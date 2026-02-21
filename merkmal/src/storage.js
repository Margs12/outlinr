// storage.js — pure localStorage helpers, no DOM, fully testable.

export const HIGH_SCORE_KEY = 'merkmal_high_score';

/**
 * Return the all-time high score, or 0 if none stored yet.
 * @returns {number}
 */
export function getHighScore() {
  const stored = parseInt(localStorage.getItem(HIGH_SCORE_KEY), 10);
  return isNaN(stored) ? 0 : stored;
}

/**
 * Update the stored high score if streak is a new record.
 * No-op if streak <= current high score.
 *
 * @param {number} streak
 * @returns {boolean} true if a new record was set
 */
export function updateHighScore(streak) {
  if (streak <= getHighScore()) return false;
  localStorage.setItem(HIGH_SCORE_KEY, streak);
  return true;
}
