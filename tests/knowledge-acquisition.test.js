// Research-first acquisition tests. Search/retrieval/model doubles prove
// provenance, SSRF, checkpoint and coverage orchestration only — they make
// no live knowledge/design agent, search or source-quality claim.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import * as core from "../packages/engine-core/index.js";
import { validateResearchBlueprint, validateCoverageAudit } from "../packages/engine-core/knowledge.js";
import { GenerationJobs } from "../generator/generation.js";
import { outputSchema, RESEARCH_BLUEPRINT_SCHEMA, COVERAGE_AUDIT_SCHEMA } from "../generator/output-contracts.js";
import { assertPublicHttpsUrl, retrievePublicSource, extractPdfBytes, htmlToText, normalizeAcquisitionBudgets } from "../generator/acquisition.js";
import { parseResearchResult, searchSources } from "../generator/research-adapter.js";
import { extractResource } from "../generator/extraction.js";

const domain = core.OREGON_MEDICAL;
const areaId = domain.translationAreas[0].areaId;
const accept = { verdict: "accept", findings: [], missingPassageIds: [], limitations: ["Test double."] };
const auditAccept = { verdict: "accept", findings: [], chapterFindings: [], missingTopics: ["Live practice"], limitations: ["Test double."] };

const TEXT_A = "Informed consent means the patient agrees after understanding risks benefits and alternatives. A dose is a quantity administered at one time. A dosage is a regimen specifying quantity timing and duration across administrations. Consent documentation records the discussion and the patient decision before treatment proceeds.";
const TEXT_B = "Informed consent requires checking understanding and inviting questions before any procedure begins. Intake workflow begins with registration then identity verification then chief complaint recording. The intake clerk verifies documents and records the reason for visit before clinician review. Professional register uses precise respectful language matched to the patient and setting.";
const TEXT_C = "A dose names one administration event while a dosage governs the repeated schedule over time. Pharmacy guidance repeats that confusing dose with dosage changes what is given and when it is repeated in practice.";
const URL_A = "https://example-a.org/consent-guide";
const URL_B = "https://example-b.org/intake-guide";
const URL_C = "https://example-c.net/dose-note";
const BODIES = { [URL_A]: TEXT_A, [URL_B]: TEXT_B, [URL_C]: TEXT_C };
const KEYWORDS = { "consent-model": "consent", "dose-distinction": "dose", "intake-workflow": "intake", "register-boundaries": "register" };

function blueprint() {
  const topic = (topicId, title, category, priority, query) => ({ topicId, title, category, priority, rationale: `This topic matters because the fixture audience performs this work and errors change the record.`, evidenceResponsibilities: [`Retrieved passages must establish the ${title} responsibility observably.`], proposedSourceTypes: ["Official or professional-body guidance"], searchQueries: [query] });
  return {
    title: "Fixture domain handbook — consent, dose and intake",
    scopeStatement: "This fixture blueprint covers informed consent, the dose and dosage distinction, intake workflow and professional register for the configured test audience and its documentation work. It does not claim any real clinical coverage because every source in these tests is an orchestration fixture.",
    rationale: "Scope follows the configured audience and work goals in the fixture context, not the title of any single seed file, so consent, terminology, workflow and register are all planned.",
    assumptions: ["Fixture sources are treated as pending-review evidence."],
    exclusions: ["Real clinical practice is out of scope for fixtures."],
    topics: [
      topic("consent-model", "Informed consent model", "conceptual-model", "critical", "informed consent official guidance"),
      topic("dose-distinction", "Dose versus dosage distinction", "distinction", "critical", "dose dosage official guidance"),
      topic("intake-workflow", "Intake workflow", "workflow", "important", "intake workflow official guidance"),
      topic("register-boundaries", "Professional register boundaries", "language-register", "optional", "professional register guidance"),
    ],
  };
}

