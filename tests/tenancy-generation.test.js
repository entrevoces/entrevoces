// ENTRE VOCES — tenancy, generation, mirror & platform contracts (spec §24 addendum)
// Run with: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import * as core from "../packages/engine-core/index.js";
import { EngineClient, MemoryStorage } from "../packages/engine-client/engine-client.js";

const ALL_GAMES = readdirSync("apps/games", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

test("seven worlds seed clean, each with sourced trilingual concepts", () => {
  assert.equal(core.SEED_DOMAINS.length, 7);
  const sids = new Set(core.SOURCES.map((s) => s.sourceId));
  for (const d of core.SEED_DOMAINS) {
    assert.equal(core.validateDomainConfig(d).ok, true, d.domainId);
    const cs = core.SEED_CONCEPTS_BY_DOMAIN[d.domainId];
    assert.ok(cs.length >= 7, `${d.domainId} needs >=7 concepts`);
    for (const c of cs) {
      assert.ok(c.terms.en && c.terms.es && c.terms.zh, `${c.conceptId} must be EN/ES/ZH`);
      assert.ok(c.sourceIds.every((s) => sids.has(s)), `${c.conceptId} provenance`);
      assert.equal(c.domainId, d.domainId);
    }
  }
  assert.equal(core.CONCEPTS.length, 61);
});

test("tenancy: EngineClient in one world never surfaces another world's concepts or state", async () => {
  for (const domainId of ["oregon-legal", "california-tax", "ai-technology"]) {
    const client = new EngineClient({
      engineUrl: "http://127.0.0.1:9", learnerId: `tenant-${domainId}`, domainId,
      storage: new MemoryStorage(), core,
      fallbackDomain: core.SEED_DOMAINS.find((d) => d.domainId === domainId),
      fallbackConcepts: core.CONCEPTS,
    });
    await client.init();
    const list = await client.listConcepts(domainId);
    assert.ok(list.length >= 7);
    assert.ok(list.every((c) => c.domainId === domainId), `${domainId} leaked foreign concepts`);
    client.recordEvidence({ conceptId: list[0].conceptId, areaId: list[0].areaIds[0], gameId: "concept-clinch", activityType: "bilingual", stage: 2, correct: true, score: 1 });
    const state = await client.getState(domainId);
    assert.equal(state.evidenceCount, 1);
    assert.ok(state.stages[list[0].conceptId], "own concept tracked");
    const foreign = core.SEED_CONCEPTS_BY_DOMAIN["oregon-medical"][0];
    if (domainId !== "oregon-medical") {
      assert.ok(!state.stages[foreign.conceptId] || state.stages[foreign.conceptId][2].evidenceCount === 0, "foreign evidence must stay zero");
      assert.equal(client.localEvidence("oregon-medical").length, 0, "no writes to foreign tenant log");
    }
  }
});

test("generation: every world mints specific, valid, non-repeating nights + items", () => {
  for (const d of core.SEED_DOMAINS) {
    const concepts = core.SEED_CONCEPTS_BY_DOMAIN[d.domainId];
    const night = core.generateNight({ domain: d, concepts, seed: `tenancy-${d.domainId}`, targetLang: "es", size: 4 });
    assert.equal(new Set(night.map((p) => p.conceptId)).size, 4, d.domainId);
    assert.ok(night.every((p) => concepts.some((c) => c.conceptId === p.conceptId)), `${d.domainId} night must stay in-tenant`);
    const item = core.generateItem({ concept: concepts[0], domain: d, stage: 2, targetLang: "es", seed: "t" });
    assert.equal(core.validateItems([item]).invalid.length, 0, d.domainId);
  }
});

test("mirror: recommendGames aligns suggestions to the thinnest stage, with reasons", () => {
  const concepts = core.SEED_CONCEPTS_BY_DOMAIN["oregon-medical"];
  const now = Date.now();
  // Learner strong at stages 1-2, absent at 6-8 → spoken/speed games must surface.
  const ev = concepts.slice(0, 3).flatMap((c, i) => [1, 2].map((s) => ({ eventId: `m${i}-${s}`, learnerId: "L", domainId: "oregon-medical", conceptId: c.conceptId, stage: s, correct: true, score: 1, confidence: 0.9, clientTs: now })));
  const state = core.computeLearnerState({ learnerId: "L", domainId: "oregon-medical", events: ev, concepts, now });
  const games = core.recommendGames({ domain: core.OREGON_MEDICAL, concepts, learnerState: state, limit: 3 });
  assert.equal(games.length, 3);
  assert.ok(games.every((g) => g.reason.length > 20 && g.gameId && g.gapStage >= 1));
  assert.ok(games.some((g) => g.gapStage >= 6), "unproven pressure stages must be suggested");
  const fresh = core.recommendGames({ domain: core.OREGON_MEDICAL, concepts, learnerState: null });
  assert.ok(fresh[0].reason.length > 10, "new learners still get a reasoned start");
});

test("all games: config valid, distinct verbs, engine evidence, standalone files", () => {
  assert.ok(ALL_GAMES.length >= 9, `expected >=9 game folders, got ${ALL_GAMES.join(",")}`);
  const verbs = new Set();
  for (const id of ALL_GAMES) {
    const cfg = JSON.parse(readFileSync(`apps/games/${id}/game.config.json`, "utf8"));
    assert.equal(cfg.gameId, id);
    assert.equal(core.validateGameConfig(cfg).ok, true, id);
    assert.ok(existsSync(`apps/games/${id}/concepts-subset.json`), `${id} subset`);
    if (id.startsWith("roblox-")) {
      assert.ok(existsSync(`apps/games/${id}/src/ReplicatedStorage/PuenteTerms.lua`), "roblox terms");
      assert.ok(existsSync(`apps/games/${id}/README.md`), "roblox guide");
      continue;
    }
    for (const f of ["index.html", "style.css", "game.js"]) assert.ok(existsSync(`apps/games/${id}/${f}`), `${id}/${f}`);
    const js = readFileSync(`apps/games/${id}/game.js`, "utf8");
    assert.ok(js.includes("EngineClient") && js.includes("recordEvidence"), `${id} must speak the engine`);
    const stages = new Set((js.match(/stage: \d/g) || []));
    assert.ok(stages.size >= 1, `${id} records staged evidence`);
  }
  for (const g of core.GAME_CATALOG) verbs.add(g.verb);
  assert.ok(verbs.size >= 8, "portfolio verbs must not repeat");
});

test("Meta adapter: no key means labeled local, never a fake Meta call", async () => {
  const { metaStatus, inventGame } = await import("../services/progression-engine/meta.js");
  const status = metaStatus();
  assert.ok("configured" in status && Array.isArray(status.recentCalls));
  if (!status.configured) {
    const inv = await inventGame({ audience: "student", gap: "auto", domain: core.OREGON_MEDICAL, coverage: core.domainCoverage({ domain: core.OREGON_MEDICAL, concepts: core.SEED_CONCEPTS_BY_DOMAIN["oregon-medical"] }), weakest: core.SEED_CONCEPTS_BY_DOMAIN["oregon-medical"][0] });
    assert.equal(inv.provider, "local-template");
    assert.ok(inv.name && inv.scores, "invention keeps its contract offline");
  }
});

test("simulated playtest: full learner loop changes recommendations (correctness of generation)", () => {
  const concepts = core.SEED_CONCEPTS_BY_DOMAIN["california-tax"];
  const now = Date.now();
  const before = core.computeLearnerState({ learnerId: "P", domainId: "california-tax", events: [], concepts, now });
  const nextBefore = core.recommendNext({ domain: core.CALIFORNIA_TAX, concepts, learnerState: before });
  assert.ok(nextBefore.conceptId, "cold start still recommends inside the tenant");
  assert.ok(concepts.some((c) => c.conceptId === nextBefore.conceptId), "recommendation stays in-tenant");
  // Play: fail deduction-vs-credit twice with its misconception → diagnostic must fire.
  const ev = [0, 1].map((i) => ({ eventId: `p${i}`, learnerId: "P", domainId: "california-tax", conceptId: "deduction-vs-credit", stage: 2, correct: false, score: 0, confidence: 0.9, misconceptionTag: "deduction-equals-credit", clientTs: now }));
  const after = core.computeLearnerState({ learnerId: "P", domainId: "california-tax", events: ev, concepts, now });
  const nextAfter = core.recommendNext({ domain: core.CALIFORNIA_TAX, concepts, learnerState: after });
  assert.equal(nextAfter.needsDiagnostic, true);
  // Generated practice for the failed concept must accept its true equivalents.
  const item = core.generateItem({ concept: concepts.find((c) => c.conceptId === "deduction-vs-credit"), domain: core.CALIFORNIA_TAX, stage: 2, targetLang: "es", seed: "playtest" });
  assert.ok(item.acceptableAnswers.some((a) => a.toLowerCase().includes("deducción")), "generated answer set must contain the true equivalent");
});
