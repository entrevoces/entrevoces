import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {learningRuntimeSources} from "./runtime.js";
import {validateGameConfig} from "../packages/engine-core/validate.js";
const repository = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);
export const safeBuildPath = (p) => typeof p === "string" && /^(?:assets\/)?[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:html|css|js|json|svg)$/.test(p) && !p.includes("..");
export async function validateBuild(build, { domain, concepts, assets = [] }) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  if (!Array.isArray(build?.files) || build.files.length < 3 || build.files.length > 60) return { ok: false, errors: [{ field: "files", message: "3..60 source files required" }] };
  const files = new Map();
  const hostFiles = new Set(["domain.json","concepts-subset.json","media-manifest.json","runtime/engine-client.js",...Object.keys(learningRuntimeSources()).map(f=>`runtime/engine-core/${f}`),...assets.map(f=>f.name)]);
  if(existsSync(join(repository,"packages/game-runtime")))for(const f of readdirSync(join(repository,"packages/game-runtime")))if(f.endsWith('.js'))hostFiles.add(`runtime/game-runtime/${f}`);
  for (const f of build.files) {
    if (!safeBuildPath(f?.path) || typeof f?.content !== "string" || files.has(f.path)) { add("files", "unique safe relative source paths and textual content required"); continue; }
    if (/^runtime\//.test(f.path) || hostFiles.has(f.path)) add(f.path, "engine runtime and generated media are host-owned");
    files.set(f.path, f.content);
  }
  if ([...files.values()].reduce((n, s) => n + Buffer.byteLength(s), 0) > 3 * 1024 * 1024) add("files", "3 MiB textual build limit exceeded");
  for (const required of ["index.html", "game.js", "style.css", "game.config.json"]) if (!files.has(required)) add(required, "required standalone build file missing");
  const html = files.get("index.html") || "";
  if (!/<canvas\b/i.test(html) || !/viewport/i.test(html) || !/game\.js/.test(html)) add("index.html", "fullscreen game canvas, viewport and game module required");
  if (/<(?:iframe|object|embed|form|base)\b/i.test(html) || /<script[^>]+src\s*=\s*["'](?:https?:|\/\/)/i.test(html)) add("index.html", "external frames/forms/scripts are not allowed in a generated build");
  if(/\bon[a-z]+\s*=/i.test(html)||/<script(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(html))add("index.html","inline executable handlers/scripts are forbidden; use bundled modules");
  let config;
  try {
    config = JSON.parse(files.get("game.config.json"));
    for(const e of validateGameConfig(config).errors)add(`game.config.json.${e.field}`,e.message);
    if (config.domainIds?.length !== 1 || config.domainIds[0] !== domain.domainId || !Array.isArray(config.stages) || !config.stages.length || config.stages.some((s) => !Number.isInteger(s) || s < 1 || s > 8)) add("game.config.json", "selected domain and actual emitted learning stages required");
  } catch { add("game.config.json", "invalid JSON"); }
  const js = files.get("game.js") || "";
  for (const marker of ["EngineClient", "recordEvidence", "fallbackConcepts"]) if (!js.includes(marker)) add("game.js", `${marker} integration required`);
  if(!js.includes("requestAnimationFrame")&&!js.includes("./runtime/game-runtime/"))add("game.js", "a real game loop or supplied shared game runtime is required");
  if (!js.includes("./runtime/engine-core/index.js") || !js.includes("./runtime/engine-client.js")) add("game.js", "use the supplied shared runtime; do not reimplement learning truth");
  if(assets.length&&!assets.every(a=>[...files.values()].some(s=>s.includes(a.name))))add("assets","every planned asset must be consumed by the game source");
  for (const [name, content] of files) {
    if (name.endsWith(".js") && /\beval\s*\(|new\s+Function\s*\(|import\s*\(\s*["'](?:https?:|\/\/)|from\s*["'](?:https?:|\/\/)/.test(content)) add(name, "dynamic execution and remote imports are forbidden");
    for (const match of content.matchAll(/(?:src|href)\s*=\s*["']([^"'#?]+)["']/g)) {
      const ref = match[1].replace(/^\.\//, "");
      if (!ref.startsWith("data:") && !hostFiles.has(ref) && !files.has(ref)) add(name, `unbundled asset reference ${ref}`);
    }
    if(name.endsWith('.js'))for(const match of content.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)){
      const ref=match[1].replace(/^\.\//,'');if(!files.has(ref)&&!hostFiles.has(ref))add(name,`missing local module ${ref}`);
    }
    for(const match of content.matchAll(/url\(\s*["']?([^\s)'"#]+)["']?\s*\)/g)){
      const ref=match[1].replace(/^\.\//,'');if(!ref.startsWith('data:')&&!files.has(ref)&&!hostFiles.has(ref))add(name,`unbundled CSS asset ${ref}`);
    }
    if(name.endsWith('.js')&&/(?:fetch\s*\(|new\s+(?:WebSocket|EventSource|Audio)\s*\()\s*["'`](?:https?:|wss?:|\/\/)/i.test(content))add(name,'remote runtime network/media calls are forbidden; bundle assets at build time');
  }
  const folder = await mkdtemp(join(tmpdir(), "ev-check-"));
  try {
    for (const [name, content] of files) if (name.endsWith(".js")) {
      const target = join(folder, name.replaceAll("/", "-").replace(/\.js$/, ".mjs")); await writeFile(target, content);
      try { await run(process.execPath, ["--check", target], { timeout: 10000 }); }
      catch (e) { add(name, `JavaScript syntax failed: ${String(e.stderr || e.message).slice(0, 600)}`); }
    }
  } finally { await rm(folder, { recursive: true, force: true }); }
  if (!Array.isArray(build?.acceptance) || !build.acceptance.length || !Array.isArray(build?.limitations)) add("acceptance", "honest acceptance report and unresolved limitations required; never claim unperformed playtests");
  return { ok: !errors.length, errors, checks: ["file contract", "asset references", "runtime integration", "JavaScript parse (no execution)"], config, conceptCount: concepts.length };
}

// Defense in depth at play time, including against computed remote URLs which
// a source-text scan cannot reliably classify. No inline executable content.
export function staticGameHTML(html){
 const policy="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'";
 const tag=`<meta http-equiv="Content-Security-Policy" content="${policy}">`;
 return /<head\b[^>]*>/i.test(html)?html.replace(/<head\b[^>]*>/i,m=>m+tag):html.replace(/^(<!doctype[^>]*>)?/i,m=>m+tag);
}
