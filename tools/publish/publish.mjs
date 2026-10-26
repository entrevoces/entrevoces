#!/usr/bin/env node
// ENTRE VOCES publisher — one source tree, many right-sized repos.
//
//   node tools/publish/publish.mjs build          # build dist/ bundles only
//   node tools/publish/publish.mjs push           # build + commit + push each bundle
//   node tools/publish/publish.mjs push --only site,game-neon-bastion
//
// Repo map (org: entrevoces, SSH remotes — never embed credentials):
//   entrevoces.github.io   <- dist/site          (hub + all web games, Pages root)
//   entrevoces             <- this repo itself   (engine, spec, docs — handled by git, not this tool)
//   knowledge-bases        <- dist/knowledge-bases (per-domain JSON + source register)
//   engine                 <- dist/engine        (engine-core + engine-client + CPE + tests)
//   game-<gameId>          <- dist/games/<gameId> (standalone: vendored engine, rewritten imports)
//   roblox-puente-islands  <- apps/games/roblox-puente-islands (Luau sources + guide)
//
// Standalone means standalone: per-game bundles vendor packages/engine-* into
// engine/ and rewrite "../../../packages/..." imports to "./engine/...", and
// hub links ("../../hub/") are rewritten to the live site URL.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIST = join(ROOT, "dist");
const ORG = process.env.EV_GITHUB_ORG || "entrevoces";
const SITE_URL = process.env.EV_SITE_URL || `https://${ORG}.github.io/`;
const args = process.argv.slice(2);
const doPush = args.includes("push");
const only = (args.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const want = (name) => !only.length || only.includes(name);

const git = (cwd, ...a) => execFileSync("git", a, { cwd, stdio: "pipe", env: { ...process.env, GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND || "ssh -o ConnectTimeout=20" } });
function pushBundle(dir, repo, message) {
  const remote = `git@github.com:${ORG}/${repo}.git`;
  try { git(dir, "ls-remote", remote); }
  catch { return { repo, status: "BLOCKED: repo not found or no SSH write access — create an empty repo (no README) at https://github.com/organizations/" + ORG + "/repositories/new?name=" + repo + ", or grant the pushing account org write access" }; }
  if (!existsSync(join(dir, ".git"))) { git(dir, "init", "-b", "main"); git(dir, "remote", "add", "origin", remote); }
  git(dir, "add", "-A");
  try { git(dir, "-c", "user.name=ENTRE VOCES Publisher", "-c", "user.email=publisher@entrevoces.local", "commit", "-m", message); }
  catch { return { repo, status: "no changes" }; }
  try { git(dir, "push", "-u", "origin", "main"); return { repo, status: "pushed" }; }
  catch (e) { return { repo, status: "PUSH FAILED: " + String(e.stderr || e.message).slice(0, 300) }; }
}

function rewriteGameImports(dir) {
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    const p = join(dir, f);
    writeFileSync(p, readFileSync(p, "utf8")
      .replaceAll("../../hub/", SITE_URL + "apps/hub/")
      .replaceAll("../../../packages/engine-core/index.js", "./engine/engine-core/index.js")
      .replaceAll("../../../packages/engine-client/engine-client.js", "./engine/engine-client/engine-client.js"));
  }
  const htmlPath = join(dir, "index.html");
  if (existsSync(htmlPath)) writeFileSync(htmlPath, readFileSync(htmlPath, "utf8").replaceAll("../../hub/", SITE_URL));
}
function vendorEngine(destDir) {
  cpSync(join(ROOT, "packages/engine-core"), join(destDir, "engine/engine-core"), { recursive: true });
  cpSync(join(ROOT, "packages/engine-client"), join(destDir, "engine/engine-client"), { recursive: true });
}

const results = [];
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// ---- site: entrevoces.github.io (apps + packages at Pages root) ----
if (want("site")) {
  const site = join(DIST, "site");
  cpSync(join(ROOT, "apps"), join(site, "apps"), { recursive: true });
  cpSync(join(ROOT, "packages"), join(site, "packages"), { recursive: true });
  writeFileSync(join(site, "index.html"), `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>ENTRE VOCES</title><meta http-equiv="refresh" content="0; url=apps/hub/"><link rel="canonical" href="apps/hub/"></head><body><p><a href="apps/hub/">Enter ENTRE VOCES</a></p></body></html>\n`);
  writeFileSync(join(site, "README.md"), `# ENTRE VOCES — live site\n\nHub: ${SITE_URL}apps/hub/ · Eleven playable games under \`apps/games/\`.\nSource of truth: the \`entrevoces\` repository (engine, spec, docs). This repo is the published site; do not edit by hand.\n`);
  results.push({ name: "site", dir: site, repo: `${ORG}.github.io` });
}

