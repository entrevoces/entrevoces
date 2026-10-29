> **Integration update (October 29):** The overlay is already integrated selectively. Do not run the old activation script or replace the multilingual hub. Use `npm run media:audit`, `npm run media:test`, `npm run build`, `node tools/media-build-verify.mjs`, and `npm run verify:site`. The public collection is `/living-library/`; see [VIDEO_STUDIO.md](VIDEO_STUDIO.md) for the separate video workflow. The remaining text is the original overlay handoff for historical context.

# Desktop ChatGPT Code — Entre Voces media-first production runbook

## A. Apply the overlay to the actual repository (required)

1. On a desktop with working GitHub access, run `git clone https://github.com/entrevoces/entrevoces.git` (or enter your existing clean clone). Start at the current default branch `main`; inspect `git status`, remote URL and latest commit. **Do not reset, delete or overwrite unrelated edits.**
2. Unzip `entrevoces-media-first-engine-overlay.zip` **into the repository root**, preserving the existing `entre_voces_knowledge_base.json` (already the full 865 entry source), `apps/learning-hub/`, `apps/games/`, `packages/engine-core/`, and original `content/living-library/collection.json`. The ZIP intentionally omits the duplicate original KB.
3. Run `node tools/activate-media-first.mjs`. It patches `package.json`, prepends `AGENTS.md` and `README.md` instructions, and changes the legacy game/knowledge UI to use natural labels without losing canonical metadata. It is idempotent: rerunning must not create repeated headers/build hooks.
4. Run `npm run media:audit && npm run media:test && npm run build && npm test && npm run modal:check && npm run verify:site` in that order. Fix failures without quietly deleting pre-existing tests, changing thresholds or rewriting original evidence contracts. On GitHub Actions, the existing Pages workflow publishes `dist/`.
5. Inspect `dist/index.html` (Biblioteca Viva home), `dist/practice.html` (unchanged legacy hub), `dist/games/...` (legacy arcades preserved), `dist/living-library/collection.json` (original 24 items), `dist/media-data/knowledge.json` (865 derived entries), and `dist/media-data/production.json` (at least 9 new draft scripts). Verify `https://suno.com/s/hhYzXEDsEJr7lFWW` is visible on the root site and linked from song01.
6. Test on **physical iPhone Safari** and desktop browsers: keyboard, touch, background/resume, bookmarks, saved items, text size, scroll, dialogs, native audio controls, optional microphone permission denial, static offline fallback, accents and numbers, 320 px viewport, reduced motion. Do not label a successful static-build test as a real audio UX playtest.
7. Make a branch or commit after reviewing `git diff`. Push to GitHub; check GitHub Actions run, the public URL, and broken-link/asset tests. Because the original helper here had 403 writes, **desktop must perform the actual commit/push**. Do not imply this environment has already pushed.

## B. Canonical content and normalization

`node tools/media-studio.mjs audit` must show 865 source terms (437 medical, 428 legal), zero displayed parenthetical labels, unchanged original canonical source and 865 entries still requiring bilingual validation. Source tokens `(criminal)` or `(insurance)` are not thrown away: they are converted into **naturally used contextual phrases**; acronyms `(OHP)`, `(ORS)` and others become separate search aliases. Compare 30 high-risk examples before release and obtain review of ambiguous translations, register and Oregon procedural language. Importantly, 865 entries is **not** evidence of professional translation correctness. English–Mandarin support remains limited and is not to be invented.

## C. Authoring with no API calls / predictable budget

```bash
node tools/media-studio.mjs queue --max 60 --out media-workshop/queue.json
node tools/media-studio.mjs labels --query 'probation'
node tools/media-studio.mjs brief --kind catch-the-change --topic negation --domain medical --out media-workshop/new-brief.json
node tools/media-studio.mjs author --brief media-workshop/new-brief.json --dry-run
node tools/media-studio.mjs batch --queue media-workshop/queue.json --limit 12 --out media-workshop
node tools/media-studio.mjs packet --item content/media-production/catalog.json --id voice-hearing-not-verdict --out media-workshop/recording-guide.json
```

