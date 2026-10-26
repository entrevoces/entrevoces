# Game-Critic Report — ENTRE VOCES (written against our own games, then fixed)

Method: five independent critic passes over every game file, the engine, the
hub/console, and the copy. No browser play was possible in the build sandbox,
so every verdict below is code-evidenced; runtime feel remains unverified and
is labelled as such. Scores are return-intent: *would someone choose this for
10–20 free minutes tomorrow?*

## Verdicts before the fix pass

| Game | Return? | Where it fell apart |
|---|---|---|
| Voice Atelier | Likely | Strongest loop; long build arc |
| Night Shift | Likely, effortful | No gentle on-ramp; story title borrowed another world's story in 4 of 6 worlds |
| Bench Call | Sometimes | Button said "Hold", behaved as click — a lie in the first minute |
| Term Rush | Sometimes | 1–2 minute runs, random prompts ignoring your gaps, nothing kept between days |
| Echo Sequence | Sometimes | Capped at 7 stones, fixed slow pace, one direction only |
| The Table | Rarely | Same encounter order every sitting; trust changed nothing about the next turn |
| Repair Shop | Rarely | 5 identical jobs, one corruption trick, no stakes |
| VocabCraft | At risk | HUD said 5 spans, game needed 3; WebGL/CDN failure was a dead end with a disabled button |
| Lingua Lab VR | Sometimes | Best fallback story; weakest feedback inside the headset |

Portfolio verdict: **two games earned a daily habit; four were good lessons
wearing game clothes; none remembered yesterday.** A lesson ends. A game
must remember you, greet you with what you are about to forget, and keep a
score worth beating.

## Engine pedagogy — what a specialist would flag

Sound: 8 stages never collapsed, sourced concepts, honest uncertainty,
misconception tracking, forgetting curve with a due queue.

Missing or misleading before this pass:

1. **Competences never decayed.** A skill proven a year ago displayed like
   today's skill. → Now time-decayed (`freshness` shown in the Hub).
2. **Selector ignored its own forgetting curve and the domain's
   `prerequisiteAreaIds` / `competencyWeights`.** Config that does nothing
   is worse than no config. → All three now move rankings.
3. **"Diagnostic" was a label, not an activity.** → Now a distinct 3-probe
   plan (recognize → recall → understand) on one concept, shown in the Hub.
4. **Direction was recorded but never used.** Interpreting runs both ways;
   one-way practice looked complete. → Per-concept direction evidence;
   the selector names unproven reverse direction.
5. **Fidelity missed modality.** "Must" → "may" passed as faithful — the
   most professional distortion there is. → Modality weakening and dropped
   hedges are now consequential `changed` findings.

Still honestly open: register and pragmatics are not yet first-class
evidence; stage 8 remains *practice evidence*, never a readiness verdict,
and the docs now say so instead of implying it.

## AI slop found and removed

Visual slop was genuinely absent (no purple gradients, no emoji, no filler).
Structural slop remained: byte-identical `Loading…` placeholders and the same
end-screen scaffold across scaffolded games. Loading lines are now contextual
per game; end screens report streaks and personal bests, which differ because
the player's history differs. Overclaims ("forever", "masters") were cut or
earned. The Bench Call control no longer promises a hold it does not implement.

## The non-technical user test

Before: creating anything meant the Console's developer form or a CLI —
a person with no computer experience could not make a game at all.
Now: Hub → **Make your own game — no code, three taps** (who / what should
players do / name it) produces a playable, shareable game in the chosen
world in under a minute, in plain words, with no field that can be filled
in wrong. Creating a whole new *world* still needs the Console; the
beginner guide (`docs/beginner-guide.md`) walks it in plain language and
says where to stop and ask for help.

## What would still not survive a real playtest (unverified)

Touch locomotion in VocabCraft, in-headset feedback density, Night Shift's
simultaneous load for true beginners, and all timing/feel. These need human
hands on real devices — listed, not hidden.

## Fix pass applied (same day, in response to the scored critique)

Critic majors addressed in code (24/24 tests green):

- **Echo crash (M1)** — petal HUD clamped; reverse rounds now hide the printed
  target term and answer in English, so they test listening as labelled;
  pool widened to 10 stones for a 10-stone thread.
- **Repair tells (M3)** — tray distractors are now sentence-chunks like the
  honest part (no shape giveaway); the `(approximately)` placeholder corruption
  is gone; the corrupted chunk varies between sittings.
- **Table self-contradiction (M4)** — chunking a dense, low-trust turn is now
  scored apt, matching the game's own advice; distortions are real neighbour
  swaps, number changes, or another concept's sentence — never a suffix tag.
- **Bench farming (M5)** — a lone first word no longer passes a sight group;
  each group can be rendered once.
- **VocabCraft (M6)** — the river is a wall until 3 spans exist; on-screen
  touch pad and a Mine/Build button now exist as the lobby promised.
- **Night Shift (M10)** — source text is hidden during the catch phase;
  listening is now the job, with the reveal token as the honest escape.
- **Wizard (M7)** — your game's name now actually travels: linked games open
  titled with it. **Streaks (M8)** — visible on the Hub Mirror, not only at
  end screens. **VR (M9 + carry-over)** — direction labels follow the real
  direction per world; the crystal's verdict colour resets every trial.
- **Genre diversity (the headline)** — two new scene-first games no one
  expects from language learning: **Neon Bastion**, a dusk-canyon platform
  shooter (run, jump, blast only the true-equivalent drone; Stages 2/6), and
  **Melon Reef**, an underwater watermelon harvest piloted by ear
  (reverse-direction listening, Stages 1/5) with oxygen, jellyfish, and a
  melon submarine. Both are full-canvas worlds, one-minute-to-learn, and
  feed the same engine evidence as every other door.
