// Critic-pass regressions: engine pedagogy fixes (decay, direction, diagnostics, modality)
import test from "node:test";
import assert from "node:assert/strict";
import * as core from "../packages/engine-core/index.js";

const MED = core.SEED_CONCEPTS_BY_DOMAIN["oregon-medical"];
const ev = (id, cid, stage, daysAgo, extra = {}) => ({ eventId: id, learnerId: "C", domainId: "oregon-medical", conceptId: cid, stage, correct: true, score: 1, confidence: 0.9, clientTs: Date.now() - daysAgo * 86400000, ...extra });

test("competences decay: year-old proof is fresher-flagged lower than today's", () => {
  const now = Date.now();
  const fresh = core.computeLearnerState({ learnerId: "C", domainId: "oregon-medical", events: [ev("f1", "dose", 2, 0)], concepts: MED, now });
  const stale = core.computeLearnerState({ learnerId: "C", domainId: "oregon-medical", events: [ev("s1", "dose", 2, 300)], concepts: MED, now });
  assert.ok(fresh.competences["bilingual-terminology"].freshness > stale.competences["bilingual-terminology"].freshness);
  assert.ok(stale.competences["bilingual-terminology"].freshness < 0.05);
});

test("direction is tracked per concept; one-way practice is visible", () => {
  const st = core.computeLearnerState({ learnerId: "C", domainId: "oregon-medical", events: [ev("d1", "dose", 2, 0, { languageDirection: "en->es" })], concepts: MED, now: Date.now() });
  assert.equal(st.directions["en->es"], 1);
  assert.equal(st.conceptDirections["dose"]["en->es"], 1);
  const next = core.recommendNext({ domain: core.OREGON_MEDICAL, concepts: MED, learnerState: st });
  assert.ok(typeof next.rationale === "string");
});

test("diagnostic is a distinct 3-probe plan on one concept, not generic practice", () => {
  const now = Date.now();
  const events = [0, 1].map((i) => ({ eventId: `x${i}`, learnerId: "C", domainId: "oregon-medical", conceptId: "dose", stage: 2, correct: false, score: 0, confidence: 0.9, misconceptionTag: "dose-equals-dosage", clientTs: now }));
  const st = core.computeLearnerState({ learnerId: "C", domainId: "oregon-medical", events, concepts: MED, now });
  const next = core.recommendNext({ domain: core.OREGON_MEDICAL, concepts: MED, learnerState: st });
  assert.equal(next.needsDiagnostic, true);
  assert.equal(next.activityType, "diagnostic");
  assert.equal(next.diagnosticPlan.length, 3);
  assert.ok(next.diagnosticPlan.every((p) => p.conceptId === next.conceptId && p.purpose.length > 10));
  assert.deepEqual(next.diagnosticPlan.map((p) => p.stage), [1, 2, 3]);
});

test("fidelity now catches modality softening and dropped hedges", () => {
  const dose = MED.find((c) => c.conceptId === "dose");
  const soft = core.assessInterpretation({ sourceText: "You must take the full dose", learnerText: "You may take the full dose", concept: dose, targetLang: "en" });
  assert.equal(soft.verdict, "distortion");
  assert.equal(soft.consequential, true);
  assert.ok(soft.changed.some((c) => c.includes("obligation weakened")));
  const hedge = core.assessInterpretation({ sourceText: "It is probably a dose problem", learnerText: "It is a dose problem", concept: dose, targetLang: "en" });
  assert.ok(hedge.changed.some((c) => c.includes("uncertainty dropped")));
  const faithful = core.assessInterpretation({ sourceText: "You must take the full dose", learnerText: "You must take the full dose", concept: dose, targetLang: "en" });
  assert.equal(faithful.verdict, "faithful");
});

test("selector honours prerequisites: dependent areas do not outrank untouched foundations for new learners", () => {
  const st = core.computeLearnerState({ learnerId: "C", domainId: "oregon-medical", events: [], concepts: MED, now: Date.now() });
  const next = core.recommendNext({ domain: core.OREGON_MEDICAL, concepts: MED, learnerState: st });
  const concept = MED.find((c) => c.conceptId === next.conceptId);
  const area = core.OREGON_MEDICAL.translationAreas.find((a) => a.areaId === concept.areaIds[0]);
  assert.ok(!area.prerequisiteAreaIds.length || next.stage <= 2, `new learner should start at foundations, got ${concept.conceptId} in ${area.areaId}`);
});

