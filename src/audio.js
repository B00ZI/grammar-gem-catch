/**
 * audio.js — procedural SFX via WebAudio. No audio files needed.
 *
 * The AudioContext is created lazily on the first user gesture (browser
 * autoplay policy) and everything runs through one master gain node.
 * Swapping in real samples later only means replacing `playSfx`.
 */

const STORAGE_KEY = 'ggc.muted';
const MASTER_VOLUME = 0.5;

let ctx = null;
let master = null;
let muted = localStorage.getItem(STORAGE_KEY) === '1';

/* ---------------- lifecycle ---------------- */

export function initAudio() {
  const unlock = () => ensure();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  if (master) master.gain.value = muted ? 0 : MASTER_VOLUME;
  return muted;
}

/* ---------------- primitives ---------------- */

function tone({ freq, dur = 0.12, type = 'square', vol = 0.2, slideTo = null, delay = 0 }) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function noise({ dur = 0.12, vol = 0.12, delay = 0, hp = 2400 }) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = hp;
  const gain = ctx.createGain();
  gain.gain.value = vol;

  src.connect(filt);
  filt.connect(gain);
  gain.connect(master);
  src.start(t0);
}

/* ---------------- the sound bank ---------------- */

export function playSfx(name) {
  if (!ctx || muted) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  switch (name) {
    case 'move':
      tone({ freq: 440, dur: 0.05, type: 'square', vol: 0.12 });
      break;

    case 'laser':
      tone({ freq: 1200, dur: 0.16, type: 'sawtooth', vol: 0.14, slideTo: 180 });
      noise({ dur: 0.10, vol: 0.08, hp: 3200 });
      break;

    case 'claim':
      tone({ freq: 660, dur: 0.05, type: 'square', vol: 0.12 });
      break;

    case 'deny':
      tone({ freq: 200, dur: 0.08, type: 'triangle', vol: 0.10 });
      break;

    case 'correct':
      tone({ freq: 523.25, dur: 0.10, type: 'square', vol: 0.18 });
      tone({ freq: 783.99, dur: 0.14, type: 'square', vol: 0.18, delay: 0.08 });
      break;

    case 'perfect':
      tone({ freq: 523.25, dur: 0.09, type: 'square', vol: 0.18 });
      tone({ freq: 783.99, dur: 0.11, type: 'square', vol: 0.18, delay: 0.07 });
      tone({ freq: 1567.98, dur: 0.16, type: 'triangle', vol: 0.16, delay: 0.15 });
      noise({ dur: 0.18, vol: 0.10, delay: 0.15, hp: 4000 });
      break;

    case 'wrong':
      tone({ freq: 220, dur: 0.30, type: 'sawtooth', vol: 0.20, slideTo: 110 });
      break;

    case 'miss':
      tone({ freq: 174, dur: 0.42, type: 'sawtooth', vol: 0.20, slideTo: 70 });
      break;

    case 'levelup':
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone({ freq: f, dur: 0.13, type: 'square', vol: 0.17, delay: i * 0.09 }),
      );
      break;

    case 'fever':
      tone({ freq: 300, dur: 0.5, type: 'sawtooth', vol: 0.14, slideTo: 1400 });
      [523.25, 659.25, 783.99].forEach((f) =>
        tone({ freq: f, dur: 0.7, type: 'triangle', vol: 0.13, delay: 0.5 }),
      );
      noise({ dur: 0.3, vol: 0.09, delay: 0.5, hp: 3000 });
      break;

    case 'gameover':
      [392, 329.63, 261.63, 196].forEach((f, i) =>
        tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.18, delay: i * 0.14 }),
      );
      break;

    default:
      break;
  }
}

/* ---------------- voice (built-in browser text-to-speech) ---------------- */

/** Read the completed sentence aloud after a claim. Uses the browser's
 *  built-in speechSynthesis — no files, no dependencies. Muted = silent. */
export function speak(text) {
  if (muted || !text || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel(); // never talk over the previous sentence
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.95;
    const voices = speechSynthesis.getVoices();
    const voice =
      voices.find((v) => /^en/i.test(v.lang) && /female|samantha|zira|aria|jenny/i.test(v.name)) ||
      voices.find((v) => v.lang === 'en-US') ||
      voices.find((v) => /^en/i.test(v.lang));
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  } catch {
    /* speech unavailable — the game continues silently */
  }
}