function coverageFromPassages(user, force = {}) {
  const topics = user.blueprint.topics.map((t) => {
    if (force[t.topicId]) return force[t.topicId];
    const found = user.passages.filter((p) => p.text.toLowerCase().includes(KEYWORDS[t.topicId] || t.topicId));
    return { topicId: t.topicId, status: found.length ? "adequate" : "absent", passageIds: found.map((p) => p.passageId), sourceIds: [...new Set(found.map((p) => p.sourceId))], rationale: found.length ? "Fixture passages establish this topic in the retrieved text." : "No retrieved fixture passage establishes this topic yet.", followUpQueries: found.length ? [] : [`more evidence for ${t.topicId}`] };
  });
  return { overallStatus: topics.every((r) => r.status === "adequate") ? "ready" : "needs-acquisition", topics, contradictions: [], currencyGaps: [], languageGaps: [], limitations: ["Test double."] };
}

function defaultSearch(counts) {
  const doseCalls = { n: 0 };
  return async ({ query, topicId }) => {
    counts.search = (counts.search || 0) + 1;
    counts[`search:${topicId}`] = (counts[`search:${topicId}`] || 0) + 1;
    let urls = [];
    if (topicId === "consent-model") urls = [URL_A, URL_B];
    else if (topicId === "dose-distinction") urls = ++doseCalls.n === 1 ? [URL_A] : [URL_C];
    else if (topicId === "intake-workflow" || query.includes("intake")) urls = [URL_B];
    else urls = [URL_B];
    return { responseId: `resp-${counts.search}`, model: "local-agent", searchCalls: [{ id: `call-${counts.search}`, status: "completed" }], citations: urls.map((url) => ({ url, title: `Fixture source ${url}` })), text: "fixture search text", rawOutput: [{ type: "web_search_call", id: `call-${counts.search}` }] };
  };
}

function defaultRetrieve(counts) {
  return async (url) => {
    counts.retrieve = (counts.retrieve || 0) + 1;
    counts[`retrieve:${url}`] = (counts[`retrieve:${url}`] || 0) + 1;
    if (!BODIES[url]) throw new Error(`no fixture body for ${url}`);
    return { finalUrl: url, status: 200, contentType: "text/plain", bytes: Buffer.from(BODIES[url]), redirects: [] };
  };
}

function passageDraft(input) {
  const passage = input.user.passages[0];
  const n = Number(/b(\d+)-/.exec(input.user.instruction)[1]);
  const quote = passage.text.split(". ")[0] + ".";
  return { summary: `Fixture reading ${n} of one retrieved passage, describing its consent, dose, intake or register content in substantive fixture detail for orchestration testing.`, concepts: [{ conceptId: `b${n}-fixture-concept`, areaIds: [areaId], terms: { en: { term: `fixture concept ${n}`, register: "professional", alternatives: [] } }, definition: { en: `Fixture definition ${n} explaining the retrieved passage content, its boundaries and its professional context in sufficient detail.` }, whyItMatters: `Misreading fixture passage ${n} changes what the practitioner records, checks or communicates in this test context.`, difficulty: 2, competences: ["domain-knowledge"], claims: [{ claimId: `b${n}-fixture-claim`, text: quote.replace(/\.$/, "") + " in the retrieved fixture source.", kind: "context", citations: [{ passageId: passage.passageId, quote }] }], distinctions: [], misconceptions: [], examples: [], unresolved: ["Fixture gap."] }], relationships: [], procedures: [], coverage: [{ passageId: passage.passageId, status: "represented", reason: "Fixture concept cites this passage.", conceptIds: [`b${n}-fixture-concept`] }], unresolved: ["Fixture passage gap."] };
}

function synthesis(input) {
  const drafts = input.user.extractedDrafts;
  return { summary: "Fixture whole-corpus synthesis consolidating consent, dose, intake and register readings from every retrieved passage with their citations preserved for orchestration testing only.", concepts: drafts.flatMap((d) => d.concepts), relationships: [], procedures: [], coverage: drafts.flatMap((d) => d.coverage), unresolved: ["Fixture whole-corpus gap."] };
}

