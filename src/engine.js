/**
 * engine.js — the requestAnimationFrame loop, gem physics and wave lifecycle.
 *
 * Reads state, calls actions, paints transforms. Never touches layout props
 * other than `transform` inside the frame loop.
 *
 * Wave lifecycle:
 *   spawnWave → falling → resolveCorrect | resolveWrong | resolveMiss → gap → next wave
 */

import { config } from './config.js';
import { state, actions, bus } from './state.js';
import { nextWave, resetSpawner } from './spawner.js';
import { flashLane, shakePlayArea, popup, popGem, shootLaser, keepRevealVisible } from './ui.js';
import { playSfx } from './audio.js';

let rafId = 0;
let last = 0;
let running = false;
let waveActive = false;
let spawnCooldown = 0;
let demoCleared = false;

/** The correct gem revealed after a wrong pick — stays until the next wave. */
let revealedEl = null;

function setRevealed(el) {
  if (revealedEl) revealedEl.remove();
  revealedEl = el;
}

/** @type {Array<HTMLElement|null>} gem layers per lane (1-indexed) */
const layers = [];

/* ---------------- lifecycle ---------------- */

export function initEngine() {
  for (let i = 1; i <= config.lanes; i++) {
    layers[i] = document.querySelector(`[data-gems="${i}"]`);
  }

  measure();
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 150);
  });

  // Auto-pause when the tab goes away so gems never jump on return.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.status === 'playing') actions.setStatus('paused');
  });

  bus.on('claim', onClaim);

  // Going home: drop any live gems immediately so a new run can never
  // stack a second set on top of an abandoned one.
  bus.on('status', (s) => {
    if (s === 'menu') clearWave();
  });
}

export function startGame() {
  clearWave(); // fade out leftovers from a paused/abandoned run FIRST —
               // actions.reset() empties state.wave and would orphan them
  actions.reset();
  resetSpawner(); // new run → fresh shuffled deck of questions
  measure();
  spawnWave();
  actions.setStatus('playing');
  last = performance.now();
  if (!running) {
    running = true;
    rafId = requestAnimationFrame(frame);
  }
}

export function togglePause() {
  if (state.status === 'playing') actions.setStatus('paused');
  else if (state.status === 'paused') actions.setStatus('playing');
}

/**
 * Advance the simulation by `seconds` in 1/60 chunks, bypassing rAF.
 * Test-only: makes assertions deterministic in throttled/background tabs.
 */
export function debugStep(seconds) {
  const dt = 1 / 60;
  for (let t = seconds; t > 0; t -= dt) {
    if (state.status === 'playing') update(Math.min(dt, t));
    render();
  }
}

/* ---------------- loop ---------------- */

function frame(now) {
  const dt = Math.min((now - last) / 1000, config.dtCap); // clamp: no tunneling
  last = now;

  if (state.status === 'playing') update(dt);
  render();

  rafId = requestAnimationFrame(frame);
}

function update(dt) {
  const { height } = state.geometry;
  // Miss line sits above the robot (measure()); a gem counts as missed the
  // moment its BOTTOM edge touches the line — no need to pass through it.
  // Fall speed is normalized to the full lane height so reading time is
  // stable on phones and desktops alike.
  const missY = state.geometry.missY > 50 ? state.geometry.missY : height;
  const gemH = state.geometry.gemH || 100;
  const ramp = 1 + config.speedPerLevel * (state.level - 1);
  const speed = ((height || 468) / config.fallTimeSec) * ramp;

  // FEVER window counts down only while actually playing.
  if (state.fever.active) {
    state.fever.timer -= dt;
    if (state.fever.timer <= 0) {
      state.fever.timer = 0;
      state.fever.active = false;
      bus.emit('fever', false);
    }
  }

  for (const gem of state.wave) {
    if (!gem.dead) gem.y += speed * dt;
  }

  // Gems whose bottom edge TOUCHED the miss line (still fully visible).
  const crossed = state.wave.filter((g) => !g.dead && g.y + gemH > missY);
  if (crossed.length) {
    if (crossed.some((g) => g.correct)) {
      resolveMiss(); // reveals the gem that got away, then clears the rest
    } else {
      for (const g of crossed) {
        g.dead = true;
        g.el?.remove();
      }
      state.wave = state.wave.filter((g) => !g.dead);
    }
  }

  // Safety net: wave emptied without an explicit resolution.
  if (waveActive && state.wave.length === 0) {
    waveActive = false;
    spawnCooldown = config.waveGapMs;
  }
  if (!waveActive) {
    spawnCooldown -= dt * 1000;
    if (spawnCooldown <= 0) spawnWave();
  }
}

function render() {
  for (const gem of state.wave) {
    if (gem.el) gem.el.style.transform = `translate(-50%, ${gem.y}px)`;
  }
}

/* ---------------- waves ---------------- */

function spawnWave() {
  clearWave();
  setRevealed(null); // drop any gem revealed by a previous wrong pick

  // Drop the Phase-0 placeholder gems exactly once, then never wipe the
  // layer again — self-removing pop/fade animations live there too.
  if (!demoCleared) {
    layers.forEach((layer) => layer?.querySelectorAll('[data-demo]').forEach((n) => n.remove()));
    demoCleared = true;
  }

  const wave = nextWave(state.level);
  state.question = wave.question;

  for (let lane = 1; lane <= config.lanes; lane++) {
    const { text, correct } = wave.options[lane - 1];
    const el = document.createElement('div');
    el.className = `gem gem-${lane}`;
    el.innerHTML = `<span>${text}</span>`;
    el.style.transform = 'translate(-50%, 0px)';
    layers[lane]?.appendChild(el);

    state.wave.push({ lane, text, correct, y: 0, el, dead: false });
  }

  // Gem height (layout px) — the miss line checks the gem's BOTTOM edge,
  // so "touching the line" is a miss, not "fully passed through".
  state.geometry.gemH = state.wave[0]?.el?.offsetHeight || state.geometry.gemH;

  waveActive = true;
  bus.emit('wave', wave.question); // ui.js renders prompt + owner badge
}