/** Silence any sentence still being read (used when muting). */
export function stopSpeech() {
  try {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

/* ---------------- background music (procedural loop) ---------------- */

/** Gentle 4-bar chiptune — C, G, Am, F — eighth-note arpeggio + bass.
 *  Scheduled with a lookahead timer; silent while muted; pausable.
 *  No audio files: everything is synthesized like the SFX. */
const MUSIC_BPM = 104;
const STEP_DUR = 60 / MUSIC_BPM / 2; // eighth notes
const ARP_VOL = 0.045;
const BASS_VOL = 0.085;
const PROG = [
  [261.63, 329.63, 392.0, 329.63],  // C:  C4 E4 G4 E4
  [246.94, 293.66, 392.0, 293.66],  // G:  B3 D4 G4 D4
  [220.0, 261.63, 329.63, 261.63],  // Am: A3 C4 E4 C4
  [174.61, 220.0, 261.63, 220.0],   // F:  F3 A3 C4 A3
];

let musicTimer = 0;
let musicStep = 0;
let musicNextTime = 0;
let musicOn = false;
let musicStarted = false; // a run asked for music — auto-pause shouldn't forget

function playMusicStep(step, t) {
  if (!ctx) return;
  const bar = Math.floor(step / 8) % 4;
  const inBar = step % 8;
  const freq = PROG[bar][inBar % 4];

  // Arpeggio note on every eighth (soft square).
  const arp = ctx.createOscillator();
  const arpGain = ctx.createGain();
  arp.type = 'square';
  arp.frequency.setValueAtTime(freq, t);
  arpGain.gain.setValueAtTime(0.0001, t);
  arpGain.gain.linearRampToValueAtTime(ARP_VOL, t + 0.012);
  arpGain.gain.exponentialRampToValueAtTime(0.0001, t + STEP_DUR * 0.92);
  arp.connect(arpGain).connect(master);
  arp.start(t);
  arp.stop(t + STEP_DUR);

  // Bass root on beats 1 and 3 (triangle, an octave down).
  if (inBar === 0 || inBar === 4) {
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'triangle';
    bass.frequency.setValueAtTime(freq / 2, t);
    bassGain.gain.setValueAtTime(0.0001, t);
    bassGain.gain.linearRampToValueAtTime(BASS_VOL, t + 0.02);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, t + STEP_DUR * 1.8);
    bass.connect(bassGain).connect(master);
    bass.start(t);
    bass.stop(t + STEP_DUR * 2);
  }
}

function scheduleMusicTick() {
  if (!musicOn || muted || !ctx) return;
  // Catch-up guard: after tab-hidden gaps, jump to "now" instead of flooding.
  if (musicNextTime < ctx.currentTime) musicNextTime = ctx.currentTime + 0.05;
  while (musicNextTime < ctx.currentTime + 0.3) {
    playMusicStep(musicStep, musicNextTime);
    musicNextTime += STEP_DUR;
    musicStep = (musicStep + 1) % 32; // 4 bars × 8 eighths
  }
}

function runScheduler() {
  if (musicOn) return;
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  musicOn = true;
  if (musicNextTime < c.currentTime) musicNextTime = c.currentTime + 0.05;
  scheduleMusicTick();
  musicTimer = setInterval(scheduleMusicTick, 120);
}

/** Begin the loop (called on Start). Idempotent. */
export function startMusic() {
  musicStarted = true;
  musicStep = 0;
  runScheduler();
}

/** Pause the loop (game paused / tab hidden / game over) — keeps position. */
export function pauseMusic() {
  musicOn = false;
  clearInterval(musicTimer);
  musicTimer = 0;
}

/** Resume after pauseMusic(), continuing the tune where it left off. */
export function resumeMusic() {
  if (musicStarted) runScheduler();
}

/** Forget the run entirely (returning home). */
export function stopMusic() {
  musicStarted = false;
  musicStep = 0;
  pauseMusic();
}

/** Debug/test view of the music state. */
export function musicStatus() {
  return { started: musicStarted, running: musicOn, step: musicStep, muted };
}
