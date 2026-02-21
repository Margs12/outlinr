// storage.js — pure localStorage helpers, no DOM, fully testable.

export const PLAYER_KEY = 'outlinr_player_name';
export const SCORES_KEY = 'outlinr_scores';
export const MAX_SCORES = 100;
export const MODE_RANK  = { easy: 0, medium: 1, hard: 2, endless: 3 };

export function getPlayerName() {
  return localStorage.getItem(PLAYER_KEY);
}

export function setPlayerName(name) {
  localStorage.setItem(PLAYER_KEY, name);
}

/**
 * Record a score for a completed run (ended by a wrong answer).
 * No-op if streak < 1.
 *
 * @param {{ name: string, streak: number, mode: string }} score
 */
export function addScore({ name, streak, mode }) {
  if (streak < 1) return;
  const scores = _loadScores();
  scores.push({ name, streak, mode, timestamp: Date.now() });
  scores.sort(_compareScores);
  if (scores.length > MAX_SCORES) {
    scores.splice(MAX_SCORES);
  }
  localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
}

/**
 * Return all stored scores sorted by rank (mode tier desc, streak desc).
 *
 * @returns {{ name: string, streak: number, mode: string, timestamp: number }[]}
 */
export function getLeaderboard() {
  return _loadScores().filter(s => s.mode === 'endless').sort(_compareScores);
}

/** @returns {object[]} — [] on missing or corrupt data */
export function _loadScores() {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Sort comparator: higher mode rank first, then higher streak first.
 * Scores with unrecognised modes are placed last.
 */
export function _compareScores(a, b) {
  const modeDiff = (MODE_RANK[b.mode] ?? -1) - (MODE_RANK[a.mode] ?? -1);
  if (modeDiff !== 0) return modeDiff;
  return b.streak - a.streak;
}
