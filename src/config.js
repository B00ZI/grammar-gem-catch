/**
 * config.js — every tunable constant lives here.
 * Balancing the game should never require touching logic code.
 */

export const config = {
  // Layout / rules
  lanes: 4,
  catchRatio: 0.82,        // gems above this ratio of lane height = "high" catch zone
  maxLives: 3,
  startLives: 3,

  // Physics — fall time is normalized to lane height so reading time is
  // identical on phones and desktops; levels then compress it.
  fallTimeSec: 12,          // seconds to fall to the miss line at level 1 (~10.5s,
                            // measured to the line just above the robot, not the floor)
  speedPerLevel: 0.18,     // +18% fall speed per level
  dtCap: 0.05,             // max seconds per frame (blocks tunneling after tab switch)
  waveGapMs: 1150,         // breathing room after each answer (read the feedback!)

  // Input
  moveThrottleMs: 110,     // min gap between repeated arrow moves

  // Progression (Phase 3 wiring)
  correctToLevelUp: 8,
  comboStep: 4,            // combo multiplier +1 every N correct
  maxComboMultiplier: 5,
  feverChargePerCorrect: 12.5,
  feverDuration: 8,

  // Teaching moment on a miss: show the answer + why; the card waits for
  // the player to acknowledge it with "Got it" (no auto-resume timer).

  // Scoring — the higher you catch the gem, the bigger the bonus
  basePoints: 100,
  bonusZones: [
    { max: 0.40, mult: 2.0, label: 'PERFECT' },
    { max: 0.70, mult: 1.5, label: 'GREAT' },
    { max: 1.05, mult: 1.0, label: 'OK' },
  ],
};
