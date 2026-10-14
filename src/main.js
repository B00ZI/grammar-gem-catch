/**
 * main.js — entry point: boots every module and wires them together.
 *
 * Flow:  input → bus → actions → state → bus → ui
 *                     ↘ engine (loop & wave lifecycle)
 */

import { state, bus, actions } from './state.js';
import {
  initUI, showOverlay, hideOverlay, updateHUD, flashFever,
  showHint, hideHint, burstConfetti,
} from './ui.js';
import { initInput } from './input.js';
import { initEngine, startGame, togglePause, debugStep } from './engine.js';
import {
  initAudio, playSfx, toggleMute, isMuted, speak, stopSpeech,
  startMusic, pauseMusic, resumeMusic, stopMusic, musicStatus,
  setMusicLayers,
} from './audio.js';

initUI();
initInput();
initEngine();
initAudio();

const $ = (sel) => document.querySelector(sel);

/* ---------- input routing ---------- */

bus.on('move', (dir) => {
  const before = state.activeLane;
  actions.move(dir);
  if (state.activeLane !== before) playSfx('move');
});

// Digits and lane taps: snap the robot there AND claim immediately.
bus.on('select', (lane) => {
  actions.setLane(lane);
  bus.emit('claim', lane);
});

bus.on('toggle-pause', () => togglePause());

bus.on('confirm', () => {
  if (state.status === 'menu' || state.status === 'gameover') beginRun();
  else if (state.status === 'paused') togglePause();
  else if (state.status === 'feedback') resumeFromHint();
});

/* ---------- answer feedback: answer + why, waits for the player ---------- */

function clearHint() {
  hideHint();
}

// The card stays up until the player acknowledges it (Got it / Space / Enter).
const saySentence = (q) => speak(q.sentence.replace('___', q.answer));

bus.on('explain', ({ question, kind }) => {
  if (state.status !== 'playing') return; // only from live play
  showHint(question, kind);
  actions.setStatus('feedback');
  if (question) saySentence(question); // voice reads the completed sentence
});

// Right catch → the voice reads the full sentence with the answer.
bus.on('answer', ({ correct }) => {
  if (correct && state.question) saySentence(state.question);
});

function resumeFromHint() {
  clearHint();
  if (state.status !== 'feedback') return;
  // Out of lives? The card came first; now finish the run.
  if (state.lives === 0) actions.setStatus('gameover');
  else actions.setStatus('playing');
}

/* ---------- status → overlays ---------- */

bus.on('levelup', (level) => {
  if ($('#levelUpText')) $('#levelUpText').textContent = `LEVEL ${level}`;
  playSfx('levelup');
  burstConfetti(20);
  setMusicLayers(state.level, state.fever.active); // the tune grows with you
});

bus.on('fever', (active) => {
  if (active) {
    playSfx('fever');
    flashFever();
    burstConfetti(14);
  }
  setMusicLayers(state.level, active); // FEVER brightens the music
});

bus.on('status', (status) => {
  // Pause button icon: bars while running, play triangle while paused.
  const paused = status === 'paused';
  $('#iconPause')?.classList.toggle('hidden', paused);
  $('#iconPlay')?.classList.toggle('hidden', !paused);
  $('#pauseBtn')?.setAttribute('aria-label', paused ? 'Resume' : 'Pause');

  // Background music follows the run: plays while live, rests when not.
  if (status === 'playing') resumeMusic();
  else if (status === 'paused' || status === 'gameover') pauseMusic();

  if (status === 'playing') {
    hideOverlay('pause');
    hideOverlay('gameover');
    hideOverlay('levelup');
  } else if (status === 'paused') {
    showOverlay('pause');
  } else if (status === 'levelup') {
    showOverlay('levelup');
    // Short celebration, then drop back into the (faster) run.
    setTimeout(() => {
      hideOverlay('levelup');
      actions.setStatus('playing');
    }, 1400);
  } else if (status === 'gameover') {
    hideOverlay('pause');
    playSfx('gameover');
    const best = recordBest();
    if ($('#finalScore')) $('#finalScore').textContent = String(state.score).padStart(6, '0');
    if ($('#finalLevel')) $('#finalLevel').textContent = String(state.level);
    if ($('#bestScoreOver')) $('#bestScoreOver').textContent = String(best).padStart(6, '0');
    if ($('#bestScoreMenu')) $('#bestScoreMenu').textContent = String(best).padStart(6, '0');
    showOverlay('gameover');
  }
});

function recordBest() {
  const prev = Number(localStorage.getItem('ggc.best') || 0);
  const best = Math.max(prev, state.score);
  localStorage.setItem('ggc.best', String(best));
  return best;
}

/* ---------- buttons ---------- */

function beginRun() {
  clearHint(); // defensive: never carry a leftover card into a new run
  hideOverlay('menu');
  hideOverlay('gameover');
  updateHUD();
  setMusicLayers(1, false); // fresh run → music starts calm, grows as you climb
  startMusic();
  startGame();
}

$('#startBtn')?.addEventListener('click', beginRun);
$('#restartBtn')?.addEventListener('click', beginRun);
$('#understoodBtn')?.addEventListener('click', resumeFromHint);
$('#pauseBtn')?.addEventListener('click', () => togglePause());
$('#resumeBtn')?.addEventListener('click', () => togglePause());

// Tap the robot: claims the gem in its lane (engine fires the laser).
$('#robotBtn')?.addEventListener('click', () => {
  bus.emit('claim', state.activeLane);
});

// Any screen → back to the welcome page (used by game-over and pause Home).
function goHome() {
  clearHint();
  stopMusic();
  actions.setStatus('menu');
  hideOverlay('gameover');
  hideOverlay('pause');
  showOverlay('menu');
}
$('#homeBtn')?.addEventListener('click', goHome);
$('#pauseHomeBtn')?.addEventListener('click', goHome);

/* ---------- mute ---------- */

function renderMute() {
  const muted = isMuted();
  $('#iconSoundOn')?.classList.toggle('hidden', muted);
  $('#iconSoundOff')?.classList.toggle('hidden', !muted);
  $('#muteBtn')?.setAttribute('aria-pressed', String(muted));
}

$('#muteBtn')?.addEventListener('click', () => {
  toggleMute();
  if (isMuted()) stopSpeech(); // silence any sentence mid-read
  renderMute();
});
renderMute();

/* ---------- best score (shown before any run exists) ---------- */

const bestEl = $('#bestScoreMenu');
if (bestEl) bestEl.textContent = String(Number(localStorage.getItem('ggc.best') || 0)).padStart(6, '0');

/* ---------- debug handle (handy for tests & console poking) ---------- */

window.__ggc = {
  state, bus, actions, step: debugStep,
  audio: { playSfx, isMuted, toggleMute, music: { status: musicStatus } },
};
