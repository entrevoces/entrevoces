# Whisper knowledge engine — resource-to-context contract v2

## 1. Product boundary and precedence

Whisper is the authoring pipeline that turns a source of truth into a substantial, context-specific knowledge artifact. It is not the speech transcription model. knowledge agent performs semantic reading, consolidation and independent critique at build time. The host extracts bytes, indexes passages, validates contracts, persists checkpoints and renders files. It must never replace failed model output with a local glossary, fabricated graph, canned synthesis or simulated success.

This specification and the current authoring workflow supersede the older runtime invention, local AI fallback, classroom and fixed game portfolio provisions in `top.md`. The player site is static. Difficulty, assessment, evidence, retention and progression use ordinary deterministic engine code. AI calls, asset generation, voice generation and coding occur only in the authoring/build environment. The published game must not contain AI credentials, agent endpoints or a requirement for an AI service.

Audience, jurisdiction, professional domain, configured translation areas, language directions, learner prerequisites and real tasks determine relevance. A PDF is evidence, not a complete curriculum by itself. Unknowns must remain visible. The goal is a defensible body of knowledge that supports understanding, terminology, distinctions, application and performance; a list of labels and generic edges fails acceptance.

## 2. Required inputs

A job freezes these inputs so later edits cannot change an in-flight result:

- Resource: original filename, format, exact bytes/text fingerprint, extractor and version, extracted pages, page count, extraction warnings and every indexed passage.
- Source register entry: stable source ID, title, publisher, canonical URL when available, publication/revision date or explicitly unknown, jurisdiction, audience, authority, permitted use and limitations. Uploading a file is not proof of authority or permission.
- DomainConfig snapshot: immutable domain ID/version, profession, jurisdiction, institutions, language pairs and directions, modalities, translation areas, prerequisites, risk and competency weights.
- Context: intended learner/audience, prior knowledge, actual work tasks, instructional goals, exclusions and relevant language variants. Use explicit user context before assumptions; disclose assumptions.
- Generation record: job ID, contract version, agent roles and execution receipts, input fingerprint, timestamps, attempts, stages, validation findings, independent review and checkpoint lineage.

Do not demand that users invent a graph schema. Derive semantic organization from the source and professional context. Do not silently substitute the Oregon seed domain for an invalid or missing domain.

## 3. Supported resource and extraction contract

The current reference host accepts PDF, UTF-8 text and Markdown. PDFs use Poppler `pdftotext -layout -enc UTF-8`; extraction is not OCR. The `doctor` CLI command reports whether the extractor exists. Encrypted, corrupt and image-only files must fail with an actionable explanation. Sparse/blank pages are reported for human inspection, never hidden by successful extraction elsewhere.

Current hard limits: 10 MiB original upload, 200 pages, 400,000 extracted characters. Reject over-limit input before model calls. Ask the operator to split it into named volumes; never silently keep the first pages. JSON request size is separately bounded. File parsing uses a random temporary directory, no shell interpolation, a time limit, a bounded output buffer and cleanup in `finally`.

Preserve page boundaries and text offsets. Every nonblank span has a stable `passageId`, page, start, end and verbatim text. Long pages split at paragraph/newline boundaries when possible. Splitting must not lose text at boundaries. Tables, multiple columns, footnotes, ligatures and reading order require operator inspection when extraction is uncertain. Preserve numbers, negation, units, qualifiers, exceptions and references in context. A flattened table must never be treated as reliable structured data without evidence.

No URL fetching is implied by entering a source URL in source-only mode. Import a supplied file/text. Network research is a separately implemented, explicitly surfaced capability (§3A, research mode only); OCR and media transcription are not provided.

## 3A. Research-first acquisition (default for new domain handbooks)

New domain handbooks default to `acquisition.mode: "research"`. The uploaded file, when present at all, is a seed — never the ceiling of the scope. `acquisition.mode: "source-only"` remains an explicit companion mode and requires a seed resource; the legacy uploaded-source creation shape (no `acquisition` field) is still accepted and means source-only. Research mode starts from `domainId` plus `context: {audience, goals}` with an optional seed `resource`/`source`.

