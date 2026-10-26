// ENTRE VOCES — Centralized Progression Engine (CPE), reference implementation
// Spec §9. Zero-dependency Node server (http + fs only).
// The wire protocol is the contract; this file is one host for it.
// Cloudflare Workers + D1 is the reference production host (see wrangler.toml);
// this Node server mirrors it for local development and judging fallback.
//
// Run: AUTHOR_TOKEN=dev-author-token PORT=8787 node server.js
// Data: ./data/store.json (created + seeded on first run)

import http from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import {
  validateDomainConfig, validateConcept, validateEvidence,
  computeLearnerState, recommendNext, domainCoverage,
  generateClient, generateNight, generateItem,
  SEED_DOMAINS, CONCEPTS, SOURCES, ENGINE_VERSION, reviewKnowledgeItem, reviewKnowledgeBase,
} from "../../packages/engine-core/index.js";
import { metaStatus, inventGame, enrichConceptDraft, reviewKnowledge } from "./meta.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const AUTHOR_TOKEN = process.env.AUTHOR_TOKEN || "dev-author-token";
const STORE_PATH = join(__dir, "data", "store.json");

// ---------- store ----------
function seedStore() {
  return {
    domains: JSON.parse(JSON.stringify(SEED_DOMAINS)),
    concepts: JSON.parse(JSON.stringify(CONCEPTS)),
    sources: JSON.parse(JSON.stringify(SOURCES)),
    learners: [],
    evidence: [],
    seq: 0,
  };
}
function loadStore() {
  try {
    if (existsSync(STORE_PATH)) return JSON.parse(readFileSync(STORE_PATH, "utf8"));
  } catch (e) { console.error("[cpe] store unreadable, reseeding:", e.message); }
  const s = seedStore();
  saveStore(s);
  return s;
}
function saveStore(s) {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  const tmp = STORE_PATH + ".tmp";
  writeFileSync(tmp, JSON.stringify(s, null, 2));
  renameSync(tmp, STORE_PATH);
}
let store = loadStore();

