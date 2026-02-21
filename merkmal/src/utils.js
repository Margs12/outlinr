// utils.js — pure, side-effect-free helper functions.

/**
 * Check whether a player's raw input matches a German noun entry.
 *
 * Rules:
 *   - Trim surrounding whitespace
 *   - Exact case-sensitive match against the noun ("Mann" !== "mann")
 *   - No umlaut normalisation — ä/ö/ü/ß must be typed correctly
 *   - Articles are not required or checked
 *
 * @param {string} input
 * @param {{ word: string }} entry
 * @returns {boolean}
 */
export function matchAnswer(input, entry) {
  return input.trim() === entry.word;
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
