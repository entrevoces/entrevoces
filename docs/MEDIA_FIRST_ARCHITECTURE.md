> **Integration update (October 29):** The current public library remains at `/living-library/`; `/` is the existing hub. The 17 Quality V2 entries are projected into that library as script drafts. The diagram and installation notes below describe the original overlay proposal, not the current build. See [living-library.md](living-library.md) and [VIDEO_STUDIO.md](VIDEO_STUDIO.md) for the actual paths.

# Entre Voces — Biblioteca Viva media-first architecture (v1)

**Decision:** Interpreter competence grows through meaning-rich experiences: conversations, serialized fiction, music, spoken mysteries, stories, and authentic domain knowledge. Arcade mechanics remain optional legacy practice, not the product's default route or its creative engine's priority. Everything consumed by learners on GitHub Pages is **static**. Meta API calls happen only in an **operator-controlled build-time studio**; there are no public API keys, mandatory per-listen inference fees, or dependencies on a live GPU just to press Play.

## 0. Current verified boundaries

- Original canonical corpus: `entre_voces_knowledge_base.json`, **865 distinct entries**, **437 medical and 428 legal**. This file is retained **byte-for-byte**; its canonical wordings, domain context, source IDs and professional-review status survive. `media-engine/knowledge.mjs` derives natural, uncluttered **spoken/display** labels separately. The original spelling and contextual parentheticals remain available for evidence and search.
- All 865 original terms remain **unreviewed** by a qualified bilingual medical/legal professional. An entry citing a general source does not itself mean that particular translation was professionally validated.
- The `content/living-library/collection.json` catalog from upstream contains **24 experiences**: 9 comparisons with 5 actual synthetic sound clips, 3 short telenovela scripts, 3 short stories, 1 branching mystery, 5 song concepts (1 actual Suno share link), and 3 video storyboards. This package additionally stages **9 extensive scripts**; they are **not playable new recordings** until voices are produced and quality-reviewed.
- Only `song01`/Cada dos días has a known Suno URL. Do not invent links or self-host recordings without checking Suno's rights and the account's plan.

## 1. Production layout

```text
Original GitHub repository main
├── entre_voces_knowledge_base.json         canonical full 865-term corpus — unchanged
├── generator/practice-library.js           patched legacy UI to natural labels
├── packages/engine-core/                  existing independent deterministic mastery engine
├── apps/learning-hub/                     preserved at /practice.html (old games accessible)
├── apps/biblioteca-viva/                   NEW root-first bilingual audio/media library
│   ├── index.html
│   └── media-app/{app.js,voice-game.js,style.css}
├── media-engine/                           NEW build-time media factory
│   ├── knowledge.mjs                      full source, natural language labels, search
│   ├── blueprints.mjs                     formats, format goals, grounded creative briefs
│   ├── library.mjs                        import, recommendation and visibility
│   ├── studio.mjs                         5-stage Muse prompts; checkpoint/resume
│   ├── meta.mjs                           real Meta API request shape, opt-in only
│   ├── validation.mjs                     semantic, content, provenance/publication gates
│   ├── ingest.mjs                         recorded-media ingestion with rights receipt
│   └── quality.mjs                        transcription difference / semantic QA advisory
├── tools/media-studio.mjs                  operator's CLI
├── tools/seed-media-scripts.mjs           one-time content creation from existing KB
├── tools/media-postbuild.mjs              extends old build and changes home; not old code
├── tools/activate-media-first.mjs         idempotent package/agent/adapter installer
├── content/media-production/
│   ├── catalog.json                       9 new, full script-only experiences
│   ├── queue.json                         36 grounded production briefs
│   └── prompt-packets/                    offline 5-stage packets for each brief
├── agents/media-registry.json             new model/critic routing
├── tests/media-first.test.js              additional validation and regression tests
└── docs/{MEDIA_FIRST_ARCHITECTURE,PRODUCTION_RUNBOOK,QA_AND_ACCEPTANCE}.md
```