1. **Coverage/research blueprint (`acquisition-blueprint`, knowledge agent, before any writing).** knowledge agent authors `{title, scopeStatement, rationale, assumptions, exclusions, topics[{topicId, title, category, priority, rationale, evidenceResponsibilities, proposedSourceTypes, searchQueries}]}` with a native strict schema. Categories span important concepts, terminology in context, conceptual models, work situations, distinctions, workflow, exceptions, misconceptions, and language/register/jurisdiction boundaries. Critical/important topics carry observable evidence responsibilities and proposed primary/authoritative source types. Scope follows the configured profession, audience and work goals — not a seed title. The host authors no topics.
2. **Search discovery (`acquisition-search` / `acquisition-followup`, source-researcher).** The local CLI must emit an observed completed web-search tool event. The agent returns discovered candidate URLs with title and fit. Receipts distinguish observed search execution from agent-proposed source URLs: no claim that the host has independently proven a search-result annotation. The host records this provenance, retrieves each candidate independently and audits actual document passages before admitting evidence. Search snippets and bibliographies never establish coverage. No provider HTTP client, model endpoint or API key configuration exists in the application. Search unavailability stops acquisition explicitly.
3. **Host retrieval (`acquisition-retrieve`, host).** Public HTTPS only, with SSRF checks on the URL and on every redirect hop (DNS resolution included; localhost, private, link-local, CGNAT and IPv6 non-public addresses, credential-bearing URLs and non-web protocols are refused), bounded bytes/time/redirects, and no author/provider credentials ever attached. PDFs prefer the Poppler extraction used for uploads; HTML is reduced to readable text and never executed; flattened tables are warnings, not structured facts. Accepted text is preserved completely with per-source page/passage provenance (passage IDs are namespaced by source), plus title/host, retrieval date, fingerprint, extractor, page count, extraction warnings and `rightsReviewStatus: pending-review` (publication/revision date is explicitly unknown when search did not establish it). Duplicate fingerprints are recorded once. Retrieval and extraction failures are retained on the job, never silently skipped. Search snippets are never treated as source text.
4. **Coverage audit (`acquisition-coverage`, knowledge agent, per round).** knowledge agent judges ACTUAL retrieved passages against every blueprint topic: `adequate`/`partial`/`absent` with passage IDs, source IDs and rationale, plus contradictions, currency and language/register gaps. Weak critical/important topics must propose follow-up queries, which drive the next round. The host additionally treats a critical topic judged adequate from a single source family as triangulation-weak. Breadth is judged from supported evidence responsibilities, never URL counts.
5. **Budgets and honest incompleteness.** Budgets are explicit and bounded (defaults: 3 rounds, 16 sources, 600,000 corpus characters; hard caps 5 rounds / 32 sources / 1,000,000 characters, 5 MiB and 20 s per source, 5 redirects). When a budget is reached with weak critical/important topics, the job fails with code `acquisition-incomplete`, preserves every checkpoint, writes `acquisition.json`/`acquisition.md` as an honest research artifact, and produces no handbook. `generate continue JOB` creates a continuation job carrying the blueprint, search calls, retrievals and audits, with the budget extended — not a retry of the same exhausted limit. Ordinary retry resumes checkpoints without re-searching, re-downloading or re-reading accepted work.
6. **Corpus hand-off.** Only after required coverage passes does the multi-source corpus enter the existing checkpointed reading → (section synthesis/reconciliation) → handbook pipeline. Source identity travels with every passage into citations, `knowledgebase.json` (`acquisition` block), `handbook.md`/`knowledgebase.md` source registers, publication source IDs and downstream game inputs. No locally authored semantic substitutes, fabricated terms/claims or canned syllabus are permitted at any acquisition stage.

