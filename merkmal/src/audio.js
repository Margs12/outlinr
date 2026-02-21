// All audio is synthesised via Web Audio API — no external files needed.
// AudioContext is created lazily on first interaction to satisfy browser
// autoplay policy (context starts 'suspended' until a user gesture occurs).

let ctx = null;

function getCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      ctx = null;
    }
  }
  return ctx;
}

export function unlockAudio() {
  try {
    const context = getCtx();
    if (context && context.state === 'suspended') context.resume();
  } catch { /* no-op */ }
}

async function ensureReady() {
  try {
    const context = getCtx();
    if (!context) return null;
    if (context.state === 'suspended') await context.resume();
    return context;
  } catch {
    return null;
  }
}

function playNote(context, frequency, startTime, duration = 0.18, peak = 0.25, type = 'sine') {
  const osc  = context.createOscillator();
  const gain = context.createGain();
  osc.connect(gain);
  gain.connect(context.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peak, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

export async function playCorrect() {
  const context = await ensureReady();
  if (!context) return;
  const now = context.currentTime;
  playNote(context, 523.25, now,        0.18, 0.22);
  playNote(context, 783.99, now + 0.09, 0.22, 0.18);
}

export async function playWrong() {
  const context = await ensureReady();
  if (!context) return;
  const now = context.currentTime;
  playNote(context, 440.00, now,        0.14, 0.20, 'triangle');
  playNote(context, 349.23, now + 0.08, 0.20, 0.16, 'triangle');
}

export async function playMilestone() {
  const context = await ensureReady();
  if (!context) return;
  const now  = context.currentTime;
  const step = 0.09;
  playNote(context, 523.25, now,            0.22, 0.22);
  playNote(context, 659.25, now + step,     0.22, 0.20);
  playNote(context, 783.99, now + step * 2, 0.22, 0.20);
  playNote(context, 1046.5, now + step * 3, 0.32, 0.18);
}

export async function playCompletion() {
  const context = await ensureReady();
  if (!context) return;
  const now  = context.currentTime;
  const step = 0.07;
  const scale = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.5];
  scale.forEach((freq, i) => playNote(context, freq, now + step * i, 0.22, 0.18));
  const chord = now + step * scale.length + 0.12;
  playNote(context, 523.25, chord, 0.85, 0.16);
  playNote(context, 659.25, chord, 0.85, 0.16);
  playNote(context, 783.99, chord, 0.85, 0.16);
  playNote(context, 1046.5, chord, 0.85, 0.20);
}
