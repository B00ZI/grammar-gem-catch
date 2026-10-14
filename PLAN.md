# Grammar Gem Catch — Build Plan

A fast-paced, 4-lane arcade runner/quiz that teaches English **possessive determiners**
(my / your / his / her / its / our / their). Built with **HTML + Tailwind CSS + Vanilla JS**,
no build step required to play.

---

## 1. Goals & Definition of Done

The game is done when *(all verified — see phase notes below)*:

- [x] A player can start a run, answer questions, score points, level up, and lose/game-over — end to end.
- [x] All 4 input methods work: `1–4` keys, `←/→` + `Space`, lane click, lane tap.
- [x] Gems animate at a stable 60fps via `requestAnimationFrame`, pausable, on desktop and mobile.
- [x] FEVER, combo, speed bonus, lives, and level progression all behave as specified.
- [x] Layout is fully responsive from 320px phones to wide desktops with no horizontal scroll.
- [x] Correct/wrong feedback is visible (glow/shake) and audible (sfx placeholders → now full procedural synth).
- [x] Runs from a static server; opening `index.html` directly from disk shows an inline notice explaining that ES modules require a server (original "or by opening directly" criterion adjusted — browsers block `file://` module loading, so a one-line server is part of the run story, documented in `README.md`).

---

## 2. Architecture

### 2.1 File structure

```
game/
├── index.html          # Markup + Tailwind CDN + module script entry
├── PLAN.md
└── src/
    ├── main.js         # Entry point: boot, wire modules, start loop
    ├── config.js       # Tunable constants (speeds, colors, timings, scoring)
    ├── state.js        # Single game-state object + pure reducers
    ├── questions.js    # Question bank + difficulty/level filtering
    ├── spawner.js      # Builds a wave: 1 correct + 3 distractors, assigns lanes
    ├── engine.js       # requestAnimationFrame loop, delta time, gem physics
    ├── input.js        # Keyboard / mouse / touch → normalized actions
    ├── ui.js           # DOM refs, render(state), feedback overlays, HUD
    ├── audio.js        # WebAudio blips (sfx placeholders, no assets needed)
    └── stars.js        # Canvas/CSS starfield background
```

> **Modularity rule:** `engine.js` owns *when* things happen; `state.js` owns *what* is true;
> `ui.js` only reads state and paints. No module reaches into another's internals —
> communication goes through a tiny event bus or explicit function calls from `main.js`.

### 2.2 Rendering strategy (hybrid)

| Element | Technique | Why |
|---|---|---|
| Starfield background | Single `<canvas>`, drawn once + slow parallax | Cheap, no DOM churn |
| Lanes, HUD, prompt, bars | Static DOM + Tailwind | Styling, accessibility, text layout |
| Gems | **DOM elements** moved with `transform: translateY()` | Only 4 alive at a time; keeps text crisp & selectable; avoids canvas text layout |
| Robot indicator | DOM, `transform: translateX()` with CSS transition | Snappy lane snapping |
| Particles / flashes | Short-lived DOM nodes or CSS animation classes | Simple, self-cleaning |

**Critical performance rule:** in the rAF loop, touch only `transform` and `opacity`.
Never animate `top`/`left`/`height`. Set `will-change: transform` on active gems.

### 2.3 Main loop skeleton