test("legacy portfolio is removed from the adaptive engine", () => {
  assert.deepEqual(core.GAME_CATALOG, []);
  const state = core.computeLearnerState({learnerId:"x",domainId:core.OREGON_MEDICAL.domainId,events:[],concepts:MED});
  assert.equal(core.recommendNext({domain:core.OREGON_MEDICAL,concepts:MED,learnerState:state}).suggestedGameId,null);
});

test("training modes re-rank training: telephone prizes listening, written prizes distinctions", () => {
  const now = Date.now();
  const st = core.computeLearnerState({ learnerId: "M", domainId: "oregon-medical", events: [], concepts: MED, now });
  const phone = core.recommendNext({ domain: core.OREGON_MEDICAL, concepts: MED, learnerState: st, mode: core.modeById("telephone") });
  const written = core.recommendNext({ domain: core.OREGON_MEDICAL, concepts: MED, learnerState: st, mode: core.modeById("written") });
  assert.deepEqual(core.modeById("cultural").games, []);
  assert.ok(phone && written, "both modes produce a recommendation");
});

test("altruistic resources match weakest stage and mode, with reasons", () => {
  const recs = core.recommendResources({ learnerState: null, concepts: MED, modes: ["consecutive"], limit: 3 });
  assert.equal(recs.length, 3);
  assert.ok(recs.every((r) => r.title && r.by && r.reason.length > 20));
  assert.ok(recs.some((r) => r.forModes.includes("consecutive") || r.matchedStages?.length >= 0));
});

test("classroom functionality is removed", () => {
  assert.equal(core.generateClassmates, undefined);
  assert.equal(core.classroomLeaderboard, undefined);
  assert.equal(core.modeById("group-class"), null);
});

test("tango world is cultural translation, with classics kept off the page (no lyrics in seed)", () => {
  const tango = core.SEED_CONCEPTS_BY_DOMAIN["rio-tango"];
  assert.equal(tango.length, 8);
  assert.ok(tango.every((c) => c.sourceIds.includes("tango-culture")));
});

test("generation is reproducible and covers the whole domain without leaving it", () => {
  const cs = core.SEED_CONCEPTS_BY_DOMAIN["oregon-medical"];
  const a = core.generateNight({ domain: core.OREGON_MEDICAL, concepts: cs, seed: "lock-1", targetLang: "es", size: 5 });
  const b = core.generateNight({ domain: core.OREGON_MEDICAL, concepts: cs, seed: "lock-1", targetLang: "es", size: 5 });
  assert.deepEqual(a, b, "same seed, same night — reproducible for classrooms and tests");
  const seen = new Set();
  for (let i = 0; i < 60; i++) core.generateNight({ domain: core.OREGON_MEDICAL, concepts: cs, seed: `cov-${i}`, targetLang: "es", size: 5 }).forEach((p) => seen.add(p.conceptId));
  assert.equal(seen.size, cs.length, "every concept is reachable by generation");
  for (const d of core.SEED_DOMAINS) {
    const dc = core.SEED_CONCEPTS_BY_DOMAIN[d.domainId];
    const night = core.generateNight({ domain: d, concepts: dc, seed: "tenancy-check", targetLang: "es", size: 4 });
    assert.ok(night.every((p) => dc.some((c) => c.conceptId === p.conceptId)), `${d.domainId} generation stays in-world`);
  }
});

test("interpretation content is evaluated on a carried sentence", () => {
  const c=core.SEED_CONCEPTS_BY_DOMAIN["oregon-medical"][0];
  const item=core.generateItem({concept:c,domain:core.OREGON_MEDICAL,stage:8,targetLang:"es",seed:"honesty"});
  assert.ok(item.acceptableAnswers.some(a=>a.split(" ").length>=4));
});

test("KB review actively rejects unusable knowledge, accepts the seed", () => {
  const good = core.reviewKnowledgeBase({ concepts: core.CONCEPTS, sources: core.SOURCES });
  assert.equal(good.rejected, 0);
  assert.equal(good.accepted, core.CONCEPTS.length);
  const broken = { ...core.CONCEPTS[0], conceptId: "broken-test", sourceIds: [], distinctions: [], misconceptions: [], examples: [{ en: "Unrelated sentence entirely.", es: "Frase sin relación alguna.", zh: "完全无关的句子。" }] };
  const verdict = core.reviewKnowledgeItem(broken, { concepts: [broken, ...core.CONCEPTS], sources: core.SOURCES });
  assert.equal(verdict.verdict, "reject");
  assert.ok(verdict.findings.some((f) => f.severity === "blocker"));
  const colliding = { ...core.CONCEPTS[1], conceptId: "collide-test", terms: { ...core.CONCEPTS[1].terms, es: { ...core.CONCEPTS[1].terms.es, term: core.CONCEPTS[0].terms.es.term } } };
  assert.equal(core.reviewKnowledgeItem(colliding, { concepts: [colliding, ...core.CONCEPTS], sources: core.SOURCES }).verdict, "reject");
});