function plan(input) {
  const concepts = input.user.concepts;
  return { title: "Fixture handbook — consent, dose and intake at work", subtitle: "Fixture subtitle", scopeStatement: "This fixture handbook covers only the consent, dose, intake and register responsibilities established by the retrieved test passages. It teaches no real clinical practice, because the passages are orchestration fixtures rather than professional sources.", organizingPrinciple: "The single fixture chapter is organized around the desk work of consent, dose documentation and intake, moving from the work problem to the model, distinctions and application.", readingPath: "Read the chapter in order, then check the derived concept index and coverage appendix against the retrieved passages.", scopeLimits: ["Only retrieved fixture passages are covered."], missingTopics: [{ topic: "Real clinical practice", reason: "The retrieved passages are test fixtures and establish no real clinical procedure or authority whatsoever.", neededSource: "Authoritative clinical sources." }], chapters: [{ chapterId: "fixture-chapter", title: "Consent, dose and intake at the desk", purpose: "Help the reader carry out consent, dose documentation and intake duties without merging distinct responsibilities.", workContext: "Fixture documentation and interpreting work at intake and treatment discussion.", conceptIds: concepts.map((c) => c.conceptId), passageIds: input.user.passages.map((p) => p.passageId), plannedElements: ["conceptual-model", "workflow", "application", "scope-limit"], targetDepth: "focused", rationale: "The retrieved fixture corpus supports exactly this grouped chapter at focused depth and no more." }] };
}

function chapter(input) {
  const pc = input.user.planChapter;
  const first = input.user.passages[0];
  const quote = first.text.split(". ")[0] + ".";
  const body = `This chapter starts from the desk problem in [${first.passageId}]: consent, dose documentation and intake each carry a different responsibility, and merging them distorts the record [${first.passageId}]. The retrieved evidence states the anchor sentence — ${quote} Working through the planned duties in order keeps each responsibility distinct: establish understanding before agreement, name whether a quantity is one event or a schedule, and complete registration and verification before clinician review. Terms in context stay tied to their duty, so a consent term names agreement after understanding, a dose term names one administration, and intake terms name the registration sequence. Application: before acting, state which duty you are performing, what the retrieved passage establishes for it, and what remains outside this fixture scope.`;
  return { chapterId: pc.chapterId, title: pc.title, markdown: body, citations: [{ passageId: first.passageId, quote }], conceptIds: [...pc.conceptIds], scopeNote: "This fixture chapter establishes only its planned retrieved passages; it teaches no real practice." };
}

function makeCall(counts, { coverage } = {}) {
  return async (input) => {
    counts[input.task] = (counts[input.task] || 0) + 1;
    if (input.task === "acquisition-blueprint") return blueprint();
    if(input.task === "acquisition-select"){const selected=input.user.candidates.slice(0,input.user.remainingSourceSlots).map(c=>c.url);return{selectedUrls:selected,rationale:"Test-only reading allocation over known fixture sources, not a live authority or coverage judgment.",balance:input.user.blueprint.topics.map(t=>({topicId:t.topicId,anticipatedSourceUrls:selected,missingReason:selected.length?'':'Fixture budget exhausted'})),deferredUrls:input.user.candidates.filter(c=>!selected.includes(c.url)).map(c=>c.url)};}
    if (input.task === "acquisition-coverage") return coverage ? coverage(input, counts) : coverageFromPassages(input.user);
    if (input.task === "knowledge-passage") return passageDraft(input);
    if (input.task === "knowledge-synthesis") return synthesis(input);
    if (input.task === "knowledge-review") return accept;
    if (input.task === "handbook-plan") return plan(input);
    if (input.task === "handbook-chapter") return chapter(input);
    if (input.task === "handbook-audit") return auditAccept;
    throw new Error(input.task);
  };
}

function harness({ call, search, retrieve } = {}) {
  const store = { jobs: [] };
  const counts = {};
  const jobs = new GenerationJobs({ getStore: () => store, save: () => {}, artifactRoot: mkdtempSync("/tmp/ev-acq-"), call: call || makeCall(counts), search: search || defaultSearch(counts), retrieve: retrieve || defaultRetrieve(counts), configured: () => true });
  return { store, jobs, counts };
}
async function complete(jobs, job) { await jobs.drain(); while (jobs.active) await new Promise((r) => setTimeout(r, 5)); return job; }
function researchJob(h, budgets) {
  return h.jobs.create({ kind: "knowledge", input: { domain, resource: null, source: null, context: { audience: "Fixture interpreters", goals: "Fixture documentation work" }, acquisition: { mode: "research", ...(budgets ? { budgets } : {}) } } });
}

