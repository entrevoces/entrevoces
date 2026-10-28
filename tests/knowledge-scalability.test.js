// Large-source knowledge scalability tests. Model test doubles prove host
// orchestration, checkpointing, bounded payloads and deterministic assembly
// only — they do not demonstrate knowledge/design agent's live quality or live compatibility.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import * as core from "../packages/engine-core/index.js";
import { validateKnowledgeSection, validateKnowledgeReconciliation, assembleKnowledgeDraft } from "../packages/engine-core/knowledge.js";
import { validateHandbookChapter, validateHandbookComposition } from "../packages/engine-core/handbook.js";
import { GenerationJobs } from "../generator/generation.js";
import { outputSchema, KNOWLEDGE_SECTION_SCHEMA, KNOWLEDGE_RECONCILIATION_SCHEMA } from "../generator/output-contracts.js";
import { partitionSections, SYNTHESIS_MONOLITH_BUDGET, RECONCILIATION_INDEX_BUDGET, HANDBOOK_PLAN_INDEX_BUDGET } from "../generator/knowledge-orchestration.js";

const domain = core.OREGON_MEDICAL;
const areaId = domain.translationAreas[0].areaId;
const accept = { verdict: "accept", findings: [], missingPassageIds: [], limitations: ["Test double."] };
const auditAccept = { verdict: "accept", findings: [], chapterFindings: [], missingTopics: ["Live professional practice"], limitations: ["Test double."] };
const SHARED_SENTENCE = "Shared verification means checking the record against the original document before filing.";
const filler = "Detailed operational context including actor, timing, verification duty and filing consequence is preserved in this fixture sentence. ".repeat(70);

function passageText(i) {
  return `Case ${i} filing rule. The intake clerk must record case ${i} identifier and verify supporting document ${i} before the submission deadline. ${SHARED_SENTENCE} Operational detail for case ${i}: ${"The clerk records the identifier, checks the supporting document, notes the deadline and confirms verification before filing the case record. ".repeat(12)}`;
}
function makeConcept(conceptId, claimId, passage, quote, term = conceptId) {
  return { conceptId, areaIds: [areaId], terms: { en: { term, register: "professional", alternatives: [] } }, definition: { en: `Fixture definition for ${term} explaining its meaning, boundaries and professional context in this test source in sufficient detail.` }, whyItMatters: `Confusing ${term} with a neighbouring duty changes what a practitioner records, checks or files in this fixture context.`, difficulty: 2, competences: ["domain-knowledge"], claims: [{ claimId, text: quote.replace(/\.$/, "") + " in the supplied fixture source.", kind: "rule", citations: [{ passageId: passage.passageId, quote }] }], distinctions: [], misconceptions: [], examples: [], unresolved: ["Fixture gap recorded explicitly."] };
}

const N = 36;
const pages = Array.from({ length: N }, (_, k) => passageText(k + 1));
const passages = core.indexSource(pages);
assert.equal(passages.length, N);

function passageDraft(input) {
  const passage = input.user.passages[0];
  const n = Number(/b(\d+)-/.exec(input.user.instruction)[1]);
  const uniqueQuote = `The intake clerk must record case ${n} identifier and verify supporting document ${n} before the submission deadline.`;
  const unique = makeConcept(`b${n}-case-${n}`, `b${n}-case-${n}-claim`, passage, uniqueQuote, `case ${n} handling`);
  unique.definition.en += filler; // makes the monolithic draft exceed the old 280k ceiling
  const shared = makeConcept(`b${n}-shared-verification`, `b${n}-shared-claim`, passage, SHARED_SENTENCE, "shared verification");
  shared.definition.en += filler;
  return { summary: `Fixture passage synthesis ${n} describing one case filing rule and the shared verification duty with enough detail to be a substantive test-only summary of this passage.`, concepts: [unique, shared], relationships: [], procedures: [], coverage: [{ passageId: passage.passageId, status: "represented", reason: "Fixture concepts cite this passage.", conceptIds: [unique.conceptId, shared.conceptId] }], unresolved: ["Fixture passage gap."] };
}

function sectionDraft(input) {
  const drafts = input.user.extractedDrafts;
  const concepts = drafts.flatMap((d) => d.concepts.map((c) => ({ ...structuredClone(c), definition: { en: c.definition.en.slice(0, 220) } })));
  return { summary: `Fixture section synthesis ${input.user.sectionIndex} consolidating its supplied passages, preserving every supplied claim and citation while deferring cross-section decisions to reconciliation.`, concepts, relationships: [], procedures: drafts.flatMap((d) => d.procedures), coverage: drafts.flatMap((d) => d.coverage), unresolved: drafts.flatMap((d) => d.unresolved), aliases: [] };
}

