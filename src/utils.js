// utils.js — pure, side-effect-free helper functions.
// Kept separate so they can be imported by both game.js and test.html.

/**
 * Normalise a string for answer comparison:
 *   • Strip combining diacritics (NFD decomposition)
 *   • Lowercase, trim, collapse internal whitespace
 *
 * Examples:
 *   "ITALY"            → "italy"
 *   "côte d'ivoire"    → "cote d'ivoire"
 *   "  united states " → "united states"
 */
export function normalise(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Check whether a player's raw input matches a country's name or any alias.
 * Pure function — takes explicit country data, no global state.
 *
 * @param {string} input
 * @param {{ name: string, aliases: string[] }} country
 * @returns {boolean}
 */
export function matches(input, country) {
  const norm = normalise(input);
  if (normalise(country.name) === norm) return true;
  return country.aliases.some(alias => normalise(alias) === norm);
}

/**
 * Escape a string for safe injection into innerHTML.
 * Covers the five characters that can introduce XSS in HTML contexts.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
