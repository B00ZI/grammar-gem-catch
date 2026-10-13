/**
 * spawner.js — turns the question bank into a wave.
 *
 * Guarantees:
 *  - exactly 1 correct option + 3 unique distractors
 *  - a question never repeats inside a run until EVERY eligible
 *    question (tiers 1..level) has been used once — 120 questions
 *    = up to 15 fresh levels
 *  - resetSpawner() on every new run (Start or Try again), so a
 *    restart always deals a different order
 *  - from level 4 the wrong gems are the classic mix-ups
 *    (his ↔ her ↔ its), so hard levels are trickier in a fair way
 *  - distractors come from the level's unlocked pool (never an
 *    ambiguous second answer — each owner maps to one determiner)
 */

import { questionsForLevel, unlockedPool } from './questions.js';

/** Ids already used this run — the deck runs out before anything repeats. */
const usedIds = new Set();

/** Fresh deck for a new run (Start / Try again → new shuffled order). */
export function resetSpawner() {
  usedIds.clear();
}

export function nextWave(level) {
  const question = pickQuestion(level);
  return { question, options: buildOptions(question, level) };
}

function pickQuestion(level) {
  const eligible = questionsForLevel(level);
  const fresh = eligible.filter((q) => !usedIds.has(q.id));
  let pool = fresh;
  if (!fresh.length) {
    // Whole eligible bank used up (>15 levels!) — deal a new shuffled cycle.
    usedIds.clear();
    pool = eligible;
  }

  const question = pool[Math.floor(Math.random() * pool.length)];
  usedIds.add(question.id);
  return question;
}

/** Test hook: how many questions this run has dealt so far. */
export function spawnerDebug() {
  return { used: usedIds.size };
}

/* ---------------- distractors ---------------- */

/** The words learners usually mix up with each answer. */
const CONFUSE = {
  my: ['your', 'our', 'their'],
  your: ['my', 'our', 'their'],
  our: ['my', 'your', 'their'],
  their: ['my', 'your', 'our'],
  his: ['her', 'its'],
  her: ['his', 'its'],
  its: ['his', 'her'],
};

function buildOptions(question, level) {
  const pool = unlockedPool(level);
  const answer = question.answer;

  let distractors;
  if (level >= 4 && CONFUSE[answer]) {
    // Hard levels: lead with the classic mix-ups (his ↔ her, its…),
    // then fill up from whatever is left in the pool.
    distractors = shuffle([...CONFUSE[answer]]);
    const rest = shuffle(pool.filter((w) => w !== answer && !distractors.includes(w)));
    while (distractors.length < 3 && rest.length) {
      distractors.push(rest.pop());
    }
  } else {
    // Gentle levels: any wrong words from the unlocked pool.
    distractors = shuffle(pool.filter((w) => w !== answer)).slice(0, 3);
  }

  const options = [
    { text: answer, correct: true },
    ...distractors.map((text) => ({ text, correct: false })),
  ];
  return shuffle(options);
}

/** Fisher–Yates — every order is equally likely (new deal each run). */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
