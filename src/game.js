// game.js — single source of truth for game state and all game logic.
// Imports from renderer.js (DOM) and audio.js (sound) but neither of
// those modules imports from here, keeping dependencies one-directional.

import { loadCountries }                         from './data.js';
import { showCountry, playAnimation, updateStreak, updateTier, updateVignetteOpacity,
         updateHighScoreDisplay, setInputLocked, shakeInput, showAnswer, hideAnswer,
         showLoadError, showLoading, hideLoading,
         updateModeButtons } from './renderer.js';
import { playCorrect, playMilestone, playWrong, playCompletion, unlockAudio } from './audio.js';
import { normalise, matches, shuffle }           from './utils.js';
import { isValidMode, getCountryPool, classifyCorrectGuess,
         getActiveTier, computeVignetteOpacity } from './gameState.js';
import { getHighScore, updateHighScore } from './storage.js';

// ── Timing constants ──────────────────────────────────────────────────────────

const TIMINGS = {
  CORRECT_MS:      550,
  MILESTONE_MS:    900,
  COMPLETION_MS:   3200,
  STREAK_RESET_MS: 1500,
};

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  countries:    [],        // Full country list (loaded once, all tiers)
  remaining:    [],        // Shuffle queue — used by practice mode
  current:      null,      // Country currently being shown
  streak:       0,         // Correct answers in a row
  animating:    false,     // Guard: blocks input during animation delay
  mode:         'endless', // 'practice' | 'endless'
  endlessTier:  null,      // Active tier in endless mode — detects tier transitions
};

// Cached pool for the current mode — invalidated whenever mode changes.
let _cachedPool = null;

function countryPool() {
  if (!_cachedPool) {
    _cachedPool = getCountryPool(state.countries, state.mode);
  }
  return _cachedPool;
}

// ── Game loop ─────────────────────────────────────────────────────────────────

/**
 * Show the next country.
 * Endless mode: per-tier shuffle queues that advance through easy → medium → hard → expert.
 * Practice mode: shuffle queue over all countries, loops indefinitely.
 */
function advance() {
  const pool = countryPool();
  if (pool.length === 0) {
    showLoadError(`No countries available for "${state.mode}" mode.`);
    return;
  }

  // Endless mode: shuffle queue per tier, reset when tier changes
  if (state.mode === 'endless') {
    const tier = getActiveTier('endless', state.streak);
    const tierChanged = tier !== state.endlessTier;

    if (state.remaining.length === 0 || tierChanged) {
      state.endlessTier = tier;
      const tierPool = state.countries.filter(c => c.tier === tier);
      const fresh = shuffle(tierPool);
      // Avoid immediate repeat only on same-tier queue refill (not on tier change)
      if (!tierChanged && state.current && fresh[fresh.length - 1].id === state.current.id) {
        const swapIdx = Math.floor(Math.random() * (fresh.length - 1));
        [fresh[swapIdx], fresh[fresh.length - 1]] = [fresh[fresh.length - 1], fresh[swapIdx]];
      }
      state.remaining = fresh;
    }

    state.current = state.remaining.pop();
    showCountry(state.current);
    return;
  }

  // Practice mode: shuffle queue over all countries, refill when exhausted
  if (state.remaining.length === 0) {
    const fresh = shuffle(pool);
    if (state.current && fresh[fresh.length - 1].id === state.current.id) {
      const swapIdx = Math.floor(Math.random() * (fresh.length - 1));
      [fresh[swapIdx], fresh[fresh.length - 1]] = [fresh[fresh.length - 1], fresh[swapIdx]];
    }
    state.remaining = fresh;
  }

  state.current = state.remaining.pop();
  showCountry(state.current);
}

/** Check whether the player's input matches the current country. */
function isCorrect(input) {
  return matches(input, state.current);
}

/**
 * Shared handler for any event that resets the streak (wrong answer or skip).
 * Sound is tied to the streak reset, not the individual action.
 * Shows the correct country name briefly, then advances.
 *
 * @param {boolean} doShake  true for wrong answer (shake input), false for skip
 */
function handleStreakReset(doShake) {
  state.streak    = 0;
  state.remaining = []; // Force reshuffle on next advance() for practice mode
  state.animating = true;

  updateStreak(0);
  updateTier(getActiveTier(state.mode, state.streak));
  updateVignetteOpacity(computeVignetteOpacity(state.mode, state.streak));
  playWrong().catch(e => console.error('[audio] playWrong failed:', e));
  setInputLocked(true);
  if (doShake) shakeInput();
  showAnswer(state.current.name);

  setTimeout(() => {
    hideAnswer();
    advance();
    state.animating = false;
    setInputLocked(false);
  }, TIMINGS.STREAK_RESET_MS);
}