test("blueprint and coverage validators enforce knowledge/design agent-authored scope and actual passages", () => {
  assert.equal(validateResearchBlueprint(blueprint(), { domain }).ok, true);
  const narrow = blueprint(); narrow.topics = narrow.topics.slice(0, 1);
  assert.equal(validateResearchBlueprint(narrow, { domain }).ok, false);
  const noQueries = blueprint(); noQueries.topics[0].searchQueries = [];
  assert.equal(validateResearchBlueprint(noQueries, { domain }).ok, false);
  const passages = [{ passageId: "src-x--p1-0", sourceId: "src-x", text: TEXT_A }];
  const audit = coverageFromPassages({ blueprint: blueprint(), passages });
  assert.equal(validateCoverageAudit(audit, { blueprint: blueprint(), passages, sources: [{ sourceId: "src-x" }] }).ok, true);
  const fake = coverageFromPassages({ blueprint: blueprint(), passages });
  fake.topics[0].passageIds = ["invented-passage"];
  assert.equal(validateCoverageAudit(fake, { blueprint: blueprint(), passages, sources: [{ sourceId: "src-x" }] }).ok, false);
});

test("acquisition schemas are native and every property is required", () => {
  assert.equal(outputSchema("acquisition-blueprint"), RESEARCH_BLUEPRINT_SCHEMA);
  assert.equal(outputSchema("acquisition-coverage"), COVERAGE_AUDIT_SCHEMA);
  const walk = (s) => { if (s?.type === "object" && s.properties) { assert.deepEqual(new Set(s.required), new Set(Object.keys(s.properties))); Object.values(s.properties).forEach(walk); } if (s?.items) walk(s.items); };
  walk(RESEARCH_BLUEPRINT_SCHEMA); walk(COVERAGE_AUDIT_SCHEMA);
  assert.deepEqual(normalizeAcquisitionBudgets({ maxRounds: 99 }).maxRounds, 5, "budgets are explicitly bounded");
});

test("SSRF validation refuses private, local, IPv6 and non-HTTPS targets", async () => {
  const pub = async () => ["93.184.216.34"];
  await assertPublicHttpsUrl("https://example.org/x", { lookup: pub });
  await assert.rejects(assertPublicHttpsUrl("http://example.org/x", { lookup: pub }), (e) => e.code === "retrieval-protocol");
  await assert.rejects(assertPublicHttpsUrl("https://localhost/x", { lookup: pub }), (e) => e.code === "retrieval-ssrf");
  await assert.rejects(assertPublicHttpsUrl("https://[::1]/x", { lookup: pub }), (e) => e.code === "retrieval-ssrf");
  await assert.rejects(assertPublicHttpsUrl("https://example.org/x", { lookup: async () => ["10.0.0.5"] }), (e) => e.code === "retrieval-ssrf");
  await assert.rejects(assertPublicHttpsUrl("https://user:pass@example.org/x", { lookup: pub }), (e) => e.code === "retrieval-credentials");
});

test("retrieval re-checks every redirect and enforces byte bounds", async () => {
  let fetches = 0;
  const redirectFetch = async () => { fetches++; return new Response(null, { status: 302, headers: { location: "https://192.168.0.9/secret" } }); };
  await assert.rejects(retrievePublicSource("https://example.org/start", { fetchImpl: redirectFetch, lookup: async () => ["93.184.216.34"] }), (e) => e.code === "retrieval-ssrf");
  assert.equal(fetches, 1, "the private redirect target is never fetched");
  const bigFetch = async () => new Response("x".repeat(500), { status: 200, headers: { "content-type": "text/plain" } });
  await assert.rejects(retrievePublicSource("https://example.org/big", { fetchImpl: bigFetch, lookup: async () => ["93.184.216.34"], maxBytes: 100 }), (e) => e.code === "retrieval-too-large");
});

