// Handbook orchestration tests. Model test doubles prove host orchestration,
// checkpointing, grounding gates and repair routing — not knowledge/design agent's live quality.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import * as core from "../packages/engine-core/index.js";
import { GenerationJobs } from "../generator/generation.js";
import { outputSchema, HANDBOOK_PLAN_SCHEMA, HANDBOOK_CHAPTER_SCHEMA, HANDBOOK_AUDIT_SCHEMA } from "../generator/output-contracts.js";

const domain = core.OREGON_MEDICAL;
const sourceText = "Test-only source: A dose is a quantity administered at one time. A dosage is a regimen specifying quantity, timing and duration. The distinction preserves information about a single administration versus a schedule.";
const passages = core.indexSource([sourceText]);
const citation = { passageId: passages[0].passageId, quote: "A dose is a quantity administered at one time." };
const accept = { verdict: "accept", findings: [], missingPassageIds: [], limitations: ["Test double."] };
const auditAccept = { verdict: "accept", findings: [], chapterFindings: [], missingTopics: ["Prescribing practice"], limitations: ["Test double."] };

function draft() { return { summary: "Test-only synthesis of a distinction between a single administered quantity and a regimen. This fixture is not published content and is used exclusively to exercise validation.", concepts: [{ conceptId: "test-dose", areaIds: [domain.translationAreas[0].areaId], terms: { en: { term: "dose", register: "professional", alternatives: [] } }, definition: { en: "Test-only concept definition distinguishing a quantity administered once from the schedule under which multiple administrations occur." }, whyItMatters: "The test distinction prevents a single quantity from being confused with an entire schedule.", difficulty: 2, competences: ["domain-knowledge"], claims: [{ claimId: "test-claim", text: "A dose is a quantity administered at one time.", kind: "definition", citations: [citation] }], distinctions: [], misconceptions: [], examples: [], unresolved: ["Fixture deliberately omits teaching designs and translations."] }], relationships: [], procedures: [], coverage: [{ passageId: passages[0].passageId, status: "represented", reason: "The fixture concept cites this source passage.", conceptIds: ["test-dose"] }], unresolved: ["This is a validator fixture, not usable curriculum."] }; }
function plan(overrides = {}) { return { title: "Dose and Dosage — a focused practice handbook", scopeStatement: "This focused handbook teaches only the dose-versus-dosage distinction established by the single supplied test passage. It does not teach prescribing, administration routes, patient counselling or any other medication topic, because the source establishes none of those.", organizingPrinciple: "The single chapter is organized around the consequential work distinction between one administration and a regimen, moving from the work problem to the model, the distinction and application.", readingPath: "Read the chapter in order, then use the derived concept index and coverage appendix to check the exact source evidence.", scopeLimits: ["Only the supplied test passage is covered."], missingTopics: [{ topic: "Prescribing and administration practice", reason: "The supplied passage defines two terms only and establishes no prescribing or administration procedure whatsoever.", neededSource: "An authoritative prescribing source." }], chapters: [{ chapterId: "dose-vs-dosage", title: "One administration versus a regimen", purpose: "Help the reader keep a single administered quantity distinct from the regimen that schedules repeated administrations in real documentation work.", workContext: "Medication documentation and interpreting where quantity and schedule must not be merged.", conceptIds: ["test-dose"], passageIds: [passages[0].passageId], plannedElements: ["conceptual-model", "distinction", "application", "scope-limit"], targetDepth: "focused", rationale: "The source supports exactly one consequential distinction, so one focused chapter at honest depth is the right size." }], ...overrides }; }
function chapter(overrides = {}) { const body = `This chapter exists because confusing one administration with a whole schedule changes what a reader believes was given and when [${passages[0].passageId}]. The source states the model plainly: a dose is the quantity administered at one time, while a dosage describes the regimen that specifies quantity, timing and duration across administrations [${passages[0].passageId}]. Keeping those two ideas apart is the whole professional task here. When documentation says a dose was given, it reports a single event; when it states a dosage, it prescribes or describes a pattern that repeats. A reader who merges them may treat a schedule as already completed, or treat one event as an ongoing instruction, and either error distorts the record. The consequential distinction is event versus regimen: dose names the event quantity, dosage names the governing schedule. Application: before rendering either term, ask whether the sentence reports one administration or lays down a schedule, then choose accordingly.`; return { chapterId: "dose-vs-dosage", title: "One administration versus a regimen", markdown: body, citations: [citation], conceptIds: ["test-dose"], scopeNote: "This chapter establishes only the distinction in the supplied passage; it teaches no prescribing practice.", ...overrides }; }
function harness(call) { const store = { jobs: [] }; const folder = mkdtempSync("/tmp/ev-handbook-"); const jobs = new GenerationJobs({ getStore: () => store, save: () => {}, artifactRoot: folder, call, configured: () => true }); return { store, jobs, folder }; }
async function complete(jobs, job) { await jobs.drain(); while (jobs.active) await new Promise((r) => setTimeout(r, 5)); return job; }
function knowledgeJob(h, counts = {}) {
  return h.jobs.create({ kind: "knowledge", input: { domain, resource: { passages, warnings: [] }, source: { sourceId: "test-source", title: "Fixture" }, context: { audience: "Test readers", goals: "Test goals" } } });
}
function baseDouble(counts, overrides = {}) {
  return async (input) => {
    const { task } = input;
    counts[task] = (counts[task] || 0) + 1;
    if (overrides[task]) return overrides[task](input);
    if (task === "knowledge-passage" || task === "knowledge-synthesis") return draft();
    if (task === "knowledge-review") return accept;
    if (task === "handbook-plan") return plan();
    if (task === "handbook-chapter") return chapter({ chapterId: input.user.planChapter.chapterId, title: input.user.planChapter.title });
    if (task === "handbook-audit") return auditAccept;
    throw new Error(task);
  };
}

