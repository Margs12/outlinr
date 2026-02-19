// game.js — single source of truth for game state and all game logic.
// Imports from renderer.js (DOM) and audio.js (sound) but neither of
// those modules imports from here, keeping dependencies one-directional.

import { loadCountries }                         from './data.js';
import { showCountry, playAnimation, updateStreak,
         setInputLocked, shakeInput, showAnswer, hideAnswer,
         showLoadError, showLoading, hideLoading,
         updateModeButtons } from './renderer.js';
import { playCorrect, playMilestone, playWrong, playCompletion, unlockAudio } from './audio.js';
import { normalise, matches, shuffle }           from './utils.js';

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  countries:   [],     // Full country list (loaded once, all tiers)
  remaining:   [],     // Shuffle queue — refilled when empty
  current:     null,   // Country currently being shown
  streak:      0,      // Correct answers in a row
  animating:   false,  // Guard: blocks input during animation delay
  mode:        'easy', // 'easy' | 'hard'
};

// Cached pool for the current mode — invalidated whenever mode changes.
let _cachedPool = null;

function countryPool() {
  if (!_cachedPool) {
    _cachedPool = state.countries.filter(c => c.tier === state.mode);
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
  playWrong();
  setInputLocked(true);
  if (doShake) shakeInput();
  showAnswer(state.current.name);

  setTimeout(() => {
    hideAnswer();
    advance();
    state.animating = false;
    setInputLocked(false);
  }, 1500);
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

    // Completion: player has correctly named every easy-mode country in a row
    const isCompletion = state.mode === 'easy' && state.streak === countryPool().length;
    const isMilestone  = !isCompletion && state.streak % 5 === 0;
    const delay        = isCompletion ? 3200 : (isMilestone ? 900 : 550);

    setInputLocked(true);
    updateStreak(state.streak);

    if (isCompletion) {
      playCompletion();
      playAnimation('completion');
      showAnswer('easy mode complete!');
      setTimeout(() => {
        hideAnswer();
        setMode('hard'); // setMode resets animating, unlocks input, and calls advance()
      }, delay);
    } else {
      if (isMilestone) {
        playMilestone();
        playAnimation('milestone');
      } else {
        playCorrect();
        playAnimation('correct');
      }
      setTimeout(() => {
        advance();
        state.animating = false;
        setInputLocked(false);
      }, delay);
    }

  } else {
    handleStreakReset(true); // Wrong answer — shake
  }
}

// ── Mode switching ────────────────────────────────────────────────────────────

function setMode(mode) {
  if (mode === state.mode) return;
  state.mode   = mode;
  _cachedPool  = null; // Invalidate cache on mode switch
  state.streak    = 0;
  state.animating = false;
  state.remaining = shuffle(countryPool());
  state.current   = null;
  updateStreak(0);
  updateModeButtons(mode);
  setInputLocked(false);
  advance();
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
    showLoadError(err.message);
  }
}

init();