test("actual PDF extractor reads a fixture PDF; HTML is stripped, never executed", async () => {
  const stream = "BT /F1 12 Tf 72 720 Td (Informed consent fixture text for extraction testing in the acquisition test suite) Tj ET";
  const pdf = `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj\n5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\ntrailer << /Root 1 0 R >>\n`;
  const bytes = Buffer.from(pdf);
  const text = await extractPdfBytes(bytes);
  assert.match(text, /Informed consent fixture text/);
  const viaUpload = await extractResource({ fileName: "fixture.pdf", base64: bytes.toString("base64") });
  assert.ok(viaUpload.passages.length >= 1);
  assert.match(htmlToText("<script>alert(1)</script><p>Hello <b>world</b></p>"), /Hello world/);
  assert.doesNotMatch(htmlToText("<script>alert(1)</script><p>Safe</p>"), /alert/);
});

test("research job: provenance, two rounds for triangulation, multi-source corpus composes handbook only after coverage", async () => {
  const h = harness();
  const job = researchJob(h); await complete(h.jobs, job);
  assert.equal(job.status, "succeeded", JSON.stringify(job.error));
  const view = h.jobs.publicView(job);
  assert.equal(view.acquisition.mode, "research");
  assert.equal(view.acquisition.status, "ready");
  assert.ok(view.acquisition.blueprint.topics.length >= 4);
  assert.equal(view.acquisition.coverageCounts.absent, 0);
  assert.equal(view.acquisition.sources.length, 3, "three independent fixture hosts accepted");
  assert.ok(view.acquisition.sources.every((s) => s.fingerprint && s.rightsReviewStatus === "pending-review"));
  assert.ok(view.acquisition.rounds.length >= 2, "triangulation weakness drove a follow-up round");
  assert.equal(h.counts["acquisition-blueprint"], 1);
  assert.ok(job.events.some((e) => e.stage === "acquisition-blueprint") && job.events.some((e) => e.stage === "acquisition-followup") && job.events.some((e) => e.stage === "acquisition-coverage"));
  assert.ok(job.files.some((f) => f.name === "acquisition.json") && job.files.some((f) => f.name === "handbook.md"));
  const draft = job.checkpoints.knowledge;
  const citedSources = new Set(draft.concepts.flatMap((c) => c.claims.flatMap((a) => a.citations.map((x) => x.passageId.split("--")[0]))));
  assert.ok(citedSources.size >= 2, `claims cite multiple sources: ${[...citedSources]}`);
  const kb = job.files.find((f) => f.name === "knowledgebase.md");
  assert.match(kb.content, /Acquired source register/);
});

test("partial coverage triggers another round before any handbook is written", async () => {
  const counts = {};
  let audits = 0;
  const call = makeCall(counts, { coverage: (input) => { audits++; if (audits === 1) return coverageFromPassages(input.user, { "intake-workflow": { topicId: "intake-workflow", status: "partial", passageIds: input.user.passages.filter((p) => p.text.toLowerCase().includes("intake")).map((p) => p.passageId), sourceIds: [], rationale: "Fixture first audit deliberately judges intake evidence partial.", followUpQueries: ["intake workflow official guidance"] } }); return coverageFromPassages(input.user); } });
  const h = harness({ call });
  h.counts = counts;
  const job = researchJob(h); await complete(h.jobs, job);
  assert.equal(job.status, "succeeded", JSON.stringify(job.error));
  assert.ok(audits >= 2, "weak coverage drove a second audit");
  assert.ok(job.checkpoints.acquisition.rounds.length >= 2);
});

test("failed search and unproven URLs are refused, never replaced with guesses", async () => {
  const h1 = harness({ search: async () => ({ responseId: "r", searchCalls: [], citations: [{ url: URL_A, title: "guessed" }], text: "", rawOutput: [] }) });
  const j1 = researchJob(h1); await complete(h1.jobs, j1);
  assert.equal(j1.status, "failed");
  assert.equal(j1.error.code, "search-not-executed");
  assert.equal(h1.jobs.publicView(j1).acquisition.sources.length, 0);
  const probe = { candidates: [], searchCalls: [] };
  assert.throws(() => h1.jobs.assertCandidateProvenance(probe, "https://invented.example/book.pdf"), (e) => e.code === "acquisition-unproven-url");
});

