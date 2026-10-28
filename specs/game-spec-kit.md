> **Use in the creation engine:** This kit supplies optional techniques. `game_framework.md` controls the knowledge/design agent→game builder handoff. Do not force every game into pixel art, one file, combat, fixed content quantities or a familiar reference. Apply only the selected game's systems and state exclusions with reasons. Games must be visually game-first; accessible semantic controls may accompany the canvas. Portfolio additions must have distinct decisions and educational responsibilities. All assets/voices are build-time artifacts, all runtime difficulty/progress is deterministic, and classroom systems are excluded.

# THE "GAME, NOT A WEBSITE" SPEC KIT
### A fill-in-the-blank design bible for vibe-coding games with AI

---

## HOW TO USE THIS KIT

**Three modes**
1. **Quick:** copy the Lite Template (Part 2), fill the blanks, paste.
2. **Full:** copy the Master Template (Part 1), fill what you care about, and **delete** sections you don't. Blank sections invite the AI to improvise; deleted sections don't.
3. **Staged:** paste one section at a time following the Build Order (Part 12). This gives the best results for big games.

**Golden rules**
- **Reference + specific trait + a number.** "Like Celeste" is weak. "Celeste's coyote time (6 frames), jump buffering (5 frames), and corner correction (4px)" is strong.
- **Every feel word needs a number.** "Snappy" means nothing. "Reach max run speed in 6 frames, stop in 4" means something.
- **Few references, deep.** 3 to 5 references per category. Contradictory references (Cuphead + Game Boy 4-color) fight each other.
- **Ban the web explicitly.** AI defaults to cards, buttons, and layouts. Part 1 §00 and §25 handle this.
- **Telegraph, don't tell.** Spec how the game *teaches*, not just what it contains.
- **Ask for tuning tools.** Make the AI expose every constant in a live-tweak panel so you tune by playing, not by re-prompting.
- **End with a definition of done.** The AI checks its own work against it.

---

# PART 1 — MASTER TEMPLATE
*Copy everything inside the block. Replace each `[[ ... ]]`. Options are separated by `|`. Delete what you don't need.*

