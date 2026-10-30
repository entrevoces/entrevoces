> **Living library:** The current static site includes 24 original entries and 17 imported script drafts. See [docs/living-library.md](docs/living-library.md) for available audio and review limits, and [docs/VIDEO_STUDIO.md](docs/VIDEO_STUDIO.md) for the script-to-image and video authoring workflow. The original games and shared learning engine remain available.

# Entre Voces

A shared learning engine, an interpreting learning hub, and a file-based game creation suite. Interpreting—understanding meaning, choosing language, preserving intent and repairing communication—is the core principle. Published learning and games remain static on **GitHub Pages**; authoring agents work at build time through the local Codex CLI. An opt-in spoken-practice extension calls a **separate Modal endpoint running Meta MMS speech recognition on CPU**. Neither Pages nor the game bundle contains model credentials.

```sh
npm run build
npm run hub
```

The library opens at `http://127.0.0.1:8014/`, with a directly linkable `cada-dos-dias-script.html` video script. Games and creation tools are under `practice.html`. The practice hub contains the game collection, a staged learning path, searchable English–Spanish/English–Chinese knowledge, a readable reused handbook, local progress export/import, and a creation room for saving game briefs. The build reuses 21 existing medical/legal concepts, ten interpreting-skill definitions from existing research notes, and nine optional source-specific reference entries. Institutional/credential reference material does not define curriculum progress. Missing translations remain visible rather than silently falling back to another language.

For GitHub Pages, the `.github/workflows/pages.yml` workflow builds and publishes `dist/`. If the public GitHub Actions variable `EV_SPOKEN_API_URL` points at your deployed Modal web function, each game can send explicitly recorded 16 kHz audio to Meta MMS for speech recognition on CPU; the transcript and example rendering are available for review, without automatic meaning grades. With no URL, games stay playable while the voice feature is unavailable. See [Modal deployment and licensing](services/modal-spoken/README.md) and [three arcade games](apps/games/README.md). Live CPU model inference testing is still required before asserting the model integration works with real voices.

The shared engine maintains eight separate mastery stages, ten competences, confidence/assistance limits, retention and spaced review, misconception diagnostics, prerequisites and a static difficulty policy. Recognition cannot award higher-order interpreting proof; repeated assisted success cannot become full mastery. Progress is validated, deduplicated and kept on-device, with corruption/quota recovery. Reading a page or launching a game awards no evidence.

```sh
npm run doctor
npm run agents
npm run knowledge:build
npm run suite:build
```

`knowledge:build` expands the reusable knowledge into three complementary topical resources: medical interpreting, legal interpreting, and interpreter language foundations with supplemental definitions. English–Spanish and English–Chinese are the confirmed priorities. A research agent creates the domain taxonomy and coverage scope, then acquisition, knowledge and editorial agents produce grounded dossiers, typed relationships and substantial chapters. A seed document does not constrain the outer scope. These resources should support a whole curriculum, not credential trivia or an alphabetical dictionary. Source-backed factual claims and clearly labeled synthetic practice coexist; formal credential legitimacy is not the organizing principle.

`suite:build` asks the design agent to dream up five different games as a progressive collection. It requires distinct primary verbs, decision systems and learning responsibilities, source-qualified concepts, and explicit handoffs between games. Each game then gets its saved detailed `game_framework.md`, four separate adversarial critiques, original local assets and authored sound, a complete implementation, static validation and independent source review. Actual play, rendering and listening still require observation; export never claims these happened automatically. A quota failure stops queued authoring work and preserves accepted checkpoints for resume.

Authoring currently depends on the signed-in local CLI account's available usage. `doctor` verifies installation and PDF tools; an execution checks actual account/tool availability. Failed and incomplete work is reported honestly. It is never replaced with fake books, games or progress.

```sh
npm run generate -- domains
npm run generate -- spec --domain knowledge/domains/medical.json --request brief.md
npm run generate -- knowledge --domain knowledge/domains/medical.json --request brief.md --source reference.pdf
npm run generate -- game --knowledge KNOWLEDGE_JOB_ID --request game-brief.md
npm run generate -- status
npm run generate -- resume JOB_ID
npm run generate -- continue JOB_ID
npm run generate -- expand JOB_ID --request revision.md
npm run generate -- export JOB_ID
npm run generate -- remove JOB_ID
npm run generate -- restore JOB_ID
```

Use `--source-only` to explicitly limit a knowledge run to a document. Otherwise the agent researches supporting sources and audits actual retrieved evidence topic by topic. Large inputs use complete bounded source windows, concept indexes and chapter checkpoints; nothing is silently sampled. Chapters may expand to 48 when the work and evidence justify them. Depth gates reject short summaries mislabeled as book-scale chapters. Poppler (`pdftotext`) is needed for PDFs; scanned pages require OCR first.

Private job state, source checkpoints and local agent receipts live in ignored `data/`. Exports live in ignored `outputs/`, `knowledge/generated/` and `knowledge/game-suite/builds/`. One project lock prevents competing writers; saved state is atomic. Remove/restore manages experiments recoverably; exported copies are independent files. The historical handbook under `knowledge/imports/` preserves its original content and provenance; it is reused, not represented as newly authored or newly certified.

```sh
npm test
npm run validate
npm run audit:kb
npm run audit:samples
```

`audit:kb` inspects actual interpreter-book jobs and fails when the books are incomplete. `audit:samples` checks the older sample dataset separately. See [agent roles](docs/agents.md), [knowledge and curriculum contract](specs/knowledgebase.md), [game framework](specs/game_framework.md), [architecture](specs/top.md), and [verification coverage](docs/coverage-matrix.md).
