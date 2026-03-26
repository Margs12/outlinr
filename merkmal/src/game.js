// game.js — game state and loop for Merkmal.

import { loadWords, loadVerbs }                                from './data.js';
import { showWord, playAnimation, updateStreak, updateTier,
         updateVignetteOpacity, updateHighScoreDisplay,
         setInputLocked, shakeInput, showAnswer, hideAnswer,
         showLoading, hideLoading, showLoadError,
         setActiveTab, setPlaceholder,
         setActiveLevelBtn, showLevelBtns, hideLevelBtns }     from './renderer.js';
import { playCorrect, playMilestone, playWrong,
         playCompletion, unlockAudio }                         from './audio.js';
import { matchAnswer, shuffle }                                from './utils.js';
import { getHighScore, updateHighScore,
         getNounLevel, setNounLevel }                          from './storage.js';

// ── Timing constants ──────────────────────────────────────────────────────────

const UMLAUT_KEYS = { '1': 'ä', '2': 'ö', '3': 'ü', '4': 'ß' };

const TIMINGS = {
  CORRECT_MS:      550,
  MILESTONE_MS:    900,
  COMPLETION_MS:   3200,
  STREAK_RESET_MS: 1500,
};

// ── Word pools (loaded once at startup) ──────────────────────────────────────

const allWords = { nouns: [], verbs: [] };

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  category:   'nouns', // 'nouns' | 'verbs'
  nounLevel:  1,       // 1 | 2 — only relevant when category === 'nouns'
  words:      [],      // Active word pool for the current category + level
  remaining:  [],      // Shuffle queue — refilled when empty
  current:    null,    // Word currently being shown
  streak:     0,       // Correct answers in a row
  animating:  false,
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

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Return words for a given noun level (rank 1–100 = lvl 1, 101–200 = lvl 2). */
function nounWordsForLevel(level) {
  return allWords.nouns.filter(w => level === 1 ? w.rank <= 100 : w.rank > 100);
}

/** The full correct answer string shown on a miss ("der Mann", "haben", etc.). */
function correctAnswerText(entry) {
  return entry.article ? `${entry.article} ${entry.word}` : entry.word;
}

/**
 * Save the current streak as a high score for the active category if it's a
 * new record, then update the display. No-op when streak is 0.
 */
function persistStreakIfBest() {
  if (state.streak > 0) {
    updateHighScore(state.category, state.streak);
    updateHighScoreDisplay(getHighScore(state.category));
  }
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
  showAnswer(correctAnswerText(state.current));

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

  if (matchAnswer(raw, state.current, { caseInsensitive: state.category === 'verbs' })) {
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
        // Level 1 complete — auto-advance to level 2
        if (state.category === 'nouns' && state.nounLevel === 1 && state.streak === 100) {
          persistStreakIfBest();
          setNounLevel(2);
          state.nounLevel  = 2;
          state.words      = nounWordsForLevel(2);
          state.streak     = 0;
          state.remaining  = [];
          updateStreak(0);
          updateTier('easy');
          updateVignetteOpacity(0);
          setActiveLevelBtn(2);
          showAnswer('level 2!');
          setTimeout(() => {
            hideAnswer();
            advance();
            state.animating = false;
            setInputLocked(false);
          }, TIMINGS.STREAK_RESET_MS);
        } else {
          advance();
          state.animating = false;
          setInputLocked(false);
        }
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
    persistStreakIfBest();
    handleStreakReset(true);
  }
}

// ── Level switching (nouns only) ──────────────────────────────────────────────

function switchLevel(newLevel) {
  if (newLevel === state.nounLevel) return;
  if (state.animating) return;

  persistStreakIfBest();
  setNounLevel(newLevel);

  state.nounLevel  = newLevel;
  state.words      = nounWordsForLevel(newLevel);
  state.streak     = 0;
  state.remaining  = [];
  state.current    = null;

  setActiveLevelBtn(newLevel);
  updateStreak(0);
  updateTier('easy');
  updateVignetteOpacity(0);
  updateHighScoreDisplay(getHighScore('nouns'));
  advance();
}

// ── Category switching ────────────────────────────────────────────────────────

function switchCategory(newCategory) {
  if (newCategory === state.category) return;
  if (state.animating) return;

  persistStreakIfBest();

  state.category  = newCategory;
  state.streak    = 0;
  state.remaining = [];
  state.current   = null;

  if (newCategory === 'nouns') {
    state.nounLevel = getNounLevel();
    state.words     = nounWordsForLevel(state.nounLevel);
    setActiveLevelBtn(state.nounLevel);
    showLevelBtns();
    setPlaceholder('article noun...');
  } else {
    state.words = allWords[newCategory];
    hideLevelBtns();
    setPlaceholder('verb...');
  }

  setActiveTab(newCategory);
  updateStreak(0);
  updateTier('easy');
  updateVignetteOpacity(0);
  updateHighScoreDisplay(getHighScore(newCategory));
  advance();
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
      e.preventDefault(); // Prevent iOS Safari from auto-blurring the input
      const value = input.value;
      input.value = '';
      input.focus();     // Explicitly retain focus so the keyboard stays open
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

  // Category tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      unlockAudio();
      switchCategory(btn.dataset.category);
    });
  });

  // Level buttons (nouns only)
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      unlockAudio();
      switchLevel(parseInt(btn.dataset.level, 10));
    });
  });

  showLoading();
  try {
    const [nouns, verbs] = await Promise.all([loadWords(), loadVerbs()]);
    allWords.nouns = nouns;
    allWords.verbs = verbs;

    state.category  = 'nouns';
    state.nounLevel = getNounLevel();
    state.words     = nounWordsForLevel(state.nounLevel);

    hideLoading();
    setActiveTab('nouns');
    setActiveLevelBtn(state.nounLevel);
    setPlaceholder('article noun...');
    updateHighScoreDisplay(getHighScore('nouns'));
    resetState();
  } catch (err) {
    showLoadError(err.message, init);
  }
}

init();
