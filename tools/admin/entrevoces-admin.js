#!/usr/bin/env node
// ENTRE VOCES Admin Tool — local operator surface (spec §23). Zero dependencies.
// Runs on your machine. Local-first: reads/generation/validation need no server.
//   node tools/admin/entrevoces-admin.js validate
//   node tools/admin/entrevoces-admin.js generate night --domain oregon-medical --seed demo
//   node tools/admin/entrevoces-admin.js scaffold game river-shift
//   node tools/admin/entrevoces-admin.js health --engine http://127.0.0.1:8787
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as core from "../../packages/engine-core/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const cmd = args[0] || "help";
const sub = args[1] && !args[1].startsWith("--") ? args[1] : null;
function flag(name, fallback = null) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const ENGINE = (flag("engine", "http://127.0.0.1:8787") || "").replace(/\/$/, "");
const TOKEN = flag("token", process.env.AUTHOR_TOKEN || "");
const useLocal = args.includes("--local") || cmd === "validate" || cmd === "scaffold" || cmd === "export" || cmd === "sync";
const out = (v) => console.log(typeof v === "string" ? v : JSON.stringify(v, null, 2));
const fail = (msg) => { console.error(`admin: ${msg}`); process.exit(1); };

async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const r = await fetch(`${ENGINE}${path}`, { ...opts, headers });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) fail(`CPE ${r.status} on ${path}: ${body.detail || JSON.stringify(body)}`);
  return body;
}
function localDomain(domainId) {
  return core.SEED_DOMAINS.find((d) => d.domainId === domainId) || null;
}
function localConcepts(domainId) { return core.CONCEPTS.filter((c) => c.domainId === domainId); }
async function getDomain(domainId) {
  if (useLocal && cmd !== "generate") { const d = localDomain(domainId); if (d) return d; }
  try { return await api(`/v1/domains/${encodeURIComponent(domainId)}`); }
  catch { const d = localDomain(domainId); if (d) { console.error("(CPE unreachable — using local seed)"); return d; } throw new Error("no domain"); }
}
async function getConcepts(domainId) {
  if (!useLocal || cmd === "generate") {
    try { return (await api(`/v1/concepts?domainId=${encodeURIComponent(domainId)}&limit=200`)).data; }
    catch { /* fall through to seed */ }
  }
  return localConcepts(domainId);
}

// ---------- validate (the conformance gate as a CLI) ----------
function doValidate() {
  let bad = 0;
  const check = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); if (!ok) bad++; };
  for (const d of core.SEED_DOMAINS) {
    const v = core.validateDomainConfig(d);
    check(`domain ${d.domainId}`, v.ok, v.errors.map((e) => `${e.field}: ${e.message}`).join("; "));
  }
  const sids = new Set(core.SOURCES.map((s) => s.sourceId));
  for (const c of core.CONCEPTS) {
    const d = localDomain(c.domainId);
    const v = core.validateConcept(c, { domain: d, sourceIds: sids });
    check(`concept ${c.conceptId}`, v.ok && c.sourceIds.length > 0, v.errors.map((e) => e.message).join("; "));
  }
  for (const s of core.SOURCES) check(`source ${s.sourceId}`, core.validateSource(s).ok);
  for (const dir of ["apps/games/concept-clinch", "apps/games/shift-consecutive", "apps/games/bench-call", "apps/hub"]) {
    const p = join(ROOT, dir, "game.config.json");
    if (!existsSync(p)) { check(`${dir} config`, false, "missing game.config.json"); continue; }
    const cfg = JSON.parse(readFileSync(p, "utf8"));
    check(`${dir} config (${cfg.gameId})`, core.validateGameConfig(cfg).ok && cfg.gameId === dir.split("/").pop() || dir.endsWith("hub"));
    const subset = join(ROOT, dir, "concepts-subset.json");
    if (existsSync(subset)) { try { JSON.parse(readFileSync(subset, "utf8")); check(`${dir} subset parses`, true); } catch { check(`${dir} subset parses`, false); } }
  }
  for (const name of ["domain-config", "concept", "evidence-event", "game-config"]) {
    check(`schema ${name}`, existsSync(join(ROOT, "packages/engine-core/schemas", `${name}.schema.json`)));
  }
  console.log(bad ? `\n${bad} FAILURE(S)` : "\nALL VALID — engine, games, and hub conform.");
  process.exit(bad ? 1 : 0);
}

