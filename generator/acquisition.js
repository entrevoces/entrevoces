// Host-side research acquisition: SSRF-safe public retrieval, bounded
// extraction and corpus bookkeeping. No semantic authorship lives here —
// knowledge/design agent authors the blueprint, search queries and coverage judgements;
// this module only moves bytes safely and records provenance honestly.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import { indexSource } from "../packages/engine-core/knowledge.js";

const run = promisify(execFile);
const fail = (message, code, status = 422) => Object.assign(new Error(message), { code, status });

export const ACQUISITION_LIMITS = {
  rounds: { min: 1, max: 5, default: 3 },
  sources: { min: 1, max: 32, default: 16 },
  characters: { min: 20000, max: 1000000, default: 600000 },
  bytesPerSource: 5 * 1024 * 1024,
  timeoutMs: 20000,
  redirects: 5,
};

const clampInt = (value, { min, max, default: dflt }) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, Math.trunc(n)));
};

/** Explicit, bounded acquisition budgets. Recorded on the job, never hidden. */
export function normalizeAcquisitionBudgets(input = {}) {
  const b = input && typeof input === "object" ? input : {};
  return {
    maxRounds: clampInt(b.maxRounds, ACQUISITION_LIMITS.rounds),
    maxSources: clampInt(b.maxSources, ACQUISITION_LIMITS.sources),
    maxCharacters: clampInt(b.maxCharacters, ACQUISITION_LIMITS.characters),
    maxBytesPerSource: ACQUISITION_LIMITS.bytesPerSource,
    timeoutMs: ACQUISITION_LIMITS.timeoutMs,
    maxRedirects: ACQUISITION_LIMITS.redirects,
  };
}

