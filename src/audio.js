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

/** A little chiptune that GROWS with the player instead of looping the
 *  same four bars forever:
 *   - 8-bar progression (C G Am F | C Am F G) — twice the old cycle
 *   - a gentle melody joins from level 3
 *   - soft hi-hats join from level 5 (or during any FEVER)
 *   - FEVER brightens everything: melody an octave up + sparkle notes
 *  Scheduled with a lookahead timer; silent while muted; pausable.
 *  No audio files: everything is synthesized like the SFX. */
const MUSIC_BPM = 104;
const STEP_DUR = 60 / MUSIC_BPM / 2; // eighth notes
const ARP_VOL = 0.045;
const BASS_VOL = 0.085;
const MEL_VOL = 0.05;
const HAT_VOL = 0.03;
const SPARK_VOL = 0.026;

// One chord per bar — 8 bars before the pattern comes back around.
const PROG = [
  [261.63, 329.63, 392.0, 329.63],  // C:  C4 E4 G4 E4
  [246.94, 293.66, 392.0, 293.66],  // G:  B3 D4 G4 D4
  [220.0, 261.63, 329.63, 261.63],  // Am: A3 C4 E4 C4
  [174.61, 220.0, 261.63, 220.0],   // F:  F3 A3 C4 A3
  [261.63, 329.63, 392.0, 329.63],  // C:  C4 E4 G4 E4
  [220.0, 261.63, 329.63, 261.63],  // Am: A3 C4 E4 C4
  [174.61, 220.0, 261.63, 220.0],   // F:  F3 A3 C4 A3
  [246.94, 293.66, 392.0, 293.66],  // G:  B3 D4 G4 D4
];

// The singable part: 4 quarter notes per bar, written to fit PROG.
const MEL = [
  [392, 329.63, 261.63, 329.63],    // C:  G E C E
  [293.66, 392, 493.88, 392],       // G:  D G B G
  [440, 392, 329.63, 392],          // Am: A G E G
  [349.23, 440, 523.25, 440],       // F:  F A C5 A
  [392, 329.63, 261.63, 329.63],    // C:  G E C E
  [440, 523.25, 440, 329.63],       // Am: A C5 A E
  [349.23, 440, 349.23, 293.66],    // F:  F A F D
  [392, 293.66, 392, 493.88],       // G:  D G D B
];

// Layers unlock as the player climbs (wired from main.js events).
let musicLevel = 1;
let musicFever = false;

export function setMusicLayers(level, fever) {
  musicLevel = level ?? 1;
  musicFever = !!fever;
}

let noiseBuf = null;
function musicNoiseBuffer() {
  if (noiseBuf || !ctx) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

/** One synthesized voice note — the music's tiny building block. */
function musicNote(type, freq, vol, t, dur, attack) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Soft closed hi-hat: a short noise blip through a high-pass filter. */
function musicHat(t) {
  const buf = musicNoiseBuffer();
  if (!buf) return;
  const src = ctx.createBufferSource();
  const hp = ctx.createBiquadFilter();
  const g = ctx.createGain();
  src.buffer = buf;
  hp.type = 'highpass';
  hp.frequency.value = 6500;
  g.gain.setValueAtTime(HAT_VOL, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  src.connect(hp).connect(g).connect(master);
  src.start(t);
  src.stop(t + 0.06);
}

function playMusicStep(step, t) {
  if (!ctx) return;
  const bar = Math.floor(step / 8) % 8;
  const inBar = step % 8;
  const freq = PROG[bar][inBar % 4];

  // 1) Arpeggio on every eighth — the backbone, always playing.
  musicNote('square', freq, ARP_VOL, t, STEP_DUR * 0.92, 0.012);

  // 2) Bass root on beats 1 and 3 — always playing.
  if (inBar === 0 || inBar === 4) {
    musicNote('triangle', freq / 2, BASS_VOL, t, STEP_DUR * 1.8, 0.02);
  }

  // 3) Melody — from level 3: quarter notes, doubled (triangle + sine)
  //    so the tune sings over the arpeggio. FEVER lifts it an octave.
  if (musicLevel >= 3 && inBar % 2 === 0) {
    const note = MEL[bar][inBar / 2] * (musicFever ? 2 : 1);
    musicNote('triangle', note, MEL_VOL, t, STEP_DUR * 1.55, 0.03);
    musicNote('sine', note, MEL_VOL * 0.45, t, STEP_DUR * 1.55, 0.03);
  }

  // 4) Hi-hats — from level 5 (or during FEVER): off-beats only.
  if ((musicLevel >= 5 || musicFever) && inBar % 2 === 1) {
    musicHat(t);
  }

  // 5) FEVER sparkle: a bright note two octaves up at the bar accents.
  if (musicFever && inBar % 4 === 0) {
    musicNote('sine', freq * 4, SPARK_VOL, t, STEP_DUR * 0.8, 0.01);
  }
}

let musicTimer = 0;
let musicStep = 0;
let musicNextTime = 0;
let musicOn = false;
let musicStarted = false; // a run asked for music — auto-pause shouldn't forget

function scheduleMusicTick() {
  if (!musicOn || muted || !ctx) return;
  // Catch-up guard: after tab-hidden gaps, jump to "now" instead of flooding.
  if (musicNextTime < ctx.currentTime) musicNextTime = ctx.currentTime + 0.05;
  while (musicNextTime < ctx.currentTime + 0.3) {
    playMusicStep(musicStep, musicNextTime);
    musicNextTime += STEP_DUR;
    musicStep = (musicStep + 1) % 64; // 8 bars × 8 eighths
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

/** Debug/test view of the music state (incl. which layers are active). */
export function musicStatus() {
  return {
    started: musicStarted, running: musicOn, step: musicStep, muted,
    level: musicLevel, fever: musicFever,
    melody: musicLevel >= 3,                 // layer 2: singable lead
    hats: musicLevel >= 5 || musicFever,     // layer 3: off-beat rhythm
  };
}