```js
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05); // clamp: avoids tunneling after tab switch
  last = now;
  if (state.status === 'playing') {
    update(dt);   // move gems, check misses, tick fever timer
    render();     // write transforms
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

- Clamp `dt` to 50ms so a backgrounded tab doesn't teleport gems past the catch line.
- Pause on `visibilitychange` and on modal overlays (start / pause / game over).

---

## 3. Data Model

### 3.1 Game state (`state.js`)

```js
const state = {
  status: 'menu' | 'playing' | 'paused' | 'levelup' | 'gameover',

  score: 0,
  lives: 3,              // max 3
  level: 1,
  activeLane: 1,         // 1..4 — robot position

  question: null,        // { sentence, owner, answer, blanks:[...] }
  wave: [],              // [{ id, lane, text, correct, y, speed, state }]
  waveResolved: false,

  combo: 0,              // consecutive correct
  comboMultiplier: 1,    // floor(combo / 4) + 1, capped
  correctThisLevel: 0,   // 0..8 → level up at 8

  fever: { charge: 0, active: false, timer: 0 },  // charge 0..100
  feverFlash: 0,

  speedBonus: 0,
  shakeTimer: 0,
};
```

**Single-writer principle:** only `state.js` reducers (`applyCorrect`, `applyWrong`,
`applyMiss`, `levelUp`, `tick`) mutate state. Everything else calls reducers.

### 3.2 Question schema (`questions.js`)

```js
{
  id: 'q_park_they',
  sentence: 'They brought [ ? ] own snacks to the park.',
  owner: 'They',              // shown in the "Owner: They" badge
  answer: 'their',
  accept: ['their'],          // allows future variants
  level: 1,                   // minimum level this question unlocks at
  hint: '“They” is plural → “their”.'
}
```

**Bank sizing:** aim for **≥60 questions** so repeats don't surface early.

- **Level 1–2 pool:** `my`, `your`, `our`, `their` (+ `I/you/we/they` owners).
- **Level 3+ pool:** adds `his`, `her`, `its` (+ `he/she/it` and singular owners).
- Guard: distractors must come from the *currently unlocked pool* but must **not** be a
  valid alternative answer for that sentence (avoid ambiguity — e.g. never offer both
  `his` and `her` as distractors for the same owner).
- Shuffle questions; no repeat until pool exhausted.

### 3.3 Wave construction (`spawner.js`)

1. Pick a question from the level-filtered pool.
2. Build 4 option strings: `[answer] + 3 unique distractors`.
3. Fisher–Yates shuffle; map to lanes 1–4.
4. Emit gem objects with identical `y = 0` start, `correct` flag, and lane.
5. Re-render prompt + badge **before** gems become catchable (brief 400ms telegraph).

---

## 4. Game Mechanics — Precise Rules

### 4.1 Physics & catch zones

- Play area height `H` (measured from the lane container, re-measured on resize).
- Gem travels `y: 0 → H` at `speed = BASE_SPEED * (1 + 0.18 * (level - 1))`, px/sec.
- **Catch line** at 82% of `H` (above the robot's head), **miss line** at 100%.
- **Height bonus** (correct claim):
  - Claimed above 40% of lane → **×2.0** ("PERFECT!")
  - 40–70% → **×1.5** ("GREAT!")
  - 70–100% → **×1.0** ("OK")

### 4.2 Scoring

```
base = 100
points = round(base * heightBonus * comboMultiplier * feverMultiplier)
feverMultiplier = fever.active ? 2 : 1
comboMultiplier = min(1 + floor(combo / 4), 5)   // ×1 → ×5
```

- **Correct:** `score += points`, `combo += 1`, `correctThisLevel += 1`, `fever.charge += 12.5`.
- **Wrong pick:** `lives -= 1`, `combo = 0`, red shake. Other gems fade; wave resolves.
- **Missed correct gem** (reaches 100% unclaimed): `lives -= 1`, `combo = 0`.
- Claiming a *wrong* gem is the same event as a wrong answer — no separate "ignore" state.

### 4.3 FEVER

- `charge` 0–100; +12.5 per correct → full after **8 correct** (or faster with streaks).
- On full: `fever.active = true`, `timer = 8s`, charge resets to 0 after activation.
- While active: score ×2, HUD bar pulses, background saturates, gems get extra glow.
- Timer ticks down in `update(dt)`; expiry clears `active`.

### 4.4 Level progression

- Trigger: `correctThisLevel >= 8`.
- Effects: `level += 1`, `correctThisLevel = 0`, `lives = min(lives + 1, 3)`,
  `speed` increases, question pool expands from Level 3.
- Show a non-blocking **LEVEL UP** overlay for ~1.2s (pause the loop), then resume with
  a fresh wave.

### 4.5 Lives & game over

- Start with 3 lives (hearts in the HUD).
- `lives === 0` → `status = 'gameover'`: final score, level reached, best score
  (`localStorage` key `ggc.best`), **Restart** button.

---

## 5. Controls & Input (`input.js`)

Normalize every input to three actions so game logic is input-agnostic:

```js
emit('move', direction)   // ← →        → activeLane ± 1, clamped 1..4
emit('select', lane)      // 1–4, tap   → set activeLane = lane AND claim
emit('claim')             // Space      → resolve current lane's gem
```

| Input | Binding | Notes |
|---|---|---|
| Digits | `1` `2` `3` `4` | Select **and** claim that lane instantly |
| Arrows | `←` `→` | Move robot; ignore repeat spam via `e.repeat` guard (or allow with 120ms throttle) |
| Space | `Space` / `Enter` | Claim active lane; also advances menu screens |
| Mouse | `click` on lane `<div>` | Uses `event.target.closest('[data-lane]')` |
| Touch | `touchstart` (not `click`) | + `preventDefault()` to kill 300ms delay & double-fire |
| Pause | `P` / `Esc` | Toggle pause overlay |

**Conflict handling:** a lane `click` must not also fire after a `touchstart`
(attach `touchstart` with `{ passive: false }` and call `preventDefault()`, or detect
`pointerdown` once — recommended: use **`pointerdown`** for all pointer input, it covers
mouse, touch, and pen uniformly).

---

## 6. UI / Visual Specification

### 6.1 Layout (top → bottom)

```
┌───────────────────────────────────────────────┐
│  SCORE 001200   ♥ ♥ ♥   LVL 2   ×2 combo  │ [Owner: They] │
│  They brought [ ? ] own snacks to the park.   │
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░  FEVER                 │
├─────────┬─────────┬─────────┬─────────────────┤
│  LANE 1 │ LANE 2  │ LANE 3  │  LANE 4         │
│   ◆     │         │    ◆    │       ◆         │
│  (my)   │         │ (their) │     (your)      │
│         │    ◆    │         │                 │
│         │  (our)  │         │                 │
│  ┌────┐ │ ┌────┐  │ ┌────┐  │ ┌────┐          │
│  │🤖1│ │ │  2 │  │ │  3 │  │ │  4 │  ←active │
│  └────┘ └────┘  └───┴────┴──┴────┴           │
└───────────────────────────────────────────────┘
```

### 6.2 Tailwind tokens

| Token | Value / class |
|---|---|
| Page bg | `bg-gradient-to-b from-slate-950 via-purple-950 to-indigo-950` + `min-h-screen` |
| Stars | Absolutely-positioned `radial-gradient` dots layer, `opacity-60`, `pointer-events-none` |
| Lane | `bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl` + lane number badge |
| Active lane | `border-fuchsia-400/70 shadow-[0_0_30px_rgba(232,121,249,0.35)]` |
| Gem | Hexagon via `clip-path: polygon(...)` (custom `.gem` class in a `<style>` block), neon `box-shadow` |
| Gem colors | pink `#f472b6`, purple `#a78bfa`, yellow `#fde047`, teal `#2dd4bf` — assigned per **lane** for consistency |
| Prompt text | `text-xl md:text-3xl font-bold text-white`, blank rendered as a glowing `[ ? ]` chip |
| Owner badge | `bg-fuchsia-500/20 border border-fuchsia-400/50 text-fuchsia-200 rounded-full px-3 py-1` |
| FEVER bar | `h-2 rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500` w/ `transition-[width]` |
| Correct flash | `.fx-correct` → full-lane `bg-emerald-400/25` pulse 400ms |
| Wrong shake | `.fx-wrong` → `@keyframes shake` translateX ±8px, 350ms on the play area |