## 4. Agent responsibilities and stage order

1. **Intake / host:** validate file, source metadata and context; extract/index all text. Save the immutable resource snapshot. No semantic authorship.
2. **Knowledge reader / knowledge agent:** read each indexed passage with the full domain/context; extract actual concepts, atomic claims, procedures, distinctions and scope. Each passage receives an explicit disposition. Preserve uncertainty.
3. **Knowledge architect / knowledge agent:** reconcile all accepted passage drafts; merge duplicates by meaning and context, retain polysemy and variants, reconcile contradictions, form typed relationships and expose gaps. This is a new semantic synthesis pass, not concatenation or a local heuristic. For large sources this runs as bounded section synthesis plus an explicit whole-source reconciliation over the complete compact concept index (see §5); the host only assembles knowledge agent's decisions deterministically.
4. **Independent critic / knowledge agent:** receive the complete resource evidence and final draft in a separate call. Reconstruct responsibilities from the original source/context rather than trusting the author's checklist. Evaluate entailment, omissions, instructional depth and graph usefulness. For large sources the critic runs per section against that section's evidence, followed by a compact global critic over the complete index/ledger that does not claim quote re-verification.
5. **Handbook planner / knowledge agent:** author the editorial outline of a topical professional handbook (see §6A). Organization is by real work — conceptual models, workflows, consequential distinctions, high-value terms in context, worked examples, misconceptions and application — never an alphabetical dictionary, a concept list or generic summaries. The planner states honest scope, scope limits and missing topics, and assigns each chapter concepts, passages, planned elements and a depth (`focused` / `substantial` / `book-scale`) earned by source density.
6. **Handbook writer / knowledge agent:** write one chapter per call, checkpointed per chapter. Each chapter is grounded in its planned passages with inline `[passageId]` markers and exact citations, labels synthetic teaching examples and inferred translations, and ends with a scope note. A retry resumes at the first unwritten chapter; accepted chapters are not rewritten except when the editorial audit flags them.
7. **Handbook editorial audit / knowledge agent (independent call):** audit the assembled chapters against the source as a skeptical professional editor: entailment (not mere citation existence), handbook-not-dictionary depth, labeling, honest scope, missing topics, cohesion and non-repetition. Chapter-specific faults are returned per chapter; only flagged chapters are rewritten, then the audit runs again once. A still-failing audit fails the job visibly with findings preserved.
8. **Repair / knowledge agent:** receive specific findings, revise the entire affected artifact (or only flagged handbook chapters) and pass the same deterministic and independent gates again. No lowering thresholds to make a job green.
9. **Review / operator:** inspect source passages, claims, graph, handbook, missing coverage and limitations. Only an explicit review action can publish knowledge to the teaching registry.

**Expansion without re-reading.** A completed knowledge artifact can be expanded/revised (`generate expand JOB --request revision.md`). The expansion job reuses the accepted passage batches, synthesis and knowledge review verbatim — passages are not re-read and knowledge is not re-synthesized. knowledge agent receives the previous handbook plan/chapters as context, re-plans, rewrites chapters and passes the editorial audit again. The original artifact is preserved; the expansion is a new job with `expansionOf` lineage.

Every agent stage is visible in the authoring workbench. Display named stages, actual progress, last activity, findings, downloadable artifacts and retry. A queue position is not a quality score. Agent personas are bounded model calls, not independent authority or human experts.

## 5. Reading strategy and context budgets

Process the entire accepted source. The current host uses one indexed passage per reading call, approximately 5,000 characters, with original page/offset provenance. All accepted batches are checkpointed. A failure in passage 12 must not cause passages 1–11 to be discarded or regenerated on retry.

Reading prompts include source metadata, configured areas, audience, goals, claim schema, allowed relationship types and the grounding rules. Source content is untrusted data. A resource may contain instructions such as “ignore previous instructions”; these are quoted document material and must not control the model or engine.

