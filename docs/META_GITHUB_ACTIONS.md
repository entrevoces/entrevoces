> **Credential boundary:** The user instructed that the supplied Meta key must never be stored. Do not put it in a GitHub secret. The manual workflow templates below require a separately authorized credential before they can run; they have not been run. The local video studio accepts credentials only from the process environment.

# GitHub Actions runs **real Meta models**, not a mock

**Status:** Workflows and client contracts authored and locally unit-tested. The live Meta workflow HAS NOT been run from this environment: it requires your `MODEL_API_KEY` and GitHub environment authorization. A green mock test is *not* a green live-model test.

## Provider models and endpoints verified against official documentation (2026-10)

- Muse Spark: `muse-spark-1.3` via `POST https://api.meta.ai/v1/chat/completions`
- Muse Wonder: `muse-wonder-1.0` via the same endpoint (changes only the model ID)
- JSON constrained decoding: `response_format.type=json_schema` with `json_schema.strict=true`; all required properties, `additionalProperties:false`
- Muse Image: `muse-image-1.0` via `POST /v1/images/generations`; returns base64 image bytes
- Muse Voice Transcribe: `muse-voice-transcribe-1.0` via multipart `POST /v1/asr/transcribe`; `request` JSON and `audio` WAV. Transcription only, NOT TTS or bilingual-grade certification.

References:
- https://dev.meta.ai/docs/overview
- https://dev.meta.ai/docs/cookbook/quickstart-chat-completions
- https://dev.meta.ai/docs/structured-output
- https://dev.meta.ai/docs/image-generation
- https://dev.meta.ai/docs/api-reference/voice/transcribe
- https://dev.meta.ai/docs/api-reference/voice/schemas

## Setup

1. On GitHub open repository **Settings → Environments**. Create `meta-production`, with required reviewers/approval for paid use.
2. In that environment's **Secrets**, add `MODEL_API_KEY` from Meta Model API (not the GitHub Pages Actions variable). Never commit this value or pass it to the browser.
3. Configure your Meta spending limit / rate limit and account/model access. The manually triggered workflows cap calls per run, but GitHub's UI does not enforce a monthly spend limit. Limit who can dispatch workflows.
4. Commit this overlay into your existing project and run the normal CI. You should see `Media-first offline regression checks` without any keys or provider charges.
5. From **Actions → Real Meta Muse model verification → Run workflow** run the real benchmark. The action **fails** when the key is missing, real inference errors, output schema is violated, model identities mismatch, or benchmark quality is below its threshold.
6. Inspect workflow's 7-day `meta-actual-output-*` artifact. It includes exact model-generated original scene drafts, semantic case decisions, model IDs, response IDs, observed usage and timestamps; **not** a fabricated fixture. A successful result is *provider/API/schema performance*, not expert clinical/legal validation.
7. Optionally select image and voice. Voice requires a licensed and verified `tests/fixtures/voice-sample.wav`; this kit intentionally does not fabricate a real-recording fixture. Image incurs a separate paid generation request. Start with the default text-only benchmark.
8. From **Actions → Meta Muse creative media draft production → Run workflow**, choose a format, topic and domain. This runs the **real** Wonder + Spark multi-stage authoring pipeline and uploads `media-workshop/` as a review artifact. It will not modify the deployed site or merge model output without the editorial, domain, rights and bilingual review gates.

## Evaluation approach

**Deterministic:** validate 865 canonical knowledge entries and natural display labels, stage schema, content size, correct data fields, source IDs, no secret leakage, safe path, output semantics, model ID, non-truncated answer, number/negation/modality risks, transcript/audio provenance and normal offline builds.

**Observed paid models:** compare real Spark/Wonder responses on 8 fixed fictional English→Spanish scenarios (6 for Wonder), including faithful pairs and subtle negation, five/fifteen, uncertainty, legal obligation, and speaker attribution errors. Require >=80% accuracy for each model. Additionally require each model to create a fully original >=160-word draft with 2 characters and both correct and incorrect Spanish interpretations. A threshold failure blocks the model QA workflow and preserves evidence for review. This is a **smoke benchmark**, not proof of professional fidelity; expert-authored external evaluation sets are needed before certification claims.

**Independent review:** no generated content or model judgment gets automatic `bilingualApproved`, `domainApproved`, `rights.cleared`, or certification evidence. Use a qualified bilingual medical/legal interpreter and independent domain professional for public instructional accuracy.

## Release control

`meta-live-qa.yml` is *manual paid QA* rather than a required check on every public PR (to control spend and prevent secret access from untrusted PRs). For a contest/public release, run the paid QA on the candidate SHA; require that run to pass, review the output artifact, then publish the release after all human/content gates. If the branch changes, run the QA again. A green GitHub Pages deployment alone never implies a live provider check. Desktop Claude should make these requirements explicit in the release checklist and show the tested SHA.

## Correctness limitations

Meta models are nondeterministic; do not compare whole creative outputs byte-for-byte against one saved golden answer. The legitimate invariant is real signed HTTPS request/response, actual model ID, valid structured JSON, meaningful negative and positive case distinctions, source compliance, adequate length, and reviewer signoff before promotion. The allowed API calls cannot independently establish where every training datum or output came from; record observed response IDs and hashes rather than inventing internal model provenance.

## Quality v2: request caps, repairs and audible correctness

The authoring workflow now defaults to a **15-request maximum**. An initial draft usually calls Wonder/Spark for premise, script, two independent critiques, and production. A rejected draft may trigger up to two additional Wonder rewrites and fresh rounds of both critiques; request usage and exact provider metadata must be logged. Failure or exhausted quota leaves a blocked draft, never an accepted public lesson. The request cap is not a dollar cap: confirm Meta provider pricing, account quotas and protected environment approvals before running.

Real-model creative verification now requires **at least 600 words, at least ten genuine spoken dialogue turns, two character voices, and the exact wrong and corrected Spanish phrases actually present in spoken lines**. Failures must include the returned model ID, request ID, token usage, structured critique and immutable script hash. A passing automatic craft check is *not* human audience enjoyment or bilingual semantic certification.

Run `npm run media:packets` before producing audio stems. The created CSV/casting plans show *estimated* phrase timings only; replace them with audible waveform offsets after a mix is final.

The fixed Meta authoring stages now send actual strict `response_format: json_schema` contracts from `media-engine/stage-schema.mjs`. Branching mystery scripts are intentionally verified after JSON decoding because dynamic branch node keys are not part of the fixed schema. The Meta client's paid-request count includes retries and never exceeds `--budget`; API responses may be nondeterministic, and all reviewed work remains a human-pending artifact. The semantic smoke test now requires **all** eight gold probes to pass per model rather than an 80% threshold.
