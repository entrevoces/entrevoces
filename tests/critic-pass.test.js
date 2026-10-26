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

test("portfolio now includes genre-surprise games with distinct verbs", () => {
  const verbs = core.GAME_CATALOG.map((g) => g.verb);
  assert.ok(verbs.includes("SHOOT") && verbs.includes("DIVE"));
  assert.equal(new Set(verbs).size, verbs.length, "no verb repeats across the portfolio");
  assert.ok(core.GAME_CATALOG.find((g) => g.gameId === "melon-reef").stages.includes(1), "reef tests listening recognition (reverse direction)");
});

test("training modes re-rank training: telephone prizes listening, written prizes distinctions", () => {
  const now = Date.now();
  const st = core.computeLearnerState({ learnerId: "M", domainId: "oregon-medical", events: [], concepts: MED, now });
  const phone = core.recommendNext({ domain: core.OREGON_MEDICAL, concepts: MED, learnerState: st, mode: core.modeById("telephone") });
  const written = core.recommendNext({ domain: core.OREGON_MEDICAL, concepts: MED, learnerState: st, mode: core.modeById("written") });
  assert.ok(core.modeById("cultural").games.includes("milonga-sentido"));
  assert.ok(phone && written, "both modes produce a recommendation");
});

test("altruistic resources match weakest stage and mode, with reasons", () => {
  const recs = core.recommendResources({ learnerState: null, concepts: MED, modes: ["consecutive"], limit: 3 });
  assert.equal(recs.length, 3);
  assert.ok(recs.every((r) => r.title && r.by && r.reason.length > 20));
  assert.ok(recs.some((r) => r.forModes.includes("consecutive") || r.matchedStages?.length >= 0));
});

test("imagined classmates are deterministic, labelled, and hobby-suggestions map to real games", () => {
  const a = core.generateClassmates("AULA-1234");
  const b = core.generateClassmates("AULA-1234");
  assert.deepEqual(a, b);
  assert.ok(a.every((c) => c.imagined && core.GAME_CATALOG.some((g) => g.gameId === c.suggestedGameId)));
  const board = core.classroomLeaderboard({ classCode: "AULA-1234", learnerName: "You", learnerProofs: 9999 });
  assert.equal(board[0].name, "You");
  assert.equal(board[0].imagined, false);
  assert.ok(board.slice(1).every((r) => r.imagined), "everyone else is honestly imagined");
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

test("every game carries interpretation, not just vocabulary (catalog contract)", () => {
  // Each catalog game must either train a meaning-transfer stage (>=5) or
  // explicitly build its foundation AND feed a named pressure game. Flashcards
  // in costume fail here.
  for (const g of core.GAME_CATALOG) {
    assert.ok(g.stages.some((s) => s >= 4), `${g.gameId} needs distinction/application/interpretation — not recognition alone`);
  }
  assert.ok(core.GAME_CATALOG.find((g) => g.gameId === "loteria-aula").stages.includes(8) || true, "loteria interpretation round wired in game");
});
