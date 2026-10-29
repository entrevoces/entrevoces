# Release gates, practical QA, and rollback

| Gate | Tool | Success criterion | Never imply |
|---|---|---|---|
| Source | `node tools/media-studio.mjs audit` | 865 exact canonical IDs; 437 medical + 428 legal; 0 parenthetical display labels | Human-verified translations |
| Engine | `npm run media:test` | no failures in media/Meta unit and contract tests | Real Meta provider ran |
| Existing engine | `npm test` | original learning/game tests pass after overlay integration | Old game feel is validated |
| Static Pages | `npm run build && npm run verify:site` | homepage library, legacy practice page, Suno link, playable old audio and sources | Finished bilingual narration |
| Model live | protected `meta-live-qa.yml` | result artifact from real Meta Spark/Wonder, >=80% semantics and creative sample checks | Clinical/legal expert assessment |
| Model authoring | protected `meta-produce-draft.yml` | real model staged draft with usage receipts | Production approved |
| Audio | `quality`, `ingest`, `signoff` | final assets, timestamps, line-aligned transcripts, consent and rights | ASR proves faithful interpreting |
| Human | independent professional signoff | substantive bilingual and subject review of all consequential statements | “AI approved” equals human review |
| Device | manual Safari/Android listening run | audio starts, pauses, background handling, voice opt-in, tap fallback, captions, reduced-motion, 320px | Source inspection equals usability testing |
| Publish | GitHub Actions Pages run + live URL | fresh SHA, correct root asset URLs, no secrets in `dist` | Changed code is already public merely because ZIP exists |

Rollback: preserve previous published Pages commit SHA and `content/media-production/catalog.json`. If a flawed media item is published, remove public asset links without deleting the source review history; rebuild the static bundle and redeploy the prior commit or an explicit corrective commit. The original game/knowledge hub remains under `practice.html`.

Quality is measured at three independent layers: technical checks, provider observation, **and** human listening/learner study. None substitutes for the others.