test("handbook schemas are registered for native structured output", () => {
  assert.equal(outputSchema("handbook-plan"), HANDBOOK_PLAN_SCHEMA);
  assert.equal(outputSchema("handbook-chapter"), HANDBOOK_CHAPTER_SCHEMA);
  assert.equal(outputSchema("handbook-audit"), HANDBOOK_AUDIT_SCHEMA);
});

test("plan gate rejects dictionary outlines, unknown concepts and silently dropped concepts", () => {
  assert.equal(core.validateHandbookPlan(plan(), { draft: draft(), passages }).ok, true);
  const noScope = plan({ scopeLimits: [] });
  assert.equal(core.validateHandbookPlan(noScope, { draft: draft(), passages }).ok, false);
  const unknown = plan(); unknown.chapters[0].conceptIds = ["missing-concept"];
  assert.equal(core.validateHandbookPlan(unknown, { draft: draft(), passages }).ok, false);
  const dropped = plan(); dropped.chapters[0].conceptIds = ["test-dose"]; const two = draft(); two.concepts.push({ ...structuredClone(two.concepts[0]), conceptId: "second-concept", claims: [{ claimId: "second-claim", text: "A dosage is a regimen specifying quantity, timing and duration.", kind: "definition", citations: [{ passageId: passages[0].passageId, quote: "A dosage is a regimen specifying quantity, timing and duration." }] }] });
  assert.ok(core.validateHandbookPlan(dropped, { draft: two, passages }).errors.some((e) => e.message.includes("second-concept")));
  const noMissing = plan({ missingTopics: [{ topic: "X", reason: "short", neededSource: "" }] });
  assert.equal(core.validateHandbookPlan(noMissing, { draft: draft(), passages }).ok, false);
});

test("chapter gate rejects fabricated quotes, out-of-plan passages and unlabeled synthetic examples", () => {
  const pc = plan().chapters[0];
  assert.equal(core.validateHandbookChapter(chapter(), { planChapter: pc, passages }).ok, true);
  const fake = chapter({ citations: [{ passageId: passages[0].passageId, quote: "Invented quote that never appears anywhere." }] });
  assert.equal(core.validateHandbookChapter(fake, { planChapter: pc, passages }).ok, false);
  const unlabeled = chapter({ markdown: chapter().markdown + "\n\nWorked example: A nurse documents one administration this morning and the schedule for the week." });
  assert.equal(core.validateHandbookChapter(unlabeled, { planChapter: pc, passages }).ok, false);
  const labeled = chapter({ markdown: chapter().markdown + "\n\nSynthetic example (teaching example, not sourced): A nurse documents one administration this morning and the schedule for the week." });
  assert.equal(core.validateHandbookChapter(labeled, { planChapter: pc, passages }).ok, true);
  const thin = chapter({ markdown: `Short. [${passages[0].passageId}]` });
  assert.equal(core.validateHandbookChapter(thin, { planChapter: pc, passages }).ok, false);
  const uncited = chapter({ markdown: chapter().markdown.replaceAll(`[${passages[0].passageId}]`, "") });
  assert.equal(core.validateHandbookChapter(uncited, { planChapter: pc, passages }).ok, false);
});