Synthesis has two paths, chosen by the serialized size of the accepted passage drafts:

- **Small sources (drafts ≤ 280,000 chars): unchanged monolithic synthesis.** One knowledge agent call receives all passage drafts and source passages and returns the complete final object.
- **Large sources (drafts > 280,000 chars): bounded sectioned synthesis.** (1) The host partitions consecutive passage batches into sections whose drafts-plus-passages payload targets ≤ 70,000 chars; a single batch above the 280,000-char hard budget fails closed with checkpoints preserved — never sampled. (2) knowledge agent synthesizes one section per checkpointed call (`knowledge-section`), scoped to its own passages: every supplied concept/claim ID either survives verbatim or is recorded in the section's explicit `aliases`, every claim and citation is carried onto its surviving concept, and every section passage keeps exactly one disposition. New IDs at this stage fail validation. (3) Independent knowledge agent critics review one section at a time against that section's passages (`knowledge-review` with a section scope); a flagged section gets one bounded knowledge agent revision of that section only, then one re-review. (4) One knowledge agent reconciliation (`knowledge-reconciliation`) receives the *complete* compact concept index of all sections (concept ID, term, definition, areas, claims and cited passages — bounded at 180,000 chars; above that the job fails closed with section checkpoints preserved, because a further index level is not yet implemented) and authors the whole-source summary, explicit alias/duplicate decisions with knowledge agent-authored merged definitions, cross-section typed relationships and cross-section procedures. Concatenating section drafts is not synthesis: the host assembles the final object only by applying those knowledge agent decisions deterministically (claims/citations carried verbatim, coverage remapped through aliases, alias-induced self-edges recorded and dropped), then validates the assembled object against every passage. (5) A compact global knowledge agent critic receives the complete concept index, coverage ledger, metrics and section-review verdicts — not the full text — and judges whole-source coverage, aliases and exposed gaps without claiming quote re-verification.

The large path never depends on one bounded output for the whole artifact: each section, review window, reconciliation decision set and chapter is its own bounded call. Handbook planning and auditing are likewise bounded for large drafts (see §6A): planning receives the complete compact concept/passage index instead of full passages, and auditing runs one knowledge agent window per chapter (checkpointed by content hash, so repair re-audits only changed chapters) plus a compact global cohesion call. Upload limits are unchanged; multi-volume sources are still split by the operator into named volumes. Model truncation, malformed JSON, provider errors and validation failures must not become partial success.

## 6. Knowledge object and semantic granularity

The final object contains `summary`, `concepts`, `relationships`, `procedures`, `coverage`, and `unresolved`. The summary must explain the specific domain situation, scope and responsibilities, not describe the resource as “valuable” or “comprehensive.”

A concept is a teachable distinction or responsibility, not necessarily a noun. Include definitions, institutional processes, role boundaries, obligations, conditional rules, thresholds, exceptions, actions and interpretation risks when supported. Split when two ideas have different prerequisites, consequences or assessment needs. Merge synonyms only when they have the same contextual meaning. Repeated source text should not inflate counts.

Each concept dossier requires:

| Field | Meaning and acceptance |
|---|---|
| `conceptId` | Stable slug; unique within this artifact; preserve through revision when meaning is unchanged |
| `areaIds` | Existing configured areas; reject unknown IDs |
| `terms` | English working label plus supported languages; each term has alternatives, register, citation or explicit inference |
| `definition.en` | Substantial explanation of meaning, conditions, boundaries and professional context |
| `whyItMatters` | Specific consequence of misunderstanding or mistranslation in the selected situation |
| `claims` | Atomic supported statements with kind and exact source citations |
| `distinctions` | Named confusable neighbor plus the consequential difference; cited or explicitly inferred teaching design |
| `misconceptions` | Tagged plausible wrong model, explanation and a diagnostic that separates it from another cause |
| `examples` | Contextual example with valid area, source citation or explicit synthetic/inferred label |
| `difficulty` | 1–5 content prior; never overrides the static runtime difficulty policy |
| `competences` | IDs from the shared engine taxonomy; no invented mastery stages |
| `unresolved` | Missing translations, weak evidence, missing distinctions and review questions |

