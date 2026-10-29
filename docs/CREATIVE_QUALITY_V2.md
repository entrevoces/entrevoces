# Biblioteca Viva — audio storytelling & model-quality standard v2

## This product is an entertainment library that teaches real interpreter skills

The listener should choose a story, musical sketch, fictional call-in, or conversational mystery for its *intrigue*, not because it looks like an exam. The local static experience is designed for brief phone sessions and hands-free listening. Learning evidence is intentionally separate from entertainment completion. A listener recognizing that a speaker said *might* rather than *did*, or *every other day* rather than *twice daily*, does not itself demonstrate professionally competent spoken interpreting.

## Source and language boundaries

- The sole authoritative local lexical reference is the full source `entre_voces_knowledge_base.json`, SHA-256 `802c5c93015293b7759779a6bfc364e89923c70f77c156e4988c422a33f55487`, 865 entries (437 medical, 428 legal). `media-engine/knowledge.mjs` derives natural display phrases while preserving the original source words separately.
- A topic must map to *relevant* domain concepts and citations. Unknown or poorly connected topics are rejected, never silently filled using unrelated common terms. Written scenarios are fictional educational drafts, not source-derived clinical or jurisdiction-specific advice.
- In source vs interpretation comparisons, preserve the exact original English, deliberately wrong Spanish and repaired Spanish, with speaker and turn indexes. Actual timing is measured from the finished audio, not guessed from narration length.
- Human bilingual, legal/clinical-domain, rights and editorial approvals are four distinct review steps. A model critique, an ASR transcript, and a synthetic voice can assist but cannot award professional signoff.

## Script craft — what makes it actually enjoyable

Use the character and sound principles in `media-engine/editorial.mjs`. Important metrics are necessary, but not sufficient. A professional reader/listener must judge each media draft against this rubric (0–5 each):

| Dimension | A strong 5-point result | Common failure |
|---|---|---|
| Immediate hook | A concrete, interesting situation in the first 20 seconds | Opening with an objective statement |
| Distinct people | Every adult character wants something and speaks with a unique rhythm | Characters recite information in identical voices |
| Dramatic turns | At least one revelation, choice, reversal and payoff | A long explanation pretending to be a scene |
| Bilingual realism | Plausible turns and register appropriate to the context; no invented medical or legal certainty | Mechanical translation, unnatural bilingual jokes |
| Meaning specificity | Changed negation, timing, agency, modality or doubt actually alters a decision | Vague 'there was a misunderstanding' |
| Sound dramaturgy | SFX are purposeful, silence carries meaning, voices remain intelligible | Constant music covering consonants or numbers |
| Humor and humanity | Subtext, callbacks, affectionate wit; no ethnic/age caricature | A lesson disguised as a punchline |
| Ending | Satisfying local resolution plus optional new question | Cliffhanger replacing the story itself |
| Originality | Distinct narrative action and musical motifs; no living-performer imitation | Recycled plot template |
| Re-listening value | A second hearing reveals a clue or change in intent | A factoid with no story |

**Editorial target:** average >=4/5; no dimension below 3. Record reviewer identity privately, actual listened runtime, localization version, red flags and rewritten excerpts. This is a human editorial rubric, not an automated performance claim. A model can propose and critique; no machine self-awards 40/50 as proof that a story is wonderful.

## New deterministic rejection gates

1. Topic-relevance check: `media-engine/curation.mjs`, and `auditBriefGrounding`; unsupported topics fail.
2. Creative DNA: stable, diverse soundscape, setting, comic rhythm, musical genre, original constraints; character stereotypes prohibited.
3. Script structural audit: genuine length, distinctive spoken lines, padding detection, placeholders and didactic clichés.
4. **Bounded independent repair:** both semantic and narrative critics must approve the final unchanged draft. Rejected scripts can be revised twice, with full original output hashes and newly run critics. Failed repair remains blocked.
5. Voice proof: exact *audible source*, *audible wrong* and *audible repair* must occur in the specified bilingual dialogue turns. Only after final mixing may measured milliseconds be written into the timing EDL and captions.
6. Rights/provenance gates: actor, music and platform permissions; transcript; domain/bilingual review; no secrets in Pages; no unlicensed Suno reuse.
7. Strict structured output: every fixed Meta authoring stage has a finite JSON schema; live model responses that cannot satisfy the required fields are rejected. The branching mystery uses separately verified graph validation because its node IDs are dynamic. Every retry counts toward the actual HTTP request budget.
8. Live Meta verification: a *real provider* response is recorded with model ID, response ID, usage and structured output. Creative verification requires >=600 words, >=10 speaker-labelled dialogue turns and exact wrong/correct Spanish utterances. All 8 semantic probes must pass on each tested model for the strict smoke gate; this still is NOT professional validation.
9. Optional browser speech recognition **only during active challenges**. It can go to a third-party service and must never silently start or restart after playback, closing, or backgrounding. Tap/key alternative must always work.

## What actually exists in the package

The library has 24 earlier static entries plus 17 newly authored script items = **41 catalog entries**. The previous 5 demo MP3s remain available; only one external Suno share link has been verified. The two new original songs provide lyrics and prompts but **not finished recordings**. There are 17 separate CSV/JSON/README actor production packets, including unconfirmed-language lines and estimated durations; they are not final audio. All medical/legal bilingual material remains pending expert review. Real speech model tests require a protected Meta API key and actual approved recordings.

## Practical sound direction for a contest-quality slice

Prioritize an 80–150-second **finished** error-detection scenario with 3 human or properly licensed performances. Use a clinic or court *simulation* with no actual patient/case data, natural pacing, a subtle delayed correction, and precise audible words. Provide original source, wrong rendering, repaired rendering, captions and waveform-aligned error window. Produce a longer well-acted episode from the 1,095-word special *La última palabra*, adding meaningful atmosphere without obscuring essential numerals, negatives and hedges. Finish a second Suno song with verified rights and a prominently accessible link, rather than hiding prompts inside a draft description.

Do an actual blind human playtest with 5+ adult bilingual learners, note time to discover Play and the Suno track, whether the error was audible without subtitles, whether the characters sounded distinct, and whether anyone understood the professional scope. Correct failures and rerun tests before a public-quality claim. No fabricated audience feedback or synthetic-only signoff.

The original three mini-telenovela *sketches* contained only ~174–212 words despite claiming an 8–10 minute duration. The source catalog is preserved, while `publicLegacyCatalog()` corrects the public artifact's duration label to a realistic short reading scene and marks short-film scripts as unproduced storyboards. This prevents misleading listeners before full productions are recorded.
