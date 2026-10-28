// Validation/rendering contract. All design prose comes from authoring agents.
export const FRAMEWORK_SECTIONS = [
  "charter", "audience", "creative-direction", "gameplay-loops", "state", "mechanics", "entities", "interactions", "simulation", "ai", "levels", "content", "difficulty", "progression", "narrative", "controls-camera", "ui-ux", "art", "animation-vfx", "audio", "accessibility", "architecture", "performance", "persistence", "generation", "testing", "acceptance", "delivery", "risks", "traceability",
];
export function validateFramework(value, { domain, concepts = [] } = {}) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, errors: [{ field: "framework", message: "structured framework required" }] };
  if (typeof value.name !== "string" || !value.name.trim()) add("name", "required");
  const sections = Array.isArray(value.sections) ? value.sections : [];
  for (const id of FRAMEWORK_SECTIONS) {
    const matches = sections.filter((s) => s?.id === id);
    if (matches.length !== 1 || typeof matches[0]?.body !== "string" || matches[0].body.trim().length < 240) add(`sections.${id}`, "one substantive section of at least 240 characters required; explicit exclusions need rationale and consequences");
    if (/\[\[|\bTODO\b|\bTBD\b/i.test(matches[0]?.body || "")) add(`sections.${id}`, "unresolved placeholders forbidden; state concrete decisions or blockers");
  }
  const mechanics = Array.isArray(value.mechanics) ? value.mechanics : [];
  if (mechanics.length < 2) add("mechanics", "at least two integrated mechanics required");
  const ids = new Set();
  for (const [i, m] of mechanics.entries()) {
    if (!m?.id || ids.has(m.id)) add(`mechanics[${i}].id`, "unique mechanic ID required");
    ids.add(m?.id);
    for (const field of ["decision", "trigger", "preconditions", "inputs", "algorithm", "parameters", "costs", "stateChanges", "feedback", "interactions", "edgeCases", "tests"]) {
      if (typeof m?.[field] !== "string" || m[field].trim().length < 35) add(`mechanics[${i}].${field}`, "concrete operational contract required");
    }
  }
  if (value.domainId !== domain?.domainId) add("domainId", "must match selected domain");
  if (!Array.isArray(value.conceptIds) || !value.conceptIds.length || value.conceptIds.some((id) => !concepts.some((c) => c.conceptId === id && c.domainId === domain.domainId))) add("conceptIds", "must map to available source-grounded concepts in this domain");
  const candidates = Array.isArray(value.candidates) ? value.candidates : [];
  if (candidates.length < 3 || candidates.filter((c) => c.selected === true).length !== 1 || candidates.some((c) => typeof c.rationale !== "string" || c.rationale.length < 80)) add("candidates", "compare at least three interaction designs; choose one with substantive tradeoffs and portfolio overlap analysis");
  return { ok: !errors.length, errors };
}
export function renderFramework(value) {
  return [`# ${value.name} — game_framework`, "", "Status: agent-authored design specification. Implementation and playtesting remain separate gates.", "", `Domain: ${value.domainId}. Concepts: ${value.conceptIds.join(", ")}.`, "", "## Candidate exploration", "", ...value.candidates.map((c) => `### ${c.name}${c.selected ? " — selected" : " — rejected"}\n\n${c.rationale}\n`), ...FRAMEWORK_SECTIONS.flatMap((id, i) => { const s = value.sections.find((s) => s.id === id); return [`## ${String(i + 1).padStart(2, "0")} · ${s.title || id}`, "", s.body, ""]; }), "## Operational mechanic contracts", "", ...value.mechanics.flatMap((m) => [`### ${m.id}`, "", ...Object.entries(m).filter(([k]) => k !== "id").map(([k, v]) => `**${k}:** ${v}\n`)]), ""].join("\n");
}