// ---------- generate ----------
async function doGenerate() {
  const kind = sub || "night";
  const domainId = flag("domain", "oregon-medical");
  const domain = await getDomain(domainId).catch(() => fail(`unknown domain ${domainId} (try: ${core.SEED_DOMAINS.map((d) => d.domainId).join(", ")})`));
  const concepts = await getConcepts(domainId);
  const seed = flag("seed", "admin-1");
  const lang = flag("lang", "es");
  if (kind === "client") out(core.generateClient({ domain, concepts, seed, targetLang: lang }));
  else if (kind === "night") out(core.generateNight({ domain, concepts, seed, targetLang: lang, size: Number(flag("size", "4")) }));
  else if (kind === "practice") {
    const concept = concepts.find((c) => c.conceptId === flag("concept")) || concepts[0];
    if (!concept) fail(`domain ${domainId} has no concepts`);
    const area = domain.translationAreas.find((a) => a.areaId === concept.areaIds[0]) || null;
    const item = core.generateItem({ concept, domain, area, stage: Number(flag("stage", "2")), targetLang: lang, seed });
    const v = core.validateItems([item]);
    out({ item, valid: v.invalid.length === 0, problems: v.invalid });
  } else fail(`unknown generate kind "${kind}" (client|night|practice)`);
}

// ---------- scaffold ----------
function doScaffold() {
  const id = args[2];
  if (!id || !/^[a-z0-9][a-z0-9-]{2,48}$/.test(id)) fail("usage: scaffold domain|game <slug-id>");
  if (sub === "domain") {
    const dir = join(ROOT, "content/domains"); mkdirSync(dir, { recursive: true });
    const p = join(dir, `${id}.draft.json`);
    if (existsSync(p)) fail(`${p} exists — refusing to overwrite`);
    const draft = {
      domainId: id, label: { en: "TODO — Name this professional world" },
      jurisdiction: { country: "US", region: "TODO", regionCode: "" }, profession: "other",
      institutions: [], languagePairs: [{ source: "en", target: "es", direction: "bidirectional" }],
      modalities: ["consecutive"],
      translationAreas: [{ areaId: "first-encounter", label: { en: "First encounter" }, setting: "TODO", participants: [], goals: [], typicalSpeechFeatures: [], riskIfMistranslated: "medium", conceptIds: [], prerequisiteAreaIds: [], order: 1 }],
      competencyWeights: Object.fromEntries(core.COMPETENCES.map((k) => [k, 0.7])),
      sourceIds: [], status: "draft", version: 1,
    };
    const v = core.validateDomainConfig(draft);
    if (!v.ok) fail(`internal template invalid: ${JSON.stringify(v.errors)}`);
    writeFileSync(p, JSON.stringify(draft, null, 2) + "\n");
    out(`Wrote draft domain ${p}\nNext: fill TODOs, attach sources, then POST it (Console or: curl -X POST ${ENGINE}/v1/domains -H "Authorization: Bearer <token>") and Activate. Preview people with: generate night --domain ${id}`);
  } else if (sub === "game") {
    const dir = join(ROOT, "apps/games", id);
    if (existsSync(dir)) fail(`${dir} exists — refusing to overwrite`);
    mkdirSync(dir, { recursive: true });
    const cfg = { gameId: id, label: "TODO — Game Name", domainIds: ["oregon-medical"], competences: ["bilingual-terminology"], stages: [1, 2], engineUrl: "http://127.0.0.1:8787", offlineSeed: "concepts-subset.json", version: 1 };
    if (!core.validateGameConfig(cfg).ok) fail("internal game template invalid");
    writeFileSync(join(dir, "game.config.json"), JSON.stringify(cfg, null, 2) + "\n");
    writeFileSync(join(dir, "concepts-subset.json"), JSON.stringify(localConcepts("oregon-medical"), null, 2) + "\n");
    writeFileSync(join(dir, "index.html"), `<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${id} · ENTRE VOCES</title><link rel="stylesheet" href="style.css"></head>\n<body><main><h1>${id}</h1><p id="status">Loading engine…</p><button id="playBtn" type="button">Play a proof</button><p><a href="../../hub/">Hub</a></p></main><script type="module" src="game.js"></script></body></html>\n`);
    writeFileSync(join(dir, "style.css"), `body{font-family:"Public Sans",system-ui,sans-serif;color:#1e2a32;background:#eef3f0;line-height:1.55}button{min-height:48px;padding:11px 20px;font-weight:700;cursor:pointer}\n`);
    writeFileSync(join(dir, "game.js"), `// ${id} — standalone ENTRE VOCES game (spec §11.2). Own the interaction; the engine owns truth.\nimport * as core from "../../../packages/engine-core/index.js";\nimport { EngineClient } from "../../../packages/engine-client/engine-client.js";\nconst p = new URLSearchParams(location.search);\nlet fallback = core.CONCEPTS;\ntry { const r = await fetch("concepts-subset.json"); if (r.ok) fallback = await r.json(); } catch {}\nconst engine = new EngineClient({ engineUrl: p.get("engine") || "http://127.0.0.1:8787", learnerId: p.get("learner") || "", domainId: p.get("domain") || "oregon-medical", core, fallbackDomain: core.OREGON_MEDICAL, fallbackConcepts: fallback });\nawait engine.init();\nconst concepts = await engine.listConcepts(engine.domainId);\ndocument.querySelector("#status").textContent = concepts.length + " engine concepts loaded (" + (engine.online ? "synced" : "local-only") + "). Now invent this game's verb — never reskin a quiz.";\ndocument.querySelector("#playBtn").addEventListener("click", () => {\n  const c = concepts[0]; if (!c) return;\n  engine.recordEvidence({ conceptId: c.conceptId, areaId: c.areaIds[0], gameId: "${id}", activityType: "terminology", stage: 1, correct: true, score: 1 });\n  document.querySelector("#status").textContent = "Proof recorded for " + c.terms.en.term + " — see it in the Hub and Console.";\n});\n`);
    out(`Scaffolded standalone game ${dir}/ (index.html, style.css, game.js, game.config.json, concepts-subset.json)\nNext: give it a distinct verb, run \`validate\`, then link it from the hub. It already speaks EngineClient.`);
  } else fail("usage: scaffold domain|game <slug-id>");
}