test("full knowledge job produces a cohesive handbook as the primary artifact", async () => {
  const counts = {}; const h = harness(baseDouble(counts));
  const job = knowledgeJob(h); await complete(h.jobs, job);
  assert.equal(job.status, "succeeded", JSON.stringify(job.error));
  assert.deepEqual([counts["knowledge-passage"], counts["handbook-plan"], counts["handbook-chapter"], counts["handbook-audit"]], [1, 1, 1, 1]);
  const handbook = job.files.find((f) => f.name === "handbook.md");
  assert.ok(handbook, "handbook.md exists");
  assert.ok(handbook.content.startsWith("# Dose and Dosage"));
  assert.ok(handbook.content.includes("Scope, limits and missing topics"));
  assert.ok(handbook.content.includes("Prescribing and administration practice"));
  assert.ok(handbook.content.includes("Appendix A · Concept and term index (derived teaching data)"));
  assert.ok(handbook.content.includes("Complete extracted source (verbatim)"));
  assert.equal(job.result.handbook.auditVerdict, "accept");
  assert.ok(job.result.handbook.words > 50);
  assert.equal(job.files[0].name, "handbook.md", "public view lists the handbook first");
});

test("chapter failure preserves checkpoints; retry resumes without re-reading passages", async () => {
  const counts = {}; let failChapter = true;
  const h = harness(baseDouble(counts, { "handbook-chapter": () => { if (failChapter) throw new Error("provider unavailable mid-chapter"); return chapter(); } }));
  const job = knowledgeJob(h); await complete(h.jobs, job);
  assert.equal(job.status, "failed");
  assert.equal(counts["knowledge-passage"], 1);
  assert.ok(job.checkpoints.handbookPlan, "plan checkpoint preserved");
  failChapter = false;
  h.jobs.retry(job.jobId); await complete(h.jobs, job);
  assert.equal(job.status, "succeeded", JSON.stringify(job.error));
  assert.equal(counts["knowledge-passage"], 1, "retry must not re-read accepted passages");
  assert.equal(counts["knowledge-synthesis"], 1, "retry must not re-synthesize");
  assert.equal(counts["handbook-plan"], 1, "retry reuses the accepted plan");
});

test("editorial audit repair rewrites only the flagged chapter and re-audits", async () => {
  const counts = {}; let audits = 0;
  const twoChapterPlan = plan(); twoChapterPlan.chapters.push({ ...structuredClone(twoChapterPlan.chapters[0]), chapterId: "applying-the-distinction", title: "Applying the distinction at work" });
  const h = harness(baseDouble(counts, {
    "handbook-plan": () => twoChapterPlan,
    "handbook-audit": () => (++audits === 1 ? { verdict: "repair", findings: [{ severity: "major", field: "handbook", message: "Second chapter repeats the first." }], chapterFindings: [{ chapterId: "applying-the-distinction", severity: "major", message: "Chapter repeats chapter one instead of applying the distinction." }], missingTopics: [], limitations: [] } : auditAccept),
  }));
  const job = knowledgeJob(h); await complete(h.jobs, job);
  assert.equal(job.status, "succeeded", JSON.stringify(job.error));
  assert.equal(audits, 2);
  assert.equal(counts["handbook-chapter"], 3, "two initial chapters plus exactly one flagged rewrite");
});

test("audit that still fails after repair fails the job visibly with findings preserved", async () => {
  const counts = {};
  const h = harness(baseDouble(counts, { "handbook-audit": () => ({ verdict: "repair", findings: [{ severity: "major", field: "handbook", message: "Still shallow." }], chapterFindings: [{ chapterId: "dose-vs-dosage", severity: "major", message: "Still a dictionary entry." }], missingTopics: [], limitations: [] }) }));
  const job = knowledgeJob(h); await complete(h.jobs, job);
  assert.equal(job.status, "failed");
  assert.equal(job.error.code, "handbook-audit");
  assert.ok(job.error.findings.length >= 1);
  assert.ok(!job.files.some((f) => f.name === "handbook.md"), "failed-audit handbook is not released as an artifact");
  assert.ok(job.checkpoints.handbookChapters.length === 1, "chapter checkpoint preserved for retry");
});

