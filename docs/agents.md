# Agents in ENTRE VOCES — what each one does and provides

Four distinct agent roles. Conflating them is how projects become slop; here
are their contracts.

## 1. Development Agent — Muse Code (Wonder Full)
**Does:** authors the spec, engine, CPE, nine games, tests, and docs in this
repo from the research spine. **Provides:** the entire hackathon work product
(new-work rule: git starts empty; every file is event work). **Never:** ships
generated teaching content without provenance, or claims a browser was run
when the sandbox forbade it.

## 2. Invention Agent — Muse Wonder (runtime, via CPE)
**Input:** audience + gap + DomainConfig + live coverage/LearnerState.
**Does:** invents an original game concept for the thinnest thread, then
critiques it (originality / evidence-quality / feasibility) in the same call.
**Provides:** `{ name, hook, coreLoop, decisions, evidence, scores, risks,
provenance }` at `POST /v1/ai/invent`, rendered in Hub Game Lab with a
live-vs-local provider badge. **Guardrails:** JSON-only contract, template
fallback with identical shape, honesty labels (idea / specification /
playable-template), full provenance. Changed inputs must yield a defensibly
different concept (spec §12 gate).

## 3. Enrichment Agent — Muse Spark (runtime, author-gated)
**Input:** domain + seed text (author token required). **Does:** fast
structured terminology drafts (EN/ES/ZH + distinctions + misconception).
**Provides:** drafts at `POST /v1/ai/enrich`, always `inferred: true`.
**Guardrails:** drafts never enter the authoritative base without Console
validation + a registered source; Spark's speed buys drafts, never truth.

## 4. Observation Agent — Muse Voice Transcribe (contract) + browser ASR
**Input:** learner speech. **Does:** returns `{ transcript, confidence }` as
an *observation*. **Provides:** the input to fidelity assessment in Night
Shift / Echo. **Guardrails:** confidence travels with the transcript; below
0.65 the learner can dispute (which itself becomes evidence); the engine
must consider transcription-error as a competing hypothesis before blaming
the learner (spec §8). No raw audio is stored.

## The non-agent that keeps them honest — the Engine
Deterministic core (validation, learner model, selector, fidelity, notes,
generator) runs identically on server and device. Agents propose; the engine
disposes. That separation is the product's answer to hallucination: anything
an agent invents is either validated data or visibly labeled invention.