```text
# GAME SPEC: [[WORKING TITLE]]

## 00 · ROLE AND PRIME DIRECTIVE
You are a veteran game programmer, game designer, and technical artist.
You are NOT a web developer. Build a GAME, not a website, app, dashboard,
landing page, or "demo."
- The entire experience renders on ONE fullscreen <canvas>. No DOM elements
  for gameplay, HUD, menus, or text.
- When a decision is ambiguous, do what a shipped indie game would do, not
  what a web page would do.
- Make all unspecified design decisions yourself. Do not ask me questions.
  Record every assumption in a comment block at the top of the file.
- Prioritize FEEL and READABILITY over feature count. A small game that feels
  incredible beats a big game that feels dead.
- Every input must produce visible, audible, and kinetic feedback within
  1-3 frames.

## 01 · PITCH
Hook (one sentence): [["A ___ where you ___ in order to ___, but ___."]]
Genre blend: [[primary genre]] + [[secondary genre]]
"X meets Y with a twist": [[ ]]
Session length target: [[3 min | 10 min | 30 min]]
Run/level length: [[ ]]
Player type: [[casual | hardcore | kids | speedrunner | completionist]]
Input: [[keyboard | gamepad | touch | all three]]

## 02 · DESIGN PILLARS
Max 4. Every feature must serve a pillar or be cut.
1. [[e.g., "Movement is the reward"]]
2. [[e.g., "Every death teaches something"]]
3. [[e.g., "The world reacts to you"]]
4. [[ ]]
ANTI-PILLARS (what this game is NOT):
[[no grinding | no text walls | no punishing resets | no menus-as-gameplay]]

## 03 · EMOTIONAL TARGET
Primary feeling: [[cozy | tense | frantic | triumphant | eerie | whimsical |
  melancholy | mischievous | power fantasy | zen | absurd | cerebral]]
Feeling reference games: [[ ]]
The moment players will describe to a friend: [[ ]]
Rank these kinds of fun (LeBlanc's 8): sensation, fantasy, narrative,
challenge, fellowship, discovery, expression, submission -> [[ranked list]]

## 04 · VERBS AND LOOPS
Core verbs (3-5; each must feel good in isolation): [[ ]]
For each verb specify: input, instant feedback (visual + audio + motion),
cost or risk, and what it can interact with.
LOOPS:
- 1-second loop (moment to moment): [[ ]]
- 10-30 second loop (one encounter or obstacle): [[ ]]
- 2-5 minute loop (room / level / wave): [[ ]]
- Session loop: [[ ]]
- Meta loop (across sessions/runs): [[ ]]
Interesting-decision test (Sid Meier): at any moment the player is choosing
between [[ A ]] and [[ B ]], and neither is obviously correct.
Skill atoms (Daniel Cook): list each skill the player learns, in order, and
what feedback confirms they've learned it: [[ ]]

## 05 · REFERENCE MAP
For each reference, name the EXACT trait to borrow and what NOT to copy.
| Reference | Trait to steal | Applies to | Do NOT copy |
|---|---|---|---|
| [[Celeste]] | [[coyote time, jump buffer, dash freeze frames]] | [[movement]] | [[story, assist menu]] |
| [[Spelunky]] | [[systemic interactions; levels from hand-made chunks]] | [[level gen]] | [[ ]] |
| [[Hades]] | [[boon choice, death-as-progress]] | [[progression]] | [[ ]] |
| [[Will Wright games]] | [[possibility space, overlays, simple agents]] | [[systems]] | [[ ]] |
| [[CalArts animation]] | [[flat shapes, shape language, limited palette]] | [[art]] | [[ ]] |

## 06 · CONTROLS AND INPUT
Keyboard: [[arrows/WASD + Z/X/C or J/K/L, Space, Enter, Esc]]
Gamepad: [[standard mapping; left stick + d-pad; A/B/X/Y; deadzone 0.2]]
Touch: [[floating left stick, 2 large right buttons, 64px minimum hit area]]
Action-mapped input layer (never read raw keys in game logic).
Input buffering: [[5 frames for jump | attack | dash]]
Coyote time: [[6 frames]]
Corner correction: [[4px nudge on ceiling/ledge clips]]
Variable jump height: [[release early = cut velocity by 50%]]
Acceleration: [[0 to max in 6 frames]]; Deceleration: [[max to 0 in 4 frames]]
Air control: [[80% of ground]]; Turn-around skid: [[yes/no]]
Input latency budget: process input at start of fixed update; no
event-driven state changes mid-frame.
Controls must be discoverable without text (see §10).

## 07 · MOVEMENT AND PHYSICS
Design jumps from desired feel, not guessed constants:
  apex height H = [[48 px]], time to apex T = [[0.35 s]]
  gravity = 2H/T^2, jump velocity = 2H/T
Fall gravity multiplier: [[1.6x]] (snappier falls than rises)
Apex hang (reduced gravity near apex): [[yes, 50% gravity when |vy| < 40]]
Terminal velocity: [[ ]]
Run speed: [[ ]] px/s; Dash: [[speed, duration, cooldown, freeze frames]]
Collision: tile-based swept AABB; resolve X then Y; no tunneling;
  one-way platforms; slopes: [[none | 45 deg]]; moving platforms carry riders.
World scale: [[tile = 16 px]], player = [[1 x 1.5 tiles]]
Physics timestep: fixed [[60 Hz]] with accumulator; render interpolated.
Determinism: seeded RNG ([[mulberry32]]) so runs are reproducible/debuggable.

## 08 · GAME FEEL BUDGET ("JUICE")
Follow Swink's Game Feel and Vlambeer's "Art of Screenshake."
- Hitstop: light [[3]] frames, heavy [[8]], kill [[12]]
- Screenshake: trauma-based (shake = trauma^2 with noise), max [[6 px]],
  decay [[0.9/frame]]; direction biased opposite the impact
- Squash and stretch: land [[1.3x wide, 0.7x tall, recover 0.12 s]];
  jump [[0.8x wide, 1.25x tall]]
- Anticipation and follow-through on every action
- Easing on ALL motion: [[easeOutBack | easeOutElastic | spring]]; no linear
- Particles: dust on run start/land/skid, hit sparks, trails, debris
- Flash frames: [[1-2 frame white flash on hit]]
- Time dilation: [[slow-mo 0.3x for 200 ms on final blow / perfect parry]]
- Zoom punch: [[+3% camera zoom, ease back over 150 ms]]
- Pitch-randomized SFX on every action
- Idle animation and reactive world (grass sways, water ripples,
  background critters scatter)
- Juice must be tied to a SETTINGS toggle (reduce shake/flash for comfort).

## 09 · CAMERA
Type: [[fixed screen (Zelda/Celeste) | follow | room-transition | free]]
Smoothing: [[lerp 0.1/frame]] with look-ahead [[40 px in facing direction]]
Deadzone: [[ ]]; vertical bias: [[look down while falling]]
Camera kick on impacts; camera clamps to level bounds
Room transitions: [[scroll slide (Zelda) | cut | iris wipe]]
Pixel-perfect: [[snap camera to integer pixels in render]]

## 10 · TEACHING AND DISCOVERABILITY
NO tutorial popups, NO text walls, NO modal instructions.
Teach with level design (Mario 1-1, Portal, Braid, Celeste):
- TEACH: introduce each mechanic in a SAFE space (no punishment).
- TEST: require the mechanic under mild pressure.
- TWIST: recombine or subvert it. (Use kishotenketsu: intro, develop,
  twist, conclude.)
Mechanics to teach, in order: [[ ]]
Teaching spaces: [[ ]]
Affordances and signifiers (Don Norman): interactables have a consistent
  visual language, e.g. [[gold = reward | red = hazard | pulse = interactable
  | cracked = destructible]]; NO hover states. Use shimmer, outline pulse,
  idle bounce, sound.
Wayfinding: visual lures (landmarks seen from afar, "weenies"), leading
  lines, light, color, motion, breadcrumbs (coins that form paths).
Secrets: three tiers: [[obvious hint | subtle hint | community-level
  obscure]]; each secret gives a REAL reward; each is foreshadowed.
Rule of three: show it, then reuse it, then twist it.
Failure must be informative: the player always sees WHY they died
  (replay flash, killer highlighted).
Input prompts shown contextually in-world as icons (keycap glyph sprites),
  appearing only when needed and fading once learned.

## 11 · SYSTEMS AND EMERGENCE
(Will Wright / BotW / Spelunky / Noita / Dwarf Fortress philosophy)
Systemic elements and their properties: [[ fire: spreads, burns wood, lit
  by lightning | water: extinguishes fire, conducts electricity | wind:
  moves smoke, fire, gliders ]]
Interaction matrix: build an element x element table and implement each
  non-empty cell. Rule of multiplicative chemistry: N elements -> N^2 effects.
Possibility space: the player can attempt [[ ]] that I did not script.
Simple agents with needs (Sims-style motives), if any: [[ ]]
Overlay/legibility: simulation state is VISIBLE through [[heat overlay |
  data layers | color tint | particles]].
Failure is entertaining (Sims pool ladder, Dwarf Fortress "losing is fun").
Emergent story hooks: events that give agents/entities names, histories,
  and consequences: [[ ]]
Dominant-strategy check: list any strategy that always wins, and nerf it.

## 12 · ENEMIES, HAZARDS, AND AI
Roster (each has ONE clear verb and ONE clear counter): [[ ]]
Distinct behaviors, Pac-Man style: each enemy type has a different
  targeting rule so players learn individual "personalities."
Telegraphing: windup [[12 frames minimum]], color flash, audio cue; attacks
  always readable BEFORE they hit.
Fairness rules:
- No unavoidable damage. No off-screen kills without a warning.
- Hurt i-frames [[60 frames]] with flicker; knockback is short and readable.
- Death is explainable. Respawn in under [[1 s]]. Checkpoint before every
  major challenge.
Enemy states: idle, notice, chase, attack, recover (vulnerable), stunned, die.
Enemy "recover" windows are the player's reward for reading the telegraph.
Boss: [[phases, patterns, vulnerability windows, arena hazards]]
Enemy density cap and spawn director (Left 4 Dead style): spawns respond to
  player stress [[ ]]

## 13 · CHALLENGE AND DIFFICULTY
Primary difficulty type: [[execution | knowledge | decision | resource |
  time]] (pick ONE as primary; secondary types stay light)
Target flow channel: challenge ramps slightly faster than player skill.
Difficulty shape: SAWTOOTH. Spike -> breather -> higher spike. Never a flat
  ramp, never a cliff.
Difficulty knobs available to the director: [[enemy speed | count | telegraph
  time | damage | healing drops | checkpoint spacing | timer | info load]]
Risk/reward: optional danger always has an optional, visible reward.
Near-miss feedback: graze sparks, slow-motion flick, sound "whoosh."
Restarts: instant (under 1 second), no loading, no confirmation dialogs.
Dynamic difficulty (hidden, Resident Evil 4 / Crash Bandicoot style): after
  [[3]] deaths in the same spot, quietly [[add a checkpoint | slow hazards
  by 10% | add a health drop]]. Never tell the player.
Assist options (Celeste model): [[game speed | infinite stamina | extra hp |
  invincibility]]; framed as support, not shame.
Difficulty modes (if any): [[ ]]
Mastery layer: [[speedrun timer | no-hit | collectibles | par scores]]

## 14 · LEVEL / WORLD STRUCTURE
Structure: [[linear | hub + spokes | metroidvania interconnected | procedural
  rooms | open sandbox]]
Spatial design (Kevin Lynch): paths, edges, districts, nodes, landmarks.
Gating: [[ability-gated (lock/key graph) | knowledge-gated (Outer Wilds) |
  skill-gated]]
Draw the lock-and-key graph before building: [[ ]]
Shortcuts that loop back to checkpoints (Dark Souls)
Level pacing: calm -> build -> peak -> release
Procedural generation (if any): hand-authored chunks assembled with a
  guaranteed solvable critical path (Spelunky's 4x4 room grid method).
Seeded; validate with a solver or flood fill; reject unwinnable seeds.
Number of levels/rooms/zones: [[ ]]
Biomes/zones: [[name, palette, hazard, music layer, signature mechanic]]

## 15 · PROGRESSION AND ECONOMY
Progression type: [[skill-only | ability unlocks | build crafting |
  meta-progression | none]]
Reward schedule: variable-ratio drops, with pity timer after [[ ]] misses.
Power curve: [[Vampire Survivors-style exponential | Mario-style flat |
  Souls-style ramp]]
Choices: present 3 options (Slay the Spire / Hades / Vampire Survivors);
  synergies between choices that players can DISCOVER.
Currencies and sinks: [[ ]]
Meta unlocks (roguelites): [[ ]]; each unlock adds options, not just power.
Goal gradient: progress bars accelerate visually near completion.
Peak-end rule: end sessions and runs on a high note.
NO fake urgency, NO manipulative timers, NO dark patterns.

## 16 · VISUAL STYLE
Style statement (one line): [[ e.g., "CalArts flat-vector meets Game Boy
  4-tone, as if Samurai Jack were a 1993 handheld game." ]]
Internal resolution: [[320x180]] scaled with integer factor and
  nearest-neighbor; letterbox, never stretch.
Palette: [[N]] colors, with exact hex: [[ ]]
  (Pico-8 16 | Game Boy 4 | NES | Sweetie 16 | Resurrect 64 | custom)
Shape language: circle = friendly/safe, square = stable/solid,
  triangle = dangerous/active. Apply to characters, hazards, pickups.
Silhouette test: every entity is identifiable in solid black.
Value structure: [[3-5]] values; foreground contrasts background.
60-30-10 color rule: 60% dominant, 30% secondary, 10% accent
  (accent = interactables and danger).
Hue-shifted shading: shadows shift toward [[blue/purple]], highlights toward
  [[yellow/orange]]; no pure black, no pure white.
Outlines: [[none | selective outline (sel-out) | 1 px dark | thick-thin line
  variation (CalArts)]]
Texture: [[flat | dithered (Bayer 4x4) | painterly | halftone | paper grain]]
Lighting: [[none | baked gradient | 2D normal-lit | cel bands]]
Parallax: [[3-5]] layers, atmospheric perspective (distant = lighter,
  lower contrast, cooler).
Color script: per-area palette shifts tied to emotional arc.
Art direction references (trait, not just name): [[ ]]

## 17 · ANIMATION
Frame rate: animate "on twos" (12 fps feel) for charm or full 60 for fluidity:
  [[ ]]
Spritesheet-style animation with per-frame durations.
Every character: idle (with personality), run, jump rise, apex, fall, land,
  hurt, die, interact, special.
Use the 12 principles of animation: squash/stretch, anticipation, staging,
  straight-ahead/pose-to-pose, follow-through/overlap, slow in/out, arcs,
  secondary action, timing, exaggeration, solid drawing, appeal.
Smear frames on fast motion; hold key poses (Genndy Tartakovsky staging).
Impact frames (1 frame of stark black/white/inverted) on big hits.
Procedural secondary motion: scarf/hair/tail via spring-damper chains.
Sprites are authored IN CODE as palette-indexed arrays or strings
  (no external image files).

## 18 · VFX
Dust, sparks, smoke, debris, trails, glow, ripples, floating numbers.
Screen effects: [[vignette | chromatic aberration pulse | CRT scanlines |
  bloom | palette flash | screen wipe]]. Subtle by default, always
  toggleable.
Pooled particles with max cap [[ ]]; particles have lifetime, easing,
  gravity, and color-over-life.
Photosensitivity safety: no more than 3 flashes per second; flash intensity
  cap; reduced-motion toggle.

## 19 · UI, HUD, MENUS, FLOW
ALL UI is drawn on the canvas with a bitmap pixel font. No DOM, no CSS.
HUD: minimal; show only what decisions need: [[ ]]
Diegetic where possible (health on the character, ammo on the weapon).
Game flow: boot -> title with ATTRACT MODE (demo plays itself, "PRESS START"
  blinks) -> game -> death -> instant retry or summary -> results.
Menus are navigated with a cursor SPRITE and focus highlight; every move
  makes a sound; works with keyboard, gamepad, and touch; NO hover states.
Transitions: [[iris wipe (Looney Tunes) | pixel dissolve | screen slide |
  shatter]]
Arcade flavor (optional): 3-letter initials high-score table, score popups,
  combo meter, "CONTINUE? 9..8..7" countdown.
Pause: freezes sim, dims, offers resume/settings/quit; auto-pause on blur.
Settings: volume sliders (SFX, music), screenshake, flash, key remap,
  colorblind palette, text speed, assist options.
First-minute rules: something moves in 1 s, player has control in 3 s,
  first win by 30 s, first fail is gentle, first surprise by 60 s, first
  discovery by 3 min.

## 20 · SOUND EFFECTS
Synthesize with WebAudio (no external files): square/pulse (12.5/25/50%
  duty), triangle, noise, sweeps, bitcrush, ADSR envelopes.
Every action and state change has a sound. Pitch randomized +-[[8%]] and
  round-robin variants so no two repeats are identical.
Layered impacts: transient click + body + tail.
Audio feedback hierarchy: danger > player action > reward > ambience.
Sidechain ducking: music dips [[6 dB]] on big SFX.
Spatial: pan and attenuate by distance from camera.
Silence is a tool: drop music before a boss/reveal.
Unlock audio on first user gesture; master volume + mute (M).
Footsteps vary by surface; UI sounds have their own character.

## 21 · MUSIC
Procedural/sequenced chiptune or synth in-engine: [[genre/mood reference]].
Tempo [[ ]] BPM; key/scale [[A minor pentatonic | Dorian | Lydian | major]];
  progression [[i-VI-III-VII | I-V-vi-IV | custom]]
Vertical layering (Hades / Journey): base loop + added stems with intensity
  (bass -> arp -> drums -> lead), driven by game state.
Horizontal resequencing: transitions on bar lines.
Leitmotif per character/zone; stingers for events (secret found, level up).
Combat/exploration states crossfade over [[2 bars]].
Music reacts to health/danger/pace.

## 22 · WORLD, TONE, AND NARRATIVE
Setting: [[ ]]; tone: [[ ]]; humor/poetry level: [[ ]]
Environmental storytelling (Dark Souls / Gone Home): tell story via set
  dressing, enemy placement, and what's missing.
Text rules: minimal; max [[12]] words per line; typed dialogue with per-
  character blip sounds (Undertale/Animal Crossing); skippable.
Characters: each is readable from silhouette + one signature behavior.
Lore delivery: [[item descriptions | murals | NPC fragments | ship log]]
Ludonarrative harmony: story themes match mechanics.

## 23 · TECH ARCHITECTURE
- Single HTML file; zero external assets; everything procedural; vanilla JS
  ([[or specify framework]]).
- Fixed timestep (60 Hz) with accumulator and render interpolation.
- Low-res offscreen canvas, integer upscale, imageSmoothingEnabled = false,
  handle devicePixelRatio, letterbox resize.
- Scenes (boot, title, play, pause, gameover) as a state stack.
- Entities with state machines (idle/run/jump/hurt); components over deep
  inheritance; object pools for bullets/particles/enemies.
- Spatial hash for collision queries if entities > [[200]].
- Tilemaps with chunked rendering; swept AABB.
- Action-mapped input with Gamepad API polling; deadzones.
- Seeded RNG; deterministic sim; save data in try/catch storage with
  in-memory fallback.
- Bitmap font embedded as data; sprite data as palette-index strings.
- Clean file layout inside the single file: CONFIG (all tunables) | INPUT |
  AUDIO | RENDER | ENTITIES | SYSTEMS | SCENES | MAIN.
- All gameplay constants live in one CONFIG object.

## 24 · PLATFORM, ACCESSIBILITY, PERFORMANCE
Lock the page: no scrolling, no pull-to-refresh, no pinch zoom, no text
  selection, no context menu, touch-action: none.
Fullscreen button inside the canvas UI. Pause on tab blur.
Performance target: 60 fps on a mid-range phone; no per-frame allocations in
  hot loops; cap particles; batch draws.
Accessibility: remappable controls, hold/toggle options, colorblind-safe
  palette option (shape + color coding, never color alone), reduced shake and
  flash, adjustable game speed, large text option, one-handed mode if
  feasible.

## 25 · DEBUG AND TUNING TOOLS
Backtick (`) toggles a TUNING PANEL (drawn on canvas) with live sliders for
  every CONFIG value: gravity, jump height, speeds, hitstop, shake, coyote,
  buffer, enemy speed, spawn rate, difficulty knobs. Include "copy values
  to clipboard" output.