The CLI accepts a single-item JSON, an authoring `result.json` containing `.item`, or a multi-item catalog when supplied with `--id`. `batch` without `--live` is safe and writes original, 5-stage prompt packets. Review the packets for authentic human situations, pace, humor, different formats, source references and meaningful interpreting skills. Do not force a named commercial game template or a shallow cultural stereotype.

## D. Author with Meta Model API (operator controls only)

Set `MODEL_API_KEY` in an environment secret store, not in source or GitHub Pages. Then:

```bash
node tools/media-studio.mjs author --brief media-workshop/new-brief.json --out media-workshop --live --budget 6
# Resume if an API call fails: completed stages are saved after each stage
node tools/media-studio.mjs author --brief media-workshop/new-brief.json --out media-workshop --live --budget 6 --resume-checkpoint media-workshop/<id>/checkpoint.json
node tools/media-studio.mjs batch --queue media-workshop/queue.json --limit 3 --live --budget 18
node tools/media-studio.mjs image --prompt 'Original illustrated cover of a radio mystery...' --out media-workshop/cover.webp --live
```

Wonder is the creative director and semantic critic, Spark writes and provides an independent narrative critique and audio/video production plan. Every authored item has five stage outputs; the staged item is never automatically published. Text-model acceptance is not human domain approval. API usage/cost and model-version changes should be logged by the operator. Confirm API availability, endpoint shape and token usage **live** before beginning a large batch; the mocked unit tests do not establish real provider success.

## E. Produce voice, music and short video outside the learner runtime

1. Use `node tools/media-studio.mjs packet --item path/to/item.json` for casting, line breakdown, sound cues, transcript and caption requirements.
2. Record via human actors or a licensed, consent-compliant speech synthesizer. Meta Muse Voice Transcribe is **ASR, not TTS**. For real interactions give interpreters voice separation, hesitations, correction and speaker attribution. Use only fictional patient/case material; no client or patient identifiable recordings.
3. For Suno songs, use the original complete lyrics and style brief, create the recording from the account's available product, get an actual share URL and rights/license details. Only **one** external URL is already verified in this repository. Five prompts do not mean five songs have been recorded.
4. For short videos, follow the shot list and optional iPhone creation workflow in production packet; add captions, intelligible sound and rights receipts. Model-generated storyboard does not mean video exists.
5. After recording, transcribe **actual PCM WAV** at approved sample rates using Meta Voice Transcribe: `node tools/media-studio.mjs transcribe --audio path/to/mono16k.wav --live`. Then `node tools/media-studio.mjs quality --item path/to/item.json --audio path/to/mono16k.wav --live`. Both results are **advisory** (ASR can be wrong); get qualified reviewer signoff on numbers, uncertainty, negation, modality, clinical/legal claims, timing and accents.
6. `node tools/media-studio.mjs ingest --item ... --audio ... --rights ...` requires a rights receipt, validates file signatures and stages audio without automatic publication. `signoff` records independent review metadata; `publish` enforces content, rights, transcript and review gates. Validate actual credentials/rights independently—the software cannot authenticate human signers from a local JSON file.

## F. Two extremely different sound pathways

**Media consumption** is inexpensive and static: native audio files and Suno external links, read scripts with accessible transcript, and listen to playable albums. **Voice-first practice** can use the same prefabricated conversation recordings with time-aligned deliberate errors; tapping at the critical cue is scoreable only after bilingual review. Optional shouted words use Web Speech Recognition when available. This opt-in browser service may require network access and is not the Meta ASR API; it does not imply offline voice recognition. Never count timing-only responses as independent interpreting performance.

## G. Editorial schedule and rejection rules

Every generated title must pass: source-based meaning; full story with a real payoff; diverse adult motivations; varied accent/register; fair authored errors; accessible captions; usable duration; audio licenses; non-deceptive medical/legal fiction; independent bilingual QA; live player usability testing. Reject invented dosage/regulatory authority, false certainty, on-screen quiz veneers, 90-second outlines labeled 10-minute episodes, or unproduced songs presented as playable. Preserve rejected drafts for audit. Publish *fewer*, excellent approved items ahead of a fake 500-item catalog.
