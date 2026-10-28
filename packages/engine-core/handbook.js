// Topical professional handbook contract. Host owns structure/grounding gates;
// knowledge/design agent owns the editorial outline, chapter prose and audit judgement.
// The handbook is the primary reading experience; structured concepts/claims/
// graph remain derived teaching data in the appendices, not the book itself.
import { validateCitations } from "./knowledge.js";

export const HANDBOOK_VERSION = "1.0";
export const HANDBOOK_ELEMENTS = ["conceptual-model", "workflow", "distinction", "terms-in-context", "worked-example", "misconception", "application", "scope-limit"];
export const HANDBOOK_DEPTHS = ["focused", "substantial", "book-scale"];
const object = (x) => x && typeof x === "object" && !Array.isArray(x);
const text = (x) => typeof x === "string" && x.trim().length > 0;
const list = (x) => Array.isArray(x) ? x : [];
const slug = (x) => typeof x === "string" && /^[a-z0-9][a-z0-9-]{2,48}$/.test(x);
const words = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;

/** knowledge/design agent-authored editorial outline. Organized by real work, not alphabetically. */
export function validateHandbookPlan(plan, { draft, passages } = {}) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  if (!object(plan)) return { ok: false, errors: [{ field: "handbookPlan", message: "structured handbook plan required" }] };
  if (!text(plan.title) || plan.title.length < 8) add("handbookPlan.title", "a specific handbook title is required");
  if (!text(plan.scopeStatement) || plan.scopeStatement.length < 120) add("handbookPlan.scopeStatement", "state honestly what this handbook covers and does not cover, grounded in the supplied source");
  if (!text(plan.organizingPrinciple) || plan.organizingPrinciple.length < 60) add("handbookPlan.organizingPrinciple", "explain the work-based organization; a dictionary or concept list is not a handbook");
  if (!text(plan.readingPath) || plan.readingPath.length < 40) add("handbookPlan.readingPath", "describe how a practitioner should read/use this handbook");
  if (!Array.isArray(plan.scopeLimits) || !plan.scopeLimits.length) add("handbookPlan.scopeLimits", "explicit scope limits required; sparse sources must not claim complete domain coverage");
  if (!Array.isArray(plan.missingTopics)) add("handbookPlan.missingTopics", "explicit missing-topics array required (topics the work needs but this source does not support)");
  for (const [i, m] of list(plan.missingTopics).entries()) {
    if (!text(m?.topic) || !text(m?.reason) || m.reason.length < 30) add(`handbookPlan.missingTopics[${i}]`, "name the missing topic and why it cannot be written from this source");
    if (!text(m?.neededSource)) add(`handbookPlan.missingTopics[${i}].neededSource`, "name what source would be needed to cover this topic");
  }
  const chapters = list(plan.chapters);
  if (!chapters.length || chapters.length > 48) add("handbookPlan.chapters", "1–48 chapters required; length follows the source, not a quota");
  const conceptIds = new Set(list(draft?.concepts).map((c) => c.conceptId));
  const passageIds = new Set(list(passages).map((p) => p.passageId));
  const seen = new Set();
  const covered = new Set();
  for (const [i, ch] of chapters.entries()) {
    const f = `handbookPlan.chapters[${i}]`;
    if (!slug(ch?.chapterId) || seen.has(ch.chapterId)) add(`${f}.chapterId`, "unique chapter slug required");
    seen.add(ch?.chapterId);
    if (!text(ch?.title) || ch.title.length < 8) add(`${f}.title`, "chapter title required");
    if (!text(ch?.purpose) || ch.purpose.length < 60) add(`${f}.purpose`, "state the work problem this chapter helps the reader perform or judge");
    if (!text(ch?.workContext) || ch.workContext.length < 30) add(`${f}.workContext`, "name the real work setting/task this chapter serves");
    if (!list(ch?.conceptIds).length || ch.conceptIds.some((id) => !conceptIds.has(id))) add(`${f}.conceptIds`, "chapters must map to synthesized concepts");
    if (!list(ch?.passageIds).length || ch.passageIds.some((id) => !passageIds.has(id))) add(`${f}.passageIds`, "chapters must map to supplied passages");
    if (!list(ch?.plannedElements).length || ch.plannedElements.some((e) => !HANDBOOK_ELEMENTS.includes(e))) add(`${f}.plannedElements`, `planned elements must be chosen from: ${HANDBOOK_ELEMENTS.join(", ")}`);
    if (!HANDBOOK_DEPTHS.includes(ch?.targetDepth)) add(`${f}.targetDepth`, "targetDepth: focused | substantial | book-scale, chosen from source density");
    if (!text(ch?.rationale) || ch.rationale.length < 40) add(`${f}.rationale`, "explain why this chapter earns its place and depth in this source");
    list(ch?.conceptIds).forEach((id) => covered.add(id));
  }
  // Every synthesized concept with sourced claims must be reachable in the book.
  for (const c of list(draft?.concepts)) {
    if (list(c.claims).length && !covered.has(c.conceptId)) add("handbookPlan.chapters", `concept ${c.conceptId} is in no chapter; the handbook would silently drop sourced material`);
  }
  return { ok: !errors.length, errors };
}