// ---------- export / sync ----------
function doExport() {
  const dDir = join(ROOT, "content/domains"); mkdirSync(dDir, { recursive: true });
  const sDir = join(ROOT, "content/sources"); mkdirSync(sDir, { recursive: true });
  for (const d of core.SEED_DOMAINS) {
    writeFileSync(join(dDir, `${d.domainId}.json`), JSON.stringify({ domain: d, concepts: localConcepts(d.domainId) }, null, 2) + "\n");
    console.log(`content/domains/${d.domainId}.json (${localConcepts(d.domainId).length} concepts)`);
  }
  writeFileSync(join(sDir, "register.json"), JSON.stringify(core.SOURCES, null, 2) + "\n");
  console.log("content/sources/register.json");
}
function doSync() {
  const gameDirs = readdirSync(join(ROOT, "apps/games"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => `apps/games/${d.name}`);
  for (const dir of [...gameDirs, "apps/hub"]) {
    const cfg = JSON.parse(readFileSync(join(ROOT, dir, "game.config.json"), "utf8"));
    const concepts = [...new Map(cfg.domainIds.flatMap((d) => localConcepts(d)).map((c) => [c.conceptId + c.domainId, c])).values()];
    writeFileSync(join(ROOT, dir, "concepts-subset.json"), JSON.stringify(concepts, null, 2) + "\n");
    console.log(`${dir}/concepts-subset.json (${concepts.length} concepts from ${cfg.domainIds.join("+")})`);
  }
}

// ---------- dispatch ----------
const HELP = `ENTRE VOCES Admin (spec §23) — local-first, zero dependencies
  validate                                  conformance gate (seeds, configs, schemas)
  health [--engine URL]                     CPE liveness + counts
  domains [--local]                         list domains (CPE, or local seed with --local)
  concepts --domain ID [--local]            list concepts
  generate client|night|practice [flags]    --domain --seed --lang --size --concept --stage
  scaffold domain|game <slug-id>            contract-valid starting points (never overwrite)
  export content                            regenerate content/ mirrors from seed
  sync subsets                              regenerate games' concepts-subset.json
Global flags: --engine URL (default http://127.0.0.1:8787) · --token T (author writes) · --local`;

try {
  if (cmd === "help" || cmd === "--help") out(HELP);
  else if (cmd === "validate") doValidate();
  else if (cmd === "health") out(await api("/v1/health"));
  else if (cmd === "domains") out(useLocal && args.includes("--local") ? core.SEED_DOMAINS : (await api("/v1/domains?status=active")).data);
  else if (cmd === "concepts") out(await getConcepts(flag("domain", "oregon-medical")));
  else if (cmd === "generate") await doGenerate();
  else if (cmd === "scaffold") doScaffold();
  else if (cmd === "export") doExport();
  else if (cmd === "sync") doSync();
  else fail(`unknown command "${cmd}" — try: help`);
} catch (e) { fail(e.message || String(e)); }
