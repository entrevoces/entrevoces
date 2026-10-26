# Contest Compliance & Opportunity Audit — Meta Global AI Developer Hackathon

Rule-by-rule, against the Participant Guide. Status is evidence, not vibes.

## Eligibility & submission

| Rule | Status | Evidence / action |
|---|---|---|
| Project fits a problem statement | ✓ | Build for Your World (Indie): interpreter scarcity in clinics/courtrooms; Push-the-Frontier colour via mode-weighted training engine |
| Must incorporate Meta models | ⚠ code-live, key-pending | Wonder invent/review, Spark enrich, Voice contract in CPE (`meta.js`, `/v1/ai/*`). **Action: set `META_API_KEY`, claim the $150 credits before Nov 4 9:00 PM ET, verify `/v1/ai/status` shows `provider:"meta"` on camera** |
| Not a banned project | ✓ | Not a chatbot, not RAG, not medical advice ( synthetic interpreter *training*; no patient advice anywhere; games teach carrying language, never diagnosing). Not political/war, not a screener/coach/analyzer clone |
| New work only, identifiable | ✓ | All git history begins Oct 26 (event window); commits narrate the build |
| Public repository | ✓ | 18 public repos under `entrevoces` (verified via API, `private:false`) |
| Team ≤ 4, one Representative | ⚠ human action | Appoint the Representative on the submission form; list every contributor |
| 3-minute demo video | ⚠ not recorded | Script ready: `docs/demo/demo-script-3min.md`. Record outside the build sandbox; video is a primary judging artifact (Demo = 25%) |
| Deadline Nov 4, 9:00 PM ET | ⏳ | Submission via CV platform; Tue Nov 3 is the last troubleshooting day — submit Nov 3, not Nov 4 |

## Stage One (pass/fail) — the gate we must not trip

"Reasonably used Meta Model API and/or Meta's open-weight models." Our wire
is real and logged, but **a judge running without our key sees
`local-template` labels** — honest, and a Stage-1 risk if read as "not
really using Meta." Mitigations, in order: (1) demo with the live key so
`/v1/ai/invent` and `/v1/ai/review` answer `provider:"meta"`; (2) the KB
reviewer is a non-obvious, load-bearing use (AI as gatekeeper of teaching
truth, with a deterministic floor it cannot waive) — exactly "beyond basic
integration"; (3) opportunity: add a Spark Open (Baseten/Modal) fallback
route for the Best Open Weights bonus ($10K) — env-flagged, not yet wired.

## Rubric opportunities (where points hide)

| Criterion | Our strongest asset | Next lever |
|---|---|---|
| Impact 30% | Six+ tenant-isolated professional worlds + classrooms; downstream patients/defendants/buyers | One named community partner quote in the video (a local class) |
| Meta AI 25% | Wonder invents games from live gaps; Wonder reviews KB as second reader; Spark drafts enrichment | Live-key demo; Spark Open route for open-weights flag |
| Technical 20% | Mode-weighted selector, idea-unit fidelity, profound KB gate (422 rejection), 36 conformance tests | Keep `npm test` green on camera; show the audit gate rejecting a planted bad concept |
| Demo 25% | 13 playable games, 3 platforms, classroom Lotería moment, tango record unlock | Shoot the Lotería room moment and the Mirror changing — judges remember rooms, not dashboards |
| Bonus: Agentic $5K | Game Lab invention loop diagnoses → invents → critiques → playable preview | Name it explicitly in submission ("flag: agentic") |
| Bonus: Creative $5K | Milonga del Sentido (Wonder-era cultural translation) + Lab invention | Flag Creative; show a verse carry + record unlock |
| Bonus: Viral $20K / Community $10K | Lotería and tango are inherently shareable; classrooms give groups a reason to vote | Post the demo on X at launch; give the class a vote link in the video description |

## Polish standard adopted (spec §26)

Every game: scene-first canvas or constructed set where the genre allows,
feedback at the spot of action, sound on events (synth, mutable, never
autoplay), no Stage-N jargon on title screens, no affiliate links anywhere,
comfort mode available (gentle picks, pressure off the pedestal).