> Use the **Tailwind Play CDN** (`https://cdn.tailwindcss.com`) for zero-build dev.
> Define custom colors/keyframes in an inline `tailwind.config = { theme: { extend: {...} } }`
> script tag. Note in README: CDN is for dev/prototyping; swap to a compiled build if shipping.

### 6.3 Robot indicator

- Small SVG robot (inline, ~40px) at the bottom of `activeLane`.
- `transition: transform 160ms cubic-bezier(.2,.8,.2,1)` for lane snapping.
- Number badge `1–4` under it; active badge glows, inactive are dimmed.
- Bobbing idle animation (CSS `@keyframes`), faster during FEVER.

### 6.4 Responsive breakpoints

| Width | Behavior |
|---|---|
| ≥1024px | Fixed max-width container (~960px), centered; large prompt, wide lanes |
| 640–1023px | Proportional shrink; prompt `text-2xl` |
| <640px | Lanes fill viewport with `gap-2`; gem text `text-sm`; HUD wraps to 2 rows; `touch-action: manipulation` on lanes; `100dvh` for full-height layout |

- Use `flex-1` lanes inside a `h-[calc(100dvh-…)]` column so no vertical scrolling during play.
- Re-measure lane geometry on `resize` (debounced 150ms) and recompute gem `y` ratios.

---

## 7. Audio & Feedback (`audio.js`)

No audio files — synthesize with **WebAudio** (placeholders, swap for real samples later):

| Event | Sound |
|---|---|
| Move / select lane | Short blip, 440Hz, 40ms |
| Correct | Rising two-note chirp (C6 → G6) |
| Perfect height bonus | Extra sparkle (noise burst + highpass) |
| Wrong / miss | Descending buzz, 220→110Hz saw |
| Level up | 4-note arpeggio |
| FEVER activate | Riser + chord |

- Create `AudioContext` lazily on the **first user gesture** (browser autoplay policy).
- Master gain node, default 0.5; a HUD **mute toggle** persisted in `localStorage`.
- Every audio call also drives a visual: `fx-correct` glow, `fx-shake`, floating score
  popup (`+200`, `FEVER ×2`, `MISS`), and screen-edge flash. Game must be fully playable
  with sound off.

---

## 8. Implementation Phases

### Phase 0 — Scaffold ✅ (complete)
- [x] `index.html` with Tailwind CDN, meta viewport, module `<script type="module" src="./src/main.js">`
- [x] Full static layout markup (HUD, prompt, fever bar, 4 lanes, robot, overlays)
- [x] Background gradient + starfield canvas (`src/stars.js`)
- [x] Verify responsive at 375 / 768 / 1280 widths — **verified**: no horizontal or vertical overflow at any width; HUD wraps to 2 rows < 640px; prompt 18px → 24px; lanes 88px → 234px
- [x] Fixes from review: single robot indicator (was duplicated per lane), hearts styled as rose glyphs (Press Start 2P lacks ♥)

### Phase 1 — Core loop & movement ✅ (complete)
- [x] `config.js`, `state.js` (state + event bus + actions), `engine.js` with clamped rAF loop
- [x] Gems spawn, fall with `translateY` (measured ~105px/s @ level 1), despawn at bottom, wave gap + respawn
- [x] `input.js`: arrows (110ms throttle) + space + digits + `pointerdown`; robot snaps lanes, badge updates
- [x] Pause on tab hide / `Esc` / `P` — gems verified frozen while paused
- [x] Files added beyond plan skeleton: `ui.js` (HUD/overlays/FX) keeps `main.js` as pure wiring
- [x] Bug fixed during review: single-robot track used `translateX(100%)` (track width) instead of `25%` — robot left the screen from lane 2 onward
- [x] All inputs verified live: keyboard, digits, pointer/tap, pause/resume, claim pops gem with green flash
- [x] `window.__ggc = { state, bus, actions }` debug handle left in for tests/console poking

### Phase 2 — Quiz engine ✅ (complete)
- [x] Question bank: **66 questions** (`questions.js`) — 40 for levels 1–2 (my/your/our/their), 26 unlocked at level 3 (adds his/her/its), each with owner, answer, level and teaching hint
- [x] `spawner.js`: exactly 1 correct + 3 unique distractors from the level's unlocked pool; repeat-safe (15/15 unique questions in a stress test)
- [x] Prompt + owner badge render per wave (escaped HTML, glowing `[?]` blank chip, `aria-live` announcement)
- [x] Claim resolution: correct → height-bonus score (PERFECT ×2 / GREAT ×1.5 / OK ×1), combo & fever charge grow; wrong → −1 life, combo reset, red shake; missed correct gem → −1 life, shake
- [x] Lives → game over (overlay with final score/level), Retry fully resets
- [x] Deterministic test hook: `window.__ggc.step(seconds)` advances the sim bypassing rAF — needed because background tabs throttle rAF to 1fps
- [x] Verified: score 200 for a high PERFECT catch, 150 for GREAT, combo reached ×4 after 12 correct, fever charge capped at 100