Empty distinctions/examples/misconceptions arrays must be justified by concrete gaps. Do not invent source support to fill a schema. A definition that only repeats a term, a distinction that says “they differ,” or an example unrelated to the actual professional task is a substantive defect even if JSON parses.

## 6A. Topical professional handbook (primary reading artifact)

The handbook resembles a topical professional handbook a medical translator/interpreter would buy and keep at the desk. It is the main reading experience; the structured concept dossiers, atomic claims and typed graph are derived teaching data in its appendices and in `knowledgebase.json`, used for games and assessment — not a substitute for reading the chapters.

**Plan (`handbookPlan`, knowledge agent-authored).** `{title, subtitle?, scopeStatement, organizingPrinciple, readingPath, scopeLimits[], missingTopics[{topic, reason, neededSource}], chapters[{chapterId, title, purpose, workContext, conceptIds, passageIds, plannedElements, targetDepth, rationale}]}`. Host gates: 1–48 chapters; unique slugs; concepts/passages must exist; every concept with sourced claims appears in at least one chapter; scope limits are non-empty; missing topics name the needed source. Planned elements are chosen from: conceptual-model, workflow, distinction, terms-in-context, worked-example, misconception, application, scope-limit.

**Chapters (`handbookChapters`, knowledge agent-authored, one checkpoint each).** `{chapterId, title, markdown, citations[{passageId, quote}], conceptIds, scopeNote}`. Host gates: prose minimum by planned depth (focused 500 / substantial 2,500 / book-scale 7,000 characters — a floor against thin output, never a target to pad); every citation quote resolves exactly in its passage; every cited passage is marked inline `[passageId]` and lies inside the chapter's planned evidence; worked/teaching examples are labeled synthetic or carry an exact citation; proposed translations are labeled inferred or cited; the chapter ends with a scope note. The host never writes, summarizes or pads prose.

**Planned-concept completeness.** A chapter must declare — and therefore be written to cover — every substantive concept its plan chapter assigns it; declaring only a subset fails per-chapter validation with the missing concept IDs named. After all chapters are written (and again after any audit repair), a final composition gate requires every planned chapter present exactly once, each chapter's declared concepts equal to its planned set, and the union of written chapters covering every planned concept and every sourced synthesized concept. Failure is an actionable `handbook-composition` error with checkpoints preserved. This enforces the plan's own coverage, never an arbitrary book length: a sparse source still earns few focused chapters.

**Bounded planning/auditing for large drafts.** When the monolithic planning payload would exceed 80,000 chars, the planner instead receives the complete compact index (every concept with its claims and cited passages, every passage with its disposition; index bounded at 200,000 chars, above which the job fails closed with knowledge checkpoints preserved) — chapter writers still receive full planned passages. When the monolithic audit payload would exceed 80,000 chars, the audit runs one knowledge agent window per chapter against only that chapter's planned evidence (checkpointed by chapter-content hash), plus one compact global cohesion call over the complete chapter index that is explicitly told not to claim entailment re-verification. Verdicts are aggregated as a deterministic union of knowledge agent findings; flagged-chapter repair and one re-audit work as before.

**Length honesty.** Content length follows the useful subject matter the source supports. A two-page guidance document earns a focused handbook with explicit scope and a long missing-topics list; it must not be padded into an invented textbook or presented as complete medical coverage. A dense multi-volume source may earn book-scale chapters. No word-count targets are set by the host.

**Editorial audit (`handbookAudit`, independent knowledge agent call).** `{verdict, findings, chapterFindings[{chapterId, severity, message}], missingTopics, limitations}` with a native JSON schema. Acceptance requires no blocker/major finding and no chapter finding. Repair rewrites only flagged chapters (all chapters when the fault is book-wide) and re-audits once. Publication is blocked when a handbook exists but its audit has not accepted. This is model editorial review, not SME certification.

