// utils.js — pure, side-effect-free helper functions.

/**
 * Check whether a player's raw input matches a word entry.
 *
 * Rules:
 *   - Trim surrounding whitespace
 *   - By default: exact case-sensitive match (required for nouns — "Mann" !== "mann")
 *   - When caseInsensitive is true: .toLowerCase() comparison on both sides
 *     (used for verbs — "Haben" and "haben" are both accepted)
 *   - No umlaut normalisation — ä/ö/ü/ß must be typed correctly
 *   - Articles are not required or checked
 *
 * @param {string}              input
 * @param {{ word: string }}    entry
 * @param {{ caseInsensitive?: boolean }} [options]
 * @returns {boolean}
 */
export function matchAnswer(input, entry, { caseInsensitive = false } = {}) {
  const trimmed = input.trim();
  if (caseInsensitive) {
    return trimmed.toLowerCase() === entry.word.toLowerCase();
  }
  return trimmed === entry.word;
}

/** Fisher-Yates shuffle. Returns a new array, never mutates the input. */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