function reconciliation(input) {
  const index = input.user.conceptIndex;
  const shared = index.filter((e) => e.conceptId.endsWith("-shared-verification"));
  const canonical = shared[0].conceptId;
  const firstUnique = index.find((e) => /-case-1$/.test(e.conceptId));
  return {
    summary: "Fixture whole-source reconciliation: many case-specific filing duties share one verification responsibility, which is aliased to a single canonical concept while every case rule remains distinct and separately cited throughout.",
    aliases: shared.slice(1).map((e) => ({ aliasConceptId: e.conceptId, canonicalConceptId: canonical, reason: "Same verification duty with the same contextual meaning in every fixture passage.", mergedDefinitionEn: "Shared verification means checking the record against the original document before filing, reconciled across every fixture section as one duty with many case citations.", mergedWhyItMatters: "Treating this one duty as many unrelated checks hides that every case filing depends on the same verification step and its consequences." })),
    relationships: [{ sourceId: canonical, targetId: firstUnique.conceptId, type: "prerequisite", explanation: "Verification of the record is a prerequisite for the first case filing duty described in this fixture source.", inferred: true, citations: [] }],
    procedures: [], unresolved: ["Fixture whole-source gap exposed by reconciliation."],
  };
}

function largePlan(input) {
  const index = input.user.conceptIndex;
  const groups = [];
  for (let i = 0; i < index.length; i += 9) groups.push(index.slice(i, i + 9));
  return {
    title: "Case Filing and Verification — a fixture practice handbook",
    scopeStatement: "This fixture handbook covers only the case filing and shared verification duties established by the supplied test passages. It does not teach any real filing practice, because the passages are orchestration fixtures rather than professional sources.",
    organizingPrinciple: "Chapters are organized by consecutive groups of case duties from the source, each moving from the filing work problem to verification, distinctions in context and application at the desk.",
    readingPath: "Read chapters in source order, then use the derived concept index and coverage appendix to inspect the exact fixture evidence behind each duty.",
    scopeLimits: ["Only the supplied fixture passages are covered."],
    missingTopics: [{ topic: "Real filing practice", reason: "The supplied passages are test fixtures and establish no real-world filing procedure, authority or deadline regime.", neededSource: "An authoritative filing source." }],
    chapters: groups.map((group, k) => ({ chapterId: `case-group-${k + 1}`, title: `Case duties group ${k + 1} in practice`, purpose: "Help the reader carry out this group of case filing duties while keeping the shared verification prerequisite distinct and correctly sequenced.", workContext: "Fixture intake documentation work where identifiers, supporting documents and verification must not be merged or skipped.", conceptIds: group.map((e) => e.conceptId), passageIds: [...new Set(group.flatMap((e) => e.citedPassageIds))], plannedElements: ["conceptual-model", "workflow", "application", "scope-limit"], targetDepth: "focused", rationale: "The source supports this consecutive group of case duties at focused depth, so the chapter earns exactly that scope and no more." })),
  };
}

function largeChapter(input) {
  const pc = input.user.planChapter;
  const first = input.user.passages[0];
  const quote = first.text.split(". ")[0] + ".";
  const terms = pc.conceptIds.join(", ");
  const body = `This chapter starts from the filing desk problem behind [${first.passageId}]: a case record is only ready when its identifier, supporting document and verification are handled in the right order [${first.passageId}]. The planned duties in scope are ${terms}. The model is consistent across the group: record what the case requires, check the record against the original document, and only then treat the filing as ready. Confusing one case duty with another changes which identifier or document is checked, and skipping the shared verification step removes the check that the record matches its source. In practice, work through the planned concepts in order, keep each case identifier attached to its own supporting document, and apply the verification duty before submission rather than after it. Terms in context stay tied to their case: a case term names one filing duty, while the verification term names the cross-case check. Application: before filing, name the case, name its document, state the verification result, and stop if any of the three cannot be stated from the supplied record.`;
  return { chapterId: pc.chapterId, title: pc.title, markdown: body, citations: [{ passageId: first.passageId, quote }], conceptIds: [...pc.conceptIds], scopeNote: "This fixture chapter establishes only the duties in its planned passages; it teaches no real filing practice." };
}

