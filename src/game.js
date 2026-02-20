// game.js — single source of truth for game state and all game logic.
// Imports from renderer.js (DOM) and audio.js (sound) but neither of
// those modules imports from here, keeping dependencies one-directional.

import { loadCountries }                         from './data.js';
import { showCountry, playAnimation, updateStreak,
         setInputLocked, shakeInput, showAnswer, hideAnswer,
         showLoadError, showLoading, hideLoading,
         updateModeButtons, updateRoundProgress } from './renderer.js';
import { playCorrect, playMilestone, playWrong, playCompletion, unlockAudio } from './audio.js';
import { normalise, matches, shuffle }           from './utils.js';
import { isValidMode, getCountryPool, classifyCorrectGuess, nextMode } from './gameState.js';

// ── Timing constants ──────────────────────────────────────────────────────────

const TIMINGS = {
  CORRECT_MS:      550,
  MILESTONE_MS:    900,
  COMPLETION_MS:   3200,
  STREAK_RESET_MS: 1500,
};

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  countries:   [],     // Full country list (loaded once, all tiers)
  remaining:   [],     // Shuffle queue — refilled when empty
  current:     null,   // Country currently being shown
  streak:      0,      // Correct answers in a row
  animating:   false,  // Guard: blocks input during animation delay
  mode:        'easy', // 'easy' | 'medium' | 'hard' | 'expert'
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
 * Pop the next country from the shuffle queue.
 * When the queue empties, reshuffle all countries so the game loops
 * indefinitely without repeating the same country twice in a row.
 */
function advance() {
  const pool = countryPool();
  if (pool.length === 0) {
    showLoadError(`No countries available for "${state.mode}" mode.`);
    return;
  }
  if (state.remaining.length === 0) {
    // Reshuffle the current mode's pool, never repeat the last country
    const fresh = shuffle(pool);
    if (state.current && fresh[fresh.length - 1].id === state.current.id) {
      // Swap last with a random earlier element to avoid immediate repeat
      const swapIdx = Math.floor(Math.random() * (fresh.length - 1));
      [fresh[swapIdx], fresh[fresh.length - 1]] = [fresh[fresh.length - 1], fresh[swapIdx]];
    }
    state.remaining = fresh;
  }

  state.current = state.remaining.pop();
  showCountry(state.current);

  // Show round progress in expert mode (derived from remaining queue length)
  if (state.mode === 'expert') {
    updateRoundProgress(pool.length - state.remaining.length, pool.length);
  } else {
    updateRoundProgress(0, 0); // Clear when not in expert
  }
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
  state.animating = true;

  updateStreak(0);
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

    // Completion: player has correctly named every country in the pool without a mistake
    const result       = classifyCorrectGuess(state.streak, countryPool().length);
    const isCompletion = result === 'completion';
    const isMilestone  = result === 'milestone';

    setInputLocked(true);
    updateStreak(state.streak);

    if (isCompletion) {
      playCompletion().catch(e => console.error('[audio] playCompletion failed:', e));
      playAnimation('completion');
      showAnswer(`${state.mode} mode complete!`);
      setTimeout(() => {
        hideAnswer();
        state.animating = false; // Clear before resetState so the animating guard in setMode passes
        resetState(nextMode(state.mode)); // Advance to next tier (expert clamps and reshuffles)
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
    handleStreakReset(true); // Wrong answer — shake
  }
}

// ── Mode switching ────────────────────────────────────────────────────────────

/**
 * Reset all game state for the given mode and start a fresh round.
 * Called both by setMode (user clicks a button) and by the completion
 * handler (auto-advance to next tier). Does NOT guard against animating —
 * callers are responsible for clearing state.animating first if needed.
 */
function resetState(mode) {
  state.mode      = mode;
  _cachedPool     = null; // Invalidate pool cache
  state.streak    = 0;
  state.animating = false;
  state.remaining = shuffle(countryPool());
  state.current   = null;
  updateStreak(0);
  updateModeButtons(mode);
  setInputLocked(false);
  advance(); // advance() also updates round-progress display
}

/** Handle a user clicking a mode button. */
function setMode(mode) {
  if (!isValidMode(mode)) {
    console.warn(`[game] setMode called with invalid mode: "${mode}"`);
    return;
  }
  if (state.animating) return; // Block mode switch during active animation
  if (mode === state.mode) return; // Clicking the already-active mode is a no-op
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

  // Mode toggle buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      unlockAudio();
      setMode(btn.dataset.mode);
    });
  });

  showLoading();
  try {
    state.countries = await loadCountries();
    hideLoading();
    state.remaining = shuffle(countryPool());
    advance();
  } catch (err) {
    showLoadError(err.message, init);
  }
}

init();