The original `tools/build-hub.mjs` still creates the full published `dist` directory. The **additive** postbuild then saves its root entry as `dist/practice.html`, substitutes `apps/biblioteca-viva/index.html` into `dist/index.html`, adds the native media UI and generated static data snapshots, and copies *already imported* voice/covers. The existing `dist/games/`, `dist/runtime/`, `curriculum.json`, `games.json`, handbook, and `dist/living-library/` stay in place. Existing Pages Actions should run the same workflow automatically after the `build` npm script is extended by the activation step. The old `hub.js` remains at `dist/hub.js` and loads from `practice.html` with the same relative URLs. No redirect loops, service worker, CDN requirement, or runtime LLM call is introduced.

## 2. Media model and educational contract

Every new item is versioned by a stable ID and has `kind`, `title`, `synopsis`, `domain`, `termIds`, `sourceIds`, `knowledgeHash`, `direction`, original `script`, `turns`, `errors`, media/voice/casting production details, captions or transcript, audio path, Suno external URL if known, rights/license, and explicit `review` state. Expected statuses: `proposed → script-draft → audio-produced → published`; there is never a transition to "published" merely because a script compiles or a model says "accept". `publicationGate` checks actual audio (for sound-led items), rights, source-linked content, transcript, and qualified bilingual/domain approval. Metadata claiming a credential is a record supplied by the operator; this system cannot independently verify the person's identity/license or grant certification.

**Knowledge transfer is not the same as decoding sound.** For each exercise separate (a) concept comprehension, (b) bilingual term recognition, (c) critical meaning-unit detection, (d) spoken response, (e) independent consecutive/simultaneous interpretation. A tap or shouted "stop" can support **error detection** only if cue windows and bilingual reference are reviewed. It must NOT award evidence for stages 7 or 8 (independent spoken production/interpretation), even if accompanied by ASR text. Mechanical timing misses and uncertain ASR are not semantic misconceptions. Generated scenarios are clearly fictional; they must not invent applicable Oregon law, drug dosage, credential rules, or patient history as facts.

### User-facing formats

1. **Catch the change / ¡Alto! Algo cambió**: continuous speaker → interpreter audio. A quiet but consequential alteration (negation, dosage, speaker, date, hearing vs judgment, modality) occurs. A learner may interrupt by big touch target/keyboard or **opt-in** browser speech recognition. Errors are authored and time-aligned in future audio; no live text grading or false mastery credit. Optional partial transcript and safe reveal.
2. **Audio mini-telenovelas**: sustained ensemble characters, dialogue, stakes, specific interpretation tensions, repeat listening, cliffhangers, adult humor without demographic caricature. New scripts are longer than prior sketches; recorded performance remains pending.
3. **Choose-your-path audio mystery**: at least two reachable outcomes, meaningful decisions that affect narrative interpretation, source-related critical claims; current seeded edition is readable and audio directions remain a production plan.
4. **Radio/podcast**: character-driven talk with inference, hedges, turn-taking and exact high-stakes semantic moments.
5. **Music**: original lyrics, Suno-ready prompts (<1000 characters), source-linked memory takeaways, direct approved playback URLs, with song drafts presented separately from actual published recordings.
6. **Stories/film/storyboards**: full readable content, production guide for short iPhone video, source checks, caption plans, and "video pending" when nothing recorded.
7. **Contextual terminology library**: all 865 natural English/Spanish phrases + explanations, alternatives, confidence/review status, and search. Never display bare '(medical)' or '(criminal)' metadata as though part of what a person says. Sense is rephrased as natural context, e.g. "criminal sentence", "insurance claim".

## 3. Suggestion engine

The **learner** experience works without Meta: built-time authoring creates static content/suggestions; the player selects filters, saved items, themes, and recently visited formats. The recommendation layer can accept separately imported genuine learner evidence and prioritize neglected concepts or due reviews; absent evidence, it uses topic/format variety and avoids unsupported gender/ethnicity behavioral inference. No demographic membership is a proxy for a learning preference.