**Assembly (`handbook.md` / `handbook.json`).** Host assembly renders knowledge agent's plan and chapters verbatim into a cohesive book: title, about/scope, scope-limits-and-missing-topics first, contents, chapters in plan order, then appendices — concept/term index, typed graph, procedures, coverage ledger, atomic claims with exact evidence, open questions, both independent reviews, and the complete verbatim source. Assembly invents no semantics.

## 7. Atomic claims and exact evidence

A claim has `{claimId,text,kind,citations}`. Kinds: definition, rule, procedure, exception, distinction, context and risk. Each citation has `{passageId,quote}`. The quote must resolve in that passage under whitespace/NFC normalization and be sufficiently specific (minimum 12 characters for the deterministic existence check). The full passage/page/offset remains available.

Citation existence does not prove that the claim follows from it. The independent critic must inspect entailment. Preserve actor, object, time, condition, exception, jurisdiction, modality (“may” versus “must”), polarity, numbers and units. Do not turn educational examples into general professional rules. Claims that go beyond the document must be removed or explicitly unresolved.

Source IDs alone are insufficient provenance. Do not point every concept at the title page. Do not cite a nearby paragraph merely because it contains the same word. A contradiction must retain both cited positions with scope/date and an unresolved question; never average incompatible obligations into one rule.

## 8. Language and cultural scope

Read language pairs from DomainConfig. Never require Spanish and Mandarin for an unrelated domain. Separate a documented equivalent from a model-proposed translation, and distinguish a term from a sentence rendering. Proposed equivalents require `inferred:true` and human review. If the source does not establish an equivalent, the artifact must not present it as sourced fact.

Record legitimate alternatives, register, audience, regional/jurisdictional variants, misleading literals, abbreviations and ambiguity where the source supports them. Do not grade one legitimate equivalent wrong because it is another concept's distractor. Missing language coverage is a visible teaching limitation. Cultural and institution-specific claims require actual evidence; do not substitute stereotypes.

## 9. Relationship contract

Edges require existing nonidentical endpoints, an allowed type, a context-specific explanation and citation or explicit inference. Allowed types: broader, narrower, prerequisite, cause-effect, confusable-with, informal-vs-professional, misleading-literal, part-of, step-before, exception-to, applies-in.

Define prerequisite direction as prerequisite concept → dependent concept. Prerequisite cycles fail validation. Other cycles may be valid. A `confusable-with` edge must explain what learners confuse and how the distinction affects work. A cause-effect edge requires evidence of causality; co-occurrence is not causation. Duplicate and self edges fail. “Related to” is not an accepted semantic type.

Evaluate isolated concepts, clusters, prerequisite reachability, useful cross-section links and disconnected responsibilities. Do not force connectivity by inventing edges. Graph density and node counts are diagnostic evidence, not targets. Ten highly specific well-connected responsibilities can be better than a hundred repeated labels; a dense source cannot be reduced to ten generic terms without explaining what was excluded.

## 10. Procedures and operational context

When a resource describes a process, retain its ordered steps, actors, inputs, preconditions, decision points, stop conditions, exceptions, escalation and consequences. Each step needs source evidence. Do not replace a process with one vocabulary node. If the source omits a step or leaves order uncertain, preserve that limitation. Distinguish the professional's duties from the interpreter's role; synthetic scenarios must not assign unsupported clinical or legal authority to a learner.

## 11. Coverage and educational responsibilities

Every indexed passage receives exactly one disposition: `represented`, `irrelevant` or `insufficient`, with a reason. Represented rows link actual concept IDs grounded in that passage. Irrelevance is relative to the frozen context, not convenience. Insufficient rows explain extraction or evidence gaps. Unknown or duplicate passage IDs fail.

