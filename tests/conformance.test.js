// ENTRE VOCES — durable conformance gate (spec §24). Zero dependencies.
// Run: node --test tests/conformance.test.js   (or: npm test)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { Readable } from "node:stream";
import * as core from "../packages/engine-core/index.js";

const MED = core.SEED_CONCEPTS_BY_DOMAIN["oregon-medical"];
const sourceIds = new Set(core.SOURCES.map((s) => s.sourceId));

test("§3 seed domains + concepts validate; mutations fail closed", () => {
  for (const d of core.SEED_DOMAINS) assert.equal(core.validateDomainConfig(d).ok, true, d.domainId);
  for (const c of core.CONCEPTS) {
    const d = core.SEED_DOMAINS.find((x) => x.domainId === c.domainId);
    assert.equal(core.validateConcept(c, { domain: d, sourceIds }).ok, true, c.conceptId);
    assert.ok(c.sourceIds.length > 0, `${c.conceptId} needs provenance`);
  }
  const dup = core.validateDomainConfig(core.OREGON_MEDICAL, { existingIds: new Set(["oregon-medical"]) });
  assert.equal(dup.ok, false);
  const cyc = structuredClone(core.OREGON_MEDICAL);
  cyc.translationAreas[0].prerequisiteAreaIds = [cyc.translationAreas[1].areaId];
  cyc.translationAreas[1].prerequisiteAreaIds = [cyc.translationAreas[0].areaId];
  assert.equal(core.validateDomainConfig(cyc).ok, false, "prerequisite cycle must fail");
  const badWeight = structuredClone(core.OREGON_MEDICAL);
  badWeight.competencyWeights["listening"] = 2;
  assert.equal(core.validateDomainConfig(badWeight).ok, false);
});

test("§5 stages never collapse; retention fades and queues review", () => {
  const now = Date.now();
  const ev = [{ eventId: "t1", learnerId: "L", domainId: "oregon-medical", conceptId: "dose", stage: 1, correct: true, score: 1, confidence: 0.9, clientTs: now - 3 * 86400000 }];
  const st = core.computeLearnerState({ learnerId: "L", domainId: "oregon-medical", events: ev, concepts: MED, now });
  assert.equal(st.stages.dose[1].evidenceCount, 1);
  assert.equal(st.stages.dose[2].evidenceCount, 0, "stage-1 success must not inflate stage 2");
  assert.ok(st.stages.dose[1].retention < 0.5, "retention must decay");
  assert.ok(st.dueForReview.some((d) => d.conceptId === "dose"), "faded concept must be due");
});

test("§6 repeated misconception demands diagnosis, not a verdict", () => {
  const now = Date.now();
  const ev = ["dose", "dosage"].map((cid, i) => ({ eventId: `d${i}`, learnerId: "L", domainId: "oregon-medical", conceptId: cid, stage: 2, correct: false, score: 0, confidence: 0.9, misconceptionTag: "dose-equals-dosage", clientTs: now }));
  const st = core.computeLearnerState({ learnerId: "L", domainId: "oregon-medical", events: ev, concepts: MED, now });
  const next = core.recommendNext({ domain: core.OREGON_MEDICAL, concepts: MED, learnerState: st });
  assert.equal(next.needsDiagnostic, true);
  assert.match(next.rationale, /dose-equals-dosage/);
});

test("§7 practice items validate; sourceless items are rejected", () => {
  const items = core.generatePracticeSet({ concepts: MED.slice(0, 3), domain: core.OREGON_MEDICAL, targetLang: "es", stages: [1, 2], perConcept: 1 });
  const { valid, invalid } = core.validateItems(items);
  assert.equal(invalid.length, 0);
  assert.ok(valid.length >= 6);
  const bad = core.validateItems([{ conceptId: "x", stage: 1, prompt: "?", acceptableAnswers: ["a"], sourceIds: [] }]);
  assert.equal(bad.valid.length, 0);
});

