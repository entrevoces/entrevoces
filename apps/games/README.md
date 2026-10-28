# Entre Voces — three additive game experiments

These are original, mobile-first arcade experiments. They extend the existing `entrevoces` hub, game runtime, knowledge snapshot, and `EngineClient`; they do not replace the existing suite. Their core arcade loops remain static and offline-friendly. The optional *spoken sight-transfer* extension uses a separate local HTTP gateway, which calls Meta models only with microphone consent.

| Game | Main physical interaction | Learning component supported |
| --- | --- | --- |
| Río de Palabras | Select neighboring bilingual equivalences; all on-board matches resolve in deterministic cascading waves | Supported recognition of reviewed bilingual medical/legal terminology |
| Última Parada | Route a moving train to the correct translated platform; earn and spend time-limited brake signals | Time-constrained bilingual term recognition and attention switching |
| Pulso de Luz | Aim and bank a glowing projectile into a translation target with physically matched trajectory previews | Bilingual term recognition with spatial planning and trajectory control |

Players can switch between Oregon-rooted medical/legal terms and English→Spanish or English→Mandarin using source-linked terminology already present in the compiled curriculum. The game controls do not require typing. Each game offers finite sessions, retry, pause, keyboard access, score/combo feedback, gentle/brisk pacing and device-local progress. Difficulty reacts conservatively to an existing evidence threshold; an older learner is not automatically given an easier task based on demographics.

## Learning integrity

- The new `engine-core/choice-assessment.js` grades **only explicit semantic choices** against sourced, unambiguous, language-specific candidates, without conflating games' motor outcomes with learning. Source and target directions are recorded accurately even when a bilingual tile-pair is selected in reverse order.
- `EngineClient` records the concept, domain, explicit language direction, answer modality, activity type and support status. Cascades, missed trains, projectile collisions, motor timing and strategic points do not create learner evidence.
- The evidence stage is **2**, activity type `bilingual`, confidence **0.70**, response modality `touch` or `keyboard`, and assessment method `visible-term-choice`. This represents supported recognition/selection, not independent spoken production, conversation management, or professional interpreter certification.
- The shared engine validates the limited claims of visual term choices and rejects any attempt to label touch responses as spoken interpreting proficiency. Older evidence without optional modality labels stays readable.
- Hint use is recorded as assistance. The learner model already discounts such attempts, and the game-difficulty policy requires a minimum of independent, confident observations before promotion. The same learner state is used to favor due, weak and unseen concepts when choosing new source terms; repeated easy wins are not the only replay objective.
- Labels and answer keys come only from the existing compiled knowledge snapshot. The game filters out unsourced, inferred and ambiguous identical-label alternatives. This demo does not create legal advice, medical instructions, fabricated bilingual phrases, or live patient/client scenarios.
- Different terms can have context-sensitive equivalents; the bundled content is a starting corpus rather than an independently adjudicated reference standard. The engine does not claim professional certification.

## Opt-in spoken practice on CPU

All three games expose Voice Lab (`V`). Record up to 30 seconds of fictional interpreting practice; the static client sends 16 kHz mono PCM WAV to Meta MMS (`facebook/mms-1b-all`) on Modal CPU containers. English, Spanish and simplified Mandarin adapters support forward/reverse practice. The device speech synthesizer can read the source. Recordings are opt-in and never saved by application code.

Voice Lab displays the transcript and example rendering for review. ASR cannot establish fidelity, so the lightweight CPU service awards no automatic spoken evidence, certification score or voice power reward. Deterministic arcade evidence is unchanged. See [the CPU deployment instructions](../../services/modal-spoken/README.md), including noncommercial model rights and cold-start limits. The original archives' GPU/Llama configuration is superseded.

## Integration

- Manifest: `knowledge/game-suite/manifest.json`.
- Source: `apps/games/{rio-de-palabras,ultima-parada,pulso-de-luz}/index.html` and shared `apps/games/_shared/game.js`.
- Build: `npm run build`, which includes the maintained shared `packages/game-runtime` modules and copies three game directories to `dist/games/`.
- Smoke test: `node --test tests/arcade-smoke.test.js` drives full successful sessions through all three games at 320px and 390px virtual viewports, checking scores, physical collisions, semantic evidence, completion and restart with an instrumented canvas.
- Evaluation and fairness test: `node --test tests/arcade-evaluation.test.js` validates thousands of seeded levels, known answer keys, ambiguity rejection, stage restrictions, idempotent evidence, strict persistence, and reachable targets.

## Status and next review

These are **experimental playable vertical slices**, not fully assessed or professionally validated training. They need real-device visual QA, demographic usability testing, deeper context-sensitive medical/legal distinctions, and real audio trials of the new provisional spoken layer. The game implementations cannot independently validate bilingual translations without subject-matter review. Four design critiques of a superseded set of concepts identified learning-evidence and puzzle-fairness pitfalls; the shared safety constraints were applied here, but these new game designs have not received the same human usability review.
