// gameState.js — pure, side-effect-free state helper functions.
// Extracted from game.js so they can be imported and tested independently
// without triggering any DOM access or module-level side effects.

export const VALID_MODES = ['easy', 'hard'];

/** Returns true if mode is a valid game mode string. */
export function isValidMode(mode) {
  return VALID_MODES.includes(mode);
}

/**
 * Filter the full country list to the playable pool for a given mode.
 * Easy mode: countries with tier === 'easy'.
 * Hard mode: countries with tier === 'hard'.
 *
 * @param {Array<{tier: string}>} countries
 * @param {string} mode
 * @returns {Array}
 */
export function getCountryPool(countries, mode) {
  return countries.filter(c => c.tier === mode);
}

/**
 * Given a correct answer, determine the result type.
 *
 * @param {string} mode       Current game mode ('easy' | 'hard').
 * @param {number} newStreak  Streak count after incrementing (>= 1).
 * @param {number} poolSize   Number of countries in the current pool.
 * @returns {'completion' | 'milestone' | 'correct'}
 */
export function classifyCorrectGuess(mode, newStreak, poolSize) {
  if (mode === 'easy' && newStreak === poolSize) return 'completion';
  if (newStreak % 5 === 0)                       return 'milestone';
  return 'correct';
}
