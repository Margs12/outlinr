// gameState.js — pure, side-effect-free state helper functions.
// Extracted from game.js so they can be imported and tested independently
// without triggering any DOM access or module-level side effects.

export const MODE_ORDER = ['easy', 'medium', 'hard', 'endless'];

/** Returns true if mode is a valid game mode string. */
export function isValidMode(mode) {
  return MODE_ORDER.includes(mode);
}

/**
 * Return the mode that follows the given mode in the progression sequence.
 * Clamps at 'endless' — endless advances back to endless (reshuffle in place).
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
 * For 'endless', returns all countries (weighted selection happens at draw time).
 *
 * @param {Array<{tier: string}>} countries
 * @param {string} mode
 * @returns {Array}
 */
export function getCountryPool(countries, mode) {
  if (mode === 'endless') return [...countries];
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

// ── Endless mode — weighted random selection ───────────────────────────────

/**
 * Probability weights per difficulty tier, indexed by streak bracket.
 * Each bracket's weights sum to 1.0.
 *
 * Brackets: [maxStreak (inclusive), { tier: weight }]
 */
const ENDLESS_WEIGHT_BRACKETS = [
  [20,       { easy: 1.00, medium: 0.00, hard: 0.00, expert: 0.00 }],
  [40,       { easy: 0.00, medium: 1.00, hard: 0.00, expert: 0.00 }],
  [60,       { easy: 0.00, medium: 0.00, hard: 1.00, expert: 0.00 }],
  [Infinity, { easy: 0.00, medium: 0.00, hard: 0.00, expert: 1.00 }],
];

const ENDLESS_TIERS = ['easy', 'medium', 'hard', 'expert'];

/**
 * Return the tier weight map that applies at the given streak value.
 *
 * @param {number} streak
 * @returns {{ easy: number, medium: number, hard: number, expert: number }}
 */
export function getEndlessWeights(streak) {
  for (const [max, weights] of ENDLESS_WEIGHT_BRACKETS) {
    if (streak <= max) return weights;
  }
  return ENDLESS_WEIGHT_BRACKETS[ENDLESS_WEIGHT_BRACKETS.length - 1][1];
}

/**
 * Pick a country for endless mode using streak-weighted random tier selection.
 * Never returns the same country twice in a row (exclude = current country).
 *
 * @param {Array<{id: string, tier: string}>} countries  Full country list.
 * @param {number} streak                                Current streak count.
 * @param {{ id: string }|null} exclude                  Country to exclude (last shown).
 * @returns {{ id: string, tier: string }}
 */
export function drawEndlessCountry(countries, streak, exclude) {
  const weights = getEndlessWeights(streak);

  // Group countries by tier, excluding the current country to avoid repeats
  const byTier = {};
  for (const tier of ENDLESS_TIERS) {
    byTier[tier] = countries.filter(c => c.tier === tier && (!exclude || c.id !== exclude.id));
  }

  // Zero out weights for empty tiers to keep probability mass valid
  let totalWeight = 0;
  const effective = {};
  for (const tier of ENDLESS_TIERS) {
    effective[tier] = byTier[tier].length > 0 ? weights[tier] : 0;
    totalWeight += effective[tier];
  }

  // Fallback: all weights are 0 (only 1 country exists, excluded)
  if (totalWeight === 0) {
    const all = countries.filter(c => !exclude || c.id !== exclude.id);
    if (all.length === 0) return countries[0]; // Absolute last resort
    return all[Math.floor(Math.random() * all.length)];
  }

  // Weighted tier pick
  let rand = Math.random() * totalWeight;
  for (const tier of ENDLESS_TIERS) {
    if (effective[tier] === 0) continue;
    rand -= effective[tier];
    if (rand <= 0) {
      const pool = byTier[tier];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  // Floating-point edge case fallback: pick from last non-empty tier
  for (let i = ENDLESS_TIERS.length - 1; i >= 0; i--) {
    if (byTier[ENDLESS_TIERS[i]].length > 0) {
      const pool = byTier[ENDLESS_TIERS[i]];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }
}