/**
 * Process a guess submitted by the player (Enter key).
 */
function handleGuess(raw) {
  if (state.animating) return;

  if (!raw.trim()) {
    handleStreakReset(false); // Skip — no shake
    return;
  }

  if (isCorrect(raw)) {
    state.streak += 1;
    state.animating = true;

    const result = classifyCorrectGuess(state.streak, countryPool().length);

    // Completion: all expert countries guessed without a single miss.
    // Detected when the expert shuffle queue is empty after a correct answer.
    const isCompletion = state.mode === 'endless'
      && getActiveTier('endless', state.streak) === 'expert'
      && state.remaining.length === 0;

    const isMilestone = result === 'milestone' && !isCompletion;

    setInputLocked(true);
    updateStreak(state.streak);
    updateTier(getActiveTier(state.mode, state.streak));
    updateVignetteOpacity(computeVignetteOpacity(state.mode, state.streak));

    if (isCompletion) {
      updateHighScore(state.streak);
      updateHighScoreDisplay(getHighScore());
      playCompletion().catch(e => console.error('[audio] playCompletion failed:', e));
      playAnimation('completion');
      showAnswer('all countries mastered!');
      setTimeout(() => {
        hideAnswer();
        state.animating = false; // Clear before resetState so the animating guard in setMode passes
        resetState('endless');
      }, TIMINGS.COMPLETION_MS);
    } else {
      if (isMilestone) {
        playMilestone().catch(e => console.error('[audio] playMilestone failed:', e));
        playAnimation('milestone');
      } else {
        playCorrect().catch(e => console.error('[audio] playCorrect failed:', e));
        playAnimation('correct');
      }
      setTimeout(() => {
        advance();
        state.animating = false;
        setInputLocked(false);
      }, isMilestone ? TIMINGS.MILESTONE_MS : TIMINGS.CORRECT_MS);
    }

  } else {
    // Record high score on wrong answer in endless mode
    if (state.mode === 'endless' && state.streak > 0) {
      updateHighScore(state.streak);
      updateHighScoreDisplay(getHighScore());
    }
    handleStreakReset(true); // Wrong answer — shake
  }
}

// ── Mode switching ────────────────────────────────────────────────────────────

/**
 * Reset all game state for the given mode and start a fresh round.
 * Called both by setMode (user clicks a button) and by the completion handler.
 * Does NOT guard against animating — callers are responsible for clearing
 * state.animating first if needed.
 */
function resetState(mode) {
  state.mode        = mode;
  _cachedPool       = null; // Invalidate pool cache
  state.streak      = 0;
  state.animating   = false;
  state.endlessTier = null; // Force tier queue rebuild on next advance()
  state.remaining   = mode === 'endless' ? [] : shuffle(countryPool());
  state.current     = null;
  updateStreak(0);
  updateTier(getActiveTier(mode, 0));
  updateVignetteOpacity(computeVignetteOpacity(mode, 0));
  updateModeButtons(mode);
  setInputLocked(false);
  advance();
}

/** Handle a user clicking a mode button. */
function setMode(mode) {
  if (!isValidMode(mode)) {
    console.warn(`[game] setMode called with invalid mode: "${mode}"`);
    return;
  }
  if (state.animating) return; // Block mode switch during active animation
  if (mode === state.mode) return; // Already in this mode — no-op
  resetState(mode);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init() {
  const input = document.getElementById('guess-input');

  // Wire up input BEFORE loading data so the element is ready
  input.addEventListener('keydown', e => {
    unlockAudio(); // Must be called synchronously within the user gesture
    if (e.key === 'Enter') {
      const value = input.value;
      input.value = ''; // Always clear on Enter (correct or wrong)
      handleGuess(value);
    }
  });

  // Practice button toggles between practice and endless (main) mode
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      unlockAudio();
      const target = state.mode === 'practice' ? 'endless' : 'practice';
      setMode(target);
    });
  });

  showLoading();
  try {
    state.countries = await loadCountries();
    hideLoading();
    updateHighScoreDisplay(getHighScore());
    resetState(state.mode);
  } catch (err) {
    showLoadError(err.message, init);
  }
}

init();
