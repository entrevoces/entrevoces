#!/usr/bin/env node
// Knowledge-base audit gate — run: npm run audit:kb
// Blockers fail (exit 1): missing terms/definitions, duplicate target terms
// inside a domain (distractor collisions), sourceless concepts, acceptable
// answers that collide with another concept's term. Warnings are reported,
// never hidden: single-example concepts, missing alternatives.
import * as core from "../../packages/engine-core/index.js";

const blockers = [], warnings = [];
for (const d of core.SEED_DOMAINS) {
  const cs = core.SEED_CONCEPTS_BY_DOMAIN[d.domainId];
  if (!cs.length) blockers.push(`${d.domainId}: no concepts`);
  for (const lang of ["es", "zh"]) {
    const seen = new Map();
    for (const c of cs) {
      const term = c.terms[lang]?.term?.toLowerCase();
      if (term && seen.has(term)) blockers.push(`${d.domainId}: duplicate ${lang} term "${term}" (${seen.get(term)} vs ${c.conceptId}) — games cannot distract fairly`);
      if (term) seen.set(term, c.conceptId);
    }
  }
  for (const c of cs) {
    for (const lang of ["en", "es", "zh"]) if (!c.terms[lang]?.term) blockers.push(`${c.conceptId}: missing ${lang} term`);
    if (!c.definition?.en || c.definition.en.length < 35) blockers.push(`${c.conceptId}: definition missing/thin`);
    if (!c.sourceIds?.length) blockers.push(`${c.conceptId}: no sources`);
    if (!c.distinctions?.length) blockers.push(`${c.conceptId}: no distinctions (Stage 4 has nothing to teach)`);
    if (!c.misconceptions?.length) blockers.push(`${c.conceptId}: no misconceptions (diagnostics are blind here)`);
    if (!c.examples?.length) blockers.push(`${c.conceptId}: no examples`);
    if ((c.examples || []).length === 1) warnings.push(`${c.conceptId}: single example (games rotate contexts via the generator, but authored depth is thin)`);
    if (!c.terms.es?.alternatives?.length && !c.terms.en?.alternatives?.length) warnings.push(`${c.conceptId}: no accepted alternatives (paraphrase tolerance is narrow)`);
  }
}
// Generation answer collisions: a generated item's answers must never equal
// another concept's target term in the same domain.
for (const d of core.SEED_DOMAINS) {
  const cs = core.SEED_CONCEPTS_BY_DOMAIN[d.domainId];
  for (const c of cs) {
    const item = core.generateItem({ concept: c, domain: d, stage: 2, targetLang: "es", seed: "audit" });
    for (const a of item.acceptableAnswers || []) {
      const clash = cs.find((x) => x.conceptId !== c.conceptId && (x.terms.es?.term?.toLowerCase() === a.toLowerCase() || (x.terms.es?.alternatives || []).some((alt) => alt.toLowerCase() === a.toLowerCase())));
      if (clash) blockers.push(`${d.domainId}: generated answer "${a}" for ${c.conceptId} collides with ${clash.conceptId}`);
    }
  }
}
const review = core.reviewKnowledgeBase({ concepts: core.CONCEPTS, sources: core.SOURCES });
for (const r of review.results) {
  if (r.verdict === "reject") blockers.push(`${r.conceptId}: KB review REJECT — ${r.findings.filter((f) => f.severity === "blocker").map((f) => f.message).join("; ")}`);
  if (r.verdict === "repair") warnings.push(`${r.conceptId}: KB review repair — ${r.findings.map((f) => f.field).join(", ")}`);
}
console.log(`KB AUDIT — ${core.SEED_DOMAINS.length} worlds, ${core.CONCEPTS.length} concepts · profound review: ${review.accepted} accept, ${review.repair} repair, ${review.rejected} reject`);
console.log(`blockers: ${blockers.length}`);
blockers.forEach((b) => console.log("  BLOCKER", b));
console.log(`warnings: ${warnings.length} (reported, not hidden)`);
warnings.slice(0, 12).forEach((w) => console.log("  warn", w));
if (warnings.length > 12) console.log(`  … and ${warnings.length - 12} more single-example/alternative warnings`);
process.exit(blockers.length ? 1 : 0);