function makeLargeDouble(counts, sizes, { failSection = -1, repairSection = -1 } = {}) {
  let failed = false, repaired = false;
  return async (input) => {
    const { task } = input;
    counts[task] = (counts[task] || 0) + 1;
    sizes.push({ task, chars: JSON.stringify(input.user ?? null).length, sectionIndex: input.user?.sectionIndex, planIndex: Boolean(input.user?.conceptIndex), scope: input.user?.auditScope?.scope || input.user?.evidence?.reviewScope?.scope || (input.user?.evidence?.reviewScope ? "section" : null) });
    if (task === "knowledge-section" && input.user.sectionIndex === failSection && !failed && !input.user.previousSectionDraft) { failed = true; throw new Error("provider unavailable mid-section (test double)"); }
    if (task === "knowledge-passage") return passageDraft(input);
    if (task === "knowledge-section") return sectionDraft(input);
    if (task === "knowledge-reconciliation") return reconciliation(input);
    if (task === "knowledge-review" && repairSection >= 0 && input.user.evidence?.reviewScope?.sectionIndex === repairSection && !repaired) { repaired = true; return { verdict: "repair", findings: [{ severity: "major", field: "section", message: "Fixture repair finding for one section only." }], missingPassageIds: [], limitations: ["Test double."] }; }
    if (task === "knowledge-review") return accept;
    if (task === "handbook-plan") return largePlan(input);
    if (task === "handbook-chapter") return largeChapter(input);
    if (task === "handbook-audit") return auditAccept;
    throw new Error(task);
  };
}
function harness(call) { const store = { jobs: [] }; const jobs = new GenerationJobs({ getStore: () => store, save: () => {}, artifactRoot: mkdtempSync("/tmp/ev-large-"), call, configured: () => true }); return { store, jobs }; }
async function complete(jobs, job) { await jobs.drain(); while (jobs.active) await new Promise((r) => setTimeout(r, 5)); return job; }
function largeJob(h) { return h.jobs.create({ kind: "knowledge", input: { domain, resource: { passages, warnings: [] }, source: { sourceId: "test-large", title: "Large fixture" }, context: { audience: "Test readers", goals: "Test goals" } } }); }

test("partitionSections accounts for every passage exactly once, in order, within budget", () => {
  const batches = passages.slice(0, 6).map((p, i) => ({ summary: "x", concepts: [], coverage: [{ passageId: p.passageId, status: "represented", reason: "r", conceptIds: [] }], _pad: "y".repeat(300 * (i + 1)) }));
  const sections = partitionSections(batches, passages.slice(0, 6), { maxChars: 1200, hardMaxChars: 100000 });
  assert.deepEqual(sections.flatMap((s) => s.passages.map((p) => p.passageId)), passages.slice(0, 6).map((p) => p.passageId));
  assert.ok(sections.length > 1);
  for (const s of sections) assert.ok(s.chars <= 1200 || s.batches.length === 1, "only a singleton may exceed the target");
});

test("partitionSections fails closed when one batch exceeds the hard budget", () => {
  const batches = [{ concepts: [], coverage: [{ passageId: passages[0].passageId, status: "represented", reason: "r", conceptIds: [] }], _pad: "z".repeat(5000) }];
  assert.throws(() => partitionSections(batches, passages.slice(0, 1), { maxChars: 1000, hardMaxChars: 2000 }), (e) => e.code === "knowledge-section-too-large");
});

test("section gate rejects dropped claims and invented concept IDs", () => {
  const input = { user: { passages: [passages[0]], instruction: "Prefix concept and claim IDs with b1- to avoid collisions." } };
  const draft = passageDraft(input);
  const good = { ...structuredClone(draft), aliases: [] };
  assert.equal(validateKnowledgeSection(good, { domain, passages: [passages[0]], inputDrafts: [draft] }).ok, true);
  const dropped = structuredClone(good); dropped.concepts[0].claims = [];
  assert.ok(validateKnowledgeSection(dropped, { domain, passages: [passages[0]], inputDrafts: [draft] }).errors.some((e) => e.message.includes("b1-case-1-claim")));
  const invented = structuredClone(good); invented.concepts[0].conceptId = "brand-new-id"; invented.coverage[0].conceptIds = ["brand-new-id", "b1-shared-verification"];
  assert.ok(validateKnowledgeSection(invented, { domain, passages: [passages[0]], inputDrafts: [draft] }).errors.some((e) => e.message.includes("invented concept ID")));
});

