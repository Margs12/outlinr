// game.js — game state and loop for Merkmal.

import { loadWords }                                         from './data.js';
import { showWord, playAnimation, updateStreak, updateTier,
         updateVignetteOpacity, updateHighScoreDisplay,
         setInputLocked, shakeInput, showAnswer, hideAnswer,
         showLoading, hideLoading, showLoadError }           from './renderer.js';
import { playCorrect, playMilestone, playWrong,
         playCompletion, unlockAudio }                       from './audio.js';
import { matchAnswer, shuffle }                              from './utils.js';
import { getHighScore, updateHighScore }                     from './storage.js';

// ── Timing constants ──────────────────────────────────────────────────────────

const UMLAUT_KEYS = { '1': 'ä', '2': 'ö', '3': 'ü', '4': 'ß' };

const TIMINGS = {
  CORRECT_MS:      550,
  MILESTONE_MS:    900,
  COMPLETION_MS:   3200,
  STREAK_RESET_MS: 1500,
};

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  words:     [],   // Full word list (loaded once)
  remaining: [],   // Shuffle queue — refilled when empty
  current:   null, // Word currently being shown
  streak:    0,    // Correct answers in a row
  animating: false,
};

// ── Tier / vignette helpers ───────────────────────────────────────────────────

function tierForStreak(streak) {
  if (streak < 10) return 'easy';
  if (streak < 25) return 'medium';
  if (streak < 50) return 'hard';
  return 'expert';
}

function vignetteForStreak(streak) {
  return Math.min(streak / 80, 0.85);
}

// ── Game loop ─────────────────────────────────────────────────────────────────

function advance() {
  if (state.words.length === 0) {
    showLoadError('No words available.');
    return;
  }

  if (state.remaining.length === 0) {
    const fresh = shuffle([...state.words]);
    // Avoid repeating the last-shown word at the front of a new queue
    if (state.current && fresh[fresh.length - 1].id === state.current.id) {
      const swapIdx = Math.floor(Math.random() * (fresh.length - 1));
      [fresh[swapIdx], fresh[fresh.length - 1]] = [fresh[fresh.length - 1], fresh[swapIdx]];
    }
    state.remaining = fresh;
  }

  state.current = state.remaining.pop();
  showWord(state.current);
}

function handleStreakReset(doShake) {
  state.streak    = 0;
  state.remaining = [];
  state.animating = true;

  updateStreak(0);
  updateTier('easy');
  updateVignetteOpacity(0);
  playWrong().catch(e => console.error('[audio] playWrong failed:', e));
  setInputLocked(true);
  if (doShake) shakeInput();
  showAnswer(state.current.word);

  setTimeout(() => {
    hideAnswer();
    advance();
    state.animating = false;
    setInputLocked(false);
  }, TIMINGS.STREAK_RESET_MS);
}

function handleGuess(raw) {
  if (state.animating) return;

  if (!raw.trim()) {
    handleStreakReset(false); // Skip — no shake
    return;
  }

  if (matchAnswer(raw, state.current)) {
    state.streak += 1;
    state.animating = true;

    const isMilestone = state.streak % 10 === 0;

    setInputLocked(true);
    updateStreak(state.streak);
    updateTier(tierForStreak(state.streak));
    updateVignetteOpacity(vignetteForStreak(state.streak));

    if (isMilestone) {
      playMilestone().catch(e => console.error('[audio] playMilestone failed:', e));
      playAnimation('milestone');
      setTimeout(() => {
        advance();
        state.animating = false;
        setInputLocked(false);
      }, TIMINGS.MILESTONE_MS);
    } else {
      playCorrect().catch(e => console.error('[audio] playCorrect failed:', e));
      playAnimation('correct');
      setTimeout(() => {
        advance();
        state.animating = false;
        setInputLocked(false);
      }, TIMINGS.CORRECT_MS);
    }

  } else {
    if (state.streak > 0) {
      updateHighScore(state.streak);
      updateHighScoreDisplay(getHighScore());
    }
    handleStreakReset(true);
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function resetState() {
  state.streak    = 0;
  state.animating = false;
  state.remaining = [];
  state.current   = null;
  updateStreak(0);
  updateTier('easy');
  updateVignetteOpacity(0);
  setInputLocked(false);
  advance();
}

async function init() {
  const input = document.getElementById('guess-input');

  input.addEventListener('keydown', e => {
    unlockAudio();
    if (e.key === 'Enter') {
      const value = input.value;
      input.value = '';
      handleGuess(value);
    }
  });

  // Replace 1/2/3/4 with umlauts as the user types.
  // Using the input event (fires after the character is inserted) is more
  // reliable than keydown + preventDefault across browsers and OSes.
  // Each replacement is 1:1 in length so cursor position is preserved.
  input.addEventListener('input', () => {
    const cursor = input.selectionStart;
    const newVal = input.value.replace(/[1234]/g, c => UMLAUT_KEYS[c] || c);
    if (newVal !== input.value) {
      input.value = newVal;
      input.selectionStart = input.selectionEnd = cursor;
    }
  });

  // Umlaut helper buttons — insert character at cursor position
  document.querySelectorAll('#umlaut-bar button').forEach(btn => {
    btn.addEventListener('click', () => {
      unlockAudio();
      const char  = btn.dataset.char;
      const start = input.selectionStart;
      const end   = input.selectionEnd;
      input.setRangeText(char, start, end, 'end');
      input.focus();
    });
  });

  showLoading();
  try {
    state.words = await loadWords();
    hideLoading();
    updateHighScoreDisplay(getHighScore());
    resetState();
  } catch (err) {
    showLoadError(err.message, init);
  }
}

init();
