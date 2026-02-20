// renderer.js — all DOM mutations live here.
// game.js decides WHAT to do; renderer.js decides HOW to show it.

const svg         = document.getElementById('shape-svg');
const countryPath = document.getElementById('country-path');
const streakCount = document.getElementById('streak-count');
const guessInput  = document.getElementById('guess-input');
const feedback    = document.getElementById('feedback');

/**
 * Remove all animation classes from the SVG container.
 * Single source of truth for the class list — prevents drift between callers.
 */
function clearSvgAnimationClasses() {
  svg.classList.remove('correct', 'milestone', 'completion');
}

/**
 * Swap in a new country shape.
 * Clears any active animation class so the new shape appears clean.
 */
export function showCountry(country) {
  clearSvgAnimationClasses();
  countryPath.setAttribute('d', country.svgPath);
}

/**
 * Trigger a CSS animation on the current shape.
 * Forces a reflow so the same class can be re-applied for back-to-back
 * correct answers without the animation being skipped.
 *
 * @param {'correct'|'milestone'|'completion'} type
 */
export function playAnimation(type) {
  clearSvgAnimationClasses();
  void svg.offsetWidth; // Force reflow — required to restart animation
  svg.classList.add(type);
}

/** Update the streak counter in the header. */
export function updateStreak(n) {
  streakCount.textContent = n;
}

/**
 * Lock the input while an animation is playing so rapid keypresses
 * cannot queue up multiple guesses.
 */
export function setInputLocked(locked) {
  guessInput.disabled = locked;
  if (!locked) {
    guessInput.value = '';
    guessInput.focus();
  }
}

/**
 * Flash the wrong-answer shake animation on the input.
 * Clears itself via animationend so the class is never left dangling.
 */
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

/** Briefly reveal the correct country name (called on streak reset). */
export function showAnswer(name) {
  feedback.textContent = name;
  feedback.classList.add('reveal');
}

/** Clear the answer reveal. */
export function hideAnswer() {
  feedback.textContent = '';
  feedback.classList.remove('reveal');
}

/** Show a loading message while country data is being fetched. */
export function showLoading() {
  countryPath.setAttribute('d', '');
  feedback.textContent = 'loading…';
  feedback.classList.add('reveal');
  guessInput.disabled = true;
}

/** Clear the loading state (called once the first country is ready). */
export function hideLoading() {
  feedback.textContent = '';
  feedback.classList.remove('reveal');
  guessInput.disabled = false;
  guessInput.focus();
}

/** Sync the easy/hard toggle buttons to the active mode. */
export function updateModeButtons(mode) {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

/**
 * Replace the entire app with a readable error message.
 * Called only when the data load fails on startup.
 *
 * @param {string}    message  Human-readable error description.
 * @param {Function}  [onRetry]  Optional callback wired to a "Try Again" button.
 */
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