test("§8 negation flip is consequential distortion; paraphrase is not failure", () => {
  const dose = MED.find((c) => c.conceptId === "dose");
  const flip = core.assessInterpretation({ sourceText: "Do not take it today", learnerText: "Take it today", concept: dose, targetLang: "en" });
  assert.equal(flip.verdict, "distortion");
  assert.equal(flip.consequential, true);
});

test("§9.3 offline merge dedupes by eventId", () => {
  const a = [{ eventId: "m1", clientTs: 1 }, { eventId: "m2", clientTs: 2 }];
  const b = [{ eventId: "m2", clientTs: 2 }, { eventId: "m3", clientTs: 3 }];
  assert.deepEqual(core.mergeEvidence(a, b).map((e) => e.eventId), ["m1", "m2", "m3"]);
});

test("§11 every game config validates and evidence ids match configs", async () => {
  for (const id of ["concept-clinch", "shift-consecutive", "bench-call"]) {
    const cfg = JSON.parse(readFileSync(`apps/games/${id}/game.config.json`, "utf8"));
    assert.equal(cfg.gameId, id);
    assert.equal(core.validateGameConfig(cfg).ok, true, id);
    const js = readFileSync(`apps/games/${id}/game.js`, "utf8");
    assert.ok(js.includes(`"${id}"`), `${id} game.js must record evidence as ${id}`);
    assert.ok(existsSync(`apps/games/${id}/concepts-subset.json`), `${id} needs standalone subset`);
  }
});

test("§22 generation is reproducible, specific, and varied within a night", () => {
  const args = { domain: core.OREGON_MEDICAL, concepts: MED, seed: "gate-1", targetLang: "es" };
  const a = core.generateClient(args), b = core.generateClient(args);
  assert.equal(a.name, b.name); assert.equal(a.conceptId, b.conceptId);
  const night = core.generateNight({ ...args, seed: "gate-night", size: 4 });
  assert.equal(new Set(night.map((p) => p.conceptId)).size, 4, "one concept per person per night");
  assert.ok(night.every((p) => p.name && p.quirk && p.stake && p.effort));
});

test("Appendix A machine-readable schemas exist and parse", () => {
  for (const name of ["domain-config", "concept", "evidence-event", "game-config"]) {
    const p = `packages/engine-core/schemas/${name}.schema.json`;
    assert.ok(existsSync(p), `missing ${p}`);
    assert.equal(JSON.parse(readFileSync(p, "utf8")).type, "object");
  }
});

// --- CPE wire, exercised in-process (no socket; sandbox-safe) ---
async function callCPE(method, path, body, headers = {}) {
  const { server } = await import("../services/progression-engine/server.js");
  const handler = server.listeners("request")[0];
  const payload = body ? JSON.stringify(body) : "";
  const req = Readable.from(payload ? [Buffer.from(payload)] : []);
  req.method = method; req.url = path; req.headers = { host: "test", "content-type": "application/json", ...headers };
  let status = 0, text = "";
  const res = {
    writeHead(s, h) { status = s; this.headers = h; },
    end(t) { text = t || ""; },
    setHeader() {},
  };
  await handler(req, res);
  return { status, json: text ? JSON.parse(text) : null };
}

test("§9 CPE health + domains over the wire", async () => {
  const h = await callCPE("GET", "/v1/health");
  assert.equal(h.status, 200); assert.equal(h.json.ok, true);
  const d = await callCPE("GET", "/v1/domains?status=active");
  assert.equal(d.status, 200);
  assert.ok(d.json.data.some((x) => x.domainId === "oregon-medical"));
});

test("§22 CPE generation endpoints mint people + practice (G3)", async () => {
  const night = await callCPE("GET", "/v1/generate/night?domainId=oregon-medical&seed=gate&size=3");
  assert.equal(night.status, 200);
  assert.equal(night.json.data.length, 3);
  assert.ok(night.json.data.every((p) => p.name && p.conceptId));
  const practice = await callCPE("GET", "/v1/generate/practice?domainId=oregon-medical&conceptId=dose&stage=2&lang=es");
  assert.equal(practice.status, 200);
  assert.ok(practice.json.acceptableAnswers?.length > 0);
});
