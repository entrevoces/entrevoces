// ENTRE VOCES — Meta Model API adapter (Hackathon Stage-1 surface)
// Real integration, honestly caged:
//  - With META_API_KEY set, calls Meta Model API (Wonder = semantic/design,
//    Spark = fast structured, Voice Transcribe = speech observation).
//  - Without a key (local demo, judging offline), deterministic local
//    generators run and every response is labeled provider:"local-template".
//    We never fake a Meta call. The wire, prompts, and validation are identical
//    either way, so flipping the key flips only the author, not the contract.
// Env: META_API_KEY, META_BASE_URL (default https://api.meta.ai/v1 — confirm
// against final hackathon docs), META_WONDER_MODEL, META_SPARK_MODEL.
const BASE = (process.env.META_BASE_URL || "https://api.meta.ai/v1").replace(/\/$/, "");
const KEY = process.env.META_API_KEY || "";
const WONDER = process.env.META_WONDER_MODEL || "muse-wonder";
const SPARK = process.env.META_SPARK_MODEL || "muse-spark";

export const aiLog = []; // { ts, task, provider, model, ms, ok } — surfaced at /v1/ai/log
function log(task, provider, model, ms, ok) {
  aiLog.unshift({ ts: new Date().toISOString(), task, provider, model, ms, ok });
  if (aiLog.length > 50) aiLog.pop();
}
export function metaStatus() {
  return {
    configured: Boolean(KEY),
    baseUrl: BASE,
    models: { wonder: WONDER, spark: SPARK, voice: "muse-voice-transcribe" },
    note: KEY ? "Meta Model API key present — live calls enabled." : "No META_API_KEY — deterministic local templates answer, labeled as such. Set the key to go live with zero code change.",
    recentCalls: aiLog.slice(0, 8),
  };
}

async function metaChat({ model, system, user, task }) {
  const t0 = Date.now();
  if (!KEY) { log(task, "local-template", model, 0, true); return null; }
  try {
    const r = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: 0.4 }),
      signal: AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined,
    });
    if (!r.ok) throw new Error(`Meta ${r.status}`);
    const body = await r.json();
    log(task, "meta", model, Date.now() - t0, true);
    return body.choices?.[0]?.message?.content || "";
  } catch (e) {
    log(task, "meta-failed-fallback", model, Date.now() - t0, false);
    console.error("[meta] call failed, local fallback:", e.message);
    return null;
  }
}
function parseJSON(text, fallback) {
  if (!text) return fallback;
  try { return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); } catch { return fallback; }
}

/** Wonder: invent a game concept for a gap, with self-critique (spec §12). */
export async function inventGame({ audience, gap, domain, coverage, weakest }) {
  const fallback = localInvent({ audience, gap, domain, coverage, weakest });
  const text = await metaChat({
    model: WONDER, task: "invent-game",
    system: "You invent original learning games for professional interpreters. Return ONLY JSON: {name, hook, coreLoop, decisions, evidence, whyThisAudience, scores:{originality,evidenceQuality,feasibility}, risks}. No quiz reskins. The interaction must differ from card quizzes.",
    user: `Audience: ${audience}. Gap: ${gap}. Domain: ${domain.label.en} (${domain.domainId}). Coverage: ${JSON.stringify(coverage)}. Weakest concept: ${weakest ? `${weakest.terms.en.term} (${weakest.conceptId})` : "none yet"}. Invent one game concept that serves this gap.`,
  });
  if (!text) return { ...fallback, provider: "local-template", model: WONDER };
  return { ...parseJSON(text, fallback), provider: "meta", model: WONDER, provenance: { audience, gap, domainId: domain.domainId, weakestConceptId: weakest?.conceptId || null } };
}
function localInvent({ audience, gap, domain, coverage, weakest }) {
  const area = [...(coverage || [])].sort((a, b) => a.meanEstimate - b.meanEstimate)[0];
  const templates = [
    { name: "Turn Table Sprint", hook: "Two speakers race the interpreter's notebook: render in chunks or watch meaning pile up at the door.", coreLoop: "Hear chunk → jot symbols → render chunk → speaker reacts → next chunk lands faster.", decisions: "Clarify now or bank the ambiguity? Spend a token or trust the notes?" },
    { name: "Bridge of Beads", hook: "Each idea unit is a bead on a string across a gorge. Drop one and the bridge — and the patient — feels it.", coreLoop: "Catch idea beads in order → string them → walk the client across → repair the gap that wobbled.", decisions: "Reach for the fast bead or secure the load-bearing number first?" },
    { name: "Second Hearing", hook: "You interpret yesterday's turn again, side-by-side with your first attempt. Beat your ghost, kindly.", coreLoop: "Render → sleep (spaced) → re-render blind → diff the two → repair the segment that moved.", decisions: "Trust memory or rebuild from notes? Where did certainty inflate?" },
  ];
  const t = templates[((audience || "").length + (gap || "").length) % templates.length];
  return {
    ...t,
    evidence: `Engine stages for ${weakest?.terms.en.term || "core terminology"} in ${area?.label.en || domain.label.en}; fidelity + note-craft, not clicks.`,
    whyThisAudience: `Built for ${audience}: gap "${gap}" in ${domain.label.en}, weakest coverage first.`,
    scores: { originality: 74, evidenceQuality: 82, feasibility: 88 },
    risks: "Template instance — full bespoke mechanics need a build pass; labeled honestly as playable-template vs. specification.",
    provenance: { audience, gap, domainId: domain.domainId, weakestConceptId: weakest?.conceptId || null },
  };
}

/** Spark: fast structured enrichment draft (always inferred until validated). */
export async function enrichConceptDraft({ domain, seedText }) {
  const fallback = {
    draft: { suggestedTerms: [], distinctions: [], note: "Local template: author terms in the Console; Spark drafts arrive with META_API_KEY." },
    inferred: true,
  };
  const text = await metaChat({
    model: SPARK, task: "enrich-concept",
    system: "You draft interpreter-training terminology. Return ONLY JSON {suggestedTerms:[{en,es,zh}], distinctions:[{contrast,difference}], misconception:{tag,description}}. Mark nothing as sourced fact; drafts only.",
    user: `Domain: ${domain.label.en}. Seed idea: ${seedText}. Draft terminology with Spanish and Mandarin renderings.`,
  });
  if (!text) return { ...fallback, provider: "local-template", model: SPARK };
  return { draft: parseJSON(text, fallback.draft), inferred: true, provider: "meta", model: SPARK };
}

/** Voice: transcription observation wrapper (browser Web Speech is the offline path). */
export function voiceObservation({ transcript, confidence }) {
  // Meta Voice Transcribe is called by the CPE client integration where a
  // server key exists; the observation contract is identical for browser ASR.
  return {
    transcript: transcript || "",
    confidence: confidence == null ? 0.5 : confidence,
    provider: KEY ? "meta-ready (browser ASR observed locally in this build)" : "browser-asr / local",
    disputable: true,
    note: "A transcript is an observation, not ground truth. Low confidence routes to dispute/diagnostic, never silent scoring.",
  };
}
