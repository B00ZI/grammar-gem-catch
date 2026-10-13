# Grammar Gem Catch — Full Game & UI Description
*(a design brief for finding a new visual direction — nothing has been changed in the game)*

---

## 1. THE GAME

**What it is:** A fast-paced, neon-arcade **4-lane falling-catcher quiz** that teaches English
**possessive determiners** (my / your / his / her / its / our / their) to kids and English
learners. Think *Frogger lanes* meets *Guitar Hero notes* meets a grammar drill — you catch
the word that completes a sentence.

**Core loop (≈5–7 seconds per round):**
1. A sentence appears at the top with a glowing blank, plus an **Owner badge** (e.g. "Owner: they")
2. Four hexagonal **gems** fall down four lanes — one correct determiner + three distractors
3. The player grabs the correct gem (keys `1–4`, `←→`+`SPACE`, lane tap, or tapping the robot)
4. Instant feedback → score pops up → next sentence
5. Every 8 correct: **LEVEL UP** (faster gems, +1 life, and Level 3 unlocks his/her/its)

**Systems:**
- **Speed bonus** — catching high pays more: top 40% of lane = ×2 (PERFECT), 40–70% = ×1.5 (GREAT), else ×1
- **Combo** — every 4 correct in a row = +1× multiplier (up to ×5); wrong/miss resets it
- **FEVER** — 8 correct fills a bar → ×2 score for 8 seconds, with a screen-wide flash
- **Lives** — 3 hearts; wrong pick or missed gem costs one
- **Teaching card** — every wrong answer (wrong pick OR miss, even the fatal one) pauses the
  game on a small card at the bottom showing the *completed sentence* with the answer
  glowing, plus a one-line rule ("'they' → 'their'"). `GOT IT` button or a 5-second
  countdown auto-resumes.
- **Best score** saved in localStorage; mute toggle; pause (P/Esc/tab-switch); full
  keyboard/screen-reader/touch support; responsive 320px → desktop

**Robot character:** a small SVG robot (violet body, teal eyes, pink antenna/feet) stands at
the bottom of the **active lane** and slides between lanes. Clicking/tapping it fires a
violet→cyan **laser beam** up the lane and grabs the gem (same as SPACE). Every claim from
any input fires the laser.

**Screens/flow:** Welcome → Play ⇄ Pause / Level-up flash / Teaching card → Game Over
(RETRY or HOME back to Welcome).

---

## 2. CURRENT VISUAL IDENTITY

**Vibe:** dark **cyber-arcade** — a starry night sky, glass-morphism panels, neon glows,
pixel-font headlines. Cool-toned overall (slate/violet) with hot-pink and yellow accents.

**Color palette (exact):**
| Role | Color |
|---|---|
| Background base | deep slate `#020617` → purple gradient, plus tiny canvas "star dots" |
| Panels/glass | `rgba(255,255,255,.03–.09)` with `backdrop-filter: blur` |
| Primary accent | hot pink `#f472b6` / `#f0abfc` (fuchsia) — active lane, headings, borders |
| Secondary | violet `#a78bfa` (robot, lane 2 gem, glows) |
| Gem colors (by lane) | pink `#f472b6`, violet `#a78bfa`, yellow `#fde047`, teal `#2dd4bf` |
| Danger | rose `#fb7185` (wrong flash, hearts, game over) |
| Success | green `#4ade80` (correct flash, score popups) |
| FEVER | yellow→orange→pink gradient `#fde047 → #fb923c → #f472b6` |
| Laser | violet→cyan `#a78bfa → #67e8f9` |

**Typography:**
- **Headings/HUD/buttons:** "Press Start 2P" — chunky 8-bit pixel font (tiny sizes, .5–.8rem)
- **Body/sentences/gems:** Inter (400–800), rounded friendly sans; gems use Inter 800 white

**Effect vocabulary:** neon `box-shadow`/`drop-shadow` glows everywhere, glass cards with
blur, thin `rgba(255,255,255,.1)` borders, rounded-2xl/3xl corners, gradient fills,
screen-flash overlays, a shake on wrong, scale-pop on gems.

---

## 3. CURRENT UI — SCREEN BY SCREEN

### A. Welcome / Home (full-screen overlay)
Dark translucent panel over everything, vertically stacked, centered:
- Title **"GRAMMAR GEM CATCH"** in pink pixel font with big neon glow
- Subtitle sentence; row of **pronoun chips** — my/your/our/their lit (pink-violet gradient
  pills), his/her/its dimmed/locked with a 🔒 note "unlock from Level 3"
- Three frosted-glass cards: **HOW TO PLAY** (3 numbered steps), **CONTROLS** (keycap-style
  `<kbd>` chips + "👆 tap a lane"), **SCORING** (small grid of rule cards: HIGH CATCH,
  COMBO, FEVER, LIVES, LEVEL UP — each with a colored bold heading)
