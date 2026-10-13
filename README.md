# 💎 Grammar Gem Catch

A fast-paced, **minimal arcade lane-runner quiz** that teaches English **possessive determiners**
(my / your / his / her / its / our / their). Built with plain **HTML + Tailwind CSS + Vanilla JavaScript** —
no build step, no framework, no asset files. Visual identity: dark charcoal (`#171918`), a single
lime accent (`#C5F36B`), Space Grotesk + Inter type.

Catch the gem that agrees with the sentence's owner. Catch it **high** for more points,
chain combos, and light up **FEVER** for double score.

A **welcome page** introduces the game before you start — how to play, the controls,
and every scoring rule — and the game-over screen's **HOME** button returns to it.

**Get one wrong?** — whether you grab the wrong gem or let the right one fall, the game
pauses on a small card at the bottom showing the completed sentence with the correct
answer highlighted and a short explanation. Tap **GOT IT** (or `Enter`/`Space`) to
continue, or let the 5-second countdown resume it for you. On your last life the card
still appears — the game-over screen only shows after you've seen the answer.

---

## ▶️ Run it

ES modules can't load from `file://` (browser CORS), so the game needs a tiny local server.
Any of these work — pick one:

```bash
# Option A · Node
npx serve .

# Option B · Python
python -m http.server 8000

# Option C · VS Code
#   Install "Live Server", right-click index.html → "Open with Live Server"
```

Then open the URL the command prints (e.g. `http://localhost:3000`).

> If you open `index.html` directly from disk, the menu shows a reminder banner
> explaining why the game can't start.

---

## 🎮 Controls

| Input | Action |
|---|---|
| `1` `2` `3` `4` | Select **and** grab that lane instantly |
| `←` `→` | Slide the robot between lanes |
| `Space` | Claim the gem in the robot's lane |
| **Tap / click a lane** | Select + grab (touch, mouse, pen — one `pointerdown` handler) |
| **Tap the robot** | Fire its laser — grabs the gem in its current lane |
| `P` / `Esc` | Pause / resume |
| `Enter` / `Space` | Start / retry from menus |

---

## 🕹️ Rules & scoring

- **Speed bonus** — the higher you catch the correct gem, the more it pays:
  - top 40% of the lane → **×2.0** (`PERFECT`)
  - 40–70% → **×1.5** (`GREAT`)
  - 70–100% → **×1.0** (`OK`)
- **Combo** — every 4 correct answers raises the multiplier (×1 → ×5).
  A wrong pick or a missed gem resets it.
- **FEVER** — 8 correct answers fill the bar → **double points for 8 seconds**.
- **Lives** — 3 hearts. Wrong pick **or** letting the correct gem hit the bottom costs one.
- **Levels** — every 8 correct answers: **+1 life** (capped at 3), faster gems, wider pronoun pool.
  From **Level 3** the quiz adds `his`, `her`, `its`.
- Best score is saved in `localStorage`.

---

## 📁 Project structure

```
index.html          Markup, Tailwind CDN, charcoal/lime design system, overlays, file:// notice
PLAN.md             Full build plan (all 6 phases, with verification notes)
src/
  main.js           Entry point — wires every module through the event bus
  config.js         Every tunable constant (speed, scoring, timing)
  state.js          Single source of truth + event bus + reducers
  questions.js      66 questions with owner / answer / level / hint
  spawner.js        Builds waves: 1 correct + 3 unique, repeat-safe
  engine.js         rAF loop, gem physics, wave lifecycle, resolution
  input.js          Keyboard + pointer → normalized bus events
  ui.js             HUD, prompt, overlays, FX (flash/shake/popup/fever)
  audio.js          Procedural WebAudio SFX (zero audio files)
```

**Data flow:** `input → bus → actions → state → bus → ui`, with `engine` owning the loop.
Only `state.js` mutates state; `ui.js` only reads and paints.

---

## 🧪 Testing hooks

The debug handle is exposed on `window.__ggc`:

```js
__ggc.state                 // full game state
__ggc.step(7)               // advance the sim N seconds deterministically
                             // (bypasses rAF — works in throttled/background tabs)
__ggc.audio.isMuted()       // mute state
__ggc.audio.playSfx('perfect')
```

Deterministic checks that ship with the build:

- all 66 questions pass owner→determiner agreement (no ambiguous answers)
- 150 generated waves: exactly 1 correct, 4 unique options, answer never offered as a distractor
- 150-wave soak: DOM nodes return to baseline, no stray FX nodes, no heap growth

---

## 📱 Support

Chrome / Edge / Firefox / Safari (recent versions). Responsive from **320px** phones to
desktop, landscape-phone compact mode, safe-area aware, honours `prefers-reduced-motion`,
screen-reader announcements via `aria-live`.
