# ENTRE VOCES — Game Design Bible (games first, learning inside)

**Category on the shelf:** cozy building + narrative shift-work adventures.
**Never on the box:** "educational game." Learning is the *craft system* of these
games, the way cooking is the craft system of a café game. Players come to
build a place, bond with people, and become someone. Fidelity is just what
"good craftsmanship" means in this fiction.

## Who we are building for (demographics → desires)

| Player | Real life | What pulls them back daily | What bores them instantly |
|---|---|---|---|
| Nursing/allied-health student (19–28) | Phone-first, 5-min gaps between classes/clinicals | Collecting, decorating, streaks with friends, characters with arcs | Anything that feels like flashcards with points |
| Bilingual clinic/court staff (25–45) | Helps interpret at work without the title; proud of language, short on time | Competence fantasy ("I handled that room"), reputation, finishing a client's story | School tone, grades, childish art |
| Interpreting student / HCI candidate | Studying for the 60-hr world; anxious about exams, hungry for reps | Mastery map that visibly fills, hard rooms unlocked, ranks | Fake praise; scores that lie |
| Working interpreter | Already good; returns for rare critical rooms + speed | Pressure rooms, precision streaks, collection completion | Repetition below their level |

Shared loves (the build brief): **make a place yours, finish people's stories,
watch a collection complete, earn a rank that means something.** Shared hate:
being lectured. Every system below serves a love; terminology serves the fiction.

## Pillars

1. **BUILD — Voice Atelier.** You inherit a bare annex between a clinic and a
   courthouse. Every shift earns **Trust**. Trust builds rooms and comforts
   (Listening Fern, Consent Lamp, Abacus of Numbers, Note Desk, Waiting Sofa,
   Mural of Two Rivers…). The studio is persistent, visible on the title screen,
   and *yours* — layout, collection wall of Distinction Duos (dose⚔dosage as
   rival twins you reconciled), and a waiting room that fills with tomorrow's
   people while you are gone. Building is the long game; interpreting is how
   you earn the bricks.
2. **BOND — Night Shift.** One night, one waiting room, real arcs. María's
   8-turn visit and Alvarez's 5-turn case continue across nights. Hearts are
   *understanding*, not hit points: a faithful rendering earns a nod, a
   retold story, a family member relaxing. Distortion has a face — confusion,
   a repeated question, a judge pausing. Players return to *finish María*,
   not to "complete module 4."
3. **BECOME — Reputation.** Ranks (Listener → Bridge → Voice → Interpreter
   of Record) gated by engine evidence across games, never by time played.
   Pressure rooms, critical consents, and court records unlock as reputation
   grows. The Engine Console's 8-stage map is the same truth, shown as a
   career wall in-game.

## How Spark shows (best attributes, on purpose)

Spark's gifts are **speed + structured invention**: new people, new turns,
new studio pieces, and portfolio concepts generated from live engine state in
the time it takes to tap. We showcase it where players can *feel* it:
- **Endless waiting room:** Game Lab + encounter templates mint fresh clients
  (name, need, speech quirk, effort profile) seeded by your weakest area.
- **Living catalog:** build pieces, client requests, and distinction duos are
  generated as data, so the studio never "runs out of content."
- **Instant adaptation:** the next client through the door is chosen from your
  evidence before the doorbell finishes — adaptation you see, not a settings page.
Runtime Spark runs through the CPE (`POST /v1/concepts/generate`, design §9);
offline, seeded templates guarantee the doorbell never rings empty.

## Core loops

- **30 seconds:** hear → build/craft a rendering → see a face change.
- **5 minutes:** finish a concept's four proofs or one client's turn; earn Trust.
- **Tomorrow:** due reviews arrive as *people returning* ("María is back —
  she still mixes dose and dosage"), the story advances one turn, one new
  studio piece is affordable.
- **Month:** studio complete, both stories finished, Reputation = Voice+.

## Education, smuggled honestly

Terminology = materials. Distinctions = rivalries to reconcile. Fidelity =
craftsmanship stars. Hints = your notebook (assistance is *diegetic* — every
professional uses one; the engine still counts it). Assessment language in-game
is consequence language ("She thinks one tablet *is* the whole week") — the
precise taxonomy lives in the Console for those who want the curtain lifted.
Nothing lies: ranks and map pips are computed from the same evidence; comforts
never buy correctness.

## Feel & production bar

Warm flat editorial art (teal/amber/ink, Fraunces + Public Sans), characters
with brows that move, WebAudio earcons (tile *tok*, success chime, room tone),
particle bursts, animated build placement, TTS voices with a hand-built
waveform, haptic-style scale pops. 48px+ touch targets, keyboard 1–4 + arrows,
`prefers-reduced-motion` honored, every spoken beat playable typed. If a beat
cannot be *felt*, it is not finished.
