# ENTRE VOCES — Progression Engine
## Engine-First Specification v2.1 — Research-to-Execution Plan
### Meta Global AI Developer Hackathon — October 26–November 4, 2026

**Product:** ENTRE VOCES is a domain-configurable **Progression Engine** for professional interpreting, with standalone games as thin clients. The engine is the product; games prove it.

**Seed instance (not hardcoded):** Oregon — Legal and Medical — English ↔ Spanish, English ↔ Mandarin Chinese. Any other jurisdiction, profession, or language pair is added by configuration, not code.

**Primary environment:** Mobile-first web. Games and console are static sites (GitHub Pages / Cloudflare Pages). One centralized progression service holds shared state.

**Development intelligence:** Muse Wonder Full through Muse Code. **Runtime AI:** Prefer Meta Model API (Muse Wonder / Spark / Voice Transcribe where available). **Team constraint:** Solo developer, no guaranteed bilingual SMEs on call.

**Reading rule:** §3 (Domain & Translation Area Model), §9 (Centralized Progression Engine), and §11 (Standalone Hosting) are normative. If a game conflicts with them, the game yields.

---

## 0. How to read this spec

- **MUST / MUST NOT** = acceptance gate. **SHOULD** = strongly expected; deviation needs a written reason in `docs/decisions/`. **MAY** = optional.
- Oregon Legal / Medical appear throughout as *worked examples* of a `DomainConfig`. Every table that lists Oregon content also states the general rule that produced it.
- "Engine" alone means the Progression Engine (§5–§9). "CPE" means the deployed centralized service implementing it. "EngineClient" means the offline-first SDK games embed. "Console" means the authoring/inspection UI for the engine.

---

## 1. Product objective — engine first

Build **one engine** that can learn what professionals must know in *any* configured domain, track what each learner can actually do, and serve that intelligence to *any* number of independently hosted games. Then demonstrate it with Oregon Legal + Medical and two excellent games.

### 1.1 The three capabilities, re-centered on the engine

| Capability | What the ENGINE owns (primary) | What a GAME owns (thin client) |
|---|---|---|
| **A. Knowledge intelligence** | Domain configs, concept graph, source provenance, terminology with variation, misconceptions, difficulty. | A presentation of knowledge (cards, scenes, dialogue). Never its own copy of truth. |
| **B. Learning intelligence** | Learner model (8-stage mastery × competence vector), evidence log, fidelity assessment, adaptive next-step selection with explanations. | Input capture and feedback rendering. Never its own scoring or progression. |
| **C. Game invention intelligence** | Audience/coverage analysis, portfolio gaps, concept generation with critique + provenance. | Only the invented interaction itself. |