test("expansion reuses accepted readings and synthesis; passages are never re-read", async () => {
  const counts = {}; const h = harness(baseDouble(counts));
  const parent = knowledgeJob(h); await complete(h.jobs, parent);
  assert.equal(parent.status, "succeeded", JSON.stringify(parent.error));
  const before = { ...counts };
  const expansion = h.jobs.createExpansion(parent, "Deepen the application material.");
  await complete(h.jobs, expansion);
  assert.equal(expansion.status, "succeeded", JSON.stringify(expansion.error));
  assert.equal(counts["knowledge-passage"], before["knowledge-passage"], "expansion must not re-read passages");
  assert.equal(counts["knowledge-synthesis"], before["knowledge-synthesis"], "expansion must not re-synthesize");
  assert.equal(counts["handbook-plan"], before["handbook-plan"] + 1, "knowledge/design agent re-plans the handbook");
  assert.equal(expansion.input.expansionOf, parent.jobId);
  assert.ok(expansion.files.some((f) => f.name === "handbook.md"));
  assert.ok(h.jobs.publicView(expansion, { includeInput: true }).expansionOf === parent.jobId);
});

test("expansion of an unfinished or game job is refused", async () => {
  const counts = {}; const h = harness(baseDouble(counts));
  assert.throws(() => h.jobs.createExpansion({ kind: "game", status: "succeeded", checkpoints: {} }), /Only a completed knowledge/);
  assert.throws(() => h.jobs.createExpansion({ kind: "knowledge", status: "failed", checkpoints: { knowledge: {}, batches: [] } }), /Only a completed knowledge/);
});

test("sparse source yields a focused handbook with explicit scope, not invented coverage", async () => {
  const counts = {}; const h = harness(baseDouble(counts));
  const job = knowledgeJob(h); await complete(h.jobs, job);
  const handbook = job.files.find((f) => f.name === "handbook.md").content;
  assert.ok(handbook.includes("does **not** support"));
  assert.ok(job.result.handbook.missingTopics >= 1);
  const metrics = core.handbookMetrics(plan(), [chapter()], draft(), passages);
  assert.equal(metrics.chapters, 1);
  assert.equal(metrics.citedPassages, 1);
  assert.equal(metrics.conceptsInChapters, 1);
});

// Meta strict schemas require all declared properties, even optional-looking ones.
test("all native output schemas list every property as required", () => {
  const walk = (schema) => {
    if (schema?.type === "object" && schema.properties) {
      assert.deepEqual(new Set(schema.required), new Set(Object.keys(schema.properties)));
      Object.values(schema.properties).forEach(walk);
    }
    if (schema?.items) walk(schema.items);
  };
  ["handbook-plan", "handbook-chapter", "handbook-audit", "game-framework", "framework-review-revision", "framework-review", "game-code"].forEach(task => walk(outputSchema(task)));
});

test('knowledge/design agent-authored retitles update the outline before editorial audit',async()=>{const counts={},finalTitle='A precise revised chapter title';const h=harness(baseDouble(counts,{'handbook-chapter':input=>chapter({chapterId:input.user.planChapter.chapterId,title:finalTitle}),'handbook-audit':input=>{assert.equal(input.user.plan.chapters[0].title,finalTitle);return auditAccept;}}));const j=knowledgeJob(h);await complete(h.jobs,j);assert.equal(j.status,'succeeded',JSON.stringify(j.error));assert.equal(j.checkpoints.handbookTitleRevisions[0].author,'knowledge/design agent');assert.ok(j.files.find(f=>f.name==='handbook.md').content.includes(`1. ${finalTitle}`));});
test('book-scale cannot pass with a short summary relabeled as a chapter',()=>{const planned={...plan().chapters[0],targetDepth:'book-scale'};const value=chapter();const result=core.validateHandbookChapter(value,{planChapter:planned,passages});assert.equal(result.ok,false);assert.ok(result.errors.some(e=>/too thin/.test(e.message)));});
