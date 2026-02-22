// storage.js — pure localStorage helpers, no DOM, fully testable.

export const NOUN_HIGH_SCORE_KEY = 'merkmal_nouns_high_score';
export const VERB_HIGH_SCORE_KEY = 'merkmal_verbs_high_score';

/**
 * Return the localStorage key for a given category.
 * Throws on unknown categories so callers fail fast rather than silently.
 *
 * @param {'nouns'|'verbs'} category
 * @returns {string}
 */
function scoreKey(category) {
  if (category === 'nouns') return NOUN_HIGH_SCORE_KEY;
  if (category === 'verbs') return VERB_HIGH_SCORE_KEY;
  throw new Error(`Unknown category: ${category}`);
}

/**
 * Return the all-time high score for a category, or 0 if none stored yet.
 *
 * @param {'nouns'|'verbs'} category
 * @returns {number}
 */
export function getHighScore(category) {
  const stored = parseInt(localStorage.getItem(scoreKey(category)), 10);
  return isNaN(stored) ? 0 : stored;
}

/**
 * Update the stored high score for a category if streak is a new record.
 * No-op if streak <= current high score.
 *
 * @param {'nouns'|'verbs'} category
 * @param {number} streak
 * @returns {boolean} true if a new record was set
 */
export function updateHighScore(category, streak) {
  if (streak <= getHighScore(category)) return false;
  localStorage.setItem(scoreKey(category), streak);
  return true;
}