test("duplicate fingerprints are recorded once; retrieval failures stay visible", async () => {
  const counts = {};
  const search = async ({ topicId }) => ({ responseId: `r-${topicId}`, searchCalls: [{ id: `c-${topicId}`, status: "completed" }], citations: topicId === "consent-model" ? [{ url: URL_A, title: "A" }, { url: "https://example-d.org/mirror", title: "mirror" }, { url: URL_B, title: "B" }] : [{ url: URL_B, title: "B" }], text: "", rawOutput: [] });
  const retrieve = async (url) => { counts[url] = (counts[url] || 0) + 1; if (url === URL_C) throw new Error("boom"); return { finalUrl: url, status: 200, contentType: "text/plain", bytes: Buffer.from(url === URL_B ? TEXT_B : TEXT_A), redirects: [] }; };
  const callCounts = {};
  // dose topic maps to URL_B in this fixture search; force dose adequate via B's dose-free text is impossible,
  // so this harness only checks dedup bookkeeping on a job that honestly stays incomplete.
  const h = harness({ search, retrieve, call: makeCall(callCounts) });
  const job = researchJob(h, { maxRounds: 1 }); await complete(h.jobs, job);
  assert.equal(h.jobs.publicView(job).acquisition.sources.filter((s) => s.kind === "retrieved").length, 2, "mirror bytes counted once");
  assert.ok(JSON.stringify(job.checkpoints.acquisition.rounds[0].failures).match(/Duplicate|duplicate/));
});

test("exhausted budget stays incomplete with no handbook, then continue-acquisition completes without redoing accepted work", async () => {
  const counts = {};
  let adequate = false;
  const call = makeCall(counts, { coverage: (input) => adequate ? coverageFromPassages(input.user) : coverageFromPassages(input.user, { "consent-model": { topicId: "consent-model", status: "partial", passageIds: input.user.passages.filter((p) => p.text.toLowerCase().includes("consent")).map((p) => p.passageId), sourceIds: [], rationale: "Fixture audit holds consent partial until continuation.", followUpQueries: ["informed consent official guidance"] } }) });
  const searchCounts = {};
  const h = harness({ call, search: defaultSearch(searchCounts), retrieve: defaultRetrieve(searchCounts) });
  const job = researchJob(h, { maxRounds: 1 }); await complete(h.jobs, job);
  assert.equal(job.status, "failed");
  assert.equal(job.error.code, "acquisition-incomplete");
  assert.ok(!job.files.some((f) => f.name === "handbook.md"), "no fake comprehensive handbook from an incomplete corpus");
  assert.ok(job.files.some((f) => f.name === "acquisition.md"));
  const view = h.jobs.publicView(job);
  assert.equal(view.acquisition.status, "incomplete");
  assert.equal(view.acquisition.canContinue, true);
  assert.ok(view.acquisition.remainingWeakTopics.includes("consent-model"));
  const blueprintCalls = counts["acquisition-blueprint"];
  const retrieveA = searchCounts[`retrieve:${URL_A}`];
  adequate = true;
  const next = h.jobs.continueAcquisition(job, { additionalRounds: 1 });
  await complete(h.jobs, next);
  assert.equal(next.status, "succeeded", JSON.stringify(next.error));
  assert.equal(next.input.continuationOf, job.jobId);
  assert.equal(counts["acquisition-blueprint"], blueprintCalls, "continuation does not re-author the blueprint");
  assert.equal(searchCounts[`retrieve:${URL_A}`], retrieveA, "continuation does not re-download accepted sources");
  assert.ok(next.files.some((f) => f.name === "handbook.md"));
});