function clearWave() {
  for (const gem of state.wave) {
    gem.dead = true;
    const el = gem.el;
    if (!el) continue;
    if (el.classList.contains('gem-pop')) continue; // pops itself out
    // Others fade away rather than vanishing mid-resolution.
    el.classList.add('gem-fade');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 600);
  }
  state.wave.length = 0;
  waveActive = false;
}

function endWave() {
  clearWave();
  spawnCooldown = config.waveGapMs;
}

/* ---------------- resolution ---------------- */

/** Claim a lane. `lane = null` → whichever lane the robot stands on.
 *  Every input path (robot tap, SPACE, digits, lane tap) lands here — the
 *  laser fires for all of them. */
function onClaim(lane) {
  if (state.status !== 'playing') return;
  shootLaser();
  playSfx('laser');
  const target = lane ?? state.activeLane;
  const gem = state.wave.find((g) => g.lane === target && !g.dead);
  if (!gem) {
    playSfx('deny');
    return;
  }

  if (gem.correct) resolveCorrect(gem);
  else resolveWrong(gem);
}

/** Presentation-only: candy gem colors per lane (mirrors CSS .gem-1..4). */
const LANE_COLORS = ['#6BB6F3', '#F794C8', '#FFD65C', '#7FE3B0'];

/** Right gem, right height — the higher the catch, the bigger the reward.
 *  The points sticker takes the caught gem's color. */
function resolveCorrect(gem) {
  const ratio = gem.y / Math.max(1, state.geometry.height);
  const zone = config.bonusZones.find((z) => ratio <= z.max) ?? config.bonusZones.at(-1);
  const feverMult = state.fever.active ? 2 : 1;
  const points = Math.round(config.basePoints * zone.mult * state.comboMultiplier * feverMult);

  actions.hitCorrect(points);

  popGem(gem.el, 'good');
  flashLane(gem.lane);
  popup(zone.mult >= 2 ? `NICE! +${points}` : `+${points}`,
    { lane: gem.lane, color: LANE_COLORS[gem.lane - 1] });
  playSfx(zone.mult >= 2 ? 'perfect' : 'correct');
  endWave();
}

/** Picked a distractor — streak dies, one life gone. */
function resolveWrong(gem) {
  gem.dead = true;
  popGem(gem.el, 'bad');

  // Answer reveal: keep the correct gem on screen, highlighted, so the
  // player sees which one it was. Detach its element from the wave first
  // so endWave()'s cleanup leaves it alone.
  const right = state.wave.find((g) => g.correct && !g.dead);
  if (right?.el) {
    const el = right.el;
    right.el = null;
    el.classList.add('gem-correct');
    setRevealed(el);
  }

  actions.hitWrong();
  flashLane(gem.lane, 'fx-flash-red');
  shakePlayArea();
  popup('WRONG!', { color: '#D98270' });
  playSfx('wrong');
  endWave();
  // Same teaching moment as a miss: answer + why before moving on.
  bus.emit('explain', { question: state.question, kind: 'wrong' });
  if (revealedEl) keepRevealVisible(revealedEl); // never hide behind the card
}

/** Correct gem crossed the miss line. It stays ON SCREEN — highlighted
 *  right where the miss happened — while the teaching card shows. */
function resolveMiss() {
  // Detach before endWave() so the cleanup leaves this element alone
  // (same trick as the wrong-pick reveal).
  const right = state.wave.find((g) => g.correct && !g.dead);
  let missed = null;
  if (right?.el) {
    missed = right.el;
    right.el = null;
    missed.classList.add('gem-correct');
    setRevealed(missed);
  }

  actions.hitWrong();
  shakePlayArea();
  popup('TOO LATE!', { color: '#D98270' });
  playSfx('miss');
  endWave();
  bus.emit('explain', { question: state.question, kind: 'miss' });
  // The card covers the robot zone — slide the gem just above it
  // so the player can still see the one that got away.
  if (missed) keepRevealVisible(missed);
}

/* ---------------- helpers ---------------- */

function measure() {
  const area = document.getElementById('playArea');
  if (!area) return;
  state.geometry.height = area.clientHeight;
  state.geometry.catchY = area.clientHeight * config.catchRatio;

  // Miss line: a bit above the robot. A gem whose bottom TOUCHES the line
  // is missed — the whole gem is still visible above the line.
  const robot = document.getElementById('robot');
  if (robot && area.clientHeight) {
    const areaTop = area.getBoundingClientRect().top;
    const robotTop = robot.getBoundingClientRect().top;
    state.geometry.missY = Math.max(140, robotTop - areaTop - 36);
  } else {
    state.geometry.missY = area.clientHeight * 0.81; // fallback ≈ robot top + margin
  }

  // Park the visible "too late" line right on the miss line.
  const line = document.getElementById('missLine');
  if (line) line.style.top = `${state.geometry.missY}px`;
}
