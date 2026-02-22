// data.js — loads word lists from local JSON files.

const TIMEOUT_MS = 10_000;

/**
 * Shared fetch helper for word list files.
 * Rejects with a user-readable Error on network failure, timeout, or bad data.
 *
 * @param {string} path   Relative URL of the JSON file
 * @param {string} label  Human-readable name used in error messages
 * @returns {Promise<Array>}
 */
async function loadWordFile(path, label) {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(path, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} — could not load ${label}`);
    const words = await res.json();
    if (!Array.isArray(words) || words.length === 0) {
      throw new Error(`${label} is empty or malformed.`);
    }
    return words;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out after 10 s.');
    throw new Error(err.message || `Failed to load ${label}.`);
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetch and return the nouns array from data/words.json. */
export function loadWords() {
  return loadWordFile('data/words.json', 'word list');
}

/** Fetch and return the verbs array from data/verbs.json. */
export function loadVerbs() {
  return loadWordFile('data/verbs.json', 'verb list');
}
