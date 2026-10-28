// Bounded orchestration for large knowledge sources. Host code only:
// partition, compact indexes and size accounting. Every semantic decision
// (section synthesis, aliasing, relationships, review, planning, audit
// judgement) remains a knowledge/design agent call; nothing here merges meaning, deduplicates
// by similarity or invents content.

/** Existing monolithic synthesis budget; the small-source path is unchanged. */
export const SYNTHESIS_MONOLITH_BUDGET = 280000;
/** Target serialized user-payload size for one section synthesis call. */
export const SECTION_INPUT_BUDGET = 70000;
/** The whole-source concept index (reconciliation / global review) must fit one bounded call. */
export const RECONCILIATION_INDEX_BUDGET = 180000;
/** Above this, handbook planning uses the compact global concept/passage index. */
export const HANDBOOK_PLAN_MONOLITH_BUDGET = 80000;
export const HANDBOOK_PLAN_INDEX_BUDGET = 200000;
/** Above this, handbook audit runs per-chapter windows plus a compact global cohesion call. */
export const HANDBOOK_AUDIT_MONOLITH_BUDGET = 80000;

export const payloadChars = (value) => JSON.stringify(value ?? null).length;

const list = (x) => Array.isArray(x) ? x : [];

/**
 * Group consecutive passage batches into sections whose combined drafts +
 * source passages fit `maxChars`. Order and every passage are preserved.
 * A single batch that cannot fit even the monolith hard budget fails closed:
 * checkpoints stay valid and nothing is sampled away.
 */
export function partitionSections(batches, passages, { maxChars = SECTION_INPUT_BUDGET, hardMaxChars = SYNTHESIS_MONOLITH_BUDGET } = {}) {
  const byId = new Map(list(passages).map((p) => [p.passageId, p]));
  const sections = [];
  let current = null;
  const flush = () => { if (current) sections.push(current); current = null; };
  list(batches).forEach((batch, batchIndex) => {
    const batchPassages = list(batch?.coverage).map((r) => byId.get(r.passageId)).filter(Boolean);
    // Passage reads are one passage per batch; fall back to positional mapping.
    const scoped = batchPassages.length ? batchPassages : (passages[batchIndex] ? [passages[batchIndex]] : []);
    const itemChars = payloadChars({ extractedDrafts: [batch], sourcePassages: scoped });
    if (itemChars > hardMaxChars) throw Object.assign(new Error(`Passage batch ${batchIndex + 1} alone is ${itemChars} characters, above the ${hardMaxChars}-character hard synthesis budget. Its checkpoint is preserved; split the named volume further — nothing was sampled or discarded.`), { code: "knowledge-section-too-large" });
    if (!current) current = { sectionIndex: sections.length, batchIndexes: [], batches: [], passages: [], chars: 0 };
    const candidateChars = payloadChars({ extractedDrafts: [...current.batches, batch], sourcePassages: [...current.passages, ...scoped] });
    if (current.batches.length && candidateChars > maxChars) { flush(); current = { sectionIndex: sections.length, batchIndexes: [], batches: [], passages: [], chars: 0 }; }
    current.batchIndexes.push(batchIndex);
    current.batches.push(batch);
    current.passages.push(...scoped);
    current.chars = payloadChars({ extractedDrafts: current.batches, sourcePassages: current.passages });
  });
  flush();
  return sections;
}

/** Compact, complete index entry for one concept. Host copies fields verbatim. */
export function conceptIndexEntry(concept, sectionIndex = null) {
  return {
    conceptId: concept?.conceptId,
    ...(sectionIndex == null ? {} : { sectionIndex }),
    term: concept?.terms?.en?.term || "",
    definition: concept?.definition?.en || "",
    areaIds: list(concept?.areaIds),
    claims: list(concept?.claims).map((a) => ({ claimId: a.claimId, text: a.text, kind: a.kind, passageIds: list(a.citations).map((c) => c.passageId) })),
    citedPassageIds: [...new Set(list(concept?.claims).flatMap((a) => list(a.citations).map((c) => c.passageId)))],
  };
}

export function buildConceptIndexFromSections(sectionDrafts) {
  return list(sectionDrafts).flatMap((draft, sectionIndex) => list(draft?.concepts).map((c) => conceptIndexEntry(c, sectionIndex)));
}

export function buildConceptIndex(draft) {
  return list(draft?.concepts).map((c) => conceptIndexEntry(c));
}

/** Complete passage ledger without passage text: ID, scope and disposition. */
export function buildPassageIndex(passages, draft) {
  const coverage = new Map(list(draft?.coverage).map((r) => [r.passageId, r]));
  return list(passages).map((p) => ({ passageId: p.passageId, page: p.page, start: p.start, end: p.end, status: coverage.get(p.passageId)?.status || "missing", conceptIds: list(coverage.get(p.passageId)?.conceptIds) }));
}

/** Compact chapter index for the global cohesion audit (no chapter prose). */
export function buildChapterIndex(plan, chapters) {
  return list(plan?.chapters).map((pc) => {
    const written = list(chapters).find((c) => c.chapterId === pc.chapterId);
    return { chapterId: pc.chapterId, title: written?.title || pc.title, purpose: pc.purpose, targetDepth: pc.targetDepth, plannedConceptIds: list(pc.conceptIds), declaredConceptIds: list(written?.conceptIds), citedPassageIds: list(written?.citations).map((c) => c.passageId), characters: String(written?.markdown || "").length, scopeNote: written?.scopeNote || "" };
  });
}
