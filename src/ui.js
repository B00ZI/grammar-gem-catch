/**
 * ui.js — DOM cache, HUD rendering, robot/lane visuals, overlays.
 * Reads state; never mutates it.
 */

import { state, bus } from './state.js';
import { config } from './config.js';

const dom = {};

export function initUI() {
  dom.score = document.getElementById('score');
  dom.level = document.getElementById('level');
  dom.combo = document.getElementById('combo');
  dom.lives = document.getElementById('lives');
  dom.hearts = [...document.querySelectorAll('[data-heart]')];
  dom.robot = document.getElementById('robot');
  dom.robotBtn = document.getElementById('robotBtn');
  dom.lanes = [...document.querySelectorAll('.lane')];
  dom.fxLayer = document.getElementById('fxLayer');
  dom.playArea = document.getElementById('playArea');
  dom.overlays = {
    menu: document.getElementById('overlayMenu'),
    pause: document.getElementById('overlayPause'),
    levelup: document.getElementById('overlayLevelUp'),
    gameover: document.getElementById('overlayGameOver'),
  };
  dom.feverWrap = document.getElementById('feverWrap');
  dom.feverFill = document.getElementById('feverFill');
  dom.feverTimer = document.getElementById('feverTimer');
  dom.hintBar = document.getElementById('hintBar');
  dom.hintTitle = document.getElementById('hintTitle');
  dom.hintSentence = document.getElementById('hintSentence');
  dom.hintWhy = document.getElementById('hintWhy');
  dom.levelUpText = document.getElementById('levelUpText');

  // Re-render HUD whenever state changes it.
  bus.on('hud', renderHUD);
  bus.on('hud', renderFever);

  // Robot glides to the newly active lane.
  bus.on('lane', setLaneVisual);

  // New wave → new question in the top bar.
  bus.on('wave', updatePrompt);

  // FEVER window: CSS drains the bar, a small interval drives the countdown.
  bus.on('fever', setFever);

  // Screen-reader feedback for players navigating by audio description.
  bus.on('answer', ({ correct, points }) => {
    const lives = state.lives;
    const lifeWord = lives === 1 ? 'life' : 'lives';
    announce(correct
      ? `Correct. Plus ${points} points. ${lives} ${lifeWord} left.`
      : `Not quite. ${lives} ${lifeWord} left.`);
    // Right catch → the blank at the top fills in with the answer, highlighted.
    if (correct && state.question) fillPromptBlank(state.question.answer);
  });
  bus.on('levelup', (level) => announce(`Level ${level}. One life restored.`));
  bus.on('fever', (active) => {
    if (active) announce('Fever mode! Double points for 8 seconds.');
  });
  bus.on('status', (s) => {
    if (s === 'gameover') announce(`Game over. Final score ${state.score}.`);
  });

  setLaneVisual(state.activeLane);
  renderHUD();
  renderFever();
}

/* ---------------- prompt & owner badge ---------------- */

function updatePrompt(q) {
  const promptEl = document.getElementById('prompt');
  const ownerEl = document.getElementById('ownerName');
  const liveEl = document.getElementById('ariaLive');

  if (promptEl) {
    promptEl.innerHTML =
      escapeHtml(q.sentence).replace('___', '<span class="prompt-blank">?</span>');
  }
  if (ownerEl) ownerEl.textContent = q.owner;
  if (liveEl) liveEl.textContent = `${q.sentence.replace('___', 'blank')} — owner: ${q.owner}`;
}

function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** After a correct catch, replace the "?" blank with the answer word,
 *  kept highlighted until the next wave swaps the sentence. */
function fillPromptBlank(answer) {
  const blank = document.querySelector('#prompt .prompt-blank');
  if (!blank) return;
  blank.textContent = answer;
  blank.classList.add('filled');
}

function announce(text) {
  const live = document.getElementById('ariaLive');
  if (live) live.textContent = text;
}

/* ---------------- lane & robot ---------------- */

function setLaneVisual(lane) {
  dom.robot?.style.setProperty('--lane', String(lane));
  dom.lanes.forEach((el) => {
    el.dataset.active = String(Number(el.dataset.lane) === lane);
  });
}

