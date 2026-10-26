# Anti-Slop Charter — faults looked up, then purposely avoided

Researched tells of AI-generated work (design-slop catalogues; hallucination
and metacognitive-laziness literature) and the counter-move shipped in this
repo. If a future change reintroduces a tell, this file is the argument against it.

## Look & feel tells → our counter-moves
- **Purple→blue gradients, glass glow, dark hero + 3 identical cards** → flat
  warm editorial system (teal/amber/ink, solid colors, ink outlines, no blur
  glass). Three hub cards survive only because each is a different *place*
  with different verbs, art, and stakes — not three features with icons.
- **Inter everywhere, emoji icons, all-caps kickers, gradient text** →
  Fraunces (display) + Public Sans (text), sentence-case labels, hand-drawn
  SVG people, typographic symbols (→ ≠ §) that *mean* something in-game.
- **Programmer-art flatness, silent clicks, identical screens** → three
  materials (day studio / night river / oak desk), WebAudio earcons, canvas
  river, stamp physics, character brows that move. Every input has a visible,
  timed consequence in the world before any text explains it.

## Content & generator tells → our counter-moves
- **Hallucinated facts/citations, confident generic feedback** → all teaching
  content is hand-authored seed with `sourceIds`; validators reject
  sourceless concepts, duplicate prompts, and closed-schema violations.
  Feedback names the *specific* distinction/number/negation at stake or stays
  visual ("Understood" + a face), never "Great job! Keep it up!"
- **Endless samey LLM items** → procedural generation is combinatorial over
  authored material with seeded reproducibility (same seed, same person;
  testable), biased by live learner gaps. Spark at runtime enriches through
  the CPE; offline templates guarantee specificity without a model.
- **Metacognitive offloading (AI does the thinking)** → games withhold help
  diegetically (notebook, tokens) and *log* assistance; the source text
  physically leaves before rendering. The learner's paper, not the model,
  carries the turn.

## Learning-system tells → our counter-moves
- **One score, gamified points over mastery, recognition = knowledge** →
  8-stage vectors, FSRS-inspired stability/retention, competence *with n*,
  `needsDiagnostic` instead of false diagnosis, ranks gated by evidence.
- **Text-wall "gameplay" (read, click, read)** → verbs with hands and clocks:
  PLACE/CRAFT (Atelier tiles + studio grid), CATCH/STACK/RENDER (Night Shift
  river + notebook under effort load), SCAN/STAMP (Bench Call eye-voice span
  + record book). Reading is the *material*; manipulation is the game.

## Engine tells → our counter-moves
- **Demo-grade CRUD pretending to be a platform** → config-over-code domains
  (§3.4 gate), optimistic concurrency, idempotent append-only evidence,
  offline merge with zero duplicates, same core math on server and client.
  Oregon is data, deleted as easily as created.