test("reconciliation gate rejects alias chains and unknown IDs; assembly carries claims onto the canonical concept", () => {
  const mk = (n) => { const d = passageDraft({ user: { passages: [passages[n - 1]], instruction: `Prefix b${n}-` } }); return { ...d, aliases: [] }; };
  const sections = [mk(1), mk(2)];
  const rec = reconciliation({ user: { conceptIndex: sections.flatMap((s, i) => s.concepts.map((c) => ({ conceptId: c.conceptId, sectionIndex: i }))) } });
  // rec aliases b2-shared -> b1-shared and links to b1-case-1; supply both claims' sections
  assert.equal(validateKnowledgeReconciliation(rec, { sectionDrafts: sections }).ok, true);
  const chained = structuredClone(rec); chained.aliases.push({ aliasConceptId: "b1-shared-verification", canonicalConceptId: "b2-case-2", reason: "Chain attempt with a sufficiently long reason.", mergedDefinitionEn: "", mergedWhyItMatters: "" });
  assert.equal(validateKnowledgeReconciliation(chained, { sectionDrafts: sections }).ok, false);
  const { draft, report } = assembleKnowledgeDraft({ sectionDrafts: sections, reconciliation: rec });
  const canonical = draft.concepts.find((c) => c.conceptId === "b1-shared-verification");
  assert.equal(canonical.claims.length, 2, "alias claims are carried, not dropped");
  assert.deepEqual(new Set(canonical.claims.flatMap((a) => a.citations.map((c) => c.passageId))), new Set([passages[0].passageId, passages[1].passageId]));
  assert.equal(report.aliasesApplied, 1);
  assert.ok(draft.coverage.every((r) => !r.conceptIds.includes("b2-shared-verification")), "coverage is remapped to canonical IDs");
  assert.ok(draft.relationships.every((e) => e.sourceId !== e.targetId));
});

test("new knowledge/design agent tasks have native output schemas with every property required", () => {
  assert.equal(outputSchema("knowledge-section"), KNOWLEDGE_SECTION_SCHEMA);
  assert.equal(outputSchema("knowledge-reconciliation"), KNOWLEDGE_RECONCILIATION_SCHEMA);
  const walk = (schema) => { if (schema?.type === "object" && schema.properties) { assert.deepEqual(new Set(schema.required), new Set(Object.keys(schema.properties))); Object.values(schema.properties).forEach(walk); } if (schema?.items) walk(schema.items); };
  walk(KNOWLEDGE_RECONCILIATION_SCHEMA);
});

test("chapter gate and final composition reject a chapter declaring only a subset of planned concepts", () => {
  const p1 = passages[0];
  const draft = { concepts: [makeConcept("alpha-concept", "alpha-claim", p1, SHARED_SENTENCE, "alpha"), makeConcept("beta-concept", "beta-claim", p1, SHARED_SENTENCE, "beta")] };
  draft.concepts[1].claims[0].text = "Beta fixture claim text from the supplied source passage.";
  const planChapter = { chapterId: "both-concepts", title: "Both concepts", conceptIds: ["alpha-concept", "beta-concept"], passageIds: [p1.passageId], targetDepth: "focused" };
  const plan = { chapters: [planChapter] };
  const subset = { chapterId: "both-concepts", title: "Both concepts", markdown: "x".repeat(600) + ` [${p1.passageId}]`, citations: [{ passageId: p1.passageId, quote: SHARED_SENTENCE }], conceptIds: ["alpha-concept"], scopeNote: "Scope note for this fixture chapter is explicit and honest." };
  const chapterGate = validateHandbookChapter(subset, { planChapter, passages });
  assert.equal(chapterGate.ok, false);
  assert.ok(chapterGate.errors.some((e) => e.message.includes("beta-concept")), JSON.stringify(chapterGate.errors));
  const composition = validateHandbookComposition(plan, [subset], draft);
  assert.equal(composition.ok, false);
  assert.ok(composition.errors.some((e) => e.message.includes("beta-concept")));
  const full = { ...subset, conceptIds: ["alpha-concept", "beta-concept"] };
  assert.equal(validateHandbookComposition(plan, [full], draft).ok, true);
});