test("restart recovery: a mid-round search failure preserves earlier searches; retry does not repeat them", async () => {
  const counts = {};
  let failedOnce = false;
  const base = defaultSearch(counts);
  const search = async (args) => { if (args.topicId === "intake-workflow" && !failedOnce) { failedOnce = true; throw new Error("provider unavailable (test double)"); } return base(args); };
  const h = harness({ search });
  const job = researchJob(h); await complete(h.jobs, job);
  assert.equal(job.status, "failed");
  assert.ok(job.checkpoints.acquisition.searchCalls.length >= 2, "earlier round searches checkpointed");
  h.jobs.retry(job.jobId); await complete(h.jobs, job);
  assert.equal(job.status, "succeeded", JSON.stringify(job.error));
  assert.equal(counts["search:consent-model"], 1, "accepted search not repeated on retry");
});

test("seed-only legacy jobs still work and report source-only acquisition", async () => {
  const passages = core.indexSource([TEXT_A]);
  const store = { jobs: [] };
  const counts = {};
  const jobs = new GenerationJobs({ getStore: () => store, save: () => {}, artifactRoot: mkdtempSync("/tmp/ev-seed-"), call: makeCall(counts), configured: () => true });
  const job = jobs.create({ kind: "knowledge", input: { domain, resource: { passages, warnings: [] }, source: { sourceId: "seed-1", title: "Seed fixture" }, context: { audience: "Fixture readers", goals: "Fixture goals" } } });
  await complete(jobs, job);
  assert.equal(job.status, "succeeded", JSON.stringify(job.error));
  assert.equal(counts["acquisition-blueprint"], undefined, "source-only jobs never research");
  assert.deepEqual(jobs.publicView(job).acquisition, { mode: "source-only", status: "not-applicable" });
});

test('source retrieval rejects hexadecimal IPv4-mapped and non-global IPv6 addresses',async()=>{
 const {assertPublicHttpsUrl}=await import('../generator/acquisition.js');
 for(const url of ['https://[::ffff:7f00:1]/','https://[::ffff:a00:1]/','https://[64:ff9b::7f00:1]/','https://[2001:db8::1]/'])await assert.rejects(assertPublicHttpsUrl(url),/non-public/);
});
test('large research coverage reviews every passage through bounded windows and checkpoints them',async()=>{
 const acq={sources:[{sourceId:'source-fixture',title:'Synthetic transport fixture',host:'example.org',url:'https://example.org/fixture'}],corpus:{passages:Array.from({length:36},(_,i)=>({passageId:`source-fixture-p1-${i}`,sourceId:'source-fixture',page:1,text:'Synthetic source-window test text only. '.repeat(180)}))}};
 const bp={topics:[{topicId:'fixture-topic',priority:'critical',evidenceResponsibilities:['Establish the synthetic fixture responsibility.']}]};
 const calls=[],store={jobs:[]},jobs=new GenerationJobs({getStore:()=>store,save:()=>{},artifactRoot:mkdtempSync('/tmp/ev-audit-windows-'),configured:()=>true,concurrency:2,call:async args=>{calls.push(args.user);const passages=args.user.passages||acq.corpus.passages;return{overallStatus:'ready',topics:[{topicId:'fixture-topic',status:'adequate',passageIds:[passages[0].passageId],sourceIds:['source-fixture'],rationale:'Synthetic fixture coverage judgement for transport testing only.',followUpQueries:[]}],contradictions:[],currencyGaps:[],languageGaps:[],limitations:['Test double; no substantive source entailment judgement.']};}});
 const job={jobId:'window-test',events:[],files:[],checkpoints:{}};
 await jobs.auditAcquisition(job,{domain,context:{},blueprint:bp,acq});const windows=calls.filter(c=>c.auditScope?.kind==='source-window');assert.ok(windows.length>1);assert.deepEqual(windows.flatMap(w=>w.passages.map(p=>p.passageId)),acq.corpus.passages.map(p=>p.passageId));assert.equal(calls.at(-1).auditScope.kind,'complete-window-aggregation');const count=windows.length;await jobs.auditAcquisition(job,{domain,context:{},blueprint:bp,acq});assert.equal(calls.filter(c=>c.auditScope?.kind==='source-window').length,count);
});
