/**
 * input.js — keyboard + pointer, normalized into bus actions:
 *   'move' (dir) | 'select' (lane) | 'claim' | 'toggle-pause' | 'confirm'
 * Game logic never inspects raw events.
 */

import { bus, state } from './state.js';
import { config } from './config.js';

let lastMoveAt = 0;

export function initInput() {
  window.addEventListener('keydown', onKeyDown, { passive: false });

  // One pointer handler covers mouse, touch and pen — no double-firing.
  const row = document.getElementById('laneRow');
  row?.addEventListener('pointerdown', onPointerDown);
}

function onKeyDown(e) {
  const { key } = e;
  const lane = key >= '1' && key <= '4' ? Number(key) : 0;

  if (lane) {
    e.preventDefault();
    bus.emit('select', lane);
    return;
  }

  switch (key) {
    case 'ArrowLeft':
      e.preventDefault();
      emitMove(-1);
      break;
    case 'ArrowRight':
      e.preventDefault();
      emitMove(1);
      break;
    case ' ':
    case 'Enter':
      e.preventDefault();
      // Space/Enter confirms in menus, resumes when paused, and
      // acknowledges the teaching card; while playing it claims the lane.
      if (state.status === 'menu' || state.status === 'gameover'
        || state.status === 'feedback' || state.status === 'paused') bus.emit('confirm');
      else bus.emit('claim', null);
      break;
    case 'Escape':
    case 'p':
    case 'P':
      e.preventDefault();
      bus.emit('toggle-pause');
      break;
    default:
      break;
  }
}

function emitMove(dir) {
  const now = performance.now();
  if (now - lastMoveAt < config.moveThrottleMs) return;
  lastMoveAt = now;
  bus.emit('move', dir);
}

function onPointerDown(e) {
  const laneEl = e.target.closest?.('[data-lane]');
  if (!laneEl) return;
  e.preventDefault();
  bus.emit('select', Number(laneEl.dataset.lane));
}