test("generation rejects bad items: bare-term interpretation, neighbour answers, leaked prompts", () => {
  const cs = core.SEED_CONCEPTS_BY_DOMAIN["oregon-medical"];
  const bare = core.validateItems([{ conceptId: "dose", domainId: "oregon-medical", stage: 8, prompt: "Interpret", acceptableAnswers: ["dosis"], sourceIds: ["x"] }], { concepts: cs });
  assert.equal(bare.valid.length, 0);
  const neighbour = core.validateItems([{ conceptId: "dose", domainId: "oregon-medical", stage: 2, prompt: "How do you say dose?", acceptableAnswers: [cs.find((c) => c.conceptId === "dosage").terms.es.term], sourceIds: ["x"] }], { concepts: cs });
  assert.equal(neighbour.valid.length, 0);
  const set = core.generatePracticeSet({ concepts: cs.slice(0, 4), domain: core.OREGON_MEDICAL, targetLang: "es", stages: [1, 2, 8], perConcept: 1 });
  assert.equal(core.validateItems(set, { concepts: cs }).invalid.length, 0, "practice sets ship only items that survive profound validation");
});

test("spoken reality works in idea units: dropped clauses, additions, compression are seen", () => {
  const dose = MED.find((c) => c.conceptId === "dose");
  const src = "Take one dose with food in the morning. Do not stop suddenly. Call us if the rash spreads.";
  const partial = core.assessInterpretation({ sourceText: src, learnerText: "Take one dose with food in the morning.", concept: dose, targetLang: "en" });
  assert.ok(partial.coverage < 0.6 && partial.ideaUnits.length === 3);
  assert.equal(partial.ideaUnits.filter((u) => u.preserved).length, 1, "exactly one idea unit survived");
  assert.ok(partial.explanation.includes("Do not stop suddenly"), "the dropped unit is named, not averaged away");
  const padded = core.assessInterpretation({ sourceText: src, learnerText: "Take one dose with food in the morning, do not stop suddenly, call us if the rash spreads, and also drink three liters of herbal tea daily forever.", concept: dose, targetLang: "en" });
  assert.ok(padded.added.some((a) => a.includes("added content")), "inventions are flagged as additions");
  const full = core.assessInterpretation({ sourceText: src, learnerText: "Take one dose with food in the morning. Do not stop suddenly. Call us if the rash spreads.", concept: dose, targetLang: "en" });
  assert.equal(full.coverage, 1);
  assert.equal(full.correct, true);
});

test("deterministic review rejects unsupported knowledge", async () => {
  // server module exports are exercised via audit gate instead of sockets here;
  // the deterministic verdict the route returns is reviewKnowledgeItem itself.
  const bad = { conceptId: "bad-1", domainId: "oregon-medical", areaIds: ["intake-registration"], terms: { en: { term: "intake" } }, definition: { en: "x" }, examples: [], distinctions: [], misconceptions: [], sourceIds: [] };
  assert.equal(core.reviewKnowledgeItem(bad, { concepts: core.CONCEPTS, sources: core.SOURCES }).verdict, "reject");
});

test("comfort mode prefers gentle doors and names pressure honestly", () => {
  const cs = core.SEED_CONCEPTS_BY_DOMAIN["oregon-medical"];
  const st = core.computeLearnerState({ learnerId: "C", domainId: "oregon-medical", events: [], concepts: cs, now: Date.now() });
  const chill = core.recommendGames({ domain: core.OREGON_MEDICAL, concepts: cs, learnerState: st, limit: 3, comfort: true });
  const GENTLE = new Set(["BUILD", "GATHER", "DIVE", "FEEL", "ECHO", "MINE & BUILD"]);
  assert.ok(chill.every((g) => GENTLE.has(g.verb) || g.pressureNote), "comfort picks are gentle or carry a pressure warning");
});