The **creative director** uses the full KB and its concept graph, identifies medically/legally consequential gaps, compares genres/length/emotional hooks, chooses source-term-linked focus, and issues 36+ distinct, reproducible briefs. A source ID proves only the authoring context, not item-level certification. The system must work when external generation is unavailable: offline `queue`, `author` dry-run, detailed prompt packet exports and seeded scripts still exist.

## 4. Build-time Meta integration, not runtime dependence

`media-engine/meta.mjs` owns provider HTTP calls and request caps (never placed in `dist`). `MODEL_API_KEY` is supplied only as an operator environment secret. Intended model routing:

| Need | API | Boundaries |
|---|---|---|
| Creative premise/semantic critique | `muse-wonder-1.0`, `/chat/completions` | Provide creative outlines and risk flags, not fact certification |
| Full script/production plan/narrative critique | `muse-spark-1.3`, `/chat/completions` | Structured JSON, concept IDs, hard minimum lengths, budget, checkpoint/resume |
| Original cover illustration | `muse-image-1.0`, `/images/generations` | Art candidate; no rights or accessibility signoff without review |
| Visual QA of locally created cover | `muse-spark-1.3`, multimodal chat input | Advisory model critique only |
| Recorded speech transcription and speaker turns | `muse-voice-transcribe-1.0`, `/asr/transcribe` | Mono PCM16 WAV 16 or 24 kHz; ASR errors require human checking |
| Human-quality Spanish/English voice ACTING | NOT furnished by Muse Voice Transcribe | Human actors or licensed external TTS at production time |
| Music recording | Suno via independently operated workflow | Five draft prompts and original lyrics; one verified external Suno share URL |
| Video | Film storyboard/shot list and iPhone workflow | Do not represent a non-existent auto-video endpoint as working |

The CLI offers `--live` **explicit opt-in**, a per-run request budget (`--budget`), checkpointing, hard failures on malformed output and scoped retry. No backdoor runtime calls, unbounded loops, scraping, invented sources or silent use of patient/court case audio. Production and validation steps stay separated from publishing, so creative API use can never directly certify its own output.

## 5. State ownership and failure handling

- Authoring checkpoint `media-workshop/<item-id>/checkpoint.json` stores all completed stage outputs, stage hashes and model usage, with a **frozen brief hash**. A new brief cannot resume an old checkpoint. Failure midway must preserve the completed stage.
- The old knowledge base remains read-only and is used by both game runtime and media builder. Derived `dist/media-data/knowledge.json` contains the 865 normalized entries plus source context and **unreviewed** flags.
- Browser favorites are local. Media files are played by native `<audio>` and must be initiated by user gesture for mobile Safari. Speech recognition is optional and may involve an external OS/browser speech service, so opt-in includes disclosure; touch fallback always remains.
- Missing audio displays a script preview and a clear "audio pending" label. Missing Suno links produce a "lyrics and prompt" view, never a dead play button. Rights uncertain → keep file staged, not promoted.
- An invalid file path, unknown source term ID, duplicate content ID, broken branch, or bad status rejects publication. External links are restricted to HTTPS Suno share URLs.
- `media-postbuild` is deterministic: all output under `dist/`; original Pages workflow continues to publish only `dist/`. Any mismatch with source 865 or deletion of existing Suno link is a hard build failure.

## 6. What this does **not** claim

The pipeline and static UI are implemented and contract-tested, but **no live Meta account/voice model call, no published bilingual acted conversations, no real-user device test, no qualified source translation review, and no live GitHub push** have been completed by this build. End-to-end operator functionality still depends on a real repository checkout, live credentials, content producer and editorial staff. Even if tests pass, the question "good enough to train professional interpreters" remains **no** until that evidence exists.
