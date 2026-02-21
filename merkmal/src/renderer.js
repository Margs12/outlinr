// renderer.js — all DOM mutations live here.
// game.js decides WHAT to do; renderer.js decides HOW to show it.

const wordDisplay    = document.getElementById('word-display');
const wordEmoji      = document.getElementById('word-emoji');
const wordHints      = document.getElementById('word-hints');
const streakCount    = document.getElementById('streak-count');
const highScoreCount = document.getElementById('high-score-count');
const guessInput     = document.getElementById('guess-input');
const feedback       = document.getElementById('feedback');

function clearAnimationClasses() {
  wordDisplay.classList.remove('correct', 'milestone', 'completion');
}

/**
 * Display a new word: large emoji + hint line.
 * Clears any active animation class so the new word appears clean.
 *
 * @param {{ emoji: string, hints: string[] }} word
 */
export function showWord(word) {
  clearAnimationClasses();
  wordEmoji.textContent = word.emoji;
  wordHints.textContent = word.hints.join(' · ');
}

/**
 * Trigger a CSS animation on the word display.
 * Forces a reflow so the same class can be re-applied for back-to-back
 * correct answers without the animation being skipped.
 *
 * @param {'correct'|'milestone'|'completion'} type
 */
export function playAnimation(type) {
  clearAnimationClasses();
  void wordDisplay.offsetWidth;
  wordDisplay.classList.add(type);
}

export function updateStreak(n) {
  streakCount.textContent = n;
}

export function updateHighScoreDisplay(score) {
  highScoreCount.textContent = score;
}

/**
 * Set the visual tension tier on <body> for streak colour transitions.
 * @param {'easy'|'medium'|'hard'|'expert'} tier
 */
export function updateTier(tier) {
  document.body.dataset.tier = tier;
}

/**
 * Set the vignette overlay opacity via a CSS custom property.
 * @param {number} opacity  Value in [0, 1]
 */
export function updateVignetteOpacity(opacity) {
  document.body.style.setProperty('--vignette-opacity', opacity);
}

export function setInputLocked(locked) {
  guessInput.classList.toggle('locked', locked);
  if (!locked) {
    guessInput.value = '';
    guessInput.focus();
  }
}

export function shakeInput() {
  guessInput.classList.remove('wrong');
  void guessInput.offsetWidth;
  guessInput.classList.add('wrong');
  guessInput.addEventListener(
    'animationend',
    () => guessInput.classList.remove('wrong'),
    { once: true }
  );
}

/** Briefly reveal the correct answer (called on streak reset or completion). */
export function showAnswer(text) {
  feedback.textContent = text;
  feedback.classList.add('reveal');
}

export function hideAnswer() {
  feedback.textContent = '';
  feedback.classList.remove('reveal');
}

export function showLoading() {
  wordEmoji.textContent  = '';
  wordHints.textContent  = '';
  feedback.textContent   = 'loading…';
  feedback.classList.add('reveal');
  guessInput.disabled    = true;
}

export function hideLoading() {
  feedback.textContent = '';
  feedback.classList.remove('reveal');
  guessInput.disabled  = false;
  guessInput.focus();
}

export function showLoadError(message, onRetry) {
  document.getElementById('app').innerHTML = `
    <div style="text-align:center; color:#f0f0f0; max-width:340px; line-height:1.6; font-family:monospace;">
      <h2 style="margin-bottom:0.75rem;">could not load game data</h2>
      <p style="margin-bottom:0.5rem; color:#888;">${message}</p>
      <p style="color:#555; font-size:0.85rem;">
        serve the files over http<br>
        (e.g. <code>python3 -m http.server 8000</code>)<br>
        and check your internet connection.
      </p>
      ${onRetry ? '<button id="retry-btn" style="margin-top:1.5rem; background:none; border:1px solid #555; color:#f0f0f0; font-family:monospace; font-size:0.85rem; padding:0.4rem 1rem; cursor:pointer; letter-spacing:0.06em;">try again</button>' : ''}
    </div>
  `;
  if (onRetry) {
    document.getElementById('retry-btn').addEventListener('click', onRetry);
  }
}
