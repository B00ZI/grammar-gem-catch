/**
 * state.js — the single source of truth.
 * Only the `actions` below mutate state; everything else reads it
 * or reacts to events through the tiny bus.
 */

import { config } from './config.js';

export const state = {
  status: 'menu',          // menu | playing | paused | levelup | gameover

  score: 0,
  lives: 3,
  level: 1,
  activeLane: 1,           // 1..4

  question: null,          // Phase 2: { sentence, owner, answer }
  wave: [],                // [{ lane, text, correct, y, el, dead }]

  combo: 0,
  comboMultiplier: 1,
  correctThisLevel: 0,

  fever: { charge: 0, active: false, timer: 0 },

  geometry: { height: 0, catchY: 0 },
};

/* ---------------- event bus ---------------- */

const handlers = new Map();

export const bus = {
  on(evt, fn) {
    if (!handlers.has(evt)) handlers.set(evt, []);
    handlers.get(evt).push(fn);
    return () => bus.off(evt, fn);
  },
  off(evt, fn) {
    const list = handlers.get(evt);
    if (list) handlers.set(evt, list.filter((f) => f !== fn));
  },
  emit(evt, payload) {
    for (const fn of handlers.get(evt) ?? []) fn(payload);
  },
};

/* ---------------- actions (the only mutators) ---------------- */

const clampLane = (n) => Math.max(1, Math.min(4, n));

export const actions = {
  setLane(n) {
    const lane = clampLane(n);
    if (lane === state.activeLane) return;
    state.activeLane = lane;
    bus.emit('lane', lane);
  },

  move(dir) {
    if (state.status !== 'playing') return;
    actions.setLane(state.activeLane + dir);
  },

  setStatus(next) {
    if (state.status === next) return;
    state.status = next;
    bus.emit('status', next);
  },

  /** Correct answer: bank points, grow combo & fever charge. */
  hitCorrect(points) {
    state.score += points;
    state.combo += 1;
    state.comboMultiplier = Math.min(
      1 + Math.floor(state.combo / config.comboStep),
      config.maxComboMultiplier,
    );
    state.correctThisLevel += 1;

    // FEVER charges only while inactive; filling it starts the ×2 window.
    if (!state.fever.active) {
      state.fever.charge += config.feverChargePerCorrect;
      if (state.fever.charge >= 100) {
        state.fever.charge = 0;
        state.fever.active = true;
        state.fever.timer = config.feverDuration;
        bus.emit('fever', true);
      }
    }

    // Answer feedback fires first so a level-up announcement isn't clobbered.
    bus.emit('answer', { correct: true, points });
    if (state.correctThisLevel >= config.correctToLevelUp) levelUp();
    bus.emit('hud', state); // after level-up: HUD shows the restored life
  },

  /** Wrong pick or missed correct gem: lose a life, streak dies.
   *  Game-over is decided later (after the teaching card) in resumeFromHint. */
  hitWrong() {
    state.lives = Math.max(0, state.lives - 1);
    state.combo = 0;
    state.comboMultiplier = 1;

    bus.emit('answer', { correct: false });
    bus.emit('hud', state);
  },

  reset() {
    state.score = 0;
    state.lives = 3;
    state.level = 1;
    state.activeLane = 1;
    state.question = null;
    state.wave = [];
    state.combo = 0;
    state.comboMultiplier = 1;
    state.correctThisLevel = 0;
    state.fever = { charge: 0, active: false, timer: 0 };
    bus.emit('lane', 1);
    bus.emit('hud', state);
    bus.emit('fever', false);
  },
};

/** 8 correct in a row through a level → level up: +1 life (capped), faster gems, wider pronoun pool. */
function levelUp() {
  state.level += 1;
  state.correctThisLevel = 0;
  state.lives = Math.min(state.lives + 1, config.maxLives);
  actions.setStatus('levelup');   // freezes the sim during the overlay
  bus.emit('levelup', state.level);
}