F1 hitboxes/hurtboxes; F2 FPS + entity count; F3 frame-step; F4 slow-mo;
  F5 level skip; F6 god mode; F7 spawn enemy; F8 reseed.
Input display overlay for debugging buffers and coyote windows.

## 26 · NEGATIVE CONSTRAINTS (HARD BANS)
NO: hero sections, cards, navbars, footers, buttons that look clickable,
rounded-rect UI panels, drop shadows on UI, gradient buttons, hover states,
modals, tooltips, paragraphs of explanatory text, "Welcome to...", loading
spinners, emoji-as-art, system fonts, Tailwind-style layouts, CSS
transitions/animations, DOM-based HUD, scrolling pages, linear motion, silent
actions, instant (un-eased) state changes, tutorial popups, a "How to Play"
text screen, identical repeated sounds.

## 27 · DEFINITION OF DONE
Self-check before finishing. The game is done only if:
[ ] It boots to a title screen with attract mode within 2 seconds
[ ] The first verb feels good in an empty room (tested alone)
[ ] Every action has visual + audio + motion feedback
[ ] Mechanics are taught without text
[ ] A player can die, see why, and retry in under 1 second
[ ] Difficulty has a sawtooth shape; first 60 seconds are gentle
[ ] At least [[3]] discoverable secrets with real rewards
[ ] Tuning panel exposes all constants
[ ] Works with keyboard + [[gamepad | touch]]
[ ] Zero DOM UI; zero scrolling; zero hover states
[ ] Stable 60 fps; no console errors
[ ] A header comment lists assumptions and controls

## 28 · DELIVERY INSTRUCTIONS
Build in this order and keep the game playable at each step:
1) one verb in an empty room 2) tune movement via CONFIG 3) one challenge
4) one discovery 5) full loop 6) juice 7) audio 8) art 9) menus/flow
10) balance and polish. Output the complete file. After the code, give me:
(a) a 5-line summary of what you built, (b) the 10 tuning values you
recommend I try changing first, and (c) 5 ideas to extend it.
```

---

# PART 2 — LITE TEMPLATE
*For when you want results in 60 seconds. Fill the blanks and paste.*

```text
Build a GAME (not a website) as a single HTML file on one fullscreen canvas.
No DOM UI, no scrolling, no hover states, no buttons, no cards, no text walls.

HOOK: A [[genre]] where you [[verb]] to [[goal]], but [[twist]].
FEELING: [[cozy | tense | frantic | triumphant | eerie | whimsical]]
VERBS: [[verb 1]], [[verb 2]], [[verb 3]]

REFERENCES (trait only):
- Movement/feel: [[Celeste: 6-frame coyote time, 5-frame jump buffer, dash freeze]]
- Systems: [[Will Wright: possibility space, visible simulation overlays]]
- Teaching: [[Mario 1-1: teach safe, test, twist, no text]]
- Art: [[CalArts flat shapes, 16-color palette, 320x180 pixel-perfect]]
- Audio: [[jsfxr-style synth SFX with pitch variation, layered adaptive music]]

JUICE: hitstop 3-8 frames, trauma screenshake, squash and stretch, particles on
every impact, easing on all motion, pitch-randomized SFX.

CHALLENGE: sawtooth difficulty, telegraphed enemy attacks (12+ frame windup),
instant restart under 1 s, hidden dynamic difficulty after repeated deaths.

DISCOVERY: [[3]] secrets in three tiers (obvious / subtle / obscure), visual
lures, shape-and-color language for hazards vs rewards, zero tutorial text.

FLOW: title with attract mode and blinking PRESS START, then play, then instant
retry. Pixel font drawn on canvas. Pause on blur.