const SYNTHETIC_LABEL = /synthetic|illustrative|invented example|teaching example/i;

/** One checkpointed chapter. Prose is knowledge/design agent's; host checks grounding + labels. */
export function validateHandbookChapter(chapter, { planChapter, passages } = {}) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  if (!object(chapter)) return { ok: false, errors: [{ field: "handbookChapter", message: "structured chapter required" }] };
  if (chapter.chapterId !== planChapter?.chapterId) add("handbookChapter.chapterId", "chapter must implement its planned chapterId");
  if (!text(chapter.title)) add("handbookChapter.title", "chapter title required");
  const md = typeof chapter.markdown === "string" ? chapter.markdown : "";
  const minChars = planChapter?.targetDepth === "focused" ? 500 : planChapter?.targetDepth === "book-scale" ? 7000 : 2500;
  if (md.trim().length < minChars) add("handbookChapter.markdown", `chapter prose too thin for ${planChapter?.targetDepth || "planned"} depth (minimum ${minChars} characters); deepen from the source or downgrade the plan — do not pad`);
  if (/^\s*(#+\s*)?(definition|term)\s*:/im.test(md) && words(md) < 900) add("handbookChapter.markdown", "reads as a dictionary entry, not a handbook chapter");
  validateCitations(chapter.citations, passages).forEach((e) => add("handbookChapter.citations", e));
  for (const c of list(chapter.citations)) {
    if (!md.includes(c.passageId)) add("handbookChapter.markdown", `citation ${c.passageId} must be marked inline in the prose as [${c.passageId}]`);
    if (planChapter && !list(planChapter.passageIds).includes(c.passageId)) add("handbookChapter.citations", `passage ${c.passageId} is outside this chapter's planned evidence`);
  }
  if (!list(chapter.citations).length) add("handbookChapter.citations", "at least one exact source citation is required");
  if (!list(chapter.conceptIds).length || chapter.conceptIds.some((id) => !list(planChapter?.conceptIds).includes(id))) add("handbookChapter.conceptIds", "chapter concepts must stay within the planned chapter scope");
  const missingPlanned = list(planChapter?.conceptIds).filter((id) => !list(chapter.conceptIds).includes(id));
  if (planChapter && missingPlanned.length) add("handbookChapter.conceptIds", `chapter ${planChapter.chapterId} declares only a subset of its planned concepts; it must actually cover every planned substantive concept or the plan must be revised — missing: ${missingPlanned.join(", ")}`);
  // Synthetic / inferred teaching material must be labeled where it appears.
  const lines = md.split("\n");
  lines.forEach((line, i) => {
    if (/\b(worked example|example scenario|teaching example|practice vignette)\b/i.test(line)) {
      const window = lines.slice(i, i + 4).join("\n");
      if (!SYNTHETIC_LABEL.test(window) && !/\[p\d/.test(window)) add("handbookChapter.markdown", "worked/teaching examples must be labeled synthetic or carry an exact source citation");
    }
    if (/\b(translation|equivalent)\b.*[:：]/i.test(line) && /["“][^"”]{2,}["”]/.test(line) && !/inferred/i.test(line) && !/\[p\d/.test(line)) {
      add("handbookChapter.markdown", "proposed translations/equivalents must be labeled inferred or carry an exact source citation; never present them as sourced");
    }
  });
  if (!text(chapter.scopeNote) || chapter.scopeNote.length < 30) add("handbookChapter.scopeNote", "each chapter ends with an honest scope note: what it does not establish");
  return { ok: !errors.length, errors };
}

/** Independent editorial audit gate (semantic verdict is knowledge/design agent's, in a separate call). */
export function validateHandbookAudit(audit) {
  const errors = [];
  if (!object(audit) || !["accept", "repair", "reject"].includes(audit.verdict)) errors.push({ field: "handbookAudit.verdict", message: "verdict accept|repair|reject required" });
  if (!Array.isArray(audit?.findings)) errors.push({ field: "handbookAudit.findings", message: "findings array required" });
  for (const f of list(audit?.findings)) if (!["blocker", "major", "minor"].includes(f?.severity) || !text(f?.message)) errors.push({ field: "handbookAudit.findings", message: "severity and actionable message required" });
  if (!Array.isArray(audit?.chapterFindings)) errors.push({ field: "handbookAudit.chapterFindings", message: "per-chapter findings array required (may be empty)" });
  for (const f of list(audit?.chapterFindings)) if (!slug(f?.chapterId) || !["blocker", "major", "minor"].includes(f?.severity) || !text(f?.message)) errors.push({ field: "handbookAudit.chapterFindings", message: "chapterId, severity and message required" });
  if (!Array.isArray(audit?.missingTopics)) errors.push({ field: "handbookAudit.missingTopics", message: "missing topics must be exposed explicitly" });
  if (!Array.isArray(audit?.limitations)) errors.push({ field: "handbookAudit.limitations", message: "limitations array required" });
  return { ok: !errors.length, errors };
}

/**
 * Final composition gate, run on the assembled book (not per chapter): every
 * planned chapter exists exactly once, each chapter declares the full set of
 * substantive concepts its plan assigned it, and the union of written chapters
 * covers every planned concept and every sourced synthesized concept. This
 * enforces planned coverage, never an arbitrary book length.
 */
export function validateHandbookComposition(plan, chapters, draft) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  if (!object(plan) || !Array.isArray(chapters)) return { ok: false, errors: [{ field: "handbookComposition", message: "plan and written chapters required" }] };
  const written = new Map();
  for (const ch of list(chapters)) {
    if (!text(ch?.chapterId)) add("handbookComposition", "written chapter without a chapterId");
    else if (written.has(ch.chapterId)) add("handbookComposition", `chapter ${ch.chapterId} is written more than once`);
    else written.set(ch.chapterId, ch);
  }
  const plannedConcepts = new Set();
  for (const pc of list(plan.chapters)) {
    list(pc?.conceptIds).forEach((id) => plannedConcepts.add(id));
    const ch = written.get(pc?.chapterId);
    if (!ch) { add("handbookComposition", `planned chapter ${pc?.chapterId} was not written`); continue; }
    const missing = list(pc?.conceptIds).filter((id) => !list(ch.conceptIds).includes(id));
    if (missing.length) add("handbookComposition", `chapter ${pc.chapterId} does not cover planned concepts: ${missing.join(", ")} — deepen the chapter or revise the plan; do not drop them silently`);
    const extra = list(ch.conceptIds).filter((id) => !list(pc?.conceptIds).includes(id));
    if (extra.length) add("handbookComposition", `chapter ${pc.chapterId} declares concepts outside its plan: ${extra.join(", ")}`);
  }
  for (const id of written.keys()) if (!list(plan.chapters).some((pc) => pc?.chapterId === id)) add("handbookComposition", `written chapter ${id} is not in the plan`);
  const covered = new Set(list(chapters).flatMap((c) => list(c?.conceptIds)));
  for (const id of plannedConcepts) if (!covered.has(id)) add("handbookComposition", `planned concept ${id} is covered by no written chapter`);
  if (draft) for (const c of list(draft.concepts)) if (list(c?.claims).length && !covered.has(c.conceptId)) add("handbookComposition", `sourced concept ${c.conceptId} is covered by no written chapter`);
  return { ok: !errors.length, errors };
}

export function handbookMetrics(plan, chapters, draft, passages) {
  const md = list(chapters).map((c) => c.markdown || "").join("\n");
  const cited = new Set(list(chapters).flatMap((c) => list(c.citations).map((x) => x.passageId)));
  const coveredConcepts = new Set(list(chapters).flatMap((c) => list(c.conceptIds)));
  return {
    chapters: list(chapters).length,
    words: words(md),
    characters: md.length,
    citedPassages: cited.size,
    passages: list(passages).length,
    conceptsInChapters: coveredConcepts.size,
    plannedConcepts: new Set(list(plan?.chapters).flatMap((c) => list(c.conceptIds))).size,
    missingPlannedConceptIds: [...new Set(list(plan?.chapters).flatMap((c) => list(c.conceptIds)))].filter((id) => !coveredConcepts.has(id)),
    concepts: list(draft?.concepts).length,
    missingTopics: list(plan?.missingTopics).length,
    syntheticLabels: (md.match(/synthetic|illustrative teaching/gi) || []).length,
  };
}

const cites = (cs) => list(cs).map((c) => `[${c.passageId}] “${c.quote}”`).join("; ");
const quoteLines = (s) => String(s || "").split("\n").map((line) => `> ${line}`).join("\n");

/** Assemble the cohesive book. Chapter prose is verbatim knowledge/design agent; appendices are derived teaching data. */
export function renderHandbook({ plan, chapters, draft, source, context, passages, knowledgeReview, handbookAudit, metrics, knowledgeMetrics: km }) {
  const L = [];
  L.push(`# ${plan.title}`, "");
  if (plan.subtitle) L.push(`**${plan.subtitle}**`, "");
  L.push(`A topical professional handbook built from one named source. Author: knowledge/design agent (authoring agents). Editorially audited in a separate knowledge/design agent call. Human review is still required before teaching use. Handbook contract: ${HANDBOOK_VERSION}.`, "");
  L.push("## About this handbook", "", plan.scopeStatement, "", `**Who it is for.** ${context?.audience || "The configured audience."}`, "", `**The work it serves.** ${context?.goals || ""}`, "", `**How it is organized.** ${plan.organizingPrinciple}`, "", `**How to read it.** ${plan.readingPath}`, "");
  L.push("## Scope, limits and missing topics — read first", "");
  for (const s of plan.scopeLimits) L.push(`- ${s}`);
  L.push("");
  if (list(plan.missingTopics).length) {
    L.push("This source does **not** support the following topics. They are exposed, not filled with invented coverage:", "");
    for (const m of plan.missingTopics) L.push(`- **${m.topic}** — ${m.reason} Needed source: ${m.neededSource}`);
    L.push("");
  }
  L.push(`Source: **${source.title}** (${source.publisher}${source.publishedOrRevised ? `, ${source.publishedOrRevised}` : ""}). Authority: ${source.authority}. Permitted use: ${source.permittedUse}.`, "");
  if (source.limitations) L.push(`Source limitations: ${source.limitations}`, "");
  L.push("Conventions: `[p…]` marks the exact supplied passage behind a claim. Material labeled **synthetic** or **inferred** is teaching design, not sourced fact. Proposed translations labeled inferred require human approval.", "");
  L.push("## Contents", "");
  list(plan.chapters).forEach((ch, i) => { const written = list(chapters).find((c) => c.chapterId === ch.chapterId); L.push(`${i + 1}. ${written?.title || ch.title} — ${ch.purpose}`); });
  L.push("");
  list(plan.chapters).forEach((ch, i) => {
    const written = list(chapters).find((c) => c.chapterId === ch.chapterId);
    L.push(`## Chapter ${i + 1} · ${written?.title || ch.title}`, "");
    if (written) {
      L.push(written.markdown.trim(), "", `*Chapter scope note.* ${written.scopeNote}`, "", `*Evidence in this chapter.* ${cites(written.citations)}`, "");
    } else L.push("*Chapter not written.*", "");
  });
  // Derived teaching data — useful for games/assessment, not the reading experience.
  L.push("## Appendix A · Concept and term index (derived teaching data)", "", "Structured concepts extracted alongside the handbook. Use this index to find terms in context in the chapters above; it is not a substitute for reading them.", "");
  for (const c of list(draft.concepts)) {
    L.push(`### ${c.terms.en.term} [${c.conceptId}]`, "", c.definition.en, "", `Why it matters: ${c.whyItMatters}`, "", `Areas: ${list(c.areaIds).join(", ")} · Difficulty prior: ${c.difficulty}/5 · Competences: ${list(c.competences).join(", ")}`, "");
    for (const [lang, t] of Object.entries(c.terms || {})) L.push(`- ${lang}: ${t.term}${t.alternatives?.length ? ` (also: ${t.alternatives.join(" / ")})` : ""} — ${t.register}${t.inferred ? " — inferred translation, review required" : ""}`);
    L.push("");
    if (list(c.distinctions).length) { L.push("Consequential distinctions:", "", ...c.distinctions.map((d) => `- Versus **${d.contrast}**: ${d.difference}${d.inferred ? " [inferred teaching contrast]" : ""}`), ""); }
    if (list(c.misconceptions).length) { L.push("Misconceptions and diagnosis:", "", ...c.misconceptions.map((m) => `- **${m.tag}**: ${m.description} Diagnostic: ${m.diagnosticPrompt}${m.inferred ? " [inferred teaching design]" : ""}`), ""); }
    if (list(c.examples).length) { L.push("Examples:", "", ...c.examples.map((e) => `- [${e.areaId}] ${e.en}${e.inferred ? " [synthetic training example]" : ""}`), ""); }
    if (list(c.unresolved).length) L.push("Unresolved:", "", ...c.unresolved.map((u) => `- ${u}`), "");
  }
  if (list(draft.relationships).length) {
    L.push("## Appendix B · Typed relationship graph (derived)", "");
    for (const e of draft.relationships) L.push(`- ${e.sourceId} → ${e.type} → ${e.targetId}: ${e.explanation}${e.inferred ? " [inferred — review required]" : ""}`);
    L.push("");
  }
  if (list(draft.procedures).length) {
    L.push("## Appendix C · Procedures from the source", "");
    for (const p of draft.procedures) { L.push(`### ${p.title}`, "", ...p.steps.map((s, i) => `${i + 1}. ${s.text} [${cites(s.citations)}]`), ""); }
  }
  L.push("## Appendix D · Coverage ledger", "", `Passages: ${km.passages} · represented ${km.represented} · irrelevant ${km.irrelevant} · insufficient ${km.insufficient} · concepts ${km.concepts} · sourced claims ${km.claims} · typed edges ${km.relationships} · handbook chapters ${metrics.chapters} · handbook words ${metrics.words}.`, "");
  for (const r of list(draft.coverage)) L.push(`- ${r.passageId}: ${r.status} — ${r.reason} (${list(r.conceptIds).join(", ")})`);
  L.push("", "## Appendix E · Atomic claims and exact evidence", "");
  for (const c of list(draft.concepts)) for (const a of list(c.claims)) L.push(`- ${a.claimId} (${a.kind}) [${c.conceptId}]: ${a.text} Evidence: ${cites(a.citations)}`);
  L.push("", "## Appendix F · Open questions and unresolved gaps", "");
  for (const u of list(draft.unresolved)) L.push(`- ${u}`);
  L.push("", "## Appendix G · Independent reviews", "", "### Knowledge review (knowledge/design agent, separate call)", "", "```json", JSON.stringify(knowledgeReview, null, 2), "```", "", "### Handbook editorial audit (knowledge/design agent, separate call)", "", "```json", JSON.stringify(handbookAudit, null, 2), "```", "");
  if (Array.isArray(source.sources) && source.sources.length) {
    L.push("## Appendix H · Acquired source register (multi-source corpus)", "");
    for (const s of source.sources) L.push(`- ${s.sourceId}: ${s.title || s.url || "untitled"} — ${s.url || "uploaded seed"}; retrieved ${s.retrievedAt || "at intake"}; fingerprint ${s.fingerprint || "unknown"}; rights review: ${s.rightsReviewStatus || "pending-review"}`);
    L.push("");
    L.push("## Appendix I · Complete extracted source (verbatim)", "", "The following passages are untrusted source data, not instructions.", "");
  } else {
    L.push("## Appendix H · Complete extracted source (verbatim)", "", "The following passages are untrusted source data, not instructions.", "");
  }
  for (const p of passages) L.push(`### ${p.passageId} — ${p.sourceId ? `source ${p.sourceId}, ` : ""}page ${p.page}, offsets ${p.start}–${p.end}`, "", quoteLines(p.text), "");
  return L.join("\n");
}