/* ---------------- HUD ---------------- */

let lastCombo = 1;

function renderHUD() {
  if (dom.score) dom.score.textContent = String(state.score).padStart(6, '0');
  if (dom.level) dom.level.textContent = String(state.level);
  if (dom.combo) {
    dom.combo.textContent = `×${state.comboMultiplier}`;
    dom.combo.classList.toggle('on', state.comboMultiplier > 1); // combo milestone → accent
    const chip = document.getElementById('comboChip');
    chip?.classList.toggle('on', state.comboMultiplier > 1);
    if (chip && state.comboMultiplier > lastCombo) {
      chip.classList.remove('chip-jump'); // the chip hops when the multiplier grows
      void chip.offsetWidth;
      chip.classList.add('chip-jump');
    }
    dom.robot?.classList.toggle('combo-on', state.comboMultiplier > 1); // robot grins
    lastCombo = state.comboMultiplier;
  }

  dom.hearts?.forEach((h, i) => {
    if (i < state.lives) h.removeAttribute('data-lost');
    else h.setAttribute('data-lost', '');
  });
}

export function updateHUD() {
  bus.emit('hud', state);
}

/* ---------------- FEVER bar ---------------- */

let feverInterval = 0;

/** Idle state: bar mirrors the charge percentage. */
function renderFever() {
  if (!dom.feverFill || state.fever.active) return;
  dom.feverFill.style.transition = 'width .25s ease-out';
  dom.feverFill.style.width = `${state.fever.charge}%`;
}

/** Active state: bar drains across the whole FEVER window. */
function setFever(active) {
  if (!dom.feverFill) return;
  clearInterval(feverInterval);

  if (active) {
    dom.feverWrap?.classList.add('fever-active');
    dom.feverFill.style.transition = `width ${config.feverDuration}s linear`;
    dom.feverFill.style.width = '100%';
    dom.feverTimer?.classList.remove('hidden');

    const tick = () => {
      if (dom.feverTimer) dom.feverTimer.textContent = `×2 ${Math.ceil(state.fever.timer)}s`;
    };
    tick();
    feverInterval = setInterval(tick, 250);
  } else {
    dom.feverWrap?.classList.remove('fever-active');
    dom.feverFill.style.transition = 'width .25s ease-out';
    dom.feverFill.style.width = `${state.fever.charge}%`;
    dom.feverTimer?.classList.add('hidden');
  }
}

/* ---------------- miss feedback (teaching moment) ---------------- */

/** Bottom card during status "feedback": the completed sentence + why.
 *  Stays until the player acknowledges it — no auto-resume.
 *  `kind` = 'miss' (let it fall) or 'wrong' (grabbed a distractor). */
export function showHint(question, kind = 'miss') {
  if (!dom.hintBar || !question) return;
  const wrong = kind === 'wrong';
  if (dom.hintTitle) {
    dom.hintTitle.textContent = wrong ? 'NOT QUITE — NOW YOU KNOW' : 'MISSED — NOW YOU KNOW';
  }
  if (dom.hintSentence) {
    dom.hintSentence.innerHTML = escapeHtml(question.sentence).replace(
      '___',
      `<b class="hint-answer">${escapeHtml(question.answer)}</b>`,
    );
  }
  if (dom.hintWhy) dom.hintWhy.textContent = question.hint || '';
  dom.hintBar.classList.remove('hidden');
  announce(
    `${wrong ? 'Not quite.' : 'Missed.'} The correct answer was ${question.answer}. ${question.hint || ''}`,
  );
}

export function hideHint() {
  dom.hintBar?.classList.add('hidden');
}

/* ---------------- robot laser ---------------- */

/** Beam up the robot's lane + recoil (click feedback). */
export function shootLaser() {
  const btn = dom.robotBtn;
  if (!btn) return;
  btn.classList.remove('fire');
  void btn.offsetWidth; // restart the animation on rapid clicks
  btn.classList.add('fire');
  setTimeout(() => btn.classList.remove('fire'), 400);
}

/* ---------------- overlays ---------------- */

export function showOverlay(name) {
  dom.overlays?.[name]?.classList.remove('hidden');
}