export function isPrivateIPv4(ip) {
  const parts = String(ip).split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

export function isPrivateIPv6(ip) {
  const v = String(ip).toLowerCase();
  // Only globally routable unicast is eligible. This also excludes encoded
  // IPv4-mapped/compatible, NAT64, loopback and local ranges without relying
  // on a textual dotted-quad spelling that an attacker can avoid.
  if (!/^[23][0-9a-f]{0,3}:/.test(v) || v.startsWith("2001:db8:")) return true;
  if (v === "::1" || v === "::") return true;
  if (v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb")) return true; // fe80::/10
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // fc00::/7
  if (v.startsWith("ff")) return true; // multicast
  const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

export const isBlockedAddress = (address) => {
  const kind = isIP(address);
  if (kind === 4) return isPrivateIPv4(address);
  if (kind === 6) return isPrivateIPv6(address);
  return true;
};

const defaultLookup = async (hostname) => {
  const rows = await dnsLookup(hostname, { all: true, verbatim: true });
  return rows.map((r) => r.address);
};

async function pinnedPublicFetch(rawUrl, options) {
  const url = new URL(rawUrl), host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : await defaultLookup(host);
  if (!addresses.length || addresses.some(isBlockedAddress)) throw fail("Source address changed to a non-public destination before connection.", "retrieval-ssrf");
  // Pin the checked IP on the actual TLS connection. Checking DNS and then
  // asking fetch to resolve the name again would permit DNS rebinding.
  const address=addresses[0],family=isIP(address);
  return new Promise((resolve,reject)=>{
    const request=httpsRequest(url,{method:'GET',headers:options.headers,signal:options.signal,agent:false,lookup:(_host,opts,callback)=>opts.all?callback(null,[{address,family}]):callback(null,address,family)},response=>{
      const headers=new Headers();for(const [name,value]of Object.entries(response.headers))if(value!=null)headers.set(name,Array.isArray(value)?value.join(', '):value);
      resolve(new Response([204,304].includes(response.statusCode)?null:Readable.toWeb(response),{status:response.statusCode,headers}));
    });
    request.on('error',reject);request.end();
  });
}

/**
 * Validate one public HTTPS URL, including DNS resolution. Every redirect
 * target must pass this again — a safe first hop never vouches for the next.
 * `lookup` is injectable so tests never touch the network.
 */
export async function assertPublicHttpsUrl(rawUrl, { lookup = defaultLookup } = {}) {
  let url;
  try { url = new URL(String(rawUrl)); } catch { throw fail(`Refused malformed source URL: ${String(rawUrl).slice(0, 120)}`, "retrieval-url"); }
  if (url.protocol !== "https:") throw fail(`Refused non-HTTPS source URL (${url.protocol || "no protocol"}): only public https:// sources are retrieved.`, "retrieval-protocol");
  if (url.username || url.password) throw fail("Refused source URL containing credentials; author/provider credentials are never attached to source retrieval.", "retrieval-credentials");
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw fail(`Refused local source host: ${host}`, "retrieval-ssrf");
  const literal = isIP(host.replace(/^\[|\]$/g, ""));
  if (literal) {
    if (isBlockedAddress(host.replace(/^\[|\]$/g, ""))) throw fail(`Refused non-public source address: ${host}`, "retrieval-ssrf");
    return url;
  }
  let addresses;
  try { addresses = await lookup(host); } catch { throw fail(`Could not resolve source host ${host}; retrieval refused rather than guessed.`, "retrieval-dns"); }
  if (!Array.isArray(addresses) || !addresses.length) throw fail(`Source host ${host} resolved to no addresses; retrieval refused.`, "retrieval-dns");
  for (const address of addresses) if (isBlockedAddress(address)) throw fail(`Refused source host ${host}: it resolves to a non-public address.`, "retrieval-ssrf");
  return url;
}

async function readBounded(body, maxBytes) {
  if (!body) return Buffer.alloc(0);
  if (typeof body.getReader === "function") {
    const reader = body.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { try { await reader.cancel(); } catch { /* bounded refusal */ } throw fail(`Source exceeds the ${maxBytes}-byte per-source retrieval limit; nothing was partially accepted.`, "retrieval-too-large"); }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }
  const buf = Buffer.from(await body.arrayBuffer());
  if (buf.length > maxBytes) throw fail(`Source exceeds the ${maxBytes}-byte per-source retrieval limit; nothing was partially accepted.`, "retrieval-too-large");
  return buf;
}

/**
 * Retrieve one public source. Manual redirects, every hop SSRF-checked,
 * bounded bytes/time, and no Authorization or cookie headers are ever sent.
 * `fetchImpl` is injectable for no-network tests.
 */
export async function retrievePublicSource(rawUrl, { fetchImpl = null, lookup = undefined, maxBytes = ACQUISITION_LIMITS.bytesPerSource, timeoutMs = ACQUISITION_LIMITS.timeoutMs, maxRedirects = ACQUISITION_LIMITS.redirects } = {}) {
  const doFetch = fetchImpl || pinnedPublicFetch;
  if (typeof doFetch !== "function") throw fail("No fetch implementation is available for source retrieval.", "retrieval-unavailable", 503);
  const redirects = [];
  let current = String(rawUrl);
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = await assertPublicHttpsUrl(current, lookup ? { lookup } : {});
    let response;
    try {
      response = await doFetch(url.href, { method: "GET", redirect: "manual", headers: { Accept: "application/pdf, text/html, text/plain, text/markdown;q=0.9, */*;q=0.1", "User-Agent": "EntreVoces-Authoring/1.0 (research acquisition)" }, signal: AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined });
    } catch (e) {
      if (e?.code?.startsWith?.("retrieval-")) throw e;
      throw fail(`Source retrieval failed for ${url.hostname}: ${e.message}`, "retrieval-failed");
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel?.();
      const location = response.headers?.get?.("location");
      if (!location) throw fail(`Source redirect from ${url.hostname} had no Location; retrieval refused.`, "retrieval-redirect");
      if (hop === maxRedirects) throw fail(`Source exceeded ${maxRedirects} redirects; retrieval refused.`, "retrieval-redirect");
      const next = new URL(location, url).href;
      redirects.push({ from: url.href, to: next, status: response.status });
      current = next;
      continue;
    }
    if (!response.ok) throw fail(`Source retrieval returned HTTP ${response.status} for ${url.hostname}; search availability is not proof of retrieval.`, "retrieval-http");
    const declared = Number(response.headers?.get?.("content-length") || 0);
    if (declared > maxBytes) throw fail(`Source exceeds the ${maxBytes}-byte per-source retrieval limit; nothing was partially accepted.`, "retrieval-too-large");
    const bytes = await readBounded(response.body, maxBytes);
    return { finalUrl: url.href, status: response.status, contentType: String(response.headers?.get?.("content-type") || "").toLowerCase(), bytes, redirects };
  }
  throw fail("Source retrieval exceeded the redirect limit.", "retrieval-redirect");
}

/** Strip markup to readable text. Source HTML is data; it is never executed. */
export function htmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|header|footer|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/** Extract text from retrieved PDF bytes with Poppler, as uploads are. */
export async function extractPdfBytes(bytes) {
  const folder = await mkdtemp(join(tmpdir(), "ev-research-"));
  try {
    const path = join(folder, "source.pdf");
    await writeFile(path, bytes, { mode: 0o600 });
    const result = await run(process.env.PDFTOTEXT_PATH || "pdftotext", ["-layout", "-enc", "UTF-8", path, "-"], { timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
    return result.stdout;
  } catch (e) {
    throw fail(e.code === "ENOENT" ? "PDF extraction unavailable on this host (Poppler/pdftotext missing); the retrieved PDF was not accepted as text." : "Retrieved PDF could not be extracted (encryption, corruption or image-only scan). It was recorded as a retrieval/extraction failure, not silently skipped.", "retrieval-extraction");
  } finally { await rm(folder, { recursive: true, force: true }); }
}

/** Turn retrieved bytes into page text. Tables stay flattened text, never asserted structure. */
export async function extractRetrievedText({ bytes, contentType }) {
  if (bytes.subarray(0, 5).equals(Buffer.from("%PDF-")) || contentType.includes("application/pdf")) {
    return { text: await extractPdfBytes(bytes), extractor: "pdftotext-layout", warnings: [] };
  }
  if (contentType.includes("text/html") || contentType.includes("application/xhtml")) {
    const text = htmlToText(bytes.toString("utf8"));
    return { text, extractor: "html-text", warnings: ["HTML was reduced to readable text; tables, columns and layout were flattened and must not be treated as structured data without inspection."] };
  }
  if (contentType.includes("text/") || contentType.includes("application/json") || !contentType) {
    return { text: bytes.toString("utf8"), extractor: "utf8", warnings: [] };
  }
  throw fail(`Unsupported retrieved content type (${contentType}); only PDF, HTML and text sources are accepted.`, "retrieval-content-type");
}

export const fingerprintBytes = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * Index one accepted source into corpus passages. Passage IDs are namespaced
 * by source so multi-source citations keep their source identity downstream:
 * the prefix travels with the passage record (`sourceId` on every passage).
 */
export function indexCorpusSource({ sourceId, pages }) {
  const raw = indexSource(pages);
  return raw.map((p) => ({ ...p, passageId: `${sourceId}--${p.passageId}`, sourceId }));
}

/** Distinct source families (hosts) behind a set of passage IDs, for triangulation. */
export function sourceFamiliesForPassages(passageIds, sources) {
  const byPassage = new Map();
  for (const s of sources || []) for (const pid of s.passageIds || []) byPassage.set(pid, s);
  const families = new Set();
  for (const pid of passageIds || []) {
    const s = byPassage.get(pid);
    if (s) families.add(s.family || s.host || s.sourceId);
  }
  return [...families];
}
