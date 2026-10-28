// Immutable build/runtime contract. Models may author content, never these rules.
export const DIFFICULTY_POLICY = Object.freeze({
  version: "1.0", minEvidence: 5, promoteAt: 0.8, easeBelow: 0.45,
  tiers: Object.freeze([
    Object.freeze({ tier: 1, maxConcepts: 3, responseSeconds: 0, assistance: "full", distractors: 1 }),
    Object.freeze({ tier: 2, maxConcepts: 5, responseSeconds: 0, assistance: "optional", distractors: 2 }),
    Object.freeze({ tier: 3, maxConcepts: 8, responseSeconds: 30, assistance: "optional", distractors: 3 }),
    Object.freeze({ tier: 4, maxConcepts: 12, responseSeconds: 20, assistance: "logged", distractors: 3 }),
    Object.freeze({ tier: 5, maxConcepts: 16, responseSeconds: 12, assistance: "logged", distractors: 4 }),
  ]),
});
export function analyzeDifficulty({ events = [], stage = 1, currentTier = 1, comfort = false } = {}) {
  const tier = Math.max(1, Math.min(5, Number.isInteger(currentTier) ? currentTier : 1));
  const eligible = events.filter((e) => typeof e.eventId === "string" && e.eventId && e.stage === stage && Number.isFinite(e.score) && e.score >= 0 && e.score <= 1 && (e.confidence ?? 1) >= 0.65 && !(e.assistance || []).length);
  const unique = [...new Map(eligible.map((e) => [e.eventId, e])).values()].sort((a,b) => (a.clientTs || 0) - (b.clientTs || 0)).slice(-10);
  const mean = unique.length ? unique.reduce((n, e) => n + e.score, 0) / unique.length : null;
  const adequate = unique.length >= DIFFICULTY_POLICY.minEvidence;
  const nextTier = adequate ? Math.max(1, Math.min(5, tier + (mean >= DIFFICULTY_POLICY.promoteAt ? 1 : mean < DIFFICULTY_POLICY.easeBelow ? -1 : 0))) : tier;
  const settings = { ...DIFFICULTY_POLICY.tiers[nextTier - 1] };
  if (comfort) settings.responseSeconds = 0;
  return { policyVersion: DIFFICULTY_POLICY.version, tier: nextTier, evidenceCount: unique.length, mean, needsEvidence: !adequate, settings, reason: !adequate ? "Gather at least five confident, unassisted attempts at this stage before changing difficulty." : nextTier > tier ? "Recent independent performance meets the promotion threshold." : nextTier < tier ? "Recent independent performance calls for more support." : "Maintain the current challenge while gathering evidence." };
}