// ---- knowledge bases ----
if (want("knowledge-bases")) {
  const kb = join(DIST, "knowledge-bases");
  cpSync(join(ROOT, "content"), kb, { recursive: true });
  const domains = readdirSync(join(kb, "domains")).filter((f) => f.endsWith(".json"));
  writeFileSync(join(kb, "README.md"), `# ENTRE VOCES knowledge bases\n\nOne JSON per world (domain config + sourced concepts), generated from \`packages/engine-core/seed-data.js\` by \`tools/admin\` — never hand-edit.\n\nWorlds: ${domains.map((d) => `\`${d}\``).join(", ")}.\nSource register: \`sources/register.json\`. Every concept carries sourceIds; inferred material is flagged.\n`);
  results.push({ name: "knowledge-bases", dir: kb, repo: "knowledge-bases" });
}

// ---- engine ----
if (want("engine")) {
  const eng = join(DIST, "engine");
  cpSync(join(ROOT, "packages"), join(eng, "packages"), { recursive: true });
  cpSync(join(ROOT, "services"), join(eng, "services"), { recursive: true });
  cpSync(join(ROOT, "tests"), join(eng, "tests"), { recursive: true });
  cpSync(join(ROOT, "spec.md"), join(eng, "spec.md"));
  writeFileSync(join(eng, "package.json"), JSON.stringify({ name: "entrevoces-engine", private: true, type: "module", scripts: { test: "node --test tests/conformance.test.js tests/tenancy-generation.test.js tests/critic-pass.test.js" } }, null, 2) + "\n");
  writeFileSync(join(eng, "README.md"), `# ENTRE VOCES — Progression Engine\n\nThe engine is the product; games are thin clients. Domain-config core, learner model,\nselector, fidelity, CPE wire v1, and the conformance suite. Spec: \`spec.md\`.\nRun: \`npm test\` · \`node services/progression-engine/server.js\`\n`);
  results.push({ name: "engine", dir: eng, repo: "engine" });
}

// ---- per-game standalone repos ----
const gameDirs = readdirSync(join(ROOT, "apps/games"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
for (const id of gameDirs) {
  if (!want(`game-${id}`) && !want(id)) continue;
  const src = join(ROOT, "apps/games", id);
  const dest = join(DIST, "games", id);
  if (id.startsWith("roblox-")) {
    cpSync(src, dest, { recursive: true });
    results.push({ name: `game-${id}`, dir: dest, repo: id });
    continue;
  }
  cpSync(src, dest, { recursive: true });
  vendorEngine(dest);
  rewriteGameImports(dest);
  const cfg = JSON.parse(readFileSync(join(dest, "game.config.json"), "utf8"));
  writeFileSync(join(dest, "README.md"), `# ${cfg.label} — an ENTRE VOCES game\n\nStandalone bundle generated by \`tools/publish/publish.mjs\` from the entrevoces monorepo.\nOpen \`index.html\` via any static host (GitHub Pages works). The engine client is vendored\nunder \`engine/\`; progress is local-first and syncs to a Progression Engine when configured.\nStages trained: ${cfg.stages.join(", ")} · Worlds: ${cfg.domainIds.join(", ")}.\n`);
  results.push({ name: `game-${id}`, dir: dest, repo: `game-${id}` });
}

console.log(`Built ${results.length} bundle(s) under dist/: ${results.map((r) => r.name).join(", ")}`);
if (!doPush) { console.log("Build only. Re-run with `push` to commit + push each bundle to its repo."); process.exit(0); }
for (const r of results) {
  const out = pushBundle(r.dir, r.repo, `Publish ${r.name} from entrevoces monorepo`);
  console.log(`${out.repo}: ${out.status}`);
}
console.log(`Main monorepo (entrevoces/entrevoces) is pushed with plain git from the repo root — see docs/runbooks/publishing.md.`);