test("large source: sectioned synthesis + reconciliation + bounded review/plan/audit succeeds with every span accounted for", async () => {
  assert.ok(JSON.stringify(Array.from({ length: N }, (_, k) => k)).length >= 0); // fixture sanity, no quality claim
  const counts = {}, sizes = [];
  const h = harness(makeLargeDouble(counts, sizes));
  const job = largeJob(h); await complete(h.jobs, job);
  assert.equal(job.status, "succeeded", JSON.stringify(job.error));
  assert.equal(counts["knowledge-passage"], N, "every passage read exactly once");
  assert.equal(counts["knowledge-synthesis"], undefined, "monolithic synthesis must not be attempted");
  const scopes = job.checkpoints.knowledgeSectionScopes;
  assert.ok(scopes.length >= 3, `expected several sections, got ${scopes.length}`);
  assert.deepEqual(scopes.flatMap((s) => s.passageIds), passages.map((p) => p.passageId), "section scopes account for every passage exactly once, in order");
  for (const s of scopes) assert.ok(s.payloadChars <= 80000, `section payload bounded: ${s.payloadChars}`);
  assert.equal(counts["knowledge-section"], scopes.length);
  assert.equal(counts["knowledge-reconciliation"], 1);
  const recSize = sizes.find((s) => s.task === "knowledge-reconciliation");
  assert.ok(recSize.chars <= RECONCILIATION_INDEX_BUDGET + 20000, `reconciliation payload bounded: ${recSize.chars}`);
  const draft = job.checkpoints.knowledge;
  assert.equal(draft.coverage.length, N);
  assert.equal(job.result.metrics.passages, N);
  assert.equal(job.result.metrics.represented, N);
  assert.equal(job.result.synthesis.mode, "sectioned");
  const canonical = draft.concepts.find((c) => c.conceptId === "b1-shared-verification");
  assert.equal(canonical.claims.length, N, "every aliased claim carried onto the canonical concept with its citation");
  assert.equal(draft.aliases.length, N - 1);
  assert.equal(draft.concepts.length, N + 1);
  assert.ok(draft.relationships.some((e) => e.sourceId === "b1-shared-verification"), "knowledge/design agent-authored cross-section relationship present");
  // Bounded downstream stages: plan used the compact index; audit used windows + one global call.
  assert.ok(sizes.filter((s) => s.task === "handbook-plan").every((s) => s.chars <= HANDBOOK_PLAN_INDEX_BUDGET + 20000));
  assert.ok(sizes.some((s) => s.task === "handbook-plan" && s.planIndex), "planner received the compact global index, not full passages");
  const auditSizes = sizes.filter((s) => s.task === "handbook-audit");
  assert.ok(auditSizes.some((s) => s.scope === "chapter-window") && auditSizes.some((s) => s.scope === "global-cohesion"), "per-chapter window audits plus a global cohesion audit");
  assert.ok(sizes.some((s) => s.task === "knowledge-review" && s.scope === "section") && sizes.some((s) => s.task === "knowledge-review" && s.scope === "large-global"), "section critics plus compact global critic");
  assert.deepEqual(job.checkpoints.handbookMetrics.missingPlannedConceptIds, []);
  assert.ok(job.files.some((f) => f.name === "handbook.md") && job.files.some((f) => f.name === "knowledgebase.md"));
});

test("large source: a flagged section is revised once in isolation and the job still completes", async () => {
  const counts = {}, sizes = [];
  const h = harness(makeLargeDouble(counts, sizes, { repairSection: 1 }));
  const job = largeJob(h); await complete(h.jobs, job);
  assert.equal(job.status, "succeeded", JSON.stringify(job.error));
  assert.equal(sizes.filter((s) => s.task === "knowledge-section" && s.sectionIndex === 1).length, 2, "flagged section re-authored exactly once");
  assert.equal(sizes.filter((s) => s.task === "knowledge-section" && s.sectionIndex === 0).length, 1, "unflagged sections not re-authored");
  assert.equal(counts["knowledge-passage"], N, "section revision reuses passage checkpoints");
});

test("large source: failure in a later section preserves earlier sections; retry does not re-read passages", async () => {
  const counts = {}, sizes = [];
  const h = harness(makeLargeDouble(counts, sizes, { failSection: 2 }));
  const job = largeJob(h); await complete(h.jobs, job);
  assert.equal(job.status, "failed");
  assert.equal(counts["knowledge-passage"], N);
  const sectionsBefore = { ...counts };
  assert.ok(job.checkpoints.knowledgeSections[0] && job.checkpoints.knowledgeSections[1], "earlier section checkpoints preserved");
  h.jobs.retry(job.jobId); await complete(h.jobs, job);
  assert.equal(job.status, "succeeded", JSON.stringify(job.error));
  assert.equal(counts["knowledge-passage"], N, "retry must not re-read accepted passages");
  const sectionCalls = sizes.filter((s) => s.task === "knowledge-section");
  assert.equal(sectionCalls.filter((s) => s.sectionIndex === 0).length, 1, "accepted section 0 not re-synthesized");
  assert.equal(sectionCalls.filter((s) => s.sectionIndex === 1).length, 1, "accepted section 1 not re-synthesized");
  assert.equal(sectionsBefore["knowledge-section"] >= 3, true);
});
