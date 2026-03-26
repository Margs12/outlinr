// utils.js — pure, side-effect-free helper functions.

/**
 * Check whether a player's raw input matches a word entry.
 *
 * Rules:
 *   - Trim surrounding whitespace
 *   - Nouns (entries with an `article` field): input must be "article noun"
 *     — article comparison is case-insensitive ("Der" === "der")
 *     — noun comparison is case-sensitive ("Mann" !== "mann")
 *     — exactly one space must separate article and noun
 *   - Verbs (no `article` field): exact match by default; case-insensitive
 *     when caseInsensitive option is true
 *   - No umlaut normalisation — ä/ö/ü/ß must be typed correctly
 *
 * @param {string}                           input
 * @param {{ word: string, article?: string }} entry
 * @param {{ caseInsensitive?: boolean }}    [options]
 * @returns {boolean}
 */
export function matchAnswer(input, entry, { caseInsensitive = false } = {}) {
  const trimmed = input.trim();

  if (entry.article) {
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) return false;
    const inputArticle = trimmed.slice(0, spaceIdx).toLowerCase();
    const inputWord    = trimmed.slice(spaceIdx + 1);
    return inputArticle === entry.article && inputWord === entry.word;
  }

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