- Big pink **START** button + tiny pixel "BEST 000000"

### B. Top bar (HUD)
A row of small rounded **glass chips** in pixel font: `SCORE 000000` · `LEVEL n` ·
`COMBO ×n` · 3 pink **heart glyphs** (gray + shrink when lost) · pause 🔘 and mute 🔊 buttons.

### C. Prompt bar
Centered pill: `Owner:` badge (pink gradient pill, lowercase owner word) + the sentence in
Inter semibold white, with the blank shown as a **pulsing yellow rounded box with "?"**.

### D. Play area (the stage)
A rounded, clipped glass rectangle split into **4 equal vertical lanes**:
- Lanes are subtle white-gradient glass with 1px dividers; inactive lane numbers (1–4) in
  dim pixel font at the top; the **active lane** glows pink with an inner shadow
- **Gems** are flat **hexagons** (CSS clip-path) with a dark inner core, colored neon border
  glow (per-lane color), and a bold white word inside with matching text-glow
- The **robot** (64px SVG) bobs at the bottom of the active lane; a click fires the laser beam

### E. FEVER bar
Thin full-width bar under the prompt: dark track, gradient fill (yellow→orange→pink),
pixel label; pulses brighter while FEVER is active.

### F. Floating feedback
- Green full-lane flash (correct) / red flash + whole-stage shake (wrong)
- Pixel-font score popups (`+300`, `PERFECT!`, `WRONG!`, `TOO LATE!`) rise and fade above
  the gem's lane
- FEVER activation = full-screen radial yellow-pink flash
- Gems: scale-in entrance, "pop" explosion on claim (grayed red pop for wrong), fade-out at bottom

### G. Teaching card (miss/wrong feedback)
Small amber-bordered glass card pinned to the bottom of the play area:
- Tiny amber pixel label ("MISSED — NOW YOU KNOW" / "NOT QUITE — NOW YOU KNOW")
- The sentence completed with the answer in glowing fuchsia bold
- One-line rule explanation in lavender
- Right side: countdown number + amber **GOT IT** button (44px touch target)
- A 3px yellow→pink gradient bar drains across the top over 5 seconds

### H–J. Overlays
- **Pause:** dark blur + "PAUSED" + RESUME button
- **Level-up:** dark blur + huge pink pixel "LEVEL n" for 1.4s, auto-dismiss
- **Game over:** dark blur + rose glowing "GAME OVER", pixel SCORE/LEVEL/BEST lines,
  RETRY (pink) + HOME (violet) buttons

### K. Footer legend
One tiny line of gray pixel hints (`1–4 grab · ←→ move · SPACE claim · P pause`; on mobile:
"TAP A LANE TO GRAB 👆").

### L. Background
Full-viewport `<canvas>` starfield — slow-drifting tiny white/purple dots at random
opacity/pulse behind everything.

---

## 4. LAYOUT & RESPONSIVENITY
Vertical stack: **HUD → prompt → FEVER bar → play area (flex-grow) → footer**, all inside a
`100dvh` app shell, max-width 5xl, safe-area aware. Play area height is fluid; fall speed is
normalized so the reading time (7s) is identical on phones and desktops. Short landscape
phones get compact chrome + smaller robot; everything is tap-first on touch.

## 5. MOTION & AUDIO
Motion: bob (robot), lane slide (160ms spring-ish cubic-bezier), gem scale-in/pop/fade,
laser beam (280ms scaleY + recoil), rising score popups, lane flashes, stage shake, fever
pulse/flash, draining hint bar — all disabled/flattened under `prefers-reduced-motion`.
Audio: fully **procedural WebAudio** (no files) — move/claim blips, laser zap, correct
chime, perfect arpeggio, wrong/miss descending saw, level-up fanfare, fever riser, game-over
dirge. Mute persists.

## 6. CURRENT-DESIGN NOTES (for reference hunting)
The current look is the **classic "AI-generated neon cyber arcade"** recipe:
dark slate + starfield, Press Start 2P pixel font, glassmorphism cards, pink/violet neon
glows, hexagon clip-path gems. It's cohesive and readable, but generic — every element says
"neon arcade template." Search directions that would fit the game's structure while giving it
a unique personality: **synthwave/retrowave**, **bubblegum candy / kawaii cute**, **arcade
pinball**, **Y2K chrome/bling**, **cassette-futurism**, **crystal/gemstone mineralogy**,
**neobrutalist sticker**, **vector cartoon Saturday-morning**, or a **mascot-led** theme
(the robot could evolve into a full character). Any direction must keep: 4 clear lanes,
large readable words, strong correct/wrong feedback, kid-friendly tone, and mobile-first scale.
