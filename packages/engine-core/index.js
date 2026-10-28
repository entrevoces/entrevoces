// ENTRE VOCES engine-core — public API (spec Appendix A)
// Import from here in the generator and static games.
export { validateDomainConfig, validateConcept, validateSource, validateEvidence, validateGameConfig } from "./validate.js";
export { STAGES, COMPETENCES, STAGE_COMPETENCES, computeLearnerState, mergeEvidence } from "./learner.js";
export { recommendNext, domainCoverage, recommendGames, GAME_CATALOG } from "./selector.js";
export { assessInterpretation, spokenErrorHypotheses, ideaUnits } from "./fidelity.js";
export { generateItem, generatePracticeSet, validateItems } from "./content.js";
export { SOURCES, OREGON_MEDICAL, OREGON_LEGAL, ONTARIO_REAL_ESTATE, OREGON_CULTIVATION, CALIFORNIA_TAX, AI_TECHNOLOGY, RIO_TANGO, CONCEPTS, SEED_DOMAINS, SEED_CONCEPTS_BY_DOMAIN, ENCOUNTERS } from "./seed-data.js";
export { predictedRetention } from "./learner.js";
export { NOTE_SYMBOLS, scoreNotes, extractKeywords } from "./notes.js";
export { generateClient, generateNight } from "./generator.js";
export { reviewKnowledgeItem, reviewKnowledgeBase } from "./review.js";
export { TRAINING_MODES, modeById, RESOURCES, recommendResources } from "./training.js";

export const ENGINE_VERSION = "1.0.0";
export const WIRE_VERSION = "v1";

export { indexSource, validateKnowledgeDraft, validateCitations, knowledgeMetrics, validateResearchBlueprint, validateCoverageAudit, coverageReadiness, RESEARCH_TOPIC_CATEGORIES, RESEARCH_PRIORITIES, COVERAGE_STATUSES } from "./knowledge.js";
export { HANDBOOK_VERSION, HANDBOOK_ELEMENTS, HANDBOOK_DEPTHS, validateHandbookPlan, validateHandbookChapter, validateHandbookAudit, handbookMetrics, renderHandbook } from "./handbook.js";
export { FRAMEWORK_SECTIONS, validateFramework } from "./framework.js";

export { DIFFICULTY_POLICY, analyzeDifficulty } from "./difficulty.js";
export {CURRICULUM_PHASES,compileCurriculum,curriculumProgress,suggestCurriculumPractice} from './curriculum.js';