**Invariant:** All three share one educational foundation (the engine's knowledge + learner state) while remaining independently testable. A game MUST be deletable without losing learner progress.

### 1.2 What success looks like at the deadline

1. An operator opens the **Engine Console**, creates or edits a domain (jurisdiction, profession, language pairs, translation areas), and the change is live for every game without redeploying any game.
2. Two standalone games on different static hosts (e.g., GitHub Pages + Cloudflare Pages) read the *same* concepts from the CPE and write evidence to the *same* learner record.
3. With the CPE unreachable, both games still play fully; evidence queues locally and syncs on reconnect with no loss or duplication.
4. The assessor can trace any taught concept to an authoritative source, and any adaptive recommendation to the evidence that caused it.

### 1.3 Explicit non-goals (v1)

- No certification or professional-readiness verdicts. The engine reports *evidence*, never "you are qualified."
- No arbitrary executable game generation. Runtime invention produces a *spec + playable template instance*, not new code (see §12).
- No storage of real patient/client data (PHI/PII). All practice content is synthetic and sourced from public professional material.

---

## 2. Engine principles (normative)

1. **Configuration over code.** Jurisdiction, profession, language pair, and translation area are data (`DomainConfig`). Adding "Washington — Education — EN↔ES" MUST NOT require changing engine, client, or game code.
2. **Standalone-first games.** Every game MUST be a static site that loads and is fully playable with zero backend. The CPE improves it (sync, adaptation, cross-game resume); it never gates play.
3. **One source of truth, two places it can live.** Authoritative knowledge + domain configs live in the CPE. Learner evidence lives first on device (append-only local log), then syncs to the CPE. Conflicts resolve by append-merge, never overwrite (see §9.3).
4. **Provenance everywhere.** Every concept, item, and recommendation carries `sourceIds` and, where inferred rather than documented, an explicit `inferred: true`. Unsupported professional claims MUST NOT silently enter the knowledge base.
5. **Conceptual mastery ≠ memorization.** Recognition success MUST NOT mark retrieval, application, or interpreting as mastered (eight distinct stages, §5.2). Assessment, adaptation, and game completion all respect this.
6. **Uncertainty is a first-class output.** Transcription confidence, assessment confidence, and competing error hypotheses are stored and shown. The engine MUST be able to say "gather more evidence" instead of diagnosing.

---

## 3. Domain & Translation Area Model — specify it in the engine

> This section answers: *"I should be able to specify the domains and area of translation there."* The Engine Console (§10) is the UI for exactly this. Oregon Legal and Oregon Medical below are the **seed configuration** shipped on day one — editable, forkable, deletable.

### 3.1 `DomainConfig` — the unit of configuration

One `DomainConfig` = one professional world the engine can teach. The engine holds a *registry* of them; games bind to one (or, for integrated scenarios, two) at launch via `?domain=` or their `game.config.json`.

| Field | Type | Rule | Oregon Medical example |
|---|---|---|---|
| `domainId` | slug, immutable | `^[a-z0-9][a-z0-9-]{2,48}$`, unique in registry | `oregon-medical` |
| `label` | localized string | Shown in pickers; `en` required | "Oregon — Medical Interpreting" |
| `jurisdiction` | `{ country, region, regionCode }` | Free region text + code; drives source selection, never logic branches | `{ country: "US", region: "Oregon", regionCode: "US-OR" }` |
| `profession` | enum + label | `medical \| legal \| education \| social-services \| other` (extensible by config) | `medical` |
| `institutions` | string[] | Bodies whose material is authoritative here | `["Oregon Health Authority", "OHSU"]` |
| `languagePairs` | `[{ source, target, direction: "bidirectional" }]` | BCP-47 codes; at least one; games MUST honor direction | `[{ source:"en", target:"es" }, { source:"en", target:"zh" }]` |
| `modalities` | enum[] | `consecutive \| simultaneous \| sight \| remote` supported in this domain | `["consecutive","sight"]` |
| `translationAreas` | `TranslationArea[]` | **The "areas of translation"** — see §3.2. At least one required. | Intake, Diagnosis, Consent… (Table 2) |
| `competencyWeights` | map competence→0..1 | Which of the 10 competencies (§5.3) matter most here; selector normalizes | Medical weights listening + fidelity high |
| `sourceIds` | string[] | FK → Source Register (§4.3). Every concept must trace here. | `["oha-hci-handbook-2024", …]` |
| `status` | `draft \| active \| archived` | Only `active` is served to games; draft visible in Console only | `active` |
| `version` | integer, engine-managed | Increments on every write; ETag for caching | `3` |
| `createdBy`, `updatedAt` | string, ISO-8601 | Audit | — |

**Validation (engine MUST reject with `422` + field errors):** duplicate `domainId`; empty `languagePairs` or `translationAreas`; a `translationArea` referencing an undeclared language pair; `sourceIds` pointing at a non-existent source; weights outside 0..1. A rejected write MUST leave the previous version untouched.

### 3.2 `TranslationArea` — where in the work interpreting happens

A translation area is a *situation family* inside a domain (a clinic phase, a court phase), not a topic tag. Concepts, spoken scenarios, and games all hang off areas, so coverage and adaptation are computed per area.

| Field | Type | Rule |
|---|---|---|
| `areaId` | slug, unique within domain | e.g. `informed-consent` |
| `label` | localized string | "Informed consent discussion" |
| `setting` | string | Where: "Outpatient clinic, pre-procedure" |
| `participants` | string[] | Roles: `["clinician","patient","family"]` |
| `goals` | string[] | Communicative goals that define success here |
| `typicalSpeechFeatures` | string[] | e.g. `hedging`, `numeric-precision`, `teach-back` (feeds §8) |
| `riskIfMistranslated` | `low \| medium \| high \| critical` | Drives assessment strictness + which errors are "consequential" |
| `conceptIds` | string[] | Concepts primarily taught in this area (a concept MAY appear in many areas) |
| `prerequisiteAreaIds` | string[] | Soft ordering for adaptation; cycles MUST be rejected |
| `order` | integer | Display/curriculum order |

### 3.3 Seed instance shipped day one (editable example, not schema)

**Domain A — `oregon-medical`** (EN↔ES, EN↔ZH; institutions: Oregon Health Authority + public clinical-communication sources)

| areaId | Setting | Risk | Speech features |
|---|---|---|---|
| `intake-registration` | Front desk / portal | medium | demographics, insurance terms, abbreviations |
| `history-symptoms` | Exam room history-taking | high | symptom qualifiers, timelines, hedged certainty |
| `diagnosis-explanation` | Diagnosis discussion | high | condition vs. symptom distinctions, probability language |
| `informed-consent` | Pre-procedure consent | **critical** | risks/benefits/alternatives, teach-back, legal register |
| `treatment-plan` | Plan + prescriptions | high | dosage vs. dose, frequency, adherence language |
| `discharge-followup` | Discharge instructions | high | warning signs, return precautions, informal paraphrase |

**Domain B — `oregon-legal`** (EN↔ES, EN↔ZH; institutions: Oregon Judicial Department + public court-interpreter preparation material)

| areaId | Setting | Risk | Speech features |
|---|---|---|---|
| `arraignment` | First appearance | high | charges, rights advisement, formal register |
| `plea-colloquy` | Plea hearing | **critical** | voluntariness, waiver language, yes/no fidelity |
| `evidence-testimony` | Direct/cross examination | high | objections, hearsay markers, speaker tracking |
| `sentencing-conditions` | Sentencing | high | conditions, dates, numeric precision |
| `victim-witness` | Witness interview | medium | narrative, self-correction, emotional variation |
| `sight-documents` | Sight translation of forms/orders | medium | written→spoken register shift, abbreviations |

Cross-domain area `professional-judgment` (role boundaries, clarification protocol, impartiality) exists in **both** domains — same engine, shared concepts, different vignettes. This proves the model is not two siloed apps.

### 3.4 Adding a new domain or area — the no-code checklist

An operator MUST be able to do all of this in the Console without touching code or redeploying games:

1. **Create domain** → fill jurisdiction/profession/institutions, pick language pairs + modalities. Engine assigns `version: 1`, `status: draft`.
2. **Add translation areas** → label, setting, participants, goals, risk, speech features; order them; set prerequisites.
3. **Attach sources** → register each authoritative source (§4.3) with jurisdiction + permitted-use note.
4. **Seed concepts** → author or import concepts (§4.1), each linked to ≥1 source and ≥1 area, with terms per language, acceptable variation, and misconceptions.
5. **Set competency weights** → e.g., Education weights sight + terminology higher than simultaneous.
6. **Preview** → Console renders the domain as games will see it (concept browser, coverage per area, missing-translation warnings).
7. **Activate** → `status: active`. Games listing domains (via `GET /v1/domains?status=active`) pick it up on next load; already-open games keep their bound domain until relaunched (stated in UI).

**Acceptance gate (new in v2):** A reviewer creates a toy third domain (e.g., "Oregon — Education — EN↔ES", two areas) in the Console and, without any code change or game redeploy, plays an existing game against it using its concepts. If that needs a developer, the engine has failed its central requirement.

### 3.5 Research that feeds configuration (not hardcoded)

The seed tables above are hypotheses to validate in Phase E0 research (§18): Oregon Health Authority health-care-interpreter standards and Oregon Judicial Department court-interpreter resources are investigated first; each seed area/concept that survives carries its source. Areas with no authoritative support are marked `inferred: true` or cut. Learner-population research (§16) then sets `competencyWeights` and default difficulty — populations are *inputs to config*, never labels pasted onto pre-made games.

---

## 4. Knowledge model — what the engine knows

### 4.1 `Concept` (the teachable unit)

| Field | Rule |
|---|---|
| `conceptId`, `domainId`, `areaIds[]` | Belongs to one domain, usable in many areas. |
| `terms` | Per language: `{ term, alternatives[], register, note }`. Multiple legitimate equivalents MUST be representable; one "correct" string is a bug. |
| `definition` | Per language, plain + professional register. |
| `distinctions[]` | Near-neighbors with *why they differ* (e.g., dose vs. dosage). At least one for `critical`/`high` areas. |
| `misconceptions[]` | `{ description, diagnosticPrompt }` — the wrong idea an error reveals. |
| `examples[]` | Contextual sentences per language + area, each with `sourceIds`. |
| `relationships[]` | `{ type, targetId, documented: bool }` — broader/narrower, prerequisite, cause-effect, confusable-with, informal-vs-professional, misleading-literal. Documented vs. inferred MUST be distinguished. |
| `difficulty` | `1..5` prior estimate; engine refines from evidence. |
| `competences[]` | Which competencies (§5.3) this concept exercises. |
| `sourceIds[]`, `inferred` | Provenance. `inferred: true` concepts are visually flagged in Console and excluded from any "authoritative" claim. |

The same concept MUST support terminology, conceptual, usage, listening, and interpreting activities without being rewritten per activity (content engine, §7, renders it differently; the knowledge does not fork).

### 4.2 Knowledge-acquisition problems the model must express (from research, §2.1 of v1)

Remembering terms; understanding the concept behind a term; distinguishing confusables; bilingual equivalents + legitimate variation; misleading literals; abbreviations; institutional procedures; professional-vs-everyday register; collocations; rapid retrieval; accurate sentence use; recognizing informal paraphrase; applying knowledge in speech. If a concept cannot support these distinctions, the schema — not the game — is fixed.

### 4.3 Source Register

Every source: `{ sourceId, title, publisher, url, jurisdiction, publishedOrRevised, audience, authority: high|medium|low, permittedUse, instructionalRelevance, limitations }`. The Console MUST show, for any concept, its sources in one click. **Gate:** the engine can explain where any taught concept originated; AI-generated professional claims without a source stay out of the authoritative base (they may exist only as flagged drafts).

---

## 5. Learner & evidence model — what the engine learns about the learner

### 5.1 `EvidenceEvent` (append-only, the atom of learning)

`{ eventId (UUID, client-generated → idempotent), learnerId, domainId, conceptId, areaId, gameId, activityType, stage, languageDirection, correct, score 0..1, assistance[] (hints/repeat/clarification), confidence 0..1, fidelity? (§8.3), misconceptionTag?, responseSummary (no raw PHI), clientTs, serverTs }`

Evidence is **never edited or deleted** by sync; corrections are new events. Games submit evidence; only the engine interprets it.

### 5.2 Eight mastery stages (per concept, per learner — never collapsed)

1. Recognize a word → 2. Remember its equivalent → 3. Understand the concept → 4. Distinguish from neighbors → 5. Apply in context → 6. Retrieve under time/memory pressure → 7. Use appropriately in speech → 8. Preserve meaning while interpreting.

Mastery is a vector of 8 estimates (each `{ estimate 0..1, evidenceCount, lastSeen, confidence }`), not a single bar. A game reporting stage-1 success updates stage 1 only.

### 5.3 Competence vector (cross-concept, per learner per domain)

Domain knowledge · Professional terminology · Bilingual terminology · Terminology usage · Listening comprehension · Speech production · Meaning transfer · Cognitive interpreting (memory/load) · Professional judgment · Integrated performance. Each is derived from staged evidence (documented mapping in engine code + tests), decayed by recency, and always presented with evidence counts — never as a validated proficiency level.

### 5.4 Learner state API shape

`LearnerState = { learnerId, domainId, stages: { [conceptId]: StageVector }, competences: { [key]: { estimate, evidenceCount, confidence } }, recentErrors[], dueForReview[] (spaced repetition), lastActivityAt }`. The CPE computes it from the evidence log; EngineClient mirrors it locally so games adapt offline identically.

---

## 6. Adaptive engine — deciding what happens next

Given `LearnerState` + `DomainConfig`, the engine returns `NextRecommendation { conceptId, areaId, stage, activityType, suggestedGameId?, rationale (human-readable), alternatives[], needsDiagnostic: bool }`.

**Decision policy (v1, explainable rules over opaque scores):** prioritize (a) critical-area gaps, (b) recurring misconception tags, (c) due-for-review concepts, (d) the lowest-evidence-weighted competence for the bound domain, (e) prerequisite areas before dependents. When evidence supports ≥2 competing causes (e.g., terminology vs. memory vs. transcription), the engine MUST return `needsDiagnostic: true` with a discriminating activity instead of committing to one cause.

**Gates:** different error patterns produce demonstrably different next activities; every recommendation's rationale names the evidence behind it; reinforcement, new introduction, context change, complexity increase, recognition→production promotion, spoken-demand addition, and error revisits are all reachable outcomes (not "harder every time").

---

## 7. Content-generation intelligence

The content engine renders `Concept` × `TranslationArea` × stage into activity items. **Families of evidence** (not game mechanics): terminology, conceptual reasoning, contextual usage, bilingual practice, retrieval, listening, spoken production, interpretation, integrated scenarios.

Every generated item MUST carry: what is taught, why it matters, source(s), success criteria, likely-misconception signals, acceptable answers (set, not single string), uncertainty, difficulty, competencies exercised, language direction. Bulk generation expands a small sourced collection; volume never excuses failed checks: source alignment, internal consistency, difficulty fit, direction correctness, unsupported facts, near-duplicates, ambiguous expectations, audience fit. Generation MUST be reproducible (seeded) and invalid items MUST be identifiable with reasons (§17 tests).

Runtime generation via Meta Model API (Wonder for semantic/design reasoning, Spark for fast structured items) is *optional enrichment*: the engine MUST work with zero AI calls from its seeded knowledge, so standalone games function offline and for free.

---

## 8. Spoken Reality Engine

**Generation:** transform structured knowledge into plausible speech varying pauses, hesitation, informal terminology, self-correction, certainty shifts, sentence structure, rate, speaker change, contextual reference, memory demand, and emotional variation — only dimensions that are generatable, testable, and demonstrably educational are enabled per area (`typicalSpeechFeatures`).

**Input:** Meta speech capabilities where supported (Muse Voice Transcribe at runtime). A transcript is an *observation*, not ground truth: store `{ transcript, confidence, alternatives }`; distinguish likely learner error from likely transcription error; learners MUST be able to inspect and dispute a transcript, and disputing MUST create evidence, not silently rewrite history.

**Assessment (§6.3 fidelity taxonomy — never a single similarity score):** meaning preserved / omitted / changed / added-unsupported, plus contextually acceptable variation, professional-distinction impact, and assessment uncertainty. Consequential errors (critical areas, changed negation/number/obligation) MUST be treated differently from faithful paraphrase.

**Loop (the core demonstration):** professional knowledge → spoken challenge → learner response → assessment → explanation → diagnostic follow-up (§6.4 hypotheses: conceptual gap, recall failure, spoken-recognition failure, retrieval failure, grammar, memory overload, production, transcription error — engine gathers evidence before concluding).

---

## 9. Centralized Progression Engine (CPE) — the service

### 9.1 Responsibilities and non-responsibilities

| CPE owns | CPE never does |
|---|---|
| Domain registry (configs, versions), concept graph, source register | Render games or hold game assets |
| Learner registry (pseudonymous IDs), evidence log, computed learner state | Require an account to play (anonymous learner ID works) |
| Adaptive recommendations, coverage analytics | Store raw audio by default (transcripts + confidence only; audio only with explicit consent, auto-expiring) |
| Game-concept artifacts + provenance (§12) | Hold per-game secrets or API keys for games |

Reference deployment: **Cloudflare Workers + D1** (single `wrangler.toml`; D1 migrations in `services/progression-engine/`). The wire protocol — not the vendor — is the contract: any host implementing §9.2 (Node, Workers, Deno) is a valid CPE. Local development runs the same code via `wrangler dev` or the bundled zero-dependency Node server.

### 9.2 Wire protocol v1 (normative summary; full schemas in Appendix A/B)

Base: `https://<cpe-host>/v1`. All bodies JSON; all writes accept `Idempotency-Key` (the client `eventId`); all list endpoints paginate with `?limit=&cursor=`; domain/concept GETs send `ETag`/`If-None-Match`.

| Endpoint | Purpose | Key semantics |
|---|---|---|
| `GET /v1/health` | Liveness + version | public, cacheable 30s |
| `GET /v1/domains?status=active` | Registry for pickers/games | ETag-cached |
| `GET /v1/domains/:domainId` | One config (incl. translation areas) | `404` unknown; draft hidden unless `?includeDraft=` + author role |
| `POST /v1/domains` · `PUT /v1/domains/:domainId` | Create/update config (Console; author role) | Validated per §3.1; `409` on stale `version` (optimistic concurrency); returns new `version` |
| `GET /v1/concepts?domainId=&areaId=&limit=&cursor=` | Knowledge for games/content engine | Stable sort by `conceptId` |
| `POST /v1/concepts` (bulk) | Seed/import (Console/CLI) | Per-item results; invalid items rejected individually with reasons |
| `POST /v1/learners` | Create pseudonymous learner `{ displayName?, languagePair? }` → `learnerId` | No email/password required in v1 |
| `POST /v1/evidence` | Submit batch `EvidenceEvent[]` | Idempotent on `eventId`; returns per-event `{ accepted, duplicate? }`; append-only |
| `GET /v1/evidence?learnerId=&domainId=&since=` | Sync/pull + Console inspection | `since` = server cursor; ordered by `serverTs` |
| `GET /v1/learners/:learnerId/state?domainId=` | Computed `LearnerState` (§5.4) | Derived, cacheable per latest `eventId` |
| `GET /v1/next?learnerId=&domainId=&excludeGameId=` | `NextRecommendation` (§6) | Explainable; `needsDiagnostic` explicit |
| `POST /v1/concepts/generate` (optional) | Runtime item/concept drafting via Meta API | Requires server-side Meta key; games NEVER call Meta directly with a key |

**Errors:** RFC-7807-ish `{ type, title, status, detail, fieldErrors? }`. `400` malformed, `401/403` role, `404`, `409` version/duplicate, `422` domain validation, `429` rate limit with `Retry-After`. Games MUST treat `5xx`/network failure as "play locally, queue sync" — never as a blocking error screen.

**Auth (v1, deliberately minimal):** learners are bearer-less pseudonymous IDs (unguessable UUID, stored on device) — appropriate for a hackathon demo with synthetic data, documented as such. Author writes (domain/concept mutation) require `Authorization: Bearer <AUTHOR_TOKEN>` held only by Console operators and the CPE server, never embedded in shipped games. Production hardening path (accounts, consent, FERPA/HIPAA-adjacent review) is specified as future work (§20), not pretended.

### 9.3 Offline-first & sync semantics (the standalone guarantee)

- EngineClient keeps the **full local evidence log + mirrored learner state** in `localStorage` (`ev:<learnerId>:<domainId>`), plus a `pending` outbox. Games read/write locally first; sync is background (`navigator.onLine`, visibility return, manual "Sync now").
- Push: `POST /v1/evidence` with the outbox; server dedupes on `eventId`. Pull: `GET …?since=<cursor>` merges server events (including from other devices/games) into the local log; learner state is then recomputed locally by the *same* engine-core code the server runs, so online and offline adaptation agree.
- No event is ever overwritten or deleted by sync. Clocks: `clientTs` is advisory; ordering uses server arrival + `eventId` tiebreak; displayed times use `clientTs` with skew noted.
- **Acceptance:** airplane-mode play across two games, then reconnect → one merged history, zero duplicates, recommendations reflect both games' evidence (automated test, §17).

### 9.4 Privacy, retention, safety

Practice content is synthetic; the engine MUST reject evidence payloads containing fields outside the schema (minimization by construction). No raw audio persisted by default. Learner IDs are pseudonymous; display names are optional and device-local unless synced by choice. Data export (`GET /v1/learners/:id/export`) and delete (`DELETE /v1/learners/:id`, author/owner) MUST exist in the Console for demo integrity. Oregon source material is used within its public/permitted terms (§15); the register records the basis per source.

### 9.5 Versioning & migrations

Wire is versioned in path (`/v1`); additive changes stay in v1, breaking changes get `/v2` with both served during migration. `DomainConfig.version` + concept `updatedAt` allow games to cache safely. CPE stores are migrated by numbered, idempotent migrations; a migration MUST be runnable against an empty store (fresh deploy) and the seed store.

---

## 10. Engine Console — specify domains and areas here

The Console is the engine's front door (static site, same hosting rules as games, plus the author token entered at runtime and kept in `sessionStorage` only).

**Required screens:**

1. **Domain Studio** — registry table (label, jurisdiction, profession, pairs, areas, status, version); create/edit form implementing §3.1–3.2 exactly (language-pair picker, translation-area editor with risk + speech features + prerequisites, competency-weight sliders, source attachment); live validation mirroring server rules; Activate/Archive; "Preview as game" (renders domain via the real `GET` endpoints); export/import domain JSON. **The §3.4 toy-domain gate is performed here.**
2. **Knowledge Browser** — concepts per domain/area with terms in all languages, distinctions, misconceptions, relationships, and one-click provenance to sources; missing-translation and inferred-content warnings; bulk import with per-item results.
3. **Learner Inspector** — pick a learner → 8-stage vectors per concept, competence bars *with evidence counts*, full evidence log (filter by game/area/stage), current `NextRecommendation` with rationale, sync status. "This learner on another game" is the same record — the demo moment.
4. **System** — CPE health/version, counts (domains/concepts/learners/events), seed/reset demo data (guarded), engine-URL config for pointing the Console (and copied game links) at any CPE.

Look: warm paper/teal/amber editorial system shared with games (Fraunces + Public Sans, ink outlines, ≥44px targets) — but the Console is a *tool*: dense, scannable tables and forms, no game theatrics. It MUST be fully usable keyboard-only and respect `prefers-reduced-motion`.

---

## 11. Standalone games & hub — thin clients on static hosting

### 11.1 Hosting requirement (normative — the added requirement, now core)

- Every game and the hub MUST be a **static site**: `index.html` + CSS + JS (+ JSON config/assets), no server-side code, no build-time secrets. Reference hosts: **GitHub Pages** and **Cloudflare Pages**; any static host qualifies.
- Each game MUST be deployable **independently**: its own folder (`apps/games/<gameId>/`) is a complete site root. It MUST work at a domain root, a project subpath (`/entrevoces/games/<id>/`), or its own subdomain — all asset/engine URLs are relative or configured, never hardcoded to one origin.
- The only runtime backend any game contacts is the CPE (§9), via the configured `engineUrl` (precedence: `?engine=` query → `game.config.json` → hub-provided `localStorage` value → bundled demo default). If `engineUrl` is unreachable, the game runs in **local-only mode** (bundled seed concepts + local learner state) and says so with a small, non-blocking badge.
- CORS: the CPE allows configured Pages origins (`*` for the public read endpoints in demo mode, allowlist for author writes). CSP guidance and `_headers` examples ship in `docs/runbooks/deploy-static.md`. No game ships a Meta API key; AI enrichment goes through the CPE (§9.2) or is pre-generated at build/content time.
- **Demo topology used for judging:** Hub + Game A on GitHub Pages, Game B on Cloudflare Pages, CPE on Cloudflare Workers — three deployables, one learner. Local development mirrors it with three `python3 -m http.server` ports + the Node CPE.

### 11.2 Game contract (`game.config.json` + EngineClient)

Every game ships `game.config.json`: `{ gameId, label, domainIds[], competences[], stages[], engineUrl, offlineSeed: "concepts-subset.json", version }`. At boot the game: (1) resolves `engineUrl` + `learnerId` (creates a pseudonymous one locally if absent), (2) loads concepts (CPE → cache → bundled seed, in that order), (3) plays using engine-core assessment helpers, (4) submits `EvidenceEvent`s through EngineClient (local-first, background sync), (5) asks the engine for what's next instead of inventing progression. A game MUST NOT implement its own interpretation scoring, mastery math, or cross-session storage format.

### 11.3 Initial portfolio (examples that prove breadth — invented after E0 research, not before)

Portfolio selection follows §12 research; the following are the *planned vertical slices*, each with a distinct interaction and educational responsibility (no shared quiz template):

- **Concept Clinch** (knowledge acquisition flagship): distinguish near-neighbor concepts in scene context, place the correct bilingual equivalent into live dialogue, then produce a short use — evidence at stages 1–5 per concept across two contexts before "mastered."
- **Shift: Consecutive** (spoken reality): consecutive-interpreting shift with waveform turns, hold-to-record (Web Speech API with typed fallback), repeat/clarification as logged assistance, and §8.3 fidelity feedback (preserved/omitted/changed/added + dispute-the-transcript).
- **Bench Call** (professional judgment, lightweight): Oregon-sourced role-boundary dilemmas with principle explanations linked to sources — proves the second domain cheaply and honestly.

Quality bar per game: touch-first (≥44px), clear rules in ≤2 lines, immediate consequence feedback, meaningful progression *sourced from the engine* (not local levels), replay variation from the concept graph, accessible presentation, fast recovery from interruption, distinctive visual/interactive identity within the shared art system, and comprehensible to an unfamiliar user without a manual.

### 11.4 Hub

The hub is also static and also a thin client: domain/language picker (writes the choice games will read), Continue (renders the engine's `NextRecommendation`), portfolio grid (each card deep-links to that game's standalone URL with `?domain=&learner=&engine=`), progress overview (LearnerState visualization), Game Lab entry (§12), and source explorer. The hub holds no learner truth of its own.

---

## 12. Game invention intelligence — visible, honest, provenanced

**Development-time:** Muse Wonder Full (via Muse Code) invents from E0 research (learner profiles, barriers, competencies, knowledge, speech capabilities, mobile constraints, existing coverage) — broad divergent candidates first (hook, decisions, actions, state, success/failure, progression, replayability, learning responsibility + required evidence, accessibility, feasibility, why it satisfies), then portfolio optimization (competency/knowledge-vs-performance coverage, interaction variety, digital-comfort spread, language/domain coverage, redundancy, technical cost, evidence quality). Weak contributors are eliminated; inclusion needs a distinctive justification. Full provenance is preserved (evidence considered, candidates, criticism, rejections, overlap analysis, rationale) as product content the demo can show.

**Runtime (deployed app):** the Game Lab takes audience + skill-gap + portfolio inputs, examines domain knowledge and coverage via the engine, proposes an original interaction with hook + overlap evaluation, revises/rejects weak proposals with visible scores, and emits an implementable design artifact; where the artifact matches a template family, it instantiates as an immediately playable micro-game. Model division is benchmarked, not presumed (Wonder: design/semantic reasoning; Spark: fast structured adaptation; Voice Transcribe: speech; ordinary code: game state/persistence). **Honesty rule:** idea ≠ specification ≠ playable ≠ new mechanic; the UI labels which it is showing, with generation provenance. A changed audience/gap/portfolio MUST produce a substantively different, defensible recommendation (acceptance gate).

---

## 13. Deployment topologies

```
A) Local demo (default)          B) Hackathon judging            C) New-domain rollout
Hub :8000 ─┐                     GH Pages: hub+Clinch            Console ──► CPE (new DomainConfig active)
Clinch :8001 ├─► CPE :8787       CF Pages: Shift      ──► CPE    Games unchanged; pick up domain on next load
Shift  :8002 ┘    (Node/Workers) CF Workers: CPE (D1)
Console:8003                     Console: CF Pages
```
All topologies use identical game builds; only `engineUrl` differs. Rollback = point `engineUrl` at the previous CPE or go local-only; no game redeploy.

---

## 14. Non-functional requirements

- **Performance:** static game first paint < 2.5s on mid-tier Android over 4G (budget: ≤ 350KB initial JS+CSS per game, lazy audio); CPE p95 < 300ms for reads at demo scale; `NextRecommendation` computed from cached state, never a synchronous AI call in the play loop.
- **Reliability:** games autosave locally on every evidence event; refresh/crash loses at most the in-progress utterance; CPE writes are idempotent so retries are safe.
- **Accessibility:** WCAG 2.2 AA targets — contrast, focus visibility, keyboard operation, screen-reader labels for all game actions, captions/text alternatives for audio, ≥44px targets, `prefers-reduced-motion` honored. Speech features always have a typed path.
- **Internationalization:** all UI strings externalized; EN/ES/ZH content parity is *reported* by the engine (missing-translation warnings), never silently fallen back in assessment.
- **Security:** no secrets in static artifacts; author token never shipped; CPE validates all payloads against schemas; output encoding in Console (learner display names are untrusted).
- **Observability:** CPE structured logs (request id, endpoint, status, ms); Console System screen surfaces counts + last errors; games expose `?debug=1` sync-state panel for the demo.

---

## 15. Data governance & sourcing

Research Oregon Health Authority (health-care interpreter training/credentialing, HCI standards, ethics, terminology) and Oregon Judicial Department (court interpreter standards, terminology/procedures, consecutive/simultaneous/sight guidance) first; evaluate every candidate source for authority, jurisdiction, date, audience, copyright/permitted use, instructional relevance, example suitability, and limitations, and record it in the Source Register (`content/sources/`). Generated training may only be *supported* by registered sources; everything else is labeled inference. Copyrighted text is summarized/linked, never bulk-copied into concepts.

---

## 16. Learners & learning science (research inputs to the engine)

Investigate realistic populations (aspiring interpreters, bilingual staff, students, working professionals) across aspirations, domain knowledge, proficiency, digital comfort, barriers, motivation, practice time, accessibility needs, and language combinations — documented evidence separated from hypotheses — and how domain knowledge, retrieval practice, conceptual understanding, auditory comprehension, and spoken interpreting develop along **Knowing → Remembering → Applying → Producing → Interpreting**. Outputs are *engine inputs*: learner profiles, the provisional→validated competency map (§5.3), `competencyWeights` defaults, and difficulty priors — each traceable, each revisable in config. The game portfolio (§11.3/§12) MUST trace to these findings.

---

## 17. Evaluation & calibration (repeatable, not vibes)

| Suite | Proves | Method |
|---|---|---|
| Knowledge | Source correspondence, distinction handling, direction correctness, no invented authority | Gold concept set + generated-item checks (§7) |
| Learning | Recognition≠recall≠understanding≠application; acceptable variation accepted; subtle meaning change caught; no overconfident feedback | Contrastive evidence scripts driving engine-core directly |
| Spoken | Clear/noisy/hesitant/self-corrected/short/long inputs; faithful paraphrase vs. critical error; ambiguous transcription handled | Fixture transcripts + confidence cases (§8) |
| Engine/CPE | Domain CRUD validation, optimistic concurrency, idempotent evidence, pagination, offline merge with zero duplicates | API integration tests (Node test runner, ephemeral store) |
| Standalone | Each game plays with CPE down; subpath + root deploys; engineUrl precedence | Static-serve each app folder alone + Playwright smoke (when browser available) |
| Games & invention | First-time comprehensibility, distinctiveness, replayability, portfolio-gap reasoning responding to changed inputs | Play checklist + Lab scenario pairs |

Automated model agreement is never presented as professional interpreter evaluation. Known failures are documented alongside results; demo-critical behaviors MUST be reproducible on demand.

---

## 18. Delivery plan — engine first (hackathon calendar)

| Phase | Target | Deliverable & gate |
|---|---|---|
| **E0 Research** | Oct 26 | Source register (Oregon medical+legal), learner profiles, learning-science notes, competency-map proposal. Gate: every seed concept traceable. |
| **E1 Engine core** | Oct 27 | Schemas, knowledge model, learner model, adaptive selector in `packages/engine-core` with unit tests. Gate: same knowledge drives 3 activity renderings; staged-mastery tests pass. |
| **E2 CPE + Client** | Oct 27–28 | CPE (§9.2) + EngineClient offline sync; Console Domain Studio. **Gate: §3.4 toy-domain test + §9.3 airplane-mode merge test pass.** |
| **E3 Content + Spoken** | Oct 28–29 | Content pipeline (seeded, checked) + one full spoken loop (knowledge→challenge→response→assessment→explanation→follow-up). Gate: paraphrase vs. consequential error distinguished; uncertain transcription disputable. |
| **E4 Games** | Oct 30–Nov 1 | Hub + Clinch + Shift (+ Bench Call if E1–E3 are green) as standalone static sites on mixed hosts. Gate: unfamiliar user plays without a manual; two hosts, one learner. |
| **E5 Invention** | Oct 31–Nov 1 | Game Lab (dev-time portfolio provenance + runtime propose/critique/instantiate-template). Gate: changed inputs → different defensible recommendation. |
| **E6 Validate + Demo** | Nov 1–3 | Benchmark suite (§17), 3-minute demo (open on play → reveal knowledge depth → reveal spoken intelligence → reveal invention → close on one-engine-many-domains), hardening (mobile/touch/speech-permission/API-failure/loading/persistence/accessibility), freeze Nov 3. **Submission: Nov 4, 2026, 9:00 PM ET / 6:00 PM PT** (confirm against final organizer rules). |

---

## 19. Prioritization under time pressure

**Tier 1 — Essential (engine first):** (1) Domain/area configuration + seed Oregon Legal/Medical knowledge with provenance; (2) CPE + offline-first EngineClient + Console Domain Studio; (3) learner evidence + adaptation shared across games; (4) terminology/conceptual practice + one meaningful spoken loop served by the engine; (5) one excellent standalone playable game + hub on static hosting; (6) demonstrable research-based game ideation; (7) reliable 3-minute demo.

**Tier 2 — Strongly preferred:** second/third complementary games; both ES and ZH fully working; realistic speech variation; finer error-cause diagnosis; visible invention reject/revise; a playable Lab-generated concept; cross-host (GitHub + Cloudflare) judging topology live.

**Tier 3 — Only if Tier 1 is green:** extensive curriculum, large terminology sets, many games/voices, social/multiplayer, arbitrary executable generation, advanced asset generation, more jurisdictions (via config — the engine already allows it), readiness prediction, certification-style assessment.

**Scope philosophy:** breadth of *capability* over breadth of content; one engine serving two distinct games beats six skins over one quiz; a trustworthy spoken assessment that knows its limits beats a fluent-sounding score; one well-justified invented concept beats a gallery.

---

## 20. Risks, assumptions, open questions

- *Meta API availability/limits unverified* → engine and games MUST demo with zero runtime AI calls; AI enriches, never blocks. Verify hackathon rules + Meta capabilities in E0 and record findings in `docs/research/`.
- *No bilingual SME on call* → all ES/ZH seed content is flagged for review; assessment accepts variation sets rather than single references; limitations stated in demo.
- *Speech recognition variance* → typed fallback everywhere; confidence + dispute flow are features, not error states.
- *Solo-developer bandwidth* → engine-first ordering means cutting games (Tier order) never cuts the product's core claim.
- *Pseudonymous-ID privacy is demo-grade* → synthetic data only; production auth/consent is future work, explicitly out of the judging claim.
- Open: final hackathon rules/deadline confirmation; Meta model/voice endpoint selection (benchmarked in E3/E5); D1 vs. KV for evidence at demo scale (default D1).

---

## 21. Glossary

**DomainConfig** — one professional world (jurisdiction + profession + pairs + areas). **TranslationArea** — a situation family inside a domain. **Concept** — a teachable professional idea with multilingual terms and provenance. **EvidenceEvent** — one observed learner action, append-only. **LearnerState** — engine-computed mastery/competence view. **CPE** — the centralized service implementing this spec's API. **EngineClient** — the offline-first SDK inside every game. **Console** — the engine's authoring/inspection UI.

---

## 22. Generation system — making new stuff with the engine (normative)

Generation is a *system with inputs and guarantees*, not a prompt and a prayer. Three generators, all deterministic at their core, all usable offline, all exposed identically through engine-core, the CPE, and the Admin Tool (§23):

| Generator | Input | Output | Guarantee |
|---|---|---|---|
| **People** (`generateClient` / `generateNight`) | DomainConfig + concepts + LearnerState + seed | Specific person: name, role, quirk, stake, area/concept, Gile effort profile, `whyYou` tied to the learner's thinnest stage | Same seed ⇒ same person (reproducible, testable). No two people in a night share a concept. Effort ramps gentle → demanding. |
| **Practice** (`generateItem` / `generatePracticeSet`) | Concept × Area × Stage × language | Item with teaching target, acceptable-answer *set*, misconception signals, provenance, uncertainty | Seeded reproducibility; `validateItems` MUST pass (provenance present, no duplicate prompts, answers non-empty) before anything reaches a game. |
| **Portfolio** (Game Lab) | Audience + gap + coverage | Labeled concept (idea / specification / playable-template) with originality/evidence/feasibility reasoning and full provenance | Honesty labels are normative (§12): a specification is never presented as playable. |

**Spark at runtime (extreme, but caged):** the CPE MAY enrich generation with Meta Spark (fast structured drafting) behind `POST /v1/generate/*`. Enrichment output enters only as `inferred: true` drafts until validated (schemas + provenance + `validateItems`); games MUST remain fully playable with enrichment disabled. Speed is showcased as *specificity at the doorbell* — a new person minted from live gaps in milliseconds — never as generic text volume.

**Authoring new content without code:** (1) Console or Admin creates/edits the DomainConfig; (2) concepts are added via `POST /v1/concepts` or Admin import (per-item validation results); (3) `admin generate night --domain <id>` previews exactly who games will mint; (4) Activate. A new *game* is scaffolded by `admin scaffold game <id>` (contract-valid folder: `index.html`/`style.css`/`game.js`/`game.config.json`/`concepts-subset.json`) and MUST pass the §11.2 contract + conformance tests before listing in the hub.

## 23. Admin Tool — the local operator surface (normative)

The Admin Tool (`tools/admin/`, zero-dependency Node, runs on the developer's machine) is the scriptable twin of the Console. It MUST provide, against a local engine-core and/or a running CPE (`--engine <url>`, `--token` for author writes):

- `validate` — every seed DomainConfig/Concept/Source, every `game.config.json`, every content mirror; exit non-zero with field errors on any failure. This is the conformance gate (§24).
- `health` / `domains` / `concepts` — inspect any CPE (or the local seed with `--local`).
- `generate client|night|practice` — preview generation (§22) as games will see it, with seeds for reproducibility.
- `scaffold domain <id>` / `scaffold game <id>` — emit contract-valid starting points (draft domain JSON; standalone game folder) that validate immediately.
- `export content` — regenerate `content/domains/*.json` + `content/sources/register.json` from the canonical seed (single source of truth: `packages/engine-core/seed-data.js`; mirrors are artifacts, never hand-edited).
- `sync subsets` — regenerate each game's `concepts-subset.json` so standalone deploys never drift from the engine.

Local-first rule: every read/generate/validate command MUST work with no CPE running. Writes to a CPE require the author token and MUST surface 409/422 responses verbatim.

## 24. Conformance matrix & known gaps

Conformance is tested, not asserted. `tests/conformance.test.js` (Node test runner, zero dependencies) is the durable gate; `admin validate` runs the same validators as a CLI.

| Spec claim | Implemented in | Durable check |
|---|---|---|
| §3 Domain/area validation (incl. cycles, weights, pairs) | `engine-core/validate.js` → CPE `422`, Console, Admin | conformance: valid seeds pass; duplicate/cycle/weight mutations fail |
| §5 Eight stages never collapsed; retention scheduling | `engine-core/learner.js` (`stabilityDays`, `predictedRetention`, `dueForReview`) | conformance: stage isolation; retention decays; due queue orders by fade |
| §6 Diagnostic instead of false diagnosis | `engine-core/selector.js` (`needsDiagnostic`) | conformance: repeated misconception ⇒ diagnostic |
| §7 Item contract + bulk checks | `engine-core/content.js` (`validateItems`) | conformance: practice set validates; sourceless item rejected |
| §8 Fidelity taxonomy (paraphrase ≠ distortion) | `engine-core/fidelity.js` | conformance: negation flip is consequential distortion |
| §9 Wire v1 incl. idempotency + optimistic concurrency | `services/progression-engine/server.js` | README examples; CPE handler exercised in conformance (in-process, no socket) |
| §9.3 Offline merge, zero duplicates | `engine-client` + `mergeEvidence` | conformance: merge by `eventId` |
| §10 Console specifies domains/areas | `apps/engine-console/` | Manual gate §3.4 (toy domain) + `admin validate` on exported JSON |
| §11 Standalone games, one learner, distinct verbs | `apps/games/*` (BUILD / ENDURE / DECIDE) | conformance: every `game.config.json` validates; evidence `gameId`s match configs |
| §22 Generation specificity | `engine-core/generator.js` + CPE `/v1/generate/*` | conformance: seeded reproducibility + intra-night variety |

**Gap register (v2.1 audit — closed in this revision unless marked open):** (G1) machine-readable schemas now live in `packages/engine-core/schemas/`; (G2) runbooks now in `docs/runbooks/`; (G3) CPE generation endpoints added (`/v1/generate/client|night|practice`); (G4) durable conformance suite added (`tests/`); (G5) content mirrors generated (`content/`); (G6) game labels aligned to shipped names (Voice Atelier / Night Shift) with stable `gameId`s; (G7) root `package.json` + Pages workflow added; (G8) Admin Tool added (§23). **Open, honestly:** (O1) full simultaneous-booth simulation (Tier 3 — pressure/rapid-retrieval only, labeled); (O2) certified SME review of ES/ZH renderings; (O3) Workers/D1 port parity test (Node CPE is the tested reference); (O4) production auth beyond pseudonymous IDs + author token.

---

## Appendix A — JSON Schemas (abridged; machine-readable copies live in `packages/engine-core/schemas/`)

`DomainConfig`, `TranslationArea`, `Concept`, `Source`, `EvidenceEvent`, `LearnerState`, `NextRecommendation`, and `GameConfig` are defined as JSON Schema (draft 2020-12) in code and validated identically by CPE, EngineClient, and Console. Field rules in §3–§5 are the human-readable projection of those schemas; where they disagree, the schema + its tests win and this document is corrected.

## Appendix B — API examples

Worked request/response pairs (create domain, seed concept, submit evidence batch with a duplicate, fetch state, fetch next recommendation, offline-merge pull) live in `services/progression-engine/README.md` and are exercised verbatim by the integration tests.

## Appendix C — Deployment runbooks

Step-by-step GitHub Pages (Actions → static artifact per app), Cloudflare Pages (per-app project, root = app folder), and Cloudflare Workers CPE (`wrangler deploy`, D1 migrations, `AUTHOR_TOKEN` secret, CORS origins) procedures live in `docs/runbooks/`. Every runbook ends with the same verification: load each deployed game with the CPE stopped (local-only badge, playable), then with the CPE running (synced badge, shared learner).

---

*Build the strongest demonstration of the underlying idea: **an engine that can be told what professionals need to know — in any domain it is configured for — helps each learner acquire it, evaluates how they use it, and invents games that make the learning compelling. Oregon Legal and Medical are where it starts, not where it ends.***


### 24.5 Judging contract addendum (rev 17)

1. **Mirror (player-visible evaluation).** The Hub shows every stage aggregate,
   predicted recall, and due queue (`#mirrorGrid`), plus `recommendGames`
   suggestions whose `reason` names the thinnest stage or specific due concept.
   Evaluation the player cannot see is a design defect here.
2. **Meta tooling (Stage-1 gate).** CPE exposes `/v1/ai/status|invent|enrich`
   (`services/progression-engine/meta.js`). No key → `local-template` labels;
   key → live Meta models. Never claim a Meta call that did not happen.
3. **Platform depth.** VR: dual controllers + lasers + haptics + flat fallback.
   Roblox: ProximityPrompts, DataStore, server-authoritative RemoteEvents.
   VocabCraft: first-person voxel build with walk-across proof.
4. Judging artifacts: `docs/judging/winning-pass.md`, `docs/demo/demo-script-3min.md`,
   `docs/agents.md`. Tests: `tests/tenancy-generation.test.js` (18 total).