TECH: fixed 60Hz timestep, state-machine entities, swept AABB tilemap, object
pools, all constants in one CONFIG object, backtick toggles a live tuning panel.

Make all unspecified decisions yourself, list assumptions in a header comment,
and give me the 10 CONFIG values to tweak first.
```

---

# PART 3 — THE REFERENCE LIBRARY
*Pick-lists. Mix and match into the template. Each entry names the trait worth borrowing.*

## 3.1 Design theory and the people behind it

**Frameworks**
| Source | Use it for |
|---|---|
| Sid Meier | "A game is a series of interesting decisions." Audit every choice |
| Raph Koster, *A Theory of Fun* | Fun is learning patterns; boredom comes when patterns are mastered |
| Jesse Schell, *Art of Game Design* | 100+ "lenses" as questions; the Elemental Tetrad (mechanics, story, aesthetics, technology) |
| MDA (Hunicke, LeBlanc, Zubek) | Mechanics -> Dynamics -> Aesthetics; design the feeling backward |
| Marc LeBlanc's 8 kinds of fun | Sensation, fantasy, narrative, challenge, fellowship, discovery, expression, submission |
| Csikszentmihalyi, *Flow* | Challenge vs skill channel; clear goals, instant feedback |
| Nolan Bushnell's Law | Easy to learn, difficult to master |
| Self-Determination Theory | Autonomy, competence, relatedness |
| Bartle's player types | Achiever, explorer, socializer, killer |
| Daniel Cook, *Loops and Arcs* | Skill atoms, learning loops, mastery arcs |
| Doug Church | Intention, perceivable consequence, story |
| Don Norman | Affordances, signifiers, feedback, mapping, constraints |
| Steve Swink, *Game Feel* | Input, response, context, polish, metaphor, rules |
| Nicole Lazzaro | Four keys: hard fun, easy fun, serious fun, people fun |

**Designers and their signature ideas**
- **Shigeru Miyamoto:** movement feels good before any level exists; level design teaches
- **Will Wright:** toys not games; possibility spaces; players as designers; simple agents with needs; overlays that make systems legible
- **Sid Meier:** interesting decisions; "fun to discover" systems
- **Hidetaka Miyazaki:** fairness through learnable patterns, item-description lore, shortcut loops
- **Eiji Aonuma / BotW team:** multiplicative chemistry; "if the player thinks it'll work, it works"
- **Jonathan Blow:** each puzzle explores one idea completely; no hand-holding
- **Derek Yu:** systems that let players be clever; handcrafted chunks plus randomness
- **Lucas Pope:** constraint as style (1-bit Obra Dinn); mechanic as theme (Papers, Please)
- **Tarn Adams:** simulation depth; "losing is fun"
- **Toby Fox:** subverting expectations through mechanics
- **Masahiro Sakurai:** visual clarity, readability over realism
- **Eugene Jarvis:** arcade intensity (Robotron, Defender)
- **Ron Gilbert:** no dead ends in adventure design
- **Toru Iwatani:** distinct enemy personalities (Pac-Man's four ghosts)
- **Alexey Pajitnov:** a rule set so tight it never stops generating decisions
- **Chris Sawyer:** simulation legibility and crowd personality (RollerCoaster Tycoon)
- **Eric Barone:** the "one more day" loop

**Schell lenses worth quoting in a prompt:** Surprise, Curiosity, Risk Mitigation, Meaningful Choices, Skill, Flow, Economy, Emergence, Toy, Pleasure, Endogenous Value, Problem Solving, Balance.

## 3.2 Game feel numbers (60 fps frames; adjust to your resolution)

| Effect | Light | Medium | Heavy |
|---|---|---|---|
| Hitstop | 2-4 frames | 5-8 | 9-14 (kill shots) |
| Screenshake (low-res px) | 1-2 | 3-5 | 6-10 |
| Screenshake decay | 0.85/frame | 0.9 | 0.93 |
| Flash | 1 frame | 2 | 3 (white, then fade) |
| Zoom punch | +1% | +3% | +6% |
| Slow-mo | none | 0.5x, 100 ms | 0.2x, 250 ms |
| Knockback | 2 px/frame, 6 frames | 4 px, 8 frames | 6 px, 12 frames |

**Forgiveness mechanics (invisible but critical)**
- Coyote time: 4-8 frames (6 typical)
- Jump buffer: 3-8 frames (5 typical)
- Corner correction: 3-5 px
- Ledge forgiveness: grab if within 4-6 px
- Hurtbox smaller than sprite (about 70-80%); player hitbox for bullets even smaller (bullet hell: 2-4 px)
- Attack-input buffering and cancel windows
- Generous pickup radius with magnet pull
- Hit detection favors the player in ambiguous cases
- Aim assist for touch/gamepad

**Easing menu:** easeOutQuad (general), easeOutBack (pop/overshoot), easeOutElastic (jelly), easeInOutCubic (camera), spring-damper (UI, tails), easeInQuad (accelerating falls)

**Squash and stretch recipes:** land (1.3w x 0.7h, 0.12 s), jump takeoff (0.8w x 1.25h, 0.1 s), dash (1.4w x 0.7h along motion), hit (pulse 1.2x, 0.08 s), collect (pop 1.4x, settle 0.15 s)

**Jump design math:** choose apex height H and time-to-apex T. Gravity g = 2H/T², initial velocity v0 = 2H/T. Example: H = 48 px, T = 0.35 s gives g ≈ 783 px/s² and v0 ≈ 274 px/s. Fall gravity multiplier of 1.5 to 2 gives snappy descent. Cutting velocity to about 40-50% on early release gives variable height.

**Celeste-like reference figures (approximate, at 320x180; verify against your own tuning):** max run about 90 px/s, run acceleration about 1000 px/s², gravity about 900 px/s², jump grace about 0.1 s, dash speed about 240 px/s for 0.15 s with a short freeze on dash start, reduced gravity near the apex.

## 3.3 Challenge, difficulty, fairness

**Five types of difficulty (pick one primary):**
1. **Execution:** timing and precision (Super Meat Boy, Celeste)
2. **Knowledge:** what you know (Outer Wilds, Obra Dinn)
3. **Decision:** strategy (Into the Breach, Civ)
4. **Resource:** scarcity (Resident Evil, FTL)
5. **Time/pressure:** clocks and chaos (Overcooked, Tetris at speed)

**Difficulty knobs you can give to a director:** enemy speed, count, health, damage, telegraph duration, projectile speed, projectile density, spawn rate, healing availability, checkpoint distance, timer length, information shown, resource drop rate, hazard cycle length, aim assist.

**Structure patterns**
- **Teach / Test / Twist** (Mario 1-1, Portal chambers)
- **Kishotenketsu:** intro, development, twist, conclusion (Mario Galaxy, Captain Toad)
- **Sawtooth curve:** spike, relief, higher spike
- **Safe zone, practice zone, exam:** a harmless room, a forgiving room, the real challenge
- **Gauntlet then reward room**
- **Boss as exam:** a boss tests every mechanic taught in the zone
- **Optional mastery:** hard side paths with cosmetic or knowledge rewards

**Fairness checklist**
- Every enemy attack has anticipation
- Every hazard has a distinct visual language
- No unavoidable damage; no pixel-hunting for hitboxes
- Player can always see what killed them
- Deaths feel like the player's fault, never the game's
- Restarts under 1 second; checkpoints precede challenges
- Hurt i-frames are long enough to escape the situation
- Randomness changes the problem but never makes it unsolvable (generation guarantees a path)

**Hidden mercy systems**
- Resident Evil 4 dynamic scaling (adjusts enemies and drops based on performance)
- Crash Bandicoot extra checkpoint and mask after repeated deaths
- Mario Kart catch-up items and rubber banding (use sparingly; players notice)
- Super Mario Bros 3 / classic mercy: fewer attackers when player health is low
- Left 4 Dead AI Director: pacing of stress and relief

**Mastery layers:** speedrun timer and ghost, par scores, no-hit badges, score multipliers for risk, hard-mode remixes, challenge rooms, seeded daily run.

**Assist menu model (Celeste):** game speed slider, infinite stamina/dashes, invincibility, skip chapter. Framed with kindness, and never penalizes the player.

## 3.4 Discoverability, curiosity, and surprise

**Teaching without words**
- Mario 1-1: a safe Goomba, a block that can't be missed, a mushroom that can't be avoided, a pit you can see across
- Braid / The Witness: one idea per level or panel, fully explored
- Portal: introduce a tool, use it in safety, then under pressure, then in combination
- Half-Life 2 / Valve: lighting and architecture as guidance
- Super Metroid: opening sequence teaches every control by obstacle design
- Hollow Knight: a fragile gate seen early that can't be opened until later; memory does the work

**Wayfinding tools:** landmarks (a "weenie" that draws you forward), light and color, leading lines, movement (birds, particles flow toward goals), audio cues, breadcrumbs (coin arcs), framing (doorways that frame destinations), gradient of danger (darker, louder, redder = harder).

**Secret design**
- Three tiers: easy hint, subtle hint, obscure
- Foreshadow: the player should be able to *deduce* the secret from something they've already seen
- Audio tells (hollow-sounding walls), visual tells (cracks, mismatched tiles), behavior tells (NPC stares at a spot)
- Reward must be real (ability, lore, shortcut, cosmetic) and always proportionate
- Systemic secrets (Spelunky, BotW): the player invents the solution
- Secrets that are secrets about the *rules* (Tunic's manual pages, Fez's language)

**Knowledge as progression:** Outer Wilds (nothing is locked except knowledge), Return of the Obra Dinn (deduction with confirmation), Tunic (manual pages), Fez (cipher), Myst-likes, Baba Is You (rules as objects).

**Curiosity engines:** unexplained objects, partial reveals (a door too far away), gaps in the map, NPC rumors, incomplete lists with empty slots, changes to the world after events.

**Surprise and delight:** reactive idles, hidden dialogue, tiny world animals, physics toys, response to unusual inputs (Untitled Goose Game honk), cosmetic easter eggs, "what if I try X?" always answered.

**Rule of consistent visual language (assign these once and never break them):**
| Meaning | Example encoding |
|---|---|
| Hazard | red/orange, spikes/jagged shapes, pulses |
| Reward | gold/yellow, sparkle, bobbing |
| Interactable | brighter outline pulse, idle bounce, small particle |
| Safe | cool blue/green, rounded, still |
| Destructible | cracked, mismatched tile, hollow sound |
| Secret hint | slight misalignment, light leak, draft particles |

**Anti-patterns:** tooltips, "Press X to continue," popup tutorials, hover highlights, unlabeled magic walls, hidden requirements with no hint.

## 3.5 Systems, emergence, and simulation (Will Wright territory)

- **Possibility space:** the set of things the player can try. Widen it with orthogonal verbs and shared rules
- **Toy-first:** a thing that's fun to poke before it has goals (SimCity, Spore creature creator, Katamari)
- **Simple agents with needs:** Sims motives (hunger, comfort, hygiene, energy, fun, social, environment) drive autonomous behavior; players influence, not control
- **Layered simulations:** SimCity's land value + traffic + pollution + crime + power layers interact; expose each as an overlay
- **Positive and negative feedback loops:** snowballing (rich get richer) versus stabilizing (rubber banding). Mix them intentionally
- **Interaction matrix:** list elements (fire, water, wood, oil, electricity, metal, wind, ice, explosive) and fill the matrix of effects
- **Emergent storytelling:** name agents, log memorable events, display them ("Fred set the kitchen on fire")
- **Legibility:** the player must be able to see *why* something happened; icons, overlays, causal replay
- **Scale shifts:** zoom levels with different games (Spore)
- **Player as designer:** let players build levels, machines, cities, creatures
- **Failure as entertainment:** cascading disasters should be funny or dramatic, not just punishing
- **Dominant strategy audit:** if one approach always wins, tune it or add a counter

**Sims-style motive template:** each motive 0-100 decays at its own rate; objects advertise which motives they satisfy and how much; agent picks the action with highest utility weighted by lowest motives plus distance; personalities scale weights.

**Systemic references:** Breath of the Wild (fire/wind/metal), Noita (every pixel simulated), Dwarf Fortress (fluids, temperature, emotion), Spelunky (bombs, water, enemies, items interact), NetHack (everything interacts with everything), Oxygen Not Included (resource networks), Zelda: Tears of the Kingdom (building and fusing), Kerbal Space Program (physics as a toy), Factorio (throughput as puzzle).

## 3.6 Enemy and AI design

- **Pac-Man ghosts:** four different targeting rules (chase, ambush, pincer, shy) create emergent teamwork
- **Space Invaders:** speed rises as enemies die; the player's success raises the challenge
- **Galaga/Gradius:** formation patterns teach rhythm
- **Mario enemies:** each has one verb and one counter (Goomba walks, Koopa shell, Piranha pops)
- **Souls enemies:** wide windups, long recoveries, readable silhouettes, weapon-length reach as the lesson
- **Into the Breach / Slay the Spire:** show enemy *intent* before it happens (perfect information turns difficulty into decisions)
- **Hades:** enemy attack indicators on the floor (red zones)
- **Stealth AI:** vision cones, sound radius, detection meters, states: unaware, suspicious, alert, searching, return-to-post
- **Boss design:** phase changes at HP thresholds, one new idea per phase, vulnerability windows after signature attacks, arena changes
- **Bullet patterns:** aimed, ring, spiral, wall with gaps, sweeping, random-with-guarantee; always a navigable path
- **Swarm AI:** boids (separation, alignment, cohesion); flow fields for large crowds
- **Pathfinding:** A* on tile grids, flow fields for swarms, steering for smoothness (see Red Blob Games)
- **Director AI:** tracks player stress (damage taken, time since last combat, resource count) and spawns accordingly

## 3.7 Level design vocabulary

- **Kevin Lynch's five elements:** paths, edges, districts, nodes, landmarks
- **Gating types:** ability gates (Metroid), key gates (Zelda), knowledge gates (Outer Wilds), skill gates (Celeste B-sides), story gates
- **Metroidvania design:** map the lock-and-key graph first; add shortcuts that loop back; map screen that fills in; fast travel after midgame; sequence-break tolerance
- **Hub and spoke:** Mario 64, Hollow Knight's Dirtmouth, Hades' House
- **Linear with side branches:** Mario, Sonic, Crash
- **Open sandbox:** BotW, Minecraft, Terraria
- **Room-based procedural:** Spelunky 4x4 critical path with templates; Isaac and Hades room-by-room; Dead Cells hand-made chunks with random assembly
- **Pacing:** calm, build, peak, release (see sawtooth)
- **Vertical slice mindset:** build one fully polished level before expanding
- **Greybox first:** blocks only, test the verbs before art
- **Safe checkpoints before every boss, shortcuts after every hard section**
- **Environmental storytelling:** an arrangement of objects tells what happened before the player arrived
- **Silhouette and composition:** guide the eye with shape contrast; place the goal in the "golden" third

## 3.8 Progression, economy, rewards

- **Meta-progression:** Hades (Mirror of Night), Rogue Legacy, Dead Cells
- **Run-based power:** Slay the Spire relics, Isaac items, Vampire Survivors upgrades, Balatro jokers (synergy discovery)
- **Choice presentation:** three options with clear categories (attack/defense/utility) and rarity tiers
- **Variable ratio rewards:** loot drops, chests with weighted tables; pity timer after N misses
- **Exponential power curves:** Vampire Survivors, idle games, Diablo
- **Skill-only progression:** Celeste, Super Meat Boy (you don't get stronger, you get better)
- **Unlock structure:** new options, not just bigger numbers
- **Economy design:** every currency needs sources AND sinks; avoid hoarding with decay or goals
- **Psychological notes:** goal-gradient (progress speeds up near the end), endowed progress (start with partial credit), peak-end rule (end on a high), loss aversion (use ethically), Zeigarnik effect (unfinished tasks pull)
- **Ethics:** no fake timers, no manipulative scarcity, no trick purchases

## 3.9 Visual style library

**Animation-school styles**
- **CalArts:** simplified geometric shapes, big heads, thin limbs, flat color with minimal gradient, graphic backgrounds, strong silhouettes, limited palette (Steven Universe, Gravity Falls, Adventure Time, Clarence)
- **Genndy Tartakovsky:** strong poses, holds, negative space, widescreen composition (Samurai Jack, Primal)
- **UPA / mid-century modern:** flat shapes, abstract backgrounds, limited animation (Gerald McBoing-Boing)
- **Mary Blair / Eyvind Earle:** bold color and simplified landscapes (Disney concept art)
- **Rubber hose / 1930s:** Cuphead, circle limbs, pie eyes, bouncing everything
- **Looney Tunes / Chuck Jones:** hold, smear, snap, extreme poses
- **Studio Ghibli:** painted backgrounds, detailed environments with simple characters, ambient motion
- **Moebius / ligne claire:** clean line, flat color, desert pastels
- **Spider-Verse:** animate on twos, halftone, misregistered color, comic frames
- **Anime impact frames:** inverted frames, speed lines, held smears

**Game art references**
| Game | Look | Trait to borrow |
|---|---|---|
| Hollow Knight | hand-drawn silhouettes | strong foreground/background value split |
| Hades | painterly comic | bold shapes, rich color, outlined characters |
| Wind Waker | cel shading | simplified faces, thick outlines |
| Okami | sumi-e | brush stroke textures and ink outlines |
| Gris | watercolor | color as emotional progression |
| Celeste | clean pixel | readable hair/face, vivid accent colors |
| Into the Breach | bold flat sprites | readability above all |
| Return of the Obra Dinn | 1-bit dithering | texture from pattern, not color |
| Monument Valley | isometric flat | impossible geometry, calm palette |
| Superhot | stark minimal | one red accent color for threat |
| Limbo/Inside | silhouette | fog, depth, tone |
| Alto's Odyssey | gradient minimal | time-of-day palette shifts |
| Mini Metro | clean abstract | color-coded information |
| Katamari | chunky low-poly | exaggerated scale |
| Hotline Miami | neon pixel | saturated palette with glitch |
| Sable | Moebius line | pastel desert |
| Dead Cells | 3D-to-pixel | fluid animation |
| Stardew Valley | cozy pixel | warm seasonal palettes |

**Retro constraints**
- **Pico-8:** 128x128, 16 colors
- **Game Boy:** 160x144, 4 greens
- **NES:** 256x240, 54 colors, 3 colors + transparent per sprite palette, 8 sprites per scanline
- **SNES/Genesis:** 256x224 / 320x224, richer palettes
- **GBA:** 240x160
- **1-bit Mac:** black and white dither
- **Common modern internal resolutions:** 320x180, 384x216, 480x270 (all integer-scale to 1080p)
- **Palettes to name:** Pico-8, Sweetie 16, Endesga 32, Resurrect 64, Apollo, Lospec Gameboy, AAP-64

**Pixel art craft terms:** hue-shifted ramps, selective outlining (sel-out), clusters, dithering (Bayer ordered, Floyd-Steinberg), anti-aliasing manually, banding (avoid), jaggies (avoid), pillow shading (avoid), sub-pixel animation, palette swaps for variety, readable 16x16 silhouettes.

**Color theory for games:** 60-30-10 rule, complementary accent for interactables, saturation hierarchy (saturated for gameplay, desaturated for background), value-first design (check in grayscale), atmospheric perspective for depth, color script per zone, warm/cool contrast for light, never pure black/white.

**3D looks (if using three.js)**
- **Low-poly flat shaded**
- **PS1:** vertex snapping, affine texture warp, low resolution, fog, dithering
- **Toon:** outline via inverted hull, ramp shading, 2-3 bands
- **1-bit dither:** Obra Dinn post-process
- **Isometric orthographic:** Monument Valley, Townscaper
- **Voxel:** Teardown, Minecraft
- **Tilt-shift / diorama:** miniature feel with depth-of-field

## 3.10 Animation and VFX library

**12 principles:** squash and stretch, anticipation, staging, straight-ahead and pose-to-pose, follow-through and overlapping action, slow-in slow-out, arcs, secondary action, timing, exaggeration, solid drawing, appeal.

**Techniques:** animating on twos/threes, smear frames, hold frames, impact frames, spring-damper secondary motion (hair, scarf, tails, antennae), squash on land, anticipation crouch before jump, run cycle with 6-8 frames, idle personality (blink, look around, fidget after 5 s).

**Reference breakdown videos:** Cuphead (hand-drawn cels), Hollow Knight (anticipation and weight), Dead Cells (fluid combat), Celeste (hair physics), Ori (expressive limbs).

**VFX list:** dust puffs (run start, skid, land), hit sparks, slash arcs, impact rings, screen flash, floating damage numbers, trails (dash, projectile), smoke, embers, ripples, glints on pickups, spawn-in effects, death poof, level-up burst, screen vignette on low health, chromatic aberration on big hits, CRT scanlines, bloom, palette flash, speed lines, parallax particles (dust, snow, fireflies).

**Particle spec:** lifetime, size over life, color over life, velocity, drag, gravity, spin, easing, pooled, capped, optional additive blending.

## 3.11 UI/UX for games (without being a website)

- **Diegetic:** Dead Space (health on suit), Isaac Clarke style, Hades (boon icons), Mario Kart (item box), Animal Crossing (phone)
- **Minimal HUD:** only what decisions require; fade when idle
- **Menu as space:** Hades' House, Persona 5's styled menus, Katamari's title, Animal Crossing's pause
- **Arcade conventions:** blinking PRESS START, attract mode, initials high-score table, continue countdown, score popups, combo meters
- **Typography:** bitmap pixel fonts, outlined text for readability, number popups with squash, text with per-character reveal and blip sounds
- **Cursor/focus:** pointer sprite or highlighted frame; always keyboard/gamepad navigable
- **Transitions:** iris wipe, pixel dissolve, slide, shatter, page-curl, color flood
- **Feedback:** every menu move has a sound and a small animation
- **Touch UI:** floating stick, large buttons (min 64 px), buttons at thumb reach, no tiny targets, no accidental zoom
- **Icons over words:** universal glyphs, keycap sprites, controller glyphs auto-switching by last input
- **Don't:** modal dialogs with OK/Cancel, cards, hover tooltips, scrolling lists with scrollbars, form-style settings

## 3.12 Audio library

**SFX synthesis recipes (WebAudio)**
| Sound | Recipe |
|---|---|
| Jump | square wave, pitch sweep up 200 to 500 Hz, 0.1 s |
| Land | noise burst, low-pass, 0.08 s + low thud |
| Coin/pickup | two quick square notes rising a fifth |
| Hit | noise + short low square, pitch down, bit-crushed |
| Explosion | noise, long decay, low-pass sweeping down |
| Laser | saw sweep down, 0.15 s |
| Power-up | arpeggio upward, 4-6 notes, 0.3 s |
| Death | descending sweep + noise tail |
| UI move | tiny pulse blip, 30 ms |
| UI confirm | two-note rising blip |
| Secret found | ascending arpeggio + sparkly high pulse |
| Dash | filtered noise sweep up |

**Principles:** pitch randomization (+/-5-10%), round-robin variants, layered impacts (transient + body + tail), ducking, priority and voice limits, distance attenuation and stereo pan, silence before big moments, audio feedback for everything (half of juice), loud for danger, soft for ambient.

**Music references**
- **Koji Kondo:** melody that tells the world's mood (Mario, Zelda)
- **Lena Raine (Celeste):** layered synth, emotional arc
- **Darren Korb (Bastion/Hades):** genre-blended, vocals as narration
- **Disasterpeace (Fez, Hyper Light Drifter):** ambient, synth-driven
- **Toby Fox:** leitmotifs reused with variations
- **Yuzo Koshiro:** driving chip dance
- **Austin Wintory (Journey):** one cello theme layered over the whole journey
- **Jessica Curry, Akira Yamaoka:** atmosphere and dread

**Adaptive music techniques:** vertical layering (add stems with intensity), horizontal resequencing (change section on bar line), stingers, crossfades on state change, tempo ramp (Space Invaders-like), low-pass on pause, muffle underwater, silence for dread.

**Procedural music starter:** tempo 90-140; pentatonic/dorian/lydian scales; progressions i-VI-III-VII (minor epic), I-V-vi-IV (pop), i-iv-VII-III (moody); instruments: pulse lead, triangle bass, noise hat/snare, fast arpeggios simulate chords (NES trick); swing 55-60% for groove; 4-bar loops with variation every 4 repeats.

## 3.13 Narrative and tone

- **Environmental storytelling:** Dark Souls, Gone Home, Bioshock audio logs, Hollow Knight murals
- **Minimal text:** Journey, Inside, Limbo (zero text)
- **Mechanic as message:** Papers, Please (bureaucracy), Undertale (spare/fight), Spec Ops (complicity), This War of Mine (scarcity), That Dragon, Cancer
- **Discovered lore:** Tunic manual, Outer Wilds ship log, Hades codex, item descriptions
- **Voice:** Disco Elysium (internal voices), Bastion (narrator reacts to your play), Stanley Parable (meta)
- **Typed dialogue:** per-character blips; speed control; skip with one tap
- **Branch and bottleneck:** choices that change texture, rejoin main line
- **Tone lexicon:** cozy, eerie, absurd, melancholic, triumphant, mischievous, oppressive, serene, frantic, whimsical, bittersweet, uncanny
- **Writing rules:** short lines; every line gives character or information; humor from specificity; never explain a joke or a mystery

## 3.14 Psychology and engagement (use ethically)

Flow channel, goal-gradient effect, endowed progress effect, peak-end rule, near-miss effect, Zeigarnik effect, variable-ratio reinforcement, loss aversion, mastery curve, autonomy/competence/relatedness, "one more turn" structure, curiosity gap, reciprocity (gifts), commitment and consistency. **Never** use these to create compulsion, fake urgency, or exploit; use them to create clarity and delight.

## 3.15 Accessibility and comfort

- Remappable controls; hold vs toggle options
- Colorblind-safe palettes; never use color alone (add shape or pattern)
- Reduced screenshake, reduced flashing, reduced motion
- Game speed option; assist mode; skip challenge
- Subtitle/text size and speed options
- Adequate contrast for text and critical elements
- Audio cues for visual info and vice versa
- One-handed play options; large touch targets
- Photosensitivity: max 3 flashes per second, limit flash area and intensity
- Reference: Game Accessibility Guidelines; Last of Us Part II and Celeste as models

---

# PART 4 — VOCABULARY SWAPS AND MOODS

**Words AI defaults to (avoid) vs words that produce game-like output**
| Avoid | Use instead |
|---|---|
| sleek, modern, clean | chunky, crunchy, punchy |
| professional, polished | juicy, tactile, snappy |
| intuitive interface | learnable through play |
| user, visitor | player |
| click, hover, scroll | press, dash, jump, grab |
| button, card, section | pickup, prop, platform, portal |
| loading, welcome | boot, attract mode, press start |
| tutorial | safe room, teaching space |
| responsive layout | letterboxed integer scaling |
| animation (CSS) | sprite animation, easing, squash and stretch |
| smooth | weighty, bouncy, crisp, floaty (when intended) |
| feature | verb, system, mechanic |

**Mood to reference quick-pick**
| Mood | References |
|---|---|
| Cozy | Stardew Valley, Animal Crossing, Spiritfarer, A Short Hike |
| Tense | Alien: Isolation, Papers Please, FTL |
| Frantic | Hotline Miami, Overcooked, Super Meat Boy |
| Triumphant | Mario flagpole, Hades victory, Celeste summit |
| Melancholy | Gris, Journey, Firewatch |
| Whimsical | Katamari, Untitled Goose Game, Kirby |
| Oppressive | Dark Souls, Inside, Limbo |
| Mischievous | Untitled Goose Game, Hitman, Goat Simulator |
| Zen | Alto's Odyssey, Flower, Mini Metro |
| Power fantasy | Vampire Survivors, Doom Eternal, Hades |
| Cerebral | Obra Dinn, Outer Wilds, Baba Is You |
| Absurd | Octodad, Katamari, Goat Simulator |

---

# PART 5 — GENRE MODULES
*Paste the relevant module into the Master Template's §04, §12, §13, §14.*

### Platformer
Verbs: run, jump, (dash/wall/grab). Must-haves: coyote time, jump buffer, variable jump, corner correction, fast respawn, moving platforms, one-way platforms, checkpoints, teach-test-twist level design, secrets off the beaten path. References: Celeste (feel), Super Mario Bros (teaching), Super Meat Boy (restart speed), Hollow Knight (pogo and atmosphere), Mario Odyssey (movement as toy).

### Top-down action / Zelda-like
Verbs: move, attack, dodge/roll, use item. Must-haves: 8-direction movement with consistent diagonal speed, attack buffer and cancel, enemy telegraphs, room-based design with locked doors and keys, heart-based health, dungeons with a central gimmick item, boss tied to the dungeon item. References: Zelda: A Link to the Past, Hyper Light Drifter, Hades, Tunic.

### Roguelite / run-based
Must-haves: seeded RNG; 3-choice rewards with synergies; rarity tiers; room clear rewards; elites and bosses; meta-progression that adds options; death as story (Hades); run length 15-40 min; build identity by minute 5. References: Hades, Slay the Spire, Dead Cells, Spelunky, Isaac, Balatro.

### Survivors-like
Must-haves: auto-attack, XP gems with magnet, level-up 3-choice, weapon evolutions from combos, timed waves, elite and boss spawns at timestamps, chest drops, screen-filling hordes (thousands via pooling and spatial hash), screen-clearing power moments. References: Vampire Survivors, Brotato, Halls of Torment.

### Bullet hell / shmup
Must-haves: tiny hitbox shown on focus, graze mechanic, bombs, patterns (aimed, ring, spiral, walls with gaps), boss phases (spell cards), readable bullets (high contrast; player shots low-opacity), score multipliers for risk. References: Touhou, Ikaruga (polarity), Cave shooters, Nex Machina, Galaga.

### Puzzle
Must-haves: one idea per level, a clear "aha," unlimited undo, restart, no guesswork, a solver or validator confirming every level is solvable, optional move/time par. References: Baba Is You, Braid, The Witness, Portal, Stephen's Sausage Roll, Snakebird.

### Strategy / tactics
Must-haves: perfect information or visible probabilities, enemy intents shown in advance, small boards with depth, undo for misclicks, clear turn feedback. References: Into the Breach, Fire Emblem, XCOM, Slay the Spire, Advance Wars.

### Tower defense
Must-haves: distinct tower roles (single, splash, slow, support), upgrade branches with tradeoffs, wave preview, economy with interest or sell-back, pathing choices, boss waves. References: Bloons, Kingdom Rush, Plants vs Zombies, Dungeon Defenders.

### Simulation / sandbox / management (Wright, Sawyer)
Must-haves: layered simulations, overlays, time controls (pause/1x/2x/3x), agents with needs, cascading events, optional goals, toy-mode freedom, visible causality, dominant-strategy audit. References: SimCity, The Sims, RollerCoaster Tycoon, Theme Hospital, Dwarf Fortress, Oxygen Not Included, Stardew (daily loop).

### Deckbuilder / card roguelike
Must-haves: enemy intent shown, energy economy, draft 1-of-3, synergy discoverability, relics that bend rules, short combats, clear card text with icons. References: Slay the Spire, Balatro, Monster Train, Inscryption.

### Metroidvania
Must-haves: lock-and-key graph, map that fills in, new movement abilities that recontextualize old rooms, shortcuts, save rooms, fast travel, sequence-break tolerance, boss-per-ability, secrets everywhere. References: Super Metroid, Hollow Knight, Ori, Castlevania: Symphony of the Night, Axiom Verge.

### Stealth
Must-haves: vision cones, noise radius, light/dark, detection meter, alert states, visible rules, multiple solutions, readable guard patrols. References: Mark of the Ninja, Metal Gear, Hitman, Thief.

### Rhythm
Must-haves: audio-clock sync (use the audio context clock, not frame time), calibration offset, judgement windows (tunable, for example 45/90/135 ms), combo, visual feedback synced to beat, charts that teach patterns. References: Crypt of the NecroDancer, Rez, Guitar Hero, osu!, Sayonara Wild Hearts.

### Racing
Must-haves: speed illusion (camera FOV, speed lines, parallax), drift or boost mechanic, rubber banding or catch-up items (subtle), readable track edges, short races, ghost replays. References: Mario Kart, Out Run, Trackmania, Rocket League.

### Fighting
Must-haves: startup/active/recovery frame data, hitstop, hitstun and blockstun, input buffer, cancels, strike/throw/block triangle, combo scaling, readable silhouettes, distinct character verbs. References: Street Fighter II, Smash Bros, Guilty Gear, Skullgirls.

### Physics toy / destruction
Must-haves: deterministic fixed timestep, stable stacking, satisfying collapse sounds, clear goals with 3-star ratings, instant retry, sandbox mode. References: Angry Birds, World of Goo, Poly Bridge, Besiege, Teardown.

### Falling-sand / cellular automata
Must-haves: material table (sand, water, oil, fire, wood, steam, acid, stone, lava, plant), reaction rules, typed-array grid, chunked updates, temperature and pressure as optional layers, brush tool. References: Noita, The Powder Toy, Sandspiel.

### Idle / incremental (use responsibly)
Must-haves: tangible tempo changes, prestige layers that add new mechanics, offline progress, visible number growth with juice, meaningful decisions between automation paths. References: Cookie Clicker, Antimatter Dimensions, Universal Paperclips. Avoid manipulative monetization patterns.

### Adventure / narrative
Must-haves: no dead ends, clear verbs, inventory with interaction logic, typed dialogue with blips, memorable characters via silhouette and voice, branching that bottlenecks. References: Monkey Island, Disco Elysium, Undertale, Kentucky Route Zero, Return of the Obra Dinn.

### Farming / life sim
Must-haves: daily loop with time pressure that is gentle, seasons, relationships with schedules, progression through tool upgrades, "one more day" hooks, cozy audio and palette. References: Stardew Valley, Animal Crossing, Harvest Moon, Spiritfarer.

### Arcade classic
Must-haves: single-screen or auto-scroll, escalating speed, score chase, extra lives at thresholds, attract mode, initials high-score table, easy to read in a second. References: Pac-Man, Asteroids, Galaga, Donkey Kong, Tetris, Robotron.

### 3D adventure (three.js)
Must-haves: third-person camera with collision and smoothing, analog-style acceleration, ledge grab or forgiving platforming, fog and a distinct palette, low-poly style, simple lighting, strong landmark for wayfinding. References: Mario 64, A Short Hike, Katamari, Journey, Tunic (isometric).

---

# PART 6 — SYMPTOM-TO-FIX TUNING DICTIONARY
*Paste the fix line as a follow-up prompt.*

| Symptom | Follow-up prompt |
|---|---|
| Floaty jump | "Increase fall gravity multiplier to 1.8x, reduce time-to-apex to 0.3 s, add 3 frames of hitstop on land." |
| Stiff movement | "Add acceleration ramp (0 to max in 6 frames) and deceleration (4 frames). Add land squash and dust." |
| Feels slippery | "Raise ground friction, add a 3-frame skid on direction reversal, snap to zero below 5 px/s." |
| Feels dead | "Add hit sparks, hitstop 4 frames, trauma shake 0.4, pitch-randomized SFX, and a 1-frame flash on every impact." |
| Too easy | "Increase telegraph speed by 15%, shorten enemy recovery by 20%, reduce healing drops by 30%." |
| Too hard | "Add a checkpoint every room, lengthen hurt i-frames to 90, add hidden mercy after 3 deaths in a spot." |
| Unfair deaths | "Shrink the player hurtbox to 70%, add 15 frames of windup to every attack, and show a replay flash of the killer." |
| Confusing | "Remove all text. Use shape and color language. Add a safe room that teaches the mechanic first." |
| Boring | "Add a risk/reward optional path with visible loot. Insert a surprise at minute 2. Vary enemy behaviors." |
| Repetitive | "Introduce a twist on the core mechanic every 3 rooms and add 2 enemy recombinations." |
| Looks like a website | "Remove all DOM. Render everything on canvas at 320x180, pixel font, palette-limited, integer scaled." |
| Flat visuals | "Add 4 parallax layers, hue-shifted shadows, ambient particles, and a vignette." |
| Audio is annoying | "Reduce SFX repetition with +-8% pitch and 3 variants each, duck music 6 dB on big SFX, lower high frequencies." |
| Camera nauseating | "Reduce lerp speed, remove rotation, clamp shake to 4 px, add reduced-shake setting." |
| Menus feel webby | "Replace with cursor-sprite navigation, bitmap font, sound on every move, and an iris-wipe transition." |
| Performance drops | "Pool all particles and bullets, cap at 300, use spatial hash for collisions, avoid per-frame allocations." |
| Players get lost | "Add a landmark visible from the start, a light gradient toward the goal, and a breadcrumb coin arc." |
| Secrets unfindable | "Add subtle visual tells (misaligned tile, draft particles) and an audio hint; foreshadow in an earlier room." |
| No progression feeling | "Add 3-choice upgrades every 2 minutes with synergies and a visible power change." |
| Death feels bad | "Instant respawn under 0.5 s, keep run stats, show something learned, add a tiny reward for dying." |

---

# PART 7 — PROMPTING STRATEGY

**Staged build (recommended)**
1. **Graybox:** "One verb, empty room, rectangles only. Make the movement perfect."
2. **Tune:** "Expose all constants; I'll tune. Add hitbox overlay."
3. **Challenge:** "Add one enemy with a telegraph and one hazard."
4. **Discovery:** "Add one secret and one landmark."
5. **Loop:** "Add win/lose, restart, and a 3-minute structure."
6. **Juice:** "Add hitstop, shake, particles, easing, squash and stretch."
7. **Audio:** "Add synthesized SFX and a layered music loop."
8. **Art:** "Apply the palette, shape language, parallax, sprites."
9. **Flow:** "Title, attract mode, pause, settings, game over."
10. **Polish:** "Run the Definition of Done checklist and fix gaps."

**Iteration prompts**
- "List the 10 CONFIG values most likely to change feel, ranked."
- "Audit this game against the Fairness Checklist and fix violations."
- "Run a 'first 60 seconds' audit and fix anything that breaks flow."
- "Add a replay of my last 3 seconds when I die."
- "Make a seeded daily-run mode."
- "Add a ghost of my best run."
- "Show me every place text appears and remove or replace it with icons."
- "Playtest by describing a first-time player's likely confusion points, then fix them."

**Anti-failure habits**
- Specify "single HTML file, no external assets" if your environment needs it
- Ask for one file, complete, no placeholders
- Ask the AI to state assumptions at the top
- When something feels wrong, name the symptom and a number, not just "make it better"
- Save a working version before each major change

---

# PART 8 — "DOES IT FEEL LIKE A GAME?" QA CHECKLIST

**First minute**
- [ ] Something moves within 1 second of load
- [ ] I have control within 3 seconds
- [ ] I achieve something by 30 seconds
- [ ] My first failure is gentle and instantly recoverable
- [ ] I'm surprised or delighted by 60 seconds

**Feel**
- [ ] Every input has instant visual, audio, and motion response
- [ ] No linear or instant motion anywhere
- [ ] Hits have weight (hitstop, shake, particles)
- [ ] I can't make an identical sound twice in a row
- [ ] The world reacts to me even when idle

**Challenge**
- [ ] I know why I died every time
- [ ] Attacks are telegraphed
- [ ] Difficulty rises and falls
- [ ] Restart is under 1 second
- [ ] Risk has visible reward

**Discovery**
- [ ] I learned every mechanic without reading
- [ ] I found a secret and felt clever
- [ ] Visual language is consistent
- [ ] I always know where I could go next

**Presentation**
- [ ] Pixel-perfect scaling, no blur
- [ ] Silhouettes are readable
- [ ] Palette is cohesive
- [ ] Music and SFX complement each other
- [ ] Menus feel like a game

**Technical**
- [ ] 60 fps, no hitches
- [ ] Works with keyboard and gamepad or touch
- [ ] No scroll, zoom, selection, or context menu
- [ ] Pause on blur
- [ ] Tuning panel works

**Web-ness detector (all must be NO)**
- [ ] Is there a button that looks clickable?
- [ ] Is there a paragraph of text?
- [ ] Is there a hover effect?
- [ ] Is there a scrollbar?
- [ ] Is there a rounded card or panel?
- [ ] Is there a system font?

---

# PART 9 — STUDY LIST

**Talks and videos**
- *The Art of Screenshake* (Jan Willem Nijman, Vlambeer)
- *Juice It or Lose It* (Martin Jonasson and Petri Purho)
- *Juicing Your Cameras With Math* (Squirrel Eiserloh)
- *Math for Game Programmers: Building a Better Jump* (Kyle Pittman)
- Game Maker's Toolkit (Mark Brown): especially the series on level design, boss design, and game feel
- Sakurai on Games
- Extra Credits

**Books**
- *Game Feel* (Steve Swink)
- *The Art of Game Design: A Book of Lenses* (Jesse Schell)
- *A Theory of Fun for Game Design* (Raph Koster)
- *Rules of Play* (Salen and Zimmerman)
- *Characteristics of Games* (Elias, Garfield, Gutschera)
- *Level Design: Concept, Theory, and Practice* (Rudolf Kremers)
- *The Design of Everyday Things* (Don Norman)
- *Flow* (Mihaly Csikszentmihalyi)
- *Game Programming Patterns* (Robert Nystrom, free online)
- *The Animator's Survival Kit* (Richard Williams)
- *The Illusion of Life* (Thomas and Johnston)
- *Color and Light* (James Gurney)
- *Understanding Comics* (Scott McCloud)
- *Spelunky* (Derek Yu, Boss Fight Books)

**Web resources**
- "Fix Your Timestep" (Glenn Fiedler)
- Red Blob Games (pathfinding, maps, grids)
- Lospec (palettes, pixel art tutorials)
- jsfxr / bfxr (SFX generators)
- Game Accessibility Guidelines

---

# PART 10 — MIX-AND-MATCH EXAMPLE SPECS
*Three short examples showing how to combine the library into a prompt.*

**A. "Cozy systemic toy"**
Hook: a tiny island ecosystem you nudge, never control. Feeling: cozy and curious. Wright: simple agents with needs, overlay layers for fertility and happiness. Stardew: gentle daily loop. Alto's Odyssey: time-of-day palette. Animal Crossing: typed blips. Challenge: none; discovery is the game (hidden species interactions). Visual: Gravity Falls-style flat shapes, 32-color palette.

**B. "Hard-but-fair precision platformer"**
Hook: a climb where each screen is one idea. Feeling: tense then triumphant. Celeste: coyote/buffer/dash freeze. Super Meat Boy: restart under 0.5 s. Mario 1-1: teach safe first. Challenge: execution; sawtooth; assist menu. Visual: Hollow Knight silhouettes, 320x180. Music: layered synth that adds stems per screen cleared.

**C. "Run-based power fantasy"**
Hook: survive 10 minutes against a growing horde. Feeling: power fantasy. Vampire Survivors: auto-attack, 3-choice levels, evolutions. Hades: boon synergies. Challenge: decision and time. Visual: Hotline Miami neon, Cave-shooter readability. Audio: pitch-randomized hits with ducking, escalating tempo.

---

*End of kit. Delete what you don't need, keep the numbers, and let the references carry the style.*
