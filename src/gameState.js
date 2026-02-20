// gameState.js — pure, side-effect-free state helper functions.
// Extracted from game.js so they can be imported and tested independently
// without triggering any DOM access or module-level side effects.

export const MODE_ORDER = ['easy', 'medium', 'hard', 'expert'];

/** Returns true if mode is a valid game mode string. */
export function isValidMode(mode) {
  return MODE_ORDER.includes(mode);
}

/**
 * Return the mode that follows the given mode in the progression sequence.
 * Clamps at 'expert' — expert advances back to expert (reshuffle in place).
 *
 * @param {string} mode
 * @returns {string}
 */
export function nextMode(mode) {
  const i = MODE_ORDER.indexOf(mode);
  return MODE_ORDER[Math.min(i + 1, MODE_ORDER.length - 1)];
}

/**
 * Filter the full country list to the playable pool for a given mode.
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
 * Completion triggers in any mode when the perfect-streak equals the pool size.
 *
 * @param {number} newStreak  Streak count after incrementing (>= 1).
 * @param {number} poolSize   Number of countries in the current pool.
 * @returns {'completion' | 'milestone' | 'correct'}
 */
export function classifyCorrectGuess(newStreak, poolSize) {
  if (newStreak === poolSize) return 'completion';
  if (newStreak % 5 === 0)   return 'milestone';
  return 'correct';
}