The critic must also compare configured translation areas, professional tasks and the eight mastery stages: recognition, equivalent recall, conceptual understanding, distinction, application, rapid retrieval, spoken production and interpretation. Mark unsupported areas and stages as missing evidence/content, not mastered or complete. Acquisition, recognition and speed are not substitutes for application or transfer. Stage-specific content must not claim professional certification.

Coverage metrics include passage totals and dispositions, relevant-passage coverage, concept and atomic-claim counts, typed-edge count and isolated IDs. Metrics have no fabricated confidence or AI quality score. A high percentage can coexist with shallow synthesis; model review and human inspection remain required.

## 12. Independent review and repair

The reviewer receives the original evidence and finished draft in a separate model call. It returns a verdict (`accept`, `repair`, `reject`), findings with severity/field/message, missing passage IDs and limitations. Blockers: fabricated source claims, unresolved citations, misleading authority, omitted critical qualifications, invalid scope, corruption or cross-domain leakage. Majors include shallow dossiers, repeated generic contrasts, absent procedures, unsupported language treatment, ineffective graph or missing relevant coverage.

Acceptance requires no blocker/major and no missing passage. An accepted verdict with major findings still fails. The host permits one bounded revision/recheck cycle per attempt, then stops visibly with preserved findings. Retry continues from accepted reading checkpoints and requests semantic revision; it cannot waive a rejection. At most five attempts per job prevents unbounded spend.

This is model review, not SME certification. Medical/legal/cultural content retains that limitation. A model saying “accept” does not authorize publication by itself.

## 13. Required files

`handbook.md` is the primary human-readable artifact: the cohesive topical handbook (plan + chapters verbatim, scope/missing-topics first, derived appendices, both independent reviews, complete verbatim source). `handbook.json` carries the plan, chapters, audit and metrics. The workbench opens `handbook.md` by default in a readable rendered view (raw Markdown and download remain available).

Research-mode jobs also produce `acquisition.md` (human-readable blueprint, acquired-source register, latest coverage judgements, failures and incompleteness notice) and `acquisition.json` (schema 1.0: budgets, knowledge agent blueprint, search calls with raw output, candidates, source records, rounds, coverage audits, failures and the public acquisition summary). These are research artifacts; an incomplete one is a valid stopping point with actionable continuation, never a handbook.

`knowledgebase.md` remains the structured companion: scope/source metadata, audience/tasks, source-specific synthesis, complete coverage ledger, detailed concept dossiers, atomic claims with exact evidence, typed graph, procedures, open questions, independent review and a complete extracted-source appendix. Include all source content accepted by the job; disclose extraction limitations.

`knowledgebase.json` (schema 2.1) contains the same semantic object plus source, context, immutable extraction snapshot, review, metrics, the embedded handbook plan/chapters/audit, schema version and provider. It is the machine handoff to knowledge agent's game-design stage (which also receives the handbook title/scope/chapters/missing-topics). Do not make downstream agents reconstruct meaning from a diagram screenshot. Artifacts and checkpoints persist atomically; generated filenames are host-controlled, never model-provided filesystem paths.

The UI shows the real stages (reading, synthesis, critic, handbook plan, chapter writing, editorial audit), artifact preview/download, claim-to-passage inspection, metrics, review findings, retry-from-checkpoint and handbook expansion. It must separate draft, reviewed, published and failed states. No automatically accepted concepts may enter player games from an unfinished job.

## 14. Publication and static builds

Publishing requires an author token, explicit acknowledgement of source/use and review, a successful independent review, schema/grounding gates and no extraction warning left unreviewed. Registry writes preserve the existing source/concept set on validation failure. Never overwrite a different concept merely because the model reused its ID. Publish source-backed data and inferred flags together.

Game generation freezes the selected knowledge artifact, audience, gap, language direction, portfolio and static difficulty policy. knowledge agent first writes a robust `game_framework.md`; game builder then codes against that file. Asset and voice production, if configured, must complete during authoring and be bundled with the static build. Missing media is a build limitation or blocker, never a runtime AI dependency.