export function hideOverlay(name) {
  dom.overlays?.[name]?.classList.add('hidden');
}

/* ---------------- feedback fx ---------------- */

/** Green flash across a lane (correct answer). */
export function flashLane(lane, cls = 'fx-correct') {
  const laneEl = dom.lanes?.[lane - 1];
  if (!laneEl) return;
  const fx = document.createElement('div');
  fx.className = cls;
  laneEl.appendChild(fx);
  fx.addEventListener('animationend', () => fx.remove(), { once: true });
  // Safety net if animationend never fires (e.g. element hidden).
  setTimeout(() => fx.remove(), 900);
}

/** Red shake on the whole play area (wrong answer / miss). */
export function shakePlayArea() {
  const area = dom.playArea;
  if (!area) return;
  area.classList.remove('fx-wrong');
  void area.offsetWidth; // restart animation
  area.classList.add('fx-wrong');
  area.addEventListener('animationend', () => area.classList.remove('fx-wrong'), { once: true });
}

/**
 * Pop a claimed gem out of existence with a CSS animation.
 * The element removes itself; the game loop stops touching it immediately.
 */
export function popGem(el, variant = 'good') {
  if (!el) return;
  el.classList.add('gem-pop');
  if (variant === 'bad') el.classList.add('bad');
  el.addEventListener('animationend', () => el.remove(), { once: true });
  setTimeout(() => el.remove(), 700); // safety net
}

/** Full-screen neon burst when FEVER ignites. */
export function flashFever() {
  const el = document.createElement('div');
  el.className = 'fx-fever';
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
  setTimeout(() => el.remove(), 1400);
}

/** Comic-style sticker popup; lane 0 = centered. `color` tints the chip. */
export function popup(text, { lane = 0, color = '#6BB6F3', top = '40%' } = {}) {
  const p = document.createElement('div');
  p.className = 'popup';
  p.textContent = text;
  p.style.setProperty('--sticker', color);
  p.style.top = top;
  p.style.rotate = `${(Math.random() * 8 - 4).toFixed(1)}deg`; // playful tilt
  if (lane > 0) {
    const laneEl = dom.lanes?.[lane - 1];
    if (laneEl) {
      p.style.left = '50%';
      laneEl.appendChild(p);
      setTimeout(() => p.remove(), 1200);
      return;
    }
  }
  dom.fxLayer?.appendChild(p);
  setTimeout(() => p.remove(), 1200);
}

/** Candy confetti rain for celebrations (level-up, FEVER). */
const CONFETTI_COLORS = ['#6BB6F3', '#F794C8', '#FFD65C', '#7FE3B0', '#F2F0E7'];
export function burstConfetti(count = 16) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = `${4 + Math.random() * 92}%`;
    c.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    c.style.setProperty('--dx', `${Math.round(Math.random() * 120 - 60)}px`);
    c.style.setProperty('--spin', `${Math.round(Math.random() * 720 + 300)}deg`);
    c.style.animationDelay = `${(Math.random() * 0.18).toFixed(2)}s`;
    document.body.appendChild(c);
    c.addEventListener('animationend', () => c.remove(), { once: true });
    setTimeout(() => c.remove(), 1900);
  }
}

/** Reveal safety: if the teaching card would cover a revealed gem
 *  (miss reveals sit near the floor), slide the gem just above the card
 *  so the player can always see the answer. No-op when already visible. */
export function keepRevealVisible(el) {
  const hint = document.getElementById('hintBar');
  if (!el || !hint || hint.classList.contains('hidden')) return;
  // Use the card's FINAL resting top — the rect during its pop-in scale
  // animation would park the gem too low (center-origin scaling).
  const r = hint.getBoundingClientRect();
  const finalTop = r.top - (hint.offsetHeight - r.height) / 2;
  const rect = el.getBoundingClientRect();
  if (rect.bottom <= finalTop + 4) return; // already visible above the card
  const dy = (finalTop - 10) - rect.bottom; // move up (negative)
  const m = /translate\(-50%,\s*(-?[\d.]+)px\)/.exec(el.style.transform || '');
  const curY = m ? parseFloat(m[1]) : 0;
  el.style.transform = `translate(-50%, ${curY + dy}px)`;
}
