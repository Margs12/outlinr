// data.js — loads the word list from a local JSON file.

const TIMEOUT_MS = 10_000;

/**
 * Fetch and return the words array from data/words.json.
 * Rejects with a user-readable Error on network failure or timeout.
 *
 * @returns {Promise<Array>}
 */
export async function loadWords() {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch('data/words.json', { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} — could not load word list`);
    const words = await res.json();
    if (!Array.isArray(words) || words.length === 0) {
      throw new Error('Word list is empty or malformed.');
    }
    return words;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out after 10 s.');
    throw new Error(err.message || 'Failed to load word data.');
  } finally {
    clearTimeout(timeout);
  }
}