// ---------- helpers ----------
function send(res, status, body, extraHeaders = {}) {
  const payload = body == null ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key, If-None-Match",
    "Access-Control-Expose-Headers": "ETag",
    ...extraHeaders,
  });
  res.end(payload);
}
function problem(res, status, title, detail, fieldErrors) {
  send(res, status, { type: `https://entrevoces.local/problems/${status}`, title, status, detail, ...(fieldErrors ? { fieldErrors } : {}) });
}
function isAuthor(req) {
  const h = req.headers.authorization || "";
  return h === `Bearer ${AUTHOR_TOKEN}`;
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve(null);
      try { resolve(JSON.parse(raw)); } catch { reject(Object.assign(new Error("malformed JSON"), { status: 400 })); }
    });
    req.on("error", reject);
  });
}
function etagFor(value) { return `"${Buffer.from(JSON.stringify(value)).toString("base64url").slice(0, 27)}"`; }
function domainById(id) { return store.domains.find((d) => d.domainId === id); }
function conceptsFor(domainId, areaId) {
  return store.concepts
    .filter((c) => c.domainId === domainId && (!areaId || c.areaIds.includes(areaId)))
    .sort((a, b) => a.conceptId.localeCompare(b.conceptId));
}

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const path = url.pathname.replace(/\/$/, "") || "/";
  const method = req.method;
  const q = url.searchParams;
  try {
    if (method === "OPTIONS") { send(res, 204, null); return; }

    // Health (public)
    if (path === "/v1/health" && method === "GET") {
      send(res, 200, { ok: true, service: "entrevoces-progression-engine", engineVersion: ENGINE_VERSION, wire: "v1", counts: { domains: store.domains.length, concepts: store.concepts.length, learners: store.learners.length, evidence: store.evidence.length }, ts: new Date().toISOString() }, { "Cache-Control": "public, max-age=30" });
      return;
    }

    // Domains — read (public; drafts hidden without author)
    if (path === "/v1/domains" && method === "GET") {
      const status = q.get("status");
      const includeDraft = q.get("includeDraft") === "true" && isAuthor(req);
      let list = store.domains.filter((d) => includeDraft || d.status !== "draft" || status === "draft" && isAuthor(req));
      if (status) list = list.filter((d) => d.status === status);
      const tag = etagFor(list.map((d) => [d.domainId, d.version]));
      if (req.headers["if-none-match"] === tag) { res.writeHead(304, { ETag: tag, "Access-Control-Allow-Origin": "*" }); res.end(); return; }
      send(res, 200, { data: list, count: list.length }, { ETag: tag });
      return;
    }
    const domainMatch = path.match(/^\/v1\/domains\/([a-z0-9-]+)$/);
    if (domainMatch && method === "GET") {
      const d = domainById(domainMatch[1]);
      if (!d || (d.status === "draft" && !isAuthor(req) && q.get("includeDraft") !== "true")) { problem(res, 404, "Domain not found", `No visible domain "${domainMatch[1]}".`); return; }
      send(res, 200, d, { ETag: etagFor([d.domainId, d.version]) });
      return;
    }
    if (path === "/v1/domains" && method === "POST") {
      if (!isAuthor(req)) { problem(res, 401, "Author token required", "Creating domains requires Authorization: Bearer <AUTHOR_TOKEN>."); return; }
      const body = await readBody(req);
      const v = validateDomainConfig(body, { existingIds: new Set(store.domains.map((d) => d.domainId)) });
      if (!v.ok) { problem(res, 422, "Domain validation failed", "See fieldErrors.", v.errors); return; }
      const cfg = { ...body, status: body.status || "draft", version: 1, updatedAt: new Date().toISOString() };
      store.domains.push(cfg); saveStore(store);
      send(res, 201, cfg);
      return;
    }
    if (domainMatch && method === "PUT") {
      if (!isAuthor(req)) { problem(res, 401, "Author token required", "Updating domains requires the author token."); return; }
      const existing = domainById(domainMatch[1]);
      if (!existing) { problem(res, 404, "Domain not found", `No domain "${domainMatch[1]}".`); return; }
      const body = await readBody(req);
      if (body.domainId && body.domainId !== existing.domainId) { problem(res, 422, "domainId is immutable", "Create a new domain instead of renaming."); return; }
      if (body.version != null && body.version !== existing.version) { problem(res, 409, "Stale version", `You edited version ${body.version} but current is ${existing.version}. Reload and retry.`, [{ field: "version", message: `current version is ${existing.version}` }]); return; }
      const merged = { ...existing, ...body, domainId: existing.domainId, version: existing.version + 1, updatedAt: new Date().toISOString() };
      const v = validateDomainConfig(merged);
      if (!v.ok) { problem(res, 422, "Domain validation failed", "See fieldErrors.", v.errors); return; }
      store.domains[store.domains.indexOf(existing)] = merged; saveStore(store);
      send(res, 200, merged);
      return;
    }

    // Sources (public read)
    if (path === "/v1/sources" && method === "GET") { send(res, 200, { data: store.sources, count: store.sources.length }); return; }

    // Concepts — read (public) / bulk write (author)
    if (path === "/v1/concepts" && method === "GET") {
      const domainId = q.get("domainId");
      if (!domainId) { problem(res, 400, "domainId required", "Pass ?domainId=oregon-medical"); return; }
      if (!domainById(domainId)) { problem(res, 404, "Domain not found", `No domain "${domainId}".`); return; }
      const limit = Math.min(200, Math.max(1, Number(q.get("limit") || 100)));
      const cursor = q.get("cursor") || "";
      const all = conceptsFor(domainId, q.get("areaId") || undefined);
      const start = cursor ? Math.max(0, all.findIndex((c) => c.conceptId === cursor) + 1) : 0;
      const page = all.slice(start, start + limit);
      send(res, 200, { data: page, count: all.length, nextCursor: start + limit < all.length ? page[page.length - 1]?.conceptId : null });
      return;
    }
    if (path === "/v1/concepts" && method === "POST") {
      if (!isAuthor(req)) { problem(res, 401, "Author token required", "Seeding concepts requires the author token."); return; }
      const body = await readBody(req);
      const list = Array.isArray(body) ? body : body?.concepts;
      if (!Array.isArray(list)) { problem(res, 400, "Expected an array of concepts", "POST a JSON array or { concepts: [...] }."); return; }
      const sourceIds = new Set(store.sources.map((s) => s.sourceId));
      const results = [];
      for (const c of list) {
        const domain = domainById(c?.domainId);
        const v = validateConcept(c, { domain, sourceIds });
        if (!v.ok) { results.push({ conceptId: c?.conceptId || null, accepted: false, errors: v.errors }); continue; }
        const idx = store.concepts.findIndex((x) => x.conceptId === c.conceptId && x.domainId === c.domainId);
        if (idx >= 0) store.concepts[idx] = c; else store.concepts.push(c);
        results.push({ conceptId: c.conceptId, accepted: true });
      }
      saveStore(store);
      send(res, 200, { results, accepted: results.filter((r) => r.accepted).length });
      return;
    }

    // Learners
    if (path === "/v1/learners" && method === "POST") {
      const body = (await readBody(req)) || {};
      const learner = { learnerId: randomUUID(), displayName: body.displayName || null, languagePair: body.languagePair || null, createdAt: new Date().toISOString() };
      store.learners.push(learner); saveStore(store);
      send(res, 201, learner);
      return;
    }
    if (path === "/v1/learners" && method === "GET") {
      send(res, 200, { data: store.learners, count: store.learners.length });
      return;
    }
    const learnerStateMatch = path.match(/^\/v1\/learners\/([a-zA-Z0-9-]+)\/state$/);
    if (learnerStateMatch && method === "GET") {
      const learnerId = learnerStateMatch[1];
      const domainId = q.get("domainId") || "oregon-medical";
      if (!domainById(domainId)) { problem(res, 404, "Domain not found", `No domain "${domainId}".`); return; }
      const events = store.evidence.filter((e) => e.learnerId === learnerId && e.domainId === domainId);
      const state = computeLearnerState({ learnerId, domainId, events, concepts: conceptsFor(domainId) });
      send(res, 200, state);
      return;
    }
    const learnerExportMatch = path.match(/^\/v1\/learners\/([a-zA-Z0-9-]+)\/export$/);
    if (learnerExportMatch && method === "GET") {
      const learnerId = learnerExportMatch[1];
      const learner = store.learners.find((l) => l.learnerId === learnerId) || { learnerId };
      send(res, 200, { learner, evidence: store.evidence.filter((e) => e.learnerId === learnerId), exportedAt: new Date().toISOString() });
      return;
    }
    const learnerMatch = path.match(/^\/v1\/learners\/([a-zA-Z0-9-]+)$/);
    if (learnerMatch && method === "DELETE") {
      const learnerId = learnerMatch[1];
      store.learners = store.learners.filter((l) => l.learnerId !== learnerId);
      store.evidence = store.evidence.filter((e) => e.learnerId !== learnerId);
      saveStore(store);
      send(res, 200, { deleted: learnerId });
      return;
    }

    // Evidence — batch submit (idempotent) + pull for sync
    if (path === "/v1/evidence" && method === "POST") {
      const body = await readBody(req);
      const list = Array.isArray(body) ? body : body?.events;
      if (!Array.isArray(list) || list.length === 0) { problem(res, 400, "Expected evidence events", "POST a JSON array of EvidenceEvent or { events: [...] } (non-empty)."); return; }
      const known = new Set(store.evidence.map((e) => e.eventId));
      const results = [];
      for (const ev of list) {
        const v = validateEvidence(ev);
        if (!v.ok) { results.push({ eventId: ev?.eventId || null, accepted: false, errors: v.errors }); continue; }
        if (known.has(ev.eventId)) { results.push({ eventId: ev.eventId, accepted: true, duplicate: true }); continue; }
        store.evidence.push({ ...ev, serverTs: Date.now(), serverSeq: ++store.seq });
        known.add(ev.eventId);
        results.push({ eventId: ev.eventId, accepted: true });
      }
      saveStore(store);
      send(res, 200, { results, accepted: results.filter((r) => r.accepted).length });
      return;
    }
    if (path === "/v1/evidence" && method === "GET") {
      const learnerId = q.get("learnerId");
      if (!learnerId) { problem(res, 400, "learnerId required", "Pass ?learnerId=..."); return; }
      const domainId = q.get("domainId");
      const since = Number(q.get("since") || 0);
      const data = store.evidence
        .filter((e) => e.learnerId === learnerId && (!domainId || e.domainId === domainId) && (e.serverSeq || 0) > since)
        .sort((a, b) => (a.serverSeq || 0) - (b.serverSeq || 0));
      send(res, 200, { data, count: data.length, cursor: data.length ? data[data.length - 1].serverSeq : since });
      return;
    }

    // Adaptive next + coverage
    if (path === "/v1/next" && method === "GET") {
      const learnerId = q.get("learnerId");
      const domainId = q.get("domainId") || "oregon-medical";
      const domain = domainById(domainId);
      if (!domain) { problem(res, 404, "Domain not found", `No domain "${domainId}".`); return; }
      const events = learnerId ? store.evidence.filter((e) => e.learnerId === learnerId && e.domainId === domainId) : [];
      const state = computeLearnerState({ learnerId: learnerId || "anonymous", domainId, events, concepts: conceptsFor(domainId) });
      send(res, 200, recommendNext({ domain, concepts: conceptsFor(domainId), learnerState: state, excludeGameId: q.get("excludeGameId") || null }));
      return;
    }
    if (path === "/v1/coverage" && method === "GET") {
      const domainId = q.get("domainId") || "oregon-medical";
      const domain = domainById(domainId);
      if (!domain) { problem(res, 404, "Domain not found", `No domain "${domainId}".`); return; }
      const learnerId = q.get("learnerId");
      const events = learnerId ? store.evidence.filter((e) => e.learnerId === learnerId && e.domainId === domainId) : [];
      const state = learnerId ? computeLearnerState({ learnerId, domainId, events, concepts: conceptsFor(domainId) }) : null;
      send(res, 200, { domainId, areas: domainCoverage({ domain, concepts: conceptsFor(domainId), learnerState: state }) });
      return;
    }

    // Generation (public, deterministic; spec §22 — Spark enrichment caged behind validation)
    if (path === "/v1/generate/night" && method === "GET") {
      const domainId = q.get("domainId") || "oregon-medical";
      const domain = domainById(domainId);
      if (!domain) { problem(res, 404, "Domain not found", `No domain "${domainId}".`); return; }
      const learnerId = q.get("learnerId");
      const events = learnerId ? store.evidence.filter((e) => e.learnerId === learnerId && e.domainId === domainId) : [];
      const state = learnerId ? computeLearnerState({ learnerId, domainId, events, concepts: conceptsFor(domainId) }) : null;
      const size = Math.min(8, Math.max(1, Number(q.get("size") || 4)));
      send(res, 200, { data: generateNight({ domain, concepts: conceptsFor(domainId), learnerState: state, seed: q.get("seed") || "night-1", targetLang: q.get("lang") || "es", size }), seed: q.get("seed") || "night-1" });
      return;
    }
    if (path === "/v1/generate/client" && method === "GET") {
      const domainId = q.get("domainId") || "oregon-medical";
      const domain = domainById(domainId);
      if (!domain) { problem(res, 404, "Domain not found", `No domain "${domainId}".`); return; }
      send(res, 200, generateClient({ domain, concepts: conceptsFor(domainId), seed: q.get("seed") || "client-1", targetLang: q.get("lang") || "es" }));
      return;
    }
    if (path === "/v1/generate/practice" && method === "GET") {
      const domainId = q.get("domainId") || "oregon-medical";
      const domain = domainById(domainId);
      if (!domain) { problem(res, 404, "Domain not found", `No domain "${domainId}".`); return; }
      const concept = conceptsFor(domainId).find((c) => c.conceptId === q.get("conceptId")) || conceptsFor(domainId)[0];
      if (!concept) { problem(res, 404, "No concepts", `Domain "${domainId}" has no concepts yet.`); return; }
      const area = domain.translationAreas.find((a) => a.areaId === concept.areaIds[0]) || null;
      send(res, 200, generateItem({ concept, domain, area, stage: Math.min(8, Math.max(1, Number(q.get("stage") || 2))), targetLang: q.get("lang") || "es", seed: q.get("seed") || "practice-1" }));
      return;
    }

    // Meta AI surface (Stage-1 proof): status + log are public; work routes
    // answer locally (labeled) without a key and live with one. No key, no fake.
    if (path === "/v1/ai/status" && method === "GET") { send(res, 200, metaStatus()); return; }
    if (path === "/v1/ai/invent" && method === "POST") {
      const body = (await readBody(req)) || {};
      const domain = domainById(body.domainId || "oregon-medical");
      if (!domain) { problem(res, 404, "Domain not found", "Pass a valid domainId."); return; }
      const concepts = conceptsFor(domain.domainId);
      const learnerId = body.learnerId;
      const events = learnerId ? store.evidence.filter((e) => e.learnerId === learnerId && e.domainId === domain.domainId) : [];
      const state = learnerId ? computeLearnerState({ learnerId, domainId: domain.domainId, events, concepts }) : null;
      const coverage = domainCoverage({ domain, concepts, learnerState: state });
      const next = state ? recommendNext({ domain, concepts, learnerState: state }) : null;
      const weakest = concepts.find((c) => c.conceptId === next?.conceptId) || concepts[0];
      send(res, 200, await inventGame({ audience: body.audience || "aspiring interpreter", gap: body.gap || "auto", domain, coverage, weakest }));
      return;
    }
    if (path === "/v1/ai/review" && method === "POST") {
      // KB gatekeeper: deterministic profound review first; Wonder second.
      // Rejected items are refused (422) — bad knowledge does not become games.
      const body = (await readBody(req)) || {};
      const concept = body.conceptId ? conceptsFor(body.domainId || "oregon-medical").find((c) => c.conceptId === body.conceptId) || store.concepts.find((c) => c.conceptId === body.conceptId) : body.concept;
      if (!concept) { problem(res, 404, "Concept not found", "Pass conceptId (+domainId) or a full concept object."); return; }
      const siblings = store.concepts.filter((c) => c.domainId === concept.domainId);
      const gate = reviewKnowledgeItem(concept, { concepts: siblings, sources: store.sources });
      if (body.deep === false) { send(res, gate.verdict === "reject" ? 422 : 200, { gate, provider: "deterministic" }); return; }
      const reviewed = await reviewKnowledge({ concept, gate });
      send(res, reviewed.verdict === "reject" ? 422 : 200, { gate, ...reviewed });
      return;
    }
    if (path === "/v1/ai/review-base" && method === "GET") {
      const base = reviewKnowledgeBase({ concepts: store.concepts, sources: store.sources });
      send(res, 200, { total: base.total, accepted: base.accepted, repair: base.repair, rejected: base.rejected, rejectedIds: base.results.filter((r) => r.verdict === "reject").map((r) => r.conceptId) });
      return;
    }
    if (path === "/v1/ai/enrich" && method === "POST") {
      if (!isAuthor(req)) { problem(res, 401, "Author token required", "Enrichment drafts require the author token."); return; }
      const body = (await readBody(req)) || {};
      const domain = domainById(body.domainId || "oregon-medical");
      if (!domain) { problem(res, 404, "Domain not found", "Pass a valid domainId."); return; }
      send(res, 200, await enrichConceptDraft({ domain, seedText: String(body.seedText || "new term").slice(0, 200) }));
      return;
    }

    // Admin (author only): reseed / reset demo data
    if (path === "/v1/admin/seed" && method === "POST") {
      if (!isAuthor(req)) { problem(res, 401, "Author token required", "Seeding requires the author token."); return; }
      const fresh = seedStore();
      store.domains = fresh.domains; store.concepts = fresh.concepts; store.sources = fresh.sources;
      saveStore(store);
      send(res, 200, { seeded: true, domains: store.domains.length, concepts: store.concepts.length, sources: store.sources.length });
      return;
    }
    if (path === "/v1/admin/reset" && method === "POST") {
      if (!isAuthor(req)) { problem(res, 401, "Author token required", "Reset requires the author token."); return; }
      store = seedStore(); saveStore(store);
      send(res, 200, { reset: true });
      return;
    }

    problem(res, 404, "Not found", `No route ${method} ${path}. See GET /v1/health.`);
  } catch (e) {
    if (e.status === 400) { problem(res, 400, "Bad request", e.message); return; }
    console.error("[cpe] error:", e);
    problem(res, 500, "Internal error", e.message || "unexpected error");
  }
});

// Exported for in-process tests (no socket needed); listening only when run directly.
export { server, store };
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  server.listen(PORT, HOST, () => {
    console.log(`[cpe] ENTRE VOCES Progression Engine listening on http://${HOST}:${PORT}/v1 (author token ${AUTHOR_TOKEN === "dev-author-token" ? "= dev-author-token (local default)" : "set via AUTHOR_TOKEN"})`);
    console.log(`[cpe] store: ${STORE_PATH} — domains=${store.domains.length} concepts=${store.concepts.length} learners=${store.learners.length} evidence=${store.evidence.length}`);
  });
}