Published player bundles contain no author token, raw private upload, agent API calls or classroom system. They use shared deterministic assessment, local evidence, retention and difficulty. Progress export/import is explicit and local; no server synchronization exists.

## 15. Failure, privacy and recovery

Use the local project CLI and private artifact files. Uploaded source text and knowledge artifacts are not public by default. Source URLs do not grant authority to fetch private networks. Never execute instructions from a PDF. Bound uploads, parsing time, queue length, output size and agent executions. Do not log keys or raw document text.

Jobs expose queued/running/succeeded/failed/interrupted states, stage events and actionable errors. Provider absence returns 503 before generation. Timeout, HTTP failure, truncated output and invalid JSON stop the affected attempt. Restart marks unfinished jobs interrupted. Retry reuses accepted checkpoints. Preserve valid framework files if coding fails. Avoid silently reseeding a corrupted persistent store.

## 16. Verification and known implementation boundaries

Required tests: text/page splitting without loss; real PDF text extraction when Poppler exists; scan/encryption/corruption and over-limit refusal; exact/fabricated citation checks; duplicate IDs; unknown areas; dangling/self/duplicate edges; prerequisite cycles; complete passage dispositions; missing translations; provider unavailable; malformed/truncated output; schema repair; independent review rejection; retry/resume; interruption recovery; saved framework before game builder; no player AI calls; static publication and download. Acquisition additionally requires, with injected doubles and no network: actual `web_search_call` provenance required, failed/no search refused, unproven URLs refused, SSRF and redirect refusal, duplicate source fingerprints, partial coverage triggering another round, exhausted budget ending incomplete with no handbook artifact, continuation without redoing accepted work, restart recovery, multi-source citations, and handbook composition only after required coverage passes.

Use clearly identified model test doubles to verify orchestration. They do not demonstrate knowledge agent/game builder quality or live service compatibility. Report actual live checks separately. Test UI on desktop and narrow touch viewports for connection, upload, status, errors, filters, artifact inspection and recovery.

Current boundaries must remain visible: OCR is not provided; remote retrieval is provided only inside research-mode acquisition (§3A) with SSRF-safe, bounded, provenance-proven fetching — entering a URL never fetches it in source-only mode; acquired sources carry `pending-review` rights/authority status until a human reviews them, and live provider/source quality is verified only by a real research run, never by test doubles; synthesis is bounded per call (280k monolith / 70k section target / 180k whole-source index / 200k planning index) and fails closed with checkpoints beyond those limits — a second-level concept index for sources whose complete compact index exceeds 180k chars is not yet implemented; translation approval needs human review; code contract/syntax and model review do not prove playability. Human playtest is a separate promotion gate. Never claim these are solved because a job returned JSON.

## Interpreting-centered curriculum

Reuse existing useful knowledge and extend it around real interpreting work, not formal credential legitimacy or one jurisdiction's exam. The curriculum should relate listening/analysis, meaning units, memory/chunking, note-taking, reformulation, terminology/distinctions, delivery, coordination, sight work, professional judgment and transparent repair. Explain concepts and high-value definitions in context; provide varied labeled practice situations and transfer between medical and legal encounters. English–Spanish and English–Chinese are the confirmed language priorities. Preserve regional/script distinctions and missing equivalents.

Separate reference completeness from practice readiness. A bounded game may use established existing concepts while broader book research continues; it must not claim to teach unsupported facts or certify a professional. A synthetic practice case need not masquerade as an authoritative source. Its learning evidence must reflect an actual assessed response and the limited responsibility it exercised. Institutional/credential material is optional reference, not the organizing principle of curriculum progression.

The shared core owns progress, difficulty and retention. Build-time agents own semantic knowledge, source-backed additions, curriculum context and game design. Reuse preserves provenance and uncertainty rather than rewriting historical content into a claim of new verification.