### Phase 3 — Scoring systems ✅ (complete)
- [x] Combo multiplier: ×1 → ×5, +1 every 4 correct, HUD chip updates (verified ×4 at combo 15 earlier, exact deltas 200→400 at combo 4)
- [x] FEVER: +12.5/correct, fills at 8 → ×2 for 8s; bar drains via CSS linear transition, countdown chip `×2 8s`, pulse animation; charge pauses while active; verified exact doubling (100×2 PERFECT ×3 combo ×2 FEVER = **1200**)
- [x] Level-up at 8 correct: +1 life (capped at 3 — verified 2→3), +18% gem speed, level-3 pool unlock; 1.4s overlay then auto-resume
- [x] Level 3 verified: `his/her/its` appeared in **8/8** waves as options, `l3-*` questions surfaced, levels 2→3→4 progressed correctly
- [x] Lives → game over overlay with final score/level, best score shown from `localStorage` (`ggc.best`), survives reload, menu displays `014750`
- [x] Reset paths: fever emits `false` on `actions.reset()` so a new run never inherits a draining bar

### Phase 4 — Juice & audio ✅ (complete)
- [x] `audio.js`: WebAudio synth, **zero asset files** — 10 sounds (move, claim, deny, correct, perfect+sparkle, wrong, miss, level-up arpeggio, FEVER riser+chord, game-over); lazy `AudioContext` on first gesture, master gain, `resume()` guarded
- [x] Mute toggle: 🔇/🔊 icon, `localStorage` `ggc.muted` persists across reloads (verified `1`↔`0`)
- [x] Gem entrance (`scale`-property keyframes — composes with the loop's inline `transform`), claimed gems **pop**, wave-clear gems **fade**; all self-removing with animationend + timeout safety nets
- [x] Green lane flash (correct) / red flash + play-area shake (wrong) / floating `+points` popups
- [x] FEVER screen flash: full-screen neon burst node verified present at ignition, gone at settle
- [x] `prefers-reduced-motion`: gem animations instant, fever flash shortened, bob/pulse/blank-pulse disabled
- [x] DOM hygiene after an 8-correct flurry: 0 popups, 0 flashes, 0 stray gems, 0 console errors

### Phase 5 — Responsive & polish ✅ (complete)
- [x] Viewport audit: **no h/v overflow at 320×568, 667×375 (landscape), 768, 960, 1440×900**; lanes 74→246px; robot always in bounds; `100dvh` column
- [x] `touch-action: none` on lanes (play area must never pan mid-gesture); single `pointerdown` handler (mouse/touch/pen, no double-fire)
- [x] Touch targets: `@media (pointer: coarse)` gives mute/pause **44×44px** min (rule verified via CSSOM — mouse browser correctly doesn't match); desktop chips pass WCAG 24px AA
- [x] Safe-area insets (`env(safe-area-inset-*)`) on the app column, notch-aware via `viewport-fit=cover`
- [x] Short-landscape (`max-height: 520px`) compact mode: tighter chrome, smaller robot/labels, play area stays tall
- [x] Keyboard focus: `button:focus-visible` fuchsia ring (CSSOM-verified; trusted-key simulation unavailable in the test harness)
- [x] `aria-live`: prompt + owner, answer results (`"Correct. Plus 200 points. 3 lives left."`), level-ups, FEVER, game over — **fixed an event-ordering bug** where the answer announcement clobbered level-up/game-over messages
- [x] Resize re-measurement (150ms debounce) + `prefers-reduced-motion` (verified rule present)

### Phase 6 — Test & balance ✅ (complete)
- [x] **Balance: height-normalized fall time** — `fallTimeSec: 7` (was fixed 95px/s, which gave phones ~30% less reading time than desktop). Verified: desktop 468px area and 320px phone (365px area) both hit *alive at 6.4s / missed by 7.3s*; Level 5 ramp = 4.07s (1.72×)
- [x] **Question integrity:** all 66 questions pass an owner→determiner rule check (`I→my, you→your, we→our, they→their, he→his, she→her, it→its`), every sentence has a blank, every answer sits in its level's pool
- [x] **Wave invariants:** 150 generated waves across levels 1–5 — always 4 unique options, exactly 1 correct, answer never a distractor, level gating respected (62/66 questions seen)
- [x] **Soak (150 waves, 31.6s):** 109 correct / 41 wrong / 11 game-over restarts / 8 level-ups / 7 FEVERs → nodes **123 → 123 (exact baseline)**, heap 11.8MB → 9.9MB, 0 popups, 0 stray FX, live wave intact
- [x] **Cross-browser:** Chrome fully verified in-harness; APIs audited for Safari 15.4+ / Firefox (added `-webkit-backdrop-filter`; `dvh`, `Array.at`, `:focus-visible`, standalone `scale` all supported since Safari 15.4/16)
- [x] `README.md` written: run instructions, controls, rules, structure, testing hooks
- [x] **`file://` caveat:** ES modules are CORS-blocked from disk — an inline notice in the menu explains and `README` documents server options (DoD adjusted: "static server" required, see §1)

### Post-v1 addition — Welcome / home page ✅ (complete)
- [x] Full-screen welcome overlay (first child of `#app`, `z-40`, scrollable, covers HUD + lanes): title + tagline, pronoun chips (3 locked 🔒 noted for Level 3), **HOW TO PLAY** (3 steps), **CONTROLS** (kbd chips), **SCORING** (speed bonus / combo / FEVER / lives / level-up cards), START + best score
- [x] Game-over overlay gained a **HOME** button → `status: menu` + welcome overlay; START from home begins a fresh run (lives/score reset verified)
- [x] Verified: 320×568 & 960×640 — no horizontal overflow, vertical scroll engages when needed, START reachable, welcome covers full app; full cycle (welcome → game → gameover → home → restart) with 0 console errors

### Post-v1 addition — Answer feedback card ("teaching moment") ✅ (complete)
- [x] On **every wrong answer** — missed gem (`kind: miss`, "MISSED — NOW YOU KNOW") and wrong pick (`kind: wrong`, "NOT QUITE — NOW YOU KNOW", popup now "WRONG!") — the sim freezes (`status: feedback`) and a compact amber card appears at the bottom of the play area
- [x] Card shows the **completed sentence** with the answer highlighted (`hint-answer` glow) + the question's **hint** ("why"), announced via `aria-live`
- [x] **GOT IT** button (`understoodBtn`) and `Enter`/`Space` resume instantly; a **5s countdown** (`config.hintSeconds`) with a draining gradient bar auto-resumes; spawn gap (650ms) resumes naturally after
- [x] **Fatal path:** `hitWrong` no longer sets game-over directly — on the last life the card shows first, and `resumeFromHint` transitions to `gameover` (best score, sfx, overlay) only after the player acknowledges or the countdown ends; `beginRun`/HOME call `clearHint()` (no transient game-over flash); pause/claim inputs ignored during feedback; reduced-motion hides the drain bar (countdown number still ticks)
- [x] Verified live: wrong-pick card + countdown resume; fatal wrong pick → card → ack → game over; fatal miss → card → ack → game over; retry clean; 0 console errors; all modules parse

### Post-v1 addition — Robot polish ✅ (complete)
- [x] Removed the lane-number chip under the robot (redundant with the lane numbers at the top of each lane); `robotKey` refs purged from markup, CSS, and `ui.js`
- [x] Robot enlarged 46px → **64px** (42px on short-landscape phones) with `recoil` keyframes on fire
- [x] Robot is now a real `<button id="robotBtn">` (`pointer-events: auto` over the pointer-less overlay, focus-visible ring, aria-label): clicking/tapping fires a **laser beam** up its lane (violet→cyan gradient beam + recoil + new procedural `laser` sfx) **and claims the gem** in its lane — same as `SPACE`
- [x] Verified: 0 robotKey leftovers, all modules parse, robot renders 64px, slides via `--lane`, click → `.fire` class + claim resolved (teaching card appeared on a wrong grab), keyboard claims still work after mouse claims, 0 console errors

### Post-v1 addition — UI redesign: "Dark Minimal Arcade" ✅ (complete)
- [x] Full presentation-layer rewrite of `index.html` (game logic untouched): charcoal `#171918` bg, `#222623` surfaces, `#363D37` borders, ink `#F2F0E7` / dim `#929990` text, single lime `#C5F36B` accent (owner badge, blank, active lane, combo ≥2, FEVER, correct popups, buttons, teaching card, gems 1)
- [x] Removed: starfield (`stars.js` deleted, canvas gone), Press Start 2P pixel font, glassmorphism blur, persistent neon glows/drop-shadows, robot bob, gradients on FEVER/laser; new fonts Space Grotesk (headings/numbers) + Inter (text)
- [x] Gems redesigned: flat hexagon tokens, muted fills (lime/mint/sand/clay `#C5F36B #8FC1B5 #E3D9AC #C9A6A0`) with dark text — same clip-path + inline `transform` pipeline preserved
- [x] Robot simplified (off-white body, charcoal face, lime antenna dot), laser now flat lime; HUD = label+number stacks with hairline dividers, diamond life pips, `II`/🔊 icon buttons; overlays = solid charcoal panels; welcome = brand hexagon, title, robot+gem illustration, Start, flat rule cards, neutral kbd chips
- [x] JS touches only: `initStars` removed from `main.js`; engine popup colors → lime/coral `#D98270`; `renderHUD` toggles combo `.on` (lime) at multiplier ≥ 2
- [x] Verified: full battery (welcome → correct/wrong → teaching card → combo lime → fever chip ×2 → level-up → pause → game over → home → restart), laser on SPACE, fonts/palette computed correctly, 320px HUD fits (tightened), no overflow 320/960, 0 console errors; all 26 JS-referenced IDs intact

### Post-v1 addition — Self-containment + polish round ✅ (complete)
- [x] **Offline-proofing**: Tailwind runtime + all 6 font files self-hosted in `vendor/` (was CDN — a browser blocking `cdn.tailwindcss.com` left Tailwind's `.hidden` class undefined, so the welcome overlay never hid and Start looked dead); `.hidden` + `.sr-only` also defined in the page's own `<style>` so core function never depends on external CSS; server sends `Cache-Control: no-store`; module script versioned (`main.js?v=2`); boot-failure fallback changes Start button text
- [x] **Invisible sentence bug fixed** (root cause): Tailwind config color named `base` collided with the `text-base` font-size utility — `md:text-base` painted the prompt `#171918` (dark-on-dark). Color `base` removed from config; `bg-base` class dropped (body bg comes from own CSS). Verified computed color `rgb(242,240,231)`
- [x] **Teaching card waits for the player**: 5s auto-resume timer, countdown number, and drain bar removed (`hintSeconds` config, `setHintCount`, `hintDrain` DOM/CSS deleted); card dismissed only via **Got it** button or Space/Enter
- [x] **Keyboard dismissal fix** (found by regression test after timer removal): `input.js` now emits `confirm` during `feedback` and `paused` too — Space/Enter acknowledges the card and resumes from pause (previously only menus confirmed)
- [x] **Pause overlay = Resume + Home**; `goHome()` shared by game-over Home and pause Home (clears hint, hides pause/gameover, shows menu)
- [x] **Real SVG icons**: pause bars ↔ play triangle (swaps on status), speaker-waves ↔ speaker-slash on mute (emoji `🔊/🔇` and text `II` removed); `aria-pressed`/`aria-label` maintained
- [x] **Hearts for lives**: three inline SVG hearts, filled coral `#D98270` while alive, dim outline (`data-lost`) when lost — `renderHUD` attr toggling unchanged
- [x] **HUD Level+Combo centered chips**: `.stat-chip` (surface card, lime numbers, tabular-nums); combo chip lights lime (border+bg+number) at multiplier ≥ 2; left/right groups `flex-1` so the chip group is exactly centered (verified delta 0px); compact `@media (max-width: 359px)` rules (smaller labels/chips/hearts/buttons)
- [x] Verified: real-click Start, sentence color/text, card stays 7s+ until Got it, fatal path card→Got it→gameover, pause↔resume (button AND keyboard), pause→Home→menu→Start, mute icon both ways, hearts fill/outline on life loss, 8 pointerdown claims → score 2400, combo ×3 chip lime, level chip "2", SPACE dismisses card / restarts / resumes pause, arrows move, 0 console errors

### Post-v1 addition — Pace, prompt fill-in & voice ✅ (complete)
- [x] **Slower gems**: `fallTimeSec` 7 → 9 (verified: gem alive at 6.5s (72% down), misses at ~9.7s)
- [x] **Prompt fills in on a correct catch**: `ui.js` `fillPromptBlank()` swaps the `?` blank for the answer word in a highlighted lime chip (`.prompt-blank.filled` — lime bg `rgba(197,243,107,.14)`, lime border, bold, pop-in animation) until the next wave swaps the sentence; wired via existing `answer` event + `state.question` (no payload changes)
- [x] **Bigger prompt area**: more vertical padding (`py-2 md:py-2.5`), larger type (`1.05rem` / `1.2rem` desktop), blank min-width 2.4em → 3em with more horizontal padding
- [x] **Voice (browser speechSynthesis, zero deps)**: `speak()`/`stopSpeech()` in `audio.js` — reads the completed sentence aloud after a correct catch AND when the teaching card appears; prefers an English female voice, falls back to any English voice; rate 0.95; respects mute (and mute mid-read cancels); silent no-op if speech is unavailable
- [x] Verified: correct claim → blank = answer word with lime chip computed styles, speech captured "You can sit in your chair by the window."; miss → card speaks the sentence; muted → 0 speech calls while scoring continues; prompt 19.2px/30px tall; 0 console errors

### Post-v1 addition — Visibility polish: gem text, teaching card, wrong-pick reveal ✅ (complete)
- [x] **Gem text bigger & heavier**: Inter weight 900 downloaded (`vendor/fonts/Inter-900.woff2` + @font-face), `.gem > span` → 900 weight, `clamp(1.05rem, 3.6vw, 1.4rem)` (verified 22.4px/900 at desktop)
- [x] **Bigger teaching card, readable text**: padding `.65/.75rem` → `1/1.1rem`, wider insets, sentence `.8/.88rem` → `.95/1.1rem`, why `.68rem` → `.78/.84rem`, title `.58` → `.68rem`, Got it button min-height 48px (verified: card 103px tall, sentence 17.6px)
- [x] **Wrong-pick answer reveal**: `resolveWrong` detaches the correct gem's element from wave cleanup, adds `.gem-correct` (lime drop-shadow ring that follows the hexagon clip-path + gentle pulse) and parks it via `setRevealed()`; `spawnWave` clears it on the next question. Verified: wrong pick → reveal gem = answer text in its lane, highlighted; next wave → reveal removed; correct-pick path unaffected; DOM left with 0 stray gems; 0 console errors

### Post-v1 addition — Accent recolor: lime → sky blue ✅ (complete)
- [x] Whole accent theme swapped from lime `#C5F36B` to sky blue `#6BB6F3` (same saturation/brightness level, hue 207°) at the user's request: 24 sites across `index.html` (config token, `--lime` var, 16 rgba tints, 4 SVG fills, gem-1 fill, hover `#8cc9f6`), engine popup color, ui popup default. Token/var NAMES (`lime`, `--lime`) intentionally kept to avoid churn — comment marks them historical
- [x] Verified computed styles: accent var, Start button, brand hexagon, pronoun chips, gem-1, owner tag, active-lane tint, robot antenna, combo chip, laser, +points popup, filled prompt chip — all `rgb(107,182,243)` family; 0 leftover green literals anywhere (incl. vendor); 0 console errors

### Post-v1 addition — "Playful Arcade" UI pack ✅ (complete)
User asked for a more kid-friendly/gamey look (UI only, zero logic changes) — approved as full package:
- [x] **Bubbly font**: Fredoka variable (300–700) self-hosted (`vendor/fonts/Fredoka-var.woff2`); all display/UI text switched from Space Grotesk (12 CSS sites + tailwind `grotesk` token); body stays Inter
- [x] **Candy glossy gems**: fills → candy blue/pink/yellow/mint (`#6BB6F3 #F794C8 #FFD65C #7FE3B0`), white shine streak (`.gem::after` gradient, clipped with hexagon), chunky sticker lip (`drop-shadow(0 3px 0)`), tiny smiley face (`.gem-face` pseudo-element eyes+smile; engine innerHTML adds the marker — presentation only)
- [x] **Bouncy motion**: gems wobble ±3.5° while falling (`gemWobble`, non-transform `rotate` property so it composes with the engine's inline `transform`), springy pop-in (`cubic-bezier(.34,1.56,.64,1)`), jelly button squash on press (`scale(1.05,.92)` / icons `.86`), overlays + teaching card pop in elastic, combo chip hops (`chip-jump`) on multiplier growth (ui.js renderHUD triggers)
- [x] **Comic stickers**: `popup()` restyled — rounded chip, thick border, hard drop shadow, random ±4° tilt, springy pop; `ZAP!` fires at the robot's lane on every laser claim, `NICE! +points` on perfect catches (engine call sites only)
- [x] **Confetti**: `burstConfetti()` in ui.js (candy colors, spin+drift via CSS vars, reduced-motion safe, auto-cleanup) — 20 pieces on level-up, 14 on FEVER (main.js event handlers)
- [x] **Cute robot**: eyes blink every ~4.8s (`.eye` scaleY keyframes, `transform-box: fill-box`), grins (mouth rect ⇄ arc smile path) while combo ≥ 2 via `robot-track.combo-on` toggled in renderHUD
- [x] Verified live: Fredoka loaded+applied, 4 candy colors computed, wobble/shine/faces on wave gems, jelly transition, blink animation, ZAP!/NICE! stickers (radius/shadow/tilt), confetti nodes at level-up, chip-jump class, grin state (smile shown + mouth hidden), 0 console errors

### Post-v1 addition — Tuning round: faces out, wobble safe, sticker colors, BGM ✅ (complete)
User feedback on the playful pack — all UI-only changes:
- [x] **Gem faces removed** (CSS `.gem-face` trio, engine innerHTML marker, 4 demo-gem markup elements) — verified: no face nodes, no face rules
- [x] **Wobble tamed & lane-safe**: ±3.5° → ±1.5°, slower (1.6s), gem width `clamp(56px, 68%, 94px)` (extra side margin) — verified: gems fully inside lane bounds at multiple rotation phases
- [x] **ZAP sticker removed** (engine onClaim popup deleted); NICE!/+points stickers kept
- [x] **Points sticker takes the gem's color**: `LANE_COLORS = [#6BB6F3, #F794C8, #FFD65C, #7FE3B0]` per lane — verified: caught pink gem (lane 2) → sticker bg `rgb(247,148,200)`
- [x] **Background music** (procedural, zero files): 4-bar chiptune C–G–Am–F, 104 BPM eighth-note square arpeggio + triangle bass, lookahead scheduler (`setInterval` 120ms), catch-up guard after tab-hidden gaps; `startMusic` on Start, pause on paused/game-over/tab-hidden, resume on play, `stopMusic` on Home, silent while muted; exposed via `__ggc.audio.music.status()` for tests
- [x] Verified music: silent on menu → starts on Start → scheduler advances in real time (step 2→4 over ~0.9s) → pauses on P → resumes on P → fully stops+resets on Home; 0 console errors

### Post-v1 addition — Word system v2: 120 sentences, 5 tiers, deck shuffle ✅ (complete)
User request: more/better words, harder as levels grow, no repeats in a run, different order on restart — but sentences stay **gentle** (learning English first).
- [x] **Bank rebuilt: 120 unique sentences, 5 tiers × 24** (`questions.js`):
  - T1 (L1): my/your/our/their, owner first, very short
  - T2 (L2): same four words, longer sentences, some hidden plural owners ("The twins finished ___ homework.")
  - T3 (L3): his/her/its unlock + gentle review
  - T4 (L4): names (David → his, Maria → her), owner mid-sentence, single-entity collectives (chef, robot)
  - T5 (L5+): all mixed, hardest shapes (team/class/band → their, animals → its) — still simple English, ≤ ~12 words
  - Every sentence: blank immediately before the owned noun, one unambiguous owner, no other possessives inside, hint attached; verified: 120 unique ids + sentences, single owner→answer mapping, all blanks+noun, all hinted
- [x] **No repeats per run + new order every restart** (`spawner.js`): used-ids deck per run — a question can't return until all 120 are dealt (≈15 fresh levels); `resetSpawner()` called in engine `startGame()` (covers Start AND Try again); verified: 150-wave sim → zero repeats in first 120, cycle resumes after, two runs → different orders; live retry → deck reset (used===1)
- [x] **Smarter distractors from L4**: `CONFUSE` map (his↔her↔its; my/your/our/their group) — hard-level wrong gems are the classic mix-ups; verified: every L4+ wave with his/her/its answer contains its true confuser
- [x] **Tier gating verified**: level N draws only tiers ≤N (L1 = tier 1 only; all 7 words still available as distractors at L3+ per unlocked pool); 4 unique options + correct always included
- [x] 0 console errors; live start → tier-1 wave confirmed

### Post-v1 addition — Simplified home, gentler pacing, evolving music ✅ (complete)
- [x] **Home page simplified** (`index.html`): 3 rule cards (How to play / Scoring / Controls) → **1 short card** (move+grab keys, catch-high hint); subtitle shortened; menu text now 310 chars (was ~800); start button, best score, illustration, pronoun chips untouched; verified: cardCount=1, no "Scoring", chips=7, start works
- [x] **Breathing room between phrases** (`config.js`): `waveGapMs` 650 → **1150** — sticker + completed sentence stay readable after each answer; verified behaviorally: still no wave at 700ms after a correct claim, wave spawned by 1.2s
- [x] **Evolving background music** (`audio.js`): 4-bar loop → **8-bar progression** (C G Am F | C Am F G); new **melody layer** (quarter-note tune, triangle+sine double voice) unlocks at **level 3**; **hi-hat layer** (off-beat noise blips) unlocks at **level 5**; **FEVER** brightens everything (melody +1 octave, sparkle notes two octaves up, hats on regardless of level); `setMusicLayers(level, fever)` wired from main.js on beginRun (reset to calm), `levelup` and `fever` events; cycle length 32→64 steps; `musicStatus()` exposes layer flags for tests
- [x] Verified live: L1 = melody/hats off → 33 correct driven to L5 with melody+hats unlocked at the right moments, FEVER seen with `music.fever=true`, scheduler advancing in real time; 0 console errors

### Post-v1 addition — Miss line above robot, slower fall, double-gem fix ✅ (complete)
- [x] **Miss line slightly above the robot** (`state.geometry.missY`, measured in `measure()` = robotTop − 8px ≈ 79–81px above floor): gems are counted missed **while still visible** instead of after fully leaving the screen; `update()` restructured so the correct gem is never pre-removed before the resolve (resolveMiss handles reveal + cleanup itself)
- [x] **The missed gem stays on screen**: same reveal trick as a wrong pick (detach `el` → `.gem-correct` ring + pulse → `setRevealed`); new `keepRevealVisible(el)` in ui.js slides the reveal just above the teaching card (card covers the robot zone; computes the card's FINAL pop-in top so the park is animation-proof) — applied to both miss and low wrong-pick reveals
- [x] **Slower fall**: `fallTimeSec` 9 → **12** (miss line is closer than the old floor, so full-fall time was retuned) — measured live: **10.8s from spawn to miss** at level 1 (was 9s)
- [x] **Double-gem bug fixed** (pause → Home → Play showed 2 sets): root cause `actions.reset()` emptied `state.wave` BEFORE `clearWave()` could touch the elements, orphaning them. Fix: `startGame()` clears the wave **before** reset + engine listens `status === 'menu'` and clears immediately on going home. Verified with the exact repro: 0 gems after Home, **exactly 4** after Play (was 8)
- [x] Verified end-to-end: claim works, miss at 10.8s with reveal text = answer, reveal above card + on screen, card dismiss → clean single wave, reveal cleaned on next spawn, 0 console errors

### Known limitations (documented, not blocking)
- Trusted-keyboard `:focus-visible` can't be simulated in the test harness — verified via CSSOM instead
- `browser.press` doesn't reach page JS in the harness — all input tests use dispatched events through the real handlers
- Audio can't be *heard* by tests; all `playSfx` paths execute without errors and mute state round-trips through `localStorage`

---

## 9. Testing Checklist

- [ ] All 4 input methods independently complete a full wave
- [ ] Wrong pick → −1 life, combo reset, red shake, wave halts
- [ ] Correct gem missed at bottom → −1 life, combo reset
- [ ] Height bonus: same answer scores more when caught higher
- [ ] Combo hits 4 → multiplier ×2, HUD updates; caps at ×5
- [ ] FEVER fills at 8 correct → ×2 for 8s → expires cleanly
- [ ] 8 correct → level up, +1 life (capped at 3), faster gems
- [ ] Level 3 unlocks `his/her/its` and they appear as answers **and** distractors
- [ ] Game over → restart resets everything except best score
- [ ] Tab backgrounded mid-fall → no gem tunneling past the catch line
- [ ] 320–1440px: no horizontal scrollbar, lanes never overlap, tap targets usable
- [ ] Sound off (or blocked) → all feedback still readable visually

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Ambiguous answers (`his` vs `her` both plausible) | Distractor validation rule in `spawner.js`; curated question bank |
| Touch double-firing (touch + click) | Single `pointerdown` handler; `preventDefault()` |
| Gems jumping after resize/tab switch | Recompute from `y` ratio; clamp `dt` |
| DOM leak from score popups / particles | Central `fx.spawn()` with auto-remove + hard cap on concurrent nodes |
| Tailwind CDN FOUC / production concern | Inline critical layout classes; document CDN→CLI migration in README |
| Audio blocked before interaction | Init `AudioContext` on first pointerdown/keydown; mute fallback |

---

## 11. Deliverables

1. `index.html` + `src/*.js` — complete, playable game.
2. `README.md` — how to run (`npx serve .` or open directly), controls, rules.
3. This `PLAN.md` — kept updated as phases complete.
