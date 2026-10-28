# Entre Voces architecture — file-based generation

The product has a shared deterministic core, a learning hub and a creation/dreaming suite. It reuses and extends knowledge into an interpreting curriculum and defines/builds substantial complementary games. The player-facing learning hub is a static game collection, interpreting curriculum, field guide and local creation room. Authoring remains CLI/file-based; there is no authoring HTTP server, provider API adapter or classroom model. A generated game has its own play interface.

## Boundary and ownership

`tools/generate.mjs` is the CLI. `generator/project.js` owns project locking, atomic state, domain validation, input extraction, knowledge-to-game handoff, export and recoverable removal. `generator/generation.js` owns durable stage transitions and accepted checkpoints. `agents/registry.json` enumerates real role instructions; `generator/agent-runner.js` executes them through the existing local Codex CLI sign-in. The project never reads or copies credentials and never configures model endpoints. Agent output is untrusted until validated. A successful process exit without a completed turn and valid final JSON is failure.

Authoring is stochastic and happens before play. Evidence assessment, difficulty, stage mastery, retention, diagnostics, recommendations and persistence are deterministic shared code. No generated game may replace these rules or call AI services.

## Knowledge lifecycle

1. Specification analyst resolves the request into a saved professional brief, including audience, scope, exclusions, work goals, unknowns and observable acceptance.
2. Research planner creates a professional topical coverage plan. A seed PDF supports this plan, never defines its outer boundary.
3. Researcher performs observed web search. Curator selects complementary authoritative candidates by topic, currency, source independence and evidence responsibility.
4. Host retrieves public HTTPS documents with DNS pinning, private-address rejection, bounded bytes/redirects/time and extraction. Search snippets and agent bibliographies are not authoritative evidence.
5. Coverage auditor reads actual passages against each planned responsibility. Weak important coverage triggers follow-up. Budget exhaustion produces an incomplete report and blocks comprehensive synthesis until continued.
6. Reader extracts grounded claims and contextual dossiers from every passage. Architect consolidates sections, relationships and procedures; critic checks entailment and omissions. Large inputs use complete bounded indexes and source windows, never sampling disguised as complete review.
7. Editor plans the topical practitioner handbook. Writer produces checkpointed chapters. Independent editorial audits check source entailment per chapter and whole-book cohesion. Required concepts must actually appear in chapter prose; a declared ID alone is insufficient.

Outputs include `project_brief.md/json`, `acquisition.md/json` for research runs, `knowledgebase.md/json`, and `handbook.md/json`. Uncertainty, missing language variants, jurisdiction and source rights remain visible. Depth follows important professional work and substantive evidence, not word count or dictionary size. See knowledgebase.md for field-level contracts and failure conditions.

## Game lifecycle

1. A game consumes a completed reviewed knowledge snapshot and existing portfolio definitions.
2. Designer compares distinct candidates, selects an additive learning responsibility, and saves the full `game_framework.md/json` before implementation.
3. Four independently instructed critics challenge mechanics/fun/replay, learning validity, distinctness/copying risk, and systems/accessibility/recovery. Revisions invalidate all prior approvals. Persistent severe findings stop the job with artifacts intact.
4. Art director defines assets; asset builder authors original local SVG layers; sound designer writes bounded cue/ambience events rendered to bundled stereo WAV. No unsupported image, voice or model API is promised. Source review is distinct from rendered visual and listening review.
5. Builder receives the entire framework, knowledge, immutable difficulty policy, actual shared APIs and asset manifest. It implements the complete game using shared simulation/scenes/input/camera/assets/audio. A canvas full of questions or menus is not a game implementation.
6. Host rejects unsafe paths, remote scripts/media/network code, missing files/imports/assets and syntax defects. Code critic independently audits actual source; repair and recheck are required for severe findings.
7. Export bundles the game, knowledge, core, client and runtime as static files, with a draft status and observed playtest still pending. There is no automatic publication or fabricated quality certification.

Full game rules, 30 required framework sections, state contracts and design acceptance live in game_framework.md. Originality means defensible comparison and distinct responsibility, not a provable guarantee that nothing similar exists.

## Shared learning engine

`packages/engine-core` is the only truth for eight separate mastery stages and ten competences, weighted evidence, retention/spacing, misconception diagnostics, area prerequisites, recommendations, content assessment, interpretation fidelity, notes and immutable five-tier difficulty policy. Confidence and assistance limit evidence strength. Domain/learner isolation and stable event IDs prevent contamination and double counting. Sparse evidence cannot establish mastery.

`packages/engine-client` accepts an injected core and bundled domain/concepts. It validates evidence, maintains a device-local append-only log and exports/imports progress with closed schema checks and duplicate/conflict handling. Corrupt local data is ignored safely. Blocked/full storage preserves current-session progress with an explicit export warning. There are no server synchronization controls or learner HTTP endpoints.

`packages/game-runtime` owns renderer-independent fixed-step timing, scene lifecycle, keyboard/touch/pointer input, camera transforms, bounded asset loading, audio unlock/mute/failure, seeded randomness/effects, reduced motion and versioned storage. The builder must consume these boundaries rather than duplicating their behavior.

## Operation and recovery

CLI commands are documented in README.md. State is atomically saved under `data/store.json`; artifact files under `data/artifacts/<job>` are inspectable. One lock permits one writer. Accepted checkpoints survive interruption/restart. Retry never waives a rejected review. Continuation and expansion retain provenance and prior work. Remove/restore manages experiments recoverably; exports are independent files. Export refuses existing destinations and traversal paths. No credentials are accepted as command options or stored in the project.

Verification combines deterministic unit/integration tests, real local-agent execution, generated-package validation and later observed play. Tests using agent doubles verify contracts and failure recovery; they do not establish model quality, knowledge completeness or enjoyment. Coverage states and remaining limits are recorded in docs/coverage-matrix.md.

## Interpreting curriculum and the learning hub

`generator/curriculum-source.js` reuses existing medical/legal knowledge, interpreting-skill research notes and a historical handbook with provenance. `packages/engine-core/curriculum.js` organizes practice through meaning, distinctions, message carrying and performance under load. These stages are shared deterministic policy. Optional institutional/credential reference does not count toward curriculum completion. Book views, menu actions and game launches award no learning proof.

`apps/learning-hub` provides the static player surface and creation room. `tools/build-hub.mjs` assembles actual knowledge, books, runtimes and available game packages. Empty or unbuilt games are never advertised as playable. The creation form saves a local request file; it does not pretend a static page can launch local AI processes. Browser play uses bundled assets and local evidence only.

`generator/suite.js` validates an agent-authored five-game portfolio with distinct decisions, interpreting responsibilities, domain-qualified knowledge and acyclic handoffs. `tools/build-suite.mjs` runs its definition and five separate complete game builds, then exports draft packages for observed play. A source review is not a fun, originality or professional certification guarantee. Native account quota failure pauses pending work honestly and preserves checkpoints.
