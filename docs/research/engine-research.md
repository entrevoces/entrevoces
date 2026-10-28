# Engine Research — what the Progression Engine knows and why

ENTRE VOCES is engine-first: games are only as good as the model underneath them.
This document records the research mechanism that drives the engine — every major
design decision below traces to a source, and the engine code names the trace.
Seed content in `packages/engine-core/seed-data.js` is *original instructional
material informed by* these sources; it does not reproduce copyrighted text.

## 1. Oregon professional reality (the seed instance, researched — not assumed)

### Medical — Oregon Health Authority (OHA) Health Care Interpreter program
- Oregon requires health care interpreters working with public funds to be
  **Qualified or Certified HCIs** on the OHA registry (ORS 413.550). The training
  floor is **60 hours of OHA-approved formal training**: ~52 hours of integrated
  medical terminology, anatomy & physiology, and interpreting concepts/modes,
  plus **8 hours of health-care interpreting ethics**, plus demonstrated language
  proficiency and (for certification) a national exam (NBCMI / CCHI) and
  documented experience.
  Sources: [OAR 333-002-0060](https://oregon.public.law/rules/oar_333-002-0060),
  [OHA HCI Registry](https://hciregistry.dhsoha.state.or.us/).
- **Engine consequence:** the medical domain cannot be a word list. Terminology
  sits inside anatomy/procedure knowledge and an ethics spine — which is why
  `Concept` carries definitions, distinctions, procedure context, and a
  judgment area (`professional-judgment-med`), and why the competency model
  weights ethics/judgment alongside terminology (§5 of spec).

### Legal — Oregon Judicial Department (OJD) Court Interpreter Program
- Oregon court interpreting demands **complete and accurate, meaning-for-meaning
  interpretation with no omissions, additions, or summarization**, in three
  examined modes — **sight, consecutive, and simultaneous** (National Center
  for State Courts oral exam tradition). The interpreter is explicitly *not*
  an advocate. Register, hedges, and self-corrections are part of the record.
  Sources: [OJD — About Court Interpreting](https://www.courts.oregon.gov/programs/interpreters/working/Pages/about-us.aspx),
  [OJD Certification Information Packet](https://stage-courts.oregon.gov/programs/interpreters/want-to-be/Documents/CertificationInformationPacket.pdf),
  [OJD Best Practices for Working With Interpreters](https://stage-courts.oregon.gov/programs/interpreters/i-am/Documents/OJD%20Best%20Practices%20for%20Working%20With%20Interpreters.pdf).
- **Engine consequence:** legal assessment is *stricter* than medical
  conversation practice. The fidelity taxonomy (§8) therefore treats added/
  omitted material and smoothed hedges as errors in legal areas, the domain
  config carries `modalities: [consecutive, simultaneous, sight]`, and
  `testimony`/`objection` concepts explicitly teach preserving uncertainty.

## 2. How interpreting actually works in the mind (cognition)

- **Gile's Effort Model:** consecutive interpreting = Listening & Analysis +
  Memory + Note-taking + Coordination (Phase 1), then Remembering + Note-reading
  + Production (Phase 2). Capacity is finite; overload shows first as omissions
  of vulnerable items (names, numbers), disfluency, and lost qualifiers.
  Recent error analyses of consecutive interpreting confirm overload-driven
  omission/disfluency patterns consistent with the model.
  Sources: Gile (2009) *Basic Concepts and Models for Interpreter and Translator
  Training*; [Lost in translation: errors in consecutive interpreting (PLOS ONE / PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12714230/).
- **Engine consequence:** difficulty is not one number. Every spoken item
  carries an **effort profile** — `listeningLoad` (speed/density/accent
  variation), `memoryLoad` (turn length, number of idea units, numeric
  density), `productionLoad` (register distance, terminology density), and
  `coordinationLoad` (speaker switches, overlap with note-taking). Games raise
  *one* effort at a time for novices and combine them for advanced learners;
  diagnosis (§6.4 hypotheses) maps observed errors back to the overloaded
  effort instead of saying "wrong answer."
- **Fidelity research:** consecutive-interpretation fidelity is assessed by
  idea-unit preservation, not string similarity. **Engine consequence:**
  `assessInterpretation` scores preserved/omitted/changed/added idea units and
  flags consequential changes (negation, number, modality, agent) separately
  from acceptable reformulation.

## 3. How professional knowledge is retained (learning science)

- **Retrieval practice + spacing:** testing beats re-reading (testing effect,
  d ≈ 0.5 in meta-analyses); spaced retrieval dramatically outperforms massed
  study at delay (e.g., Karpicke & Roediger 2008). Modern schedulers (FSRS,
  trained on hundreds of millions of reviews) model per-item **stability** —
  how long a memory lasts — and schedule review just before predicted recall
  drops below target, cutting review load ~20–30% vs. SM-2 at equal retention.
  Sources: Karpicke & Roediger (2008, *Science* 319:966–969); FSRS /
  open-spaced-repetition benchmark literature.
- **Engine consequence:** the learner model keeps, per (concept × stage), not
  just an accuracy estimate but a **stability (days)** and **last-retrieval**
  timestamp. Predicted retention `R = exp(−Δt / stability)` drives
  `dueForReview`: the daily return queue *is* the forgetting curve made
  visible. Success lengthens stability; failure shortens it; assisted success
  lengthens it less. This is an FSRS-*inspired* simplification (documented as
  such — we do not claim FSRS parameters without review-log training data).
- **Conceptual mastery ≠ memorization** (spec §2.2): vocabulary research
  distinguishes recognition, recall, conceptual understanding, and use.
  **Engine consequence:** the 8-stage mastery vector is never collapsed, and
  games must elicit *production* (tile assembly, spoken turns, judgment calls),
  not only recognition clicks, to advance later stages.

## 4. Who the learners are (populations → configuration, not stereotypes)

Researched archetypes (to be validated with Oregon programs in E0 fieldwork;
treated here as *hypotheses with different engine settings*, not labels on
pre-made games):

| Archetype | Reality | Engine setting it changes |
|---|---|---|
| Aspiring HCI / court candidate | Bilingual, often heritage speakers; needs the 60-hr-style foundation + exam modes | Full stage ladder; sight+consecutive emphasis; ethics weight high |
| Bilingual clinic/court staff | Strong everyday bilingualism, thin professional register; minutes per session | Short shifts; workplace areas first; register-distinction concepts prioritized |
| Interpreting student | Coursework vocabulary, little live pressure | Memory-load progression; note-taking scaffold in Shift |
| Working professional | Fast retrieval, rare-but-critical gaps (consent, waiver, numbers) | Critical-area gaps first; high combined effort loads |

Session design follows from this: 3–7 minute completable units, resumable
mid-encounter, and a *reason to return tomorrow* (due reviews + an unfinished
patient/case story), because practice time is fragmented for every archetype.

## 5. Production values as pedagogy (why the games must feel real)

Return behavior is a learning variable: spaced repetition only works if the
learner comes back. The games therefore treat production quality as part of
the engine's retention system — persistent places (your clinic, your
courtroom), continuing people (one patient's visit across days, one case
across hearings), visible mastery geography (area map that fills), and
consequence feedback (the patient understands — or doesn't) rather than
points alone. Points without consequence teach point-seeking; consequence
teaches interpreting.

## 6. Limits stated honestly

- ES/ZH seed renderings are authored for the demo without certified SME review;
  every concept accepts *variation sets* and generated artifacts label inferred content.
- Automated fidelity uses deterministic idea-unit heuristics — never presented as professional evaluation.
- Stability scheduling is FSRS-inspired, not FSRS-trained. Claims stay inside
  the evidence.
