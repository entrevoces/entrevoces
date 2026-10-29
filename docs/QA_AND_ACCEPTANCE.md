# QA, learning-validity and release acceptance — Biblioteca Viva

## Acceptance matrix

| Quality gate | Automated check | Current evidence | Status |
|---|---|---|---|
| Canonical source coverage | 865 source IDs in exact provided JSON; 437 medical, 428 legal; hash | Node test + `media:audit`; source unchanged | PASS, structural |
| Natural conversational labels | No `(...)` in displayed 865 English/Spanish labels; high-risk sense translations preserved by explicit mapping | corpus normalization tests; original terms retained for lookup | PASS, structural; linguistic review pending |
| Core learning safety | Error detection ≠ spoken production; touch/ASR timing are not medical/legal interpretation proof | scoring unit tests, no stage-7/8 evidence | PASS, policy |
| Knowledge provenance | All new media IDs reference actual source corpus IDs; no invented source IDs | catalog validator and tests | PASS, structural |
| Media content volume | Nine substantial authored script-only items, 36 grounded production briefs/prompt packets | script length & graph reachability tests | PASS, quantity only, not cultural/clinical evaluation |
| Legacy preservation | Original games/runtime remain in Pages; old hub moved to `practice.html` | simulated integration build; static file presence | PASS in fixture, full checkout test pending |
| Library prioritized | `dist/index.html` is media-first; featured Suno link and native audio interface; no arcade catalog on root | static source audit, integration fixture | PASS source-level; actual iPhone UX pending |
| Legacy existing media | original 24 items remain, 5 sound files and 1 real Suno URL | catalog and simulated build | PASS in fixture |
| API request shape | Wonder/Spark chat, Muse Image art + vision, Muse Voice Transcribe multipart | mocked requests with path/payload assertions | PASS mocked; live account pending |
| Staged authoring | five distinct stage outputs, saved/validated by frozen brief hash; restart after failed call | replayed simulated interruption test | PASS simulated |
| Production safety | unreviewed/rights-uncleared recordings cannot publish; script-only cards explicitly pending | publication/rights tests | PASS structural; human identities not authenticated |
| Accessibility | touch targets, text/voice fallback, labels, transcripts, reduced-motion support | code inspection of media UI; keyboard events | INCOMPLETE until real-device inspection |
| UX acceptance | motivated user finds real audio within 2 taps, understands which episodes are readable only | actual observation required | NOT VALIDATED |
| Voice accuracy | real English/Spanish audio with meaningful, reviewable mistranslations | no generated, annotated, reviewed bilingual recordings | NOT VALIDATED |
| Provider deployment | live Muse calls with authenticated key, checked rate limits, invoices, actual microphone/ASR | no keys available in build environment | NOT VALIDATED |
| Rights & credentials | independently confirmed media licenses and medical/legal interpretation reviewers | model & local JSON metadata cannot authenticate identity | NOT VALIDATED |
| GitHub push | new `main` commit + Actions workflow + physical Pages inspection | connector create branch/file returned HTTP 403 | BLOCKED |

## Engineering confidence vs learning confidence

`npm run media:test` exercises the new modules, content contracts, source integrity, security boundaries, and client-safe rules. These are **engineering tests**. They do not prove professional legal/medical translation equivalence, interpreter competency gains, narrative enjoyment, authentic performance, fairness of cultural content, oral detection accuracy, or audio/video license clearance. Do not describe a test report as "validated for certification." No high-stakes automated grades can be promoted on synthetic unreviewed ground truth.

## Pre-publication clinical/legal checklist

For each medical/legal episode, obtain a qualified reviewer for both languages and applicable domain; compare the *actual* source sentence, approved reference rendering, purposefully wrong version, repair, phrase-level fidelity, correct Oregon / federal jurisdiction, medications, dosage and conditional meanings. Confirm that error cues are subtle but genuinely distinguishable; line-up source, faulty version and approximate audible timing; prevent automatic negative scores on vague ASR or traffic loss. Double-review high-risk numerals and negative/conditional phrases. Verify dialect coverage and neutral register; avoid direct medical/legal advice in fictional media. Save signed approval outside the public site and publish a review metadata stub with non-sensitive credential information.

## Adversarial/UX sessions for release

- Screen reader, keyboard, 320 px narrow iPhone, Safari autoplay prevention, users who deny mic permission, and browser audio-only mode.
- Real playback: changing episode pauses previous one; focus returns after detail close; locked screen/resume yields coherent position; captions are in sync.
- Real voice interaction: browser SpeechRecognition absent, remote provider down, device offline, unintelligible input, multiple speakers, interruption near a cue boundary, accidental shouted music lyric, missed target, premature reveal, background tab, and repeat listening. Never treat text recognition mismatch as a professional interpretation error.
- Script: at least 6–10 real minutes for a labeled 8–10 minute episode; no 170-word scene masquerading as a full episode. Full character conflict, realistic stakes, proper consent, appropriate humor, consequences, and emotional resolution.
- Recommendations: unknown learner receives varied formats; known weak concepts alter suggestions reproducibly; no demographic proxy score. Saved media survives refresh when localStorage allowed, works ephemerally when not allowed.
- Production security: inject malformed JSON, oversized voice WAV, missing source IDs, unsafe `../` asset traversal, counterfeit Suno URL, unlicensed media, ASR missing negation, wrong judge finding, unverifiable review metadata; ensure not published and keys never in `dist/`.
- CI: `npm test`, `npm run modal:check`, `npm run verify:site`, `npm run media:test`, and `npm run build` must pass against the *full original repository*. Audit GitHub Pages URL after deployment; inspect the actual built files, not a cached prior deployment.

## Honest verdict, 2026-10-29

This local overlay is a credible, substantial **engineering beta / authoring scaffold** for a media-first platform: full source inventory, offline content, static library, real model integration client, resumable five-stage authoring, rights gates, retained old apps and deterministic voice-detection contracts. It is **not yet good enough to claim completed professional interpreter training** until live model authentication, real bilingual voice recordings, independent domain review, on-device UX observations and production deployment are demonstrated. It is also not evidence that the fully integrated original repo's entire regression suite passes. Treat those as hard launch gates, not polish suggestions.
