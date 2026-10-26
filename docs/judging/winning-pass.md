# Winning Pass — ENTRE VOCES through the judges' rubric

Written by judging our own project against the Participant Guide. Every claim
below points at a file or a test; anything softer was cut.

## Track & problem statement

**Indie Developer · Build for Your World.** Professional interpreters are
scarce exactly where stakes are highest — Oregon clinics and courtrooms where
a dropped negation changes medicine or liberty. Existing tools teach words;
nobody teaches *the work* (listening under load, notes, memory, repair,
nerve) across every domain a community actually needs. ENTRE VOCES is the
engine for that work, configured per world. It is not a chatbot, not RAG,
not a medical-advice system (banned categories avoided by design: synthetic
practice only, no advice to patients, interpreters as the users).

## Stage One (pass/fail): Meta tooling, really used

- **Muse Wonder** invents games from live learner gaps (`POST /v1/ai/invent`,
  Console Game Lab + Hub Lab) with structured critique scores and provenance.
- **Muse Spark** drafts terminology enrichment (`POST /v1/ai/enrich`, author-only)
  — always `inferred: true` until human-validated. Speed serves specificity.
- **Muse Voice Transcribe** contract wraps speech observation (browser ASR
  offline path; server key upgrades the provider with zero contract change).
- **Muse Code (Wonder Full)** built the system — the spec, engine, and nine
  games are its work product, versioned in this repo.
- Proof surface: `GET /v1/ai/status` shows configured models + recent call
  log. **Without `META_API_KEY`, responses say `provider: "local-template"`.**
  We never fake a Meta call for judges; with the $150 credits key set, the
  same wire goes live. Test: `Meta adapter` in `tests/tenancy-generation.test.js`.

## Rubric map

| Criterion (weight) | Where it lives | Strongest single proof |
|---|---|---|
| Impact (30%) | Six tenant-isolated worlds (OR medical/legal, ON real estate, OR cultivation, CA tax, AI tech ES→EN); LEP patients, defendants, buyers, growers, taxpayers downstream of every interpreter trained | Tenancy suite: one learner, five careers, zero leakage (`tests/tenancy-generation.test.js`) |
| Use of Meta AI (25%) | Wonder invention, Spark enrichment, Voice observation, Spark-grade procedural generation at the doorbell | Hub → Game Lab → *Invent* with a learner who has played: concept is minted from *their* thinnest stage, labeled live-vs-local |
| Technical depth (20%) | Domain-config engine (no-code new worlds), 8-stage learner model with forgetting, diagnostic selector, fidelity taxonomy, offline merge, CPE wire v1 | `npm test` — 18 conformance/tenancy/generation/playtest checks, all in-process |
| Demo (25%) | Nine playable games, three platforms (web, WebXR, Roblox Studio) + voxel craft; 3-minute script below | `docs/demo/demo-script-3min.md` — every beat is reproducible live |

## The wow ladder (what judges should feel, in order)

1. **"It knows my world."** Pick Ontario Real Estate on the intro; every game,
   term, and recommendation is suddenly deeds and deposits — nothing medical leaks.
2. **"It watched me fail *specifically*."** Miss dose/dosage twice: the Mirror
   shows Stage 2 at risk, retention falling, and *diagnoses before prescribing*.
3. **"Wait — it invented a game for that?"** Wonder mints a concept from the
   gap, critiques itself in the open, and a playable preview submits real evidence.
4. **"I'm inside it / I'm building it / I'm on Roblox?!"** VR controllers carry
   shards; VocabCraft bridges stand or crumble; Puente Islands persist points.
5. **"My notebook is a game mechanic."** Night Shift's catch-stack-render makes
   Rozan note-taking tactile — the skill textbooks describe, hands finally do.

## Risks judges will probe (and honest answers)

- *ES/ZH quality without SMEs?* Variation sets, sourced seed, `inferred` flags; stated, not hidden.
- *Automated interpreting grades?* Idea-unit fidelity with uncertainty + dispute; never a proficiency verdict.
- *Why not one app?* Standalone static games + one CPE is the deployment truth of community programs (GitHub/Cloudflare Pages, offline wards, no IT department).
