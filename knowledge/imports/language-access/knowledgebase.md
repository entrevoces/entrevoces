# Developing a Language Access Plan — contextual knowledge base

Status: reviewed draft; human review required before teaching. Generator: Meta AI. Contract: 2.0.

## Scope and source

{
  "source": {
    "title": "Developing a Language Access Plan",
    "publisher": "Oregon Health Authority — Equity and Inclusion Division",
    "url": "https://www.oregon.gov/oha/EI/Documents/Language-Access-Planning.pdf",
    "publishedOrRevised": "2021-06-10",
    "authority": "high",
    "permittedUse": "Public Oregon government educational guidance, local evaluation only; review rights before redistribution.",
    "limitations": "2021 publication; current law and linked external tools must be verified separately.",
    "sourceId": "resource-23d4e92c6c708e66596d",
    "jurisdiction": "Oregon"
  },
  "context": {
    "audience": "Bilingual clinical staff learning the boundaries of professional health care interpreting in Oregon.",
    "goals": "Understand the complete workflow for identifying community language needs, distinguishing bilingual staff from qualified interpreting, recognizing the stated emergency exception without broadening it, finding interpreters, and providing patient communication tools. Preserve operational steps and limitations of this 2021 source; do not invent medical advice or sourced translations."
  }
}

## Source-specific synthesis

Oregon Health Authority guidance (last updated 06/10/2021) for developing a language access plan in Oregon medical settings: identify languages likely to be encountered using Census Business Builder and other local data plus community outreach, use bilingual/multilingual staff for interpretation only when they meet the stated qualified criteria, apply a narrow imminent-threat emergency exception for staff who do not meet those criteria, find interpreters through Oregon's Health Care Interpreter Registry while retaining provider responsibility for ensuring an interpreter is qualified or certified, and make patient language-identification and communication cards available at intake. The source is organizational language-access guidance, not encounter-specific medical advice, and it establishes no Spanish or Mandarin equivalents.

## Coverage and limitations

{
  "passages": 2,
  "represented": 2,
  "irrelevant": 0,
  "insufficient": 0,
  "relevantCoverage": 1,
  "concepts": 9,
  "claims": 27,
  "relationships": 5,
  "isolatedConceptIds": [
    "b2-additional-language-access-resources"
  ]
}

- p1-0: represented — Passage covers language-needs data sources and Census Business Builder steps, qualified bilingual staff criteria under Section 1557, the imminent-threat emergency exception, Oregon's Health Care Interpreter Registry, and provider responsibility; all are represented in concepts, claims, and procedures. (b1-language-needs-assessment, b1-qualified-bilingual-staff, b1-emergency-interpretation-exception, b1-health-care-interpreter-registry, b1-provider-responsibility-for-interpreter)
- p2-0: represented — All substantive content is represented: Preferred Language cards (10 languages), I Speak cards at reception for people with LEP, communication cards for individuals who cannot speak with two COVID-19 examples, and the full list of additional language-access resources. The footer date line is source metadata, not a separate concept. (b2-preferred-language-cards, b2-i-speak-cards, b2-communication-cards-nonspeaking, b2-additional-language-access-resources)

## Concept dossiers

### language needs assessment [b1-language-needs-assessment]

The planning step of determining which languages a practice is most likely to encounter by examining several data sets and reaching out to community members. The source names the U.S. Census Bureau's Business Builder as a common starting point and also lists school district data, Medicaid data, and data from community partners in the area.

Why it matters: If a practice misidentifies the languages it is likely to encounter, its language access plan may fail to arrange appropriate interpreting capacity before patients need care; the source frames this as a data-and-community inquiry, not a guess based on a single source.

Areas: intake-registration, professional-judgment-med. Difficulty prior: 2/5. Competences: domain-knowledge, professional-judgment.

#### Terms and variation

- en: language needs assessment; alternatives: determining languages spoken in local communities / finding out what languages are spoken; register: organizational planning; 

#### Atomic sourced claims

- b1-claim-needs-data-community (procedure): A practice can look at several data sets and reach out to community members to determine the languages it is most likely to encounter.
  Evidence: [p1-0] “You can look at several data sets and reach out to community members to determine the languages your practice is most likely to encounter.”
- b1-claim-census-starting-point (context): A common starting point is the U.S. Census Bureau's Business Builder.
  Evidence: [p1-0] “A common starting point is the U.S. Census Bureau’s Business Builder.”
- b1-claim-other-data-sources (procedure): Other potential data sources are school district data, Medicaid data, and data from community partners in the area.
  Evidence: [p1-0] “School district data”; [p1-0] “Medicaid data”; [p1-0] “Data from community partners in your area”

#### Distinctions

- Versus Census Business Builder report vs. other local data sources: Business Builder is presented as a common starting point, while school district, Medicaid, and community-partner data are additional potential sources; the source does not rank them as substitutes for community outreach. [[p1-0] “A common starting point is the U.S. Census Bureau’s Business Builder.”; [p1-0] “Other potential data sources are:”]

#### Misconceptions and diagnosis

- single-source-language-planning: Assuming one Census report alone completes language-needs identification, when the source also directs practices to several data sets and community members.
  Diagnostic: A practice generated one county Census report and stopped. What additional source-directed inquiries remain before treating its language list as adequately informed? [inferred teaching design]

#### Contextual examples

- intake-registration: A practice defines its county in Census Business Builder, generates the report, and then checks school district and Medicaid data and asks community partners which languages they encounter before finalizing its plan. [synthetic training example]

#### Unresolved

- No Spanish or Mandarin equivalent for this concept is established in the passage; bilingual terminology remains a gap requiring human review.
- The passage does not specify how to reconcile conflicting language data across sources.

### qualified bilingual/multilingual staff [b1-qualified-bilingual-staff]

Under the source's statement of Section 1557, a bilingual/multilingual staff member may provide interpretation only if qualified. Qualified requires proficiency in speaking and understanding both spoken English and at least one other spoken language or sign language, including necessary specialized vocabulary, terminology and phraseology, and the ability to effectively, accurately, and impartially communicate directly with individuals who use sign language or who have limited English proficiency.

Why it matters: Treating any bilingual employee as an interpreter risks inaccurate or partial communication in medical encounters; the source makes specialized proficiency plus effective, accurate, impartial direct communication the threshold, not bilingualism alone.

Areas: professional-judgment-med. Difficulty prior: 3/5. Competences: domain-knowledge, professional-terminology, bilingual-terminology, professional-judgment.

#### Terms and variation

- en: qualified bilingual/multilingual staff; alternatives: qualified bilingual staff; register: regulatory/professional; 

#### Atomic sourced claims

- b1-claim-1557-permissible-if-qualified (rule): Section 1557 states that using bilingual staff to provide interpretation is permissible, but the bilingual/multilingual staff member must be qualified.
  Evidence: [p1-0] “Section 1557 states that this is permissible, but the bilingual/multilingual staff member must qualified.”
- b1-claim-qualified-proficiency (definition): Qualified includes proficiency in speaking and understanding both spoken English and at least one other spoken language or sign language, including any necessary specialized vocabulary, terminology and phraseology.
  Evidence: [p1-0] “Proficient in speaking and understanding both spoken English and at least one other spoken language or sign language, including any necessary specialized vocabulary, terminology and phraseology”
- b1-claim-qualified-communication (definition): Qualified also requires being able to effectively, accurately, and impartially communicate directly with individuals who use sign language or who have limited English proficiency.
  Evidence: [p1-0] “Able to effectively, accurately, and impartially communicate directly with individuals who use sign language or who have limited English proficiency.”

#### Distinctions

- Versus bilingual/multilingual staff member vs. qualified bilingual/multilingual staff member: Speaking another language alone is insufficient in the source; the staff member must meet both the proficiency/specialized-vocabulary criterion and the effective, accurate, impartial direct-communication criterion before providing interpretation outside the emergency exception. [[p1-0] “Proficient in speaking and understanding both spoken English and at least one other spoken language or sign language, including any necessary specialized vocabulary, terminology and phraseology”; [p1-0] “Able to effectively, accurately, and impartially communicate directly with individuals who use sign language or who have limited English proficiency.”]

#### Misconceptions and diagnosis

- bilingual-equals-qualified: Assuming that being bilingual or multilingual automatically qualifies a staff member to interpret, without specialized vocabulary and effective, accurate, impartial communication ability.
  Diagnostic: An employee speaks English and another language fluently in everyday conversation but has not shown medical terminology proficiency or impartial direct communication. Under the source, may they interpret routinely? [inferred teaching design]

#### Contextual examples

- professional-judgment-med: Before assigning a bilingual staff member to interpret, a supervisor checks both spoken-language proficiency including specialized terminology and whether the person can communicate directly, effectively, accurately, and impartially with a patient with limited English proficiency. [synthetic training example]

#### Unresolved

- No Spanish or Mandarin equivalent for 'qualified bilingual/multilingual staff' is established in the passage; proposed translations would require inferred labeling and human review.
- The passage does not specify an assessment method or credentialing process for determining that staff meet the qualified criteria.

### emergency exception for unqualified bilingual staff [b1-emergency-interpretation-exception]

If bilingual staff members do not meet the qualified criteria, they can only provide interpretation services in an emergency involving imminent threat to the safety or welfare of an individual or the public. The exception is conditional on both non-qualification and an imminent-threat emergency; it is not presented as a general convenience or staffing-shortage exception.

Why it matters: Broadening this exception beyond imminent threat would let unqualified staff interpret in routine medical encounters, contrary to the source's 'only' limitation and creating accuracy and impartiality risk.

Areas: professional-judgment-med. Difficulty prior: 3/5. Competences: domain-knowledge, professional-judgment.

#### Terms and variation

- en: emergency exception for unqualified bilingual staff; alternatives: emergency involving imminent threat; register: regulatory/professional; 

#### Atomic sourced claims

- b1-claim-emergency-only (exception): If bilingual staff members do not meet the qualified criteria, they can only provide interpretation services in an emergency involving imminent threat to the safety or welfare of an individual or the public.
  Evidence: [p1-0] “If bilingual staff members do not meet these criteria, they can only provide interpretation services in an emergency involving imminent threat to the safety or welfare of an individual or the public.”

#### Distinctions

- Versus emergency involving imminent threat vs. routine or urgent-but-not-imminent need: The source permits unqualified bilingual staff to interpret only in an emergency involving imminent threat to safety or welfare of an individual or the public; it does not state that workload, delay, or general urgency qualifies. [inferred teaching contrast]

#### Misconceptions and diagnosis

- emergency-means-any-urgent-need: Reading 'emergency' as any busy, delayed, or clinically important situation rather than the source's narrower imminent threat to safety or welfare.
  Diagnostic: No qualified interpreter is immediately available for a routine visit and a bilingual employee offers to help to avoid rescheduling. Does the source's emergency exception apply on those facts alone? [inferred teaching design]

#### Contextual examples

- professional-judgment-med: A bilingual employee who does not meet the qualified criteria is not assigned to interpret a routine appointment solely because the schedule is full; the source's exception is reserved for an imminent-threat emergency. [synthetic training example]

#### Unresolved

- The passage does not define further operational thresholds for 'imminent threat' beyond safety or welfare of an individual or the public.
- No Spanish or Mandarin rendering of the exception is established in the passage.

### Health Care Interpreter Registry [b1-health-care-interpreter-registry]

The Oregon resource named by the source for finding qualified and certified health care interpreters in Oregon. It is presented as the place to find interpreter services in Oregon, alongside references to OHA's fact sheet and Health Care Interpreter Program page for federal and state requirements.

Why it matters: Using the Registry connects a practice to qualified and certified health care interpreters in Oregon rather than relying on ad hoc bilingual help; mistaking it for a guarantee would still overlook the provider's separate responsibility to ensure qualification or certification.

Areas: professional-judgment-med. Difficulty prior: 2/5. Competences: domain-knowledge, professional-judgment.

#### Terms and variation

- en: Health Care Interpreter Registry; alternatives: Oregon Health Care Interpreter Registry; register: institutional proper name; 

#### Atomic sourced claims

- b1-claim-use-registry (procedure): Use the Health Care Interpreter Registry to find qualified and certified health care interpreters in Oregon.
  Evidence: [p1-0] “Use the Health Care Interpreter Registry to find qualified and certified health care interpreters in Oregon.”
- b1-claim-more-requirements-resources (context): To learn more about federal and state interpreter service requirements, the source directs readers to OHA's fact sheet and OHA's Health Care Interpreter Program page.
  Evidence: [p1-0] “To learn more about federal and state interpreter service requirements, read OHA’s fact sheet and visit OHA’s Health Care Interpreter Program page.”

#### Distinctions

- Versus finding an interpreter through the Registry vs. provider ensuring qualification/certification: The Registry is the source's tool for finding qualified and certified interpreters, while the provider remains responsible for ensuring that any interpreter used is qualified or certified. [[p1-0] “Use the Health Care Interpreter Registry to find qualified and certified health care interpreters in Oregon.”; [p1-0] “The provider is responsible for ensuring that any interpreter used is a qualified or certified interpreter.”]

#### Misconceptions and diagnosis

- registry-listing-ends-provider-duty: Assuming that locating a name through the Registry eliminates the provider's responsibility to ensure the interpreter used is qualified or certified.
  Diagnostic: A provider found an interpreter through the Registry but did no check that the person used was qualified or certified. What source-stated responsibility remains unmet? [inferred teaching design]

#### Contextual examples

- professional-judgment-med: When arranging Oregon interpreter services, a practice consults the Health Care Interpreter Registry to identify qualified and certified health care interpreters. [synthetic training example]

#### Unresolved

- The passage does not provide Registry search steps, eligibility verification details, or a URL for the Registry.
- No Spanish or Mandarin equivalent for the Registry name is established in the passage; as an institutional proper name it should not be presented as a sourced translation.

### provider responsibility for interpreter qualification [b1-provider-responsibility-for-interpreter]

The provider is responsible for ensuring that any interpreter used is a qualified or certified interpreter. This responsibility applies to 'any interpreter used' in the source's wording and is stated separately from the availability of the Health Care Interpreter Registry.

Why it matters: If providers treat interpreter quality as solely the interpreter's or Registry's concern, unqualified interpretation may be used in care; the source assigns the ensuring responsibility to the provider.

Areas: professional-judgment-med. Difficulty prior: 2/5. Competences: domain-knowledge, professional-judgment, integrated-performance.

#### Terms and variation

- en: provider responsibility for interpreter qualification; alternatives: provider responsibility for ensuring a qualified or certified interpreter; register: regulatory/professional; 

#### Atomic sourced claims

- b1-claim-provider-responsible (rule): The provider is responsible for ensuring that any interpreter used is a qualified or certified interpreter.
  Evidence: [p1-0] “The provider is responsible for ensuring that any interpreter used is a qualified or certified interpreter.”

#### Distinctions

- Versus qualified interpreter vs. certified interpreter: The source states the provider must ensure the interpreter used is 'a qualified or certified interpreter' but does not define the difference between qualified and certified in this passage; that distinction cannot be completed from this passage alone. [inferred teaching contrast]

#### Misconceptions and diagnosis

- responsibility-shifts-to-interpreter: Believing the interpreter alone bears responsibility for being qualified or certified, when the source expressly makes the provider responsible for ensuring it for any interpreter used.
  Diagnostic: An unqualified person interpreted and the provider says qualification was entirely that person's responsibility. How does the source allocate responsibility? [inferred teaching design]

#### Contextual examples

- professional-judgment-med: Before an encounter, the provider verifies that the interpreter who will be used is qualified or certified rather than assuming availability is enough. [synthetic training example]

#### Unresolved

- The passage does not define 'certified' or explain how certification differs from 'qualified.'
- The passage does not specify documentation or verification steps by which a provider ensures qualification or certification.
- No Spanish or Mandarin equivalent for this responsibility statement is established in the passage.

### Preferred Language cards [b2-preferred-language-cards]

Cards presented as a tool for patients to communicate their language needs to providers. The source states they are available in 10 languages, but does not name those languages or describe the cards' wording, format, or distribution procedure.

Why it matters: At intake, using the documented tool as described helps a patient signal language need before clinical communication begins; assuming the card is available in a patient's specific language, or substituting it for arranging interpreting, risks an unidentified language need because the source does not list the 10 languages.

Areas: intake-registration. Difficulty prior: 2/5. Competences: domain-knowledge, professional-terminology, terminology-usage.

#### Terms and variation

- en: Preferred Language cards; alternatives: preferred language cards; register: administrative / patient-facing intake tool; 

#### Atomic sourced claims

- b2-claim-pref-lang-purpose (definition): Preferred language cards are a tool for patients to communicate their language needs.
  Evidence: [p2-0] “preferred language cards are a tool for patients to communicate their language”
- b2-claim-pref-lang-10 (context): Preferred Language cards are available in 10 languages.
  Evidence: [p2-0] “Preferred Language cards are available in 10 languages.”

#### Distinctions

- Versus I Speak Identification Cards: Preferred Language cards are framed as patients communicating language needs to providers; I Speak Identification Cards are specifically to be readily available at the reception desk to allow people with LEP to identify their language easily. The passage does not state they are interchangeable products. [inferred teaching contrast]

#### Misconceptions and diagnosis

- assumed-language-availability: Assuming a Preferred Language card exists in the individual patient's language because the set covers 10 languages; the passage does not name the 10 languages.
  Diagnostic: A patient needs a language you cannot confirm is among the 10: do you hand over a card anyway or escalate to identify the language another way? Explain based on what the source does and does not say. [inferred teaching design]

#### Contextual examples

- intake-registration: Front-desk staff offer a Preferred Language card during check-in so a patient can indicate their language need before registration continues. [synthetic training example]

#### Unresolved

- Spanish (es) and Mandarin (zh) equivalents for 'Preferred Language cards' are not established in this passage and require human review; no sourced translation is recorded.
- The 10 languages in which the cards are available are not named in this passage.
- Card wording, format, and who provides the card at what moment are not described.

### I Speak Identification Cards [b2-i-speak-cards]

Identification cards that, per the source, should be readily available at the reception desk to allow people with LEP to identify their language easily. The passage does not expand the abbreviation LEP, list the languages on the cards, or describe their exact content.

Why it matters: Placement is operational, not incidental: if the cards are not readily available at reception, a person with LEP may be unable to identify their language at first contact, delaying language-access steps at intake.

Areas: intake-registration. Difficulty prior: 2/5. Competences: domain-knowledge, professional-terminology, terminology-usage, professional-judgment.

#### Terms and variation

- en: I Speak Identification Cards; alternatives: I Speak cards; register: administrative / reception-desk identification tool; 

#### Atomic sourced claims

- b2-claim-i-speak-placement (rule): I Speak Identification Cards should be readily available at the reception desk.
  Evidence: [p2-0] “I Speak Identification Cards that should be readily available at your reception desk”
- b2-claim-i-speak-purpose (definition): I Speak Identification Cards allow people with LEP to identify their language easily.
  Evidence: [p2-0] “allow people with LEP to identify their language easily”

#### Distinctions

- Versus Preferred Language cards: I Speak cards are tied in the source to a specific location (reception desk) and population (people with LEP) for language identification; Preferred Language cards are described more generally as patients informing providers of language needs and as available in 10 languages. [inferred teaching contrast]
- Versus Communication cards for individuals who cannot speak: I Speak cards support identifying a spoken language; communication cards are introduced separately for individuals who cannot speak, so language identification and non-speech communication are distinct needs in the passage. [inferred teaching contrast]

#### Misconceptions and diagnosis

- storage-vs-availability: Treating I Speak cards as filed office supplies rather than readily available at the reception desk, contradicting the source's placement instruction.
  Diagnostic: Cards are kept in a manager's office and brought out on request: does that satisfy 'readily available at your reception desk,' and what intake problem could result? [inferred teaching design]

#### Contextual examples

- intake-registration: A receptionist keeps I Speak Identification Cards visible at the front desk so a newly arrived patient can point to their language without needing English to ask. [synthetic training example]

#### Unresolved

- Spanish (es) and Mandarin (zh) equivalents for 'I Speak Identification Cards' are not established in this passage; no sourced translation is recorded.
- The abbreviation LEP is not expanded in this passage.
- Languages listed on the I Speak cards and the cards' exact wording are not given.

### communication card (for individuals who cannot speak) [b2-communication-cards-nonspeaking]

A card the source suggests having available for individuals who cannot speak. Two examples are named: a COVID-19 Communication Card and a Covid-19 Vaccine Communication Card. The passage uses tentative wording ('you may want to have') rather than a mandate, and does not describe card symbols, languages, or clinical use.

Why it matters: This addresses a different barrier from spoken-language identification: a patient who cannot speak needs a non-speech communication aid. Broadening the tentative suggestion into a universal mandate, or using it as a substitute for qualified interpreting or clinical assessment, exceeds what the 2021 source states.

Areas: intake-registration, professional-judgment-med. Difficulty prior: 3/5. Competences: domain-knowledge, professional-judgment, meaning-transfer.

#### Terms and variation

- en: communication card (for individuals who cannot speak); alternatives: communication cards; register: patient-communication aid; 

#### Atomic sourced claims

- b2-claim-comm-card-suggestion (rule): For individuals who cannot speak, the source suggests having a communication card available, using 'may want to' wording.
  Evidence: [p2-0] “For individuals who cannot speak you may want to have a communication card available.”
- b2-claim-comm-card-examples (context): The two examples given are the COVID-19 Communication Card and the Covid-19 Vaccine Communication Card.
  Evidence: [p2-0] “COVID-19 Communication Card and Covid-19 Vaccine Communication Card”

#### Distinctions

- Versus I Speak Identification Cards: Communication cards are for individuals who cannot speak; I Speak cards are for people with LEP to identify their language. One concerns speech ability, the other language identification. [inferred teaching contrast]

#### Misconceptions and diagnosis

- tentative-as-mandate: Reading 'you may want to have' as a strict requirement, or conversely dismissing the suggestion entirely; the source's modality is a recommendation, not 'must.'
  Diagnostic: Does the passage require every site to stock these cards, recommend considering them, or forbid them? Point to the exact modal wording. [inferred teaching design]
- aid-as-interpreting-substitute: Assuming a communication card replaces qualified interpreting or clinical communication support; the passage presents it only as a card to have available and gives no such substitution rule.
  Diagnostic: A nonspeaking patient also needs a language other than English: what does this passage alone authorize you to conclude about interpreting arrangements? [inferred teaching design]

#### Contextual examples

- intake-registration: During a vaccine visit, staff offer the Covid-19 Vaccine Communication Card to a patient who cannot speak so the patient can point to communicate basic needs. [synthetic training example]

#### Unresolved

- Spanish (es) and Mandarin (zh) equivalents for these card names are not established in this passage; no sourced translation is recorded.
- Card contents, symbols, languages, and instructions for use are not described.
- Whether the COVID-19 examples remain current after the 2021 publication must be verified separately.

### additional language access resources [b2-additional-language-access-resources]

A list of external resources the document points readers to for additional language-access information, spanning CLAS standards, federal civil-rights and LEP guidance, assessment/planning tools, and educational videos. The passage lists titles and brief descriptors only; it does not reproduce their content, so no rule should be derived from a title alone.

Why it matters: Staff must treat this as a pointer list requiring verification of current, authoritative content, not as substantive guidance itself; citing a listed title as if the passage had stated its requirements would misrepresent the source, especially given the 2021 date.

Areas: professional-judgment-med. Difficulty prior: 2/5. Competences: domain-knowledge, professional-judgment.

#### Terms and variation

- en: additional language access resources; alternatives: language access resources; register: professional reference / guidance list; 

#### Atomic sourced claims

- b2-claim-res-clas-blueprint (context): Listed resource: 'A BluePrint for Advancing National Standards for Culturally and Linguistically Appropriate Services (CLAS)'.
  Evidence: [p2-0] “A BluePrint for Advancing National Standards for Culturally and Linguistically Appropriate
     Services (CLAS)”
- b2-claim-res-hhs-guidance (context): Listed resource: United States Department of Health & Human Services Guidance to Federal Financial Assistance Recipients.
  Evidence: [p2-0] “United States Department of Health & Human Services Guidance to Federal Financial
     Assistance Recipients”
- b2-claim-res-civil-rights-providers (context): Listed resource: Civil Rights for Providers of Health Care and Human Services.
  Evidence: [p2-0] “Civil Rights for Providers of Health Care and Human Services”
- b2-claim-res-hhs-ocr-lep (context): Listed resource: HHS OCR link to LEP Resources and Guidance Documents.
  Evidence: [p2-0] “HHS OCR link to LEP Resources and Guidance Documents”
- b2-claim-res-national-origin (context): Listed resource on National Origin Discrimination, described as assisting agencies with benefit applications and other administrative procedures to ensure they do not deter or deny eligible national origin groups from obtaining services.
  Evidence: [p2-0] “National Origin Discrimination – to assist agencies with benefit applications and other
     administrative procedures, to ensure they do not deter or deny eligible national origin groups
     from obtaining services”
- b2-claim-res-effective-comm-video (context): Listed resource: Effective communication YouTube video on improving patient-provider communications.
  Evidence: [p2-0] “Effective communication YouTube video on improving patient-provider communications”
- b2-claim-res-mededportal (context): Listed resource: Medical School Curriculum Facilitator's Guide and PowerPoint 'Stopping Discrimination before it Starts: the Impact of Civil Rights Laws on Healthcare Disparities' (MedEdPORTAL Pub Id #7740).
  Evidence: [p2-0] “Medical School Curriculum Facilitator's Guide and PowerPoint: “Stopping Discrimination
     before it Starts: the Impact of Civil Rights Laws on Healthcare Disparities.” (MedEdPORTAL:
     Pub Id #7740)”
- b2-claim-res-lep-video (context): Listed resource: LEP Video on Breaking down the Language Barrier: Translating English Proficiency Policy into Practice.
  Evidence: [p2-0] “LEP Video on Breaking down the Language Barrier: Translating English Proficiency Policy
     into Practice”
- b2-claim-res-assessment-tool (context): Listed resource: Language Access Assessment and Planning Tool, described as a guide to walk you through your office to review for access.
  Evidence: [p2-0] “Language Access Assessment and Planning Tool: A guide to walk you through your office to
     review for access”
- b2-claim-res-teded-interpreters (context): Listed resource: 'How interpreters juggle two languages at Once' Ted-Ed.
  Evidence: [p2-0] “How interpreters juggle two languages at Once Ted-Ed”
- b2-claim-res-hearing-hands (context): Listed resource: Hearing Hands Samsung Ad illustrating barrier reduction for Deaf Community Member.
  Evidence: [p2-0] “Hearing Hands Samsung Ad illustrating barrier reduction for Deaf Community Member”

#### Distinctions

- Versus Substantive guidance in the document itself: This concept is only a list of external titles/descriptors; unlike the card instructions, it states no procedure, obligation, or threshold that a learner can apply without consulting and verifying the external source. [inferred teaching contrast]

#### Misconceptions and diagnosis

- title-as-rule: Deriving a legal or clinical obligation from a listed resource title (e.g., CLAS or civil-rights items) when the passage provides no content from those resources.
  Diagnostic: What specific obligation does this passage itself impose via the CLAS Blueprint listing, and what would you need to check outside the passage before acting? [inferred teaching design]

#### Contextual examples

- professional-judgment-med: A staff member uses the listed Language Access Assessment and Planning Tool title as a lead to locate the actual tool for an office access review, rather than treating the listing as the review itself. [synthetic training example]

#### Unresolved

- No URLs, publication dates, or current status are given for the listed resources in this passage; currency and authority must be verified separately, consistent with the source limitation that linked external tools must be verified.
- Spanish (es) and Mandarin (zh) renderings of these resource titles are not established in this passage; titles are retained in English as proper names.

## Typed graph

- b1-emergency-interpretation-exception → exception-to → b1-qualified-bilingual-staff: The emergency rule is an exception to the qualified-staff requirement: staff who do not meet the qualified criteria may interpret only in an emergency involving imminent threat to safety or welfare. [[p1-0] “If bilingual staff members do not meet these criteria, they can only provide interpretation services in an emergency involving imminent threat to the safety or welfare of an individual or the public.”]
- b1-health-care-interpreter-registry → step-before → b1-provider-responsibility-for-interpreter: Using the Registry to find qualified and certified interpreters precedes, but does not replace, the provider's responsibility to ensure any interpreter used is qualified or certified. [[p1-0] “Use the Health Care Interpreter Registry to find qualified and certified health care interpreters in Oregon.”; [p1-0] “The provider is responsible for ensuring that any interpreter used is a qualified or certified interpreter.”]
- b1-language-needs-assessment → step-before → b1-health-care-interpreter-registry: Determining likely languages is a planning step before finding interpreters for those languages through the Registry; the ordering is a teaching sequence inferred from the passage layout, not an explicitly stated causal rule. [inferred — review required]
- b2-preferred-language-cards → confusable-with → b2-i-speak-cards: Both are patient-facing cards used around language identification at intake, but the source assigns I Speak cards a reception-desk location and LEP language-identification purpose, while Preferred Language cards are described as available in 10 languages for patients to communicate language needs. [inferred — review required]
- b2-i-speak-cards → confusable-with → b2-communication-cards-nonspeaking: Both are cards offered at the point of contact, but I Speak cards identify a spoken language for people with LEP, whereas communication cards are suggested for individuals who cannot speak; confusing them leaves one of the two barriers unaddressed. [inferred — review required]

## Procedures

### Use Census Business Builder to generate a county language-access report

1. Visit https://cbb.census.gov/rae/#. [[p1-0] “Visit https://cbb.census.gov/rae/#.”]
2. Define your region by typing in the name of the county you are interested in generating a report for and selecting the correct auto-populated option. [[p1-0] “Define your region by typing in the name of the county you are interested in generating a report for and selecting the correct auto-populated option.”]
3. At the top of the webpage, under 'Change The Sector' ensure 'All Sectors' is selected. [[p1-0] “Under “Change The Sector” ensure “All Sectors” is selected.”]
4. Under 'Change Your Location' ensure the county and state you are interested in is selected. [[p1-0] “Under “Change Your Location” ensure the county and state you are interested in is selected.”]
5. Under 'Select Map Variable' ensure 'Total Population' is selected as the 1st variable. [[p1-0] “Under “Select Map Variable” ensure “Total Population” is selected as the 1st variable.”]
6. At the bottom left side of the webpage, select 'Create Report' to generate a detailed report. [[p1-0] “At the bottom left side of the webpage, select “Create Report” to generate a detailed report.”]
7. To save a copy of the report, you may download it as an Excel, CSV, or PDF file by clicking the downward facing arrow in the top right corner of the webpage. [[p1-0] “To save a copy of the report, you may download it as an Excel, CSV, or PDF file by clicking the downward facing arrow in the top right corner of the webpage.”]

### Find interpreter services in Oregon

1. Use the Health Care Interpreter Registry to find qualified and certified health care interpreters in Oregon. [[p1-0] “Use the Health Care Interpreter Registry to find qualified and certified health care interpreters in Oregon.”]
2. As the provider, ensure that any interpreter used is a qualified or certified interpreter. [[p1-0] “The provider is responsible for ensuring that any interpreter used is a qualified or certified interpreter.”]
3. For more on federal and state interpreter service requirements, read OHA's fact sheet and visit OHA's Health Care Interpreter Program page. [[p1-0] “To learn more about federal and state interpreter service requirements, read OHA’s fact sheet and visit OHA’s Health Care Interpreter Program page.”]

### Make language-identification and communication cards available at intake

1. Keep I Speak Identification Cards readily available at the reception desk so people with LEP can identify their language easily. [[p2-0] “I Speak Identification Cards that should be readily available at your reception desk to
allow people with LEP to identify their language easily.”]
2. Use Preferred Language cards as a tool for patients to communicate their language needs, noting they are available in 10 languages (languages not named in this passage). [[p2-0] “preferred language cards are a tool for patients to communicate their language
needs. Preferred Language cards are available in 10 languages.”]
3. For an individual who cannot speak, consider having a communication card available, such as the COVID-19 Communication Card or Covid-19 Vaccine Communication Card examples. [[p2-0] “For individuals who cannot speak you may want to have a communication card available.”; [p2-0] “COVID-19 Communication Card and Covid-19 Vaccine Communication Card”]

## Open questions / missing responsibilities

- Source is dated 06/10/2021; current federal and Oregon law, Section 1557 interpretation, Registry operation, Census Business Builder interface, and linked external tools must be verified separately and are not established by these passages.
- No sourced Spanish (es) or Mandarin (zh) equivalents are provided in either passage for any concept; bilingual-terminology coverage is missing for all concepts and must not be invented as sourced fact. This blocks equivalent-recall teaching in es/zh until human-approved translations are supplied.
- The passages do not define 'certified' versus 'qualified,' specify how providers verify qualification/certification, or specify how bilingual staff qualification is assessed.
- The passages do not define operational thresholds for 'imminent threat' beyond safety or welfare of an individual or the public.
- LEP is used in p2-0 but not expanded there; its expansion must not be taught as sourced from p2-0.
- The 10 languages for Preferred Language cards, the languages/content of I Speak cards, and communication-card contents, symbols, and instructions are not specified.
- Configured translation areas history-symptoms, diagnosis-explanation, informed-consent, treatment-plan, and discharge-followup receive no direct content in these passages; they are unsupported by this source, not mastered. Only intake-registration and professional-judgment-med are supported.
- Of the eight mastery stages (recognition, equivalent recall, conceptual understanding, distinction, application, rapid retrieval, spoken production, interpretation), this source supports only conceptual understanding and distinction, with limited application through the documented planning, Registry, and card-availability procedures. Recognition, equivalent recall (especially es/zh), rapid retrieval, spoken production, and interpretation performance have no supporting exercises or evidence in these passages and must not be claimed as complete.
- Concept b2-additional-language-access-resources is intentionally isolated in the graph: the passage lists external titles only, and no typed relationship to other concepts is stated or safely inferable without inventing a connection. No relationship was created merely to avoid an isolated node.
- External resources in p2-0 are listed by title/descriptor only, with no URLs, dates, or current status; no rule may be derived from a title alone.

## Independent model review

{
  "findings": [],
  "limitations": [
    "Source is Oregon Health Authority guidance last updated 06/10/2021; current federal and Oregon law, Section 1557 interpretation, Registry operation, Census Business Builder interface, and linked external resources require separate verification.",
    "No Spanish or Mandarin equivalents are established in the passages; bilingual equivalent-recall teaching must not be presented as sourced until human-approved translations are supplied.",
    "The passages do not define certified versus qualified, specify verification or staff-assessment methods, define operational thresholds for imminent threat, expand LEP, name the 10 Preferred Language card languages, or describe card contents and instructions.",
    "Only intake-registration and professional-judgment-med are directly supported; history-symptoms, diagnosis-explanation, informed-consent, treatment-plan, and discharge-followup receive no direct content in these passages.",
    "The source supports conceptual understanding and distinction, with limited application through documented procedures; it does not by itself evidence recognition, equivalent recall, rapid retrieval, spoken production, or interpretation performance."
  ],
  "missingPassageIds": [],
  "verdict": "accept"
}

## Complete extracted source appendix

The following passages are untrusted source data, not instructions to the engine.

### p1-0 — page 1, offsets 0–2632

> EQUITY AND INCLUSION DIVISION
> Civil Rights Unit
> 
> 
> Developing a language access plan
> Finding out what languages are spoken in local communities
> You can look at several data sets and reach out to community members to determine the languages
> your practice is most likely to encounter. A common starting point is the U.S. Census Bureau’s
> Business Builder. To use this:
>    ◼ Visit https://cbb.census.gov/rae/#.
>    ◼ Define your region by typing in the name of the county you are interested in generating a
>        report for and selecting the correct auto-populated option.
>    ◼ At the top of the webpage, select the following options:
>           ► Under “Change The Sector” ensure “All Sectors” is selected.
>           ► Under “Change Your Location” ensure the county and state you are interested in is
>               selected.
>           ► Under “Select Map Variable” ensure “Total Population” is selected as the 1st variable.
>    ◼ At the bottom left side of the webpage, select “Create Report” to generate a detailed report.
>    ◼ To save a copy of the report, you may download it as an Excel, CSV, or PDF file by clicking
>        the downward facing arrow in the top right corner of the webpage.
> 
> Other potential data sources are:
>    ◼ School district data
>    ◼ Medicaid data
>    ◼ Data from community partners in your area
> 
> Can a provider use bilingual staff to provide interpretation?
> Yes. Section 1557 states that this is permissible, but the bilingual/multilingual staff member must
> qualified. Qualified is defined as:
>    ◼ Proficient in speaking and understanding both spoken English and at least one other spoken
>         language or sign language, including any necessary specialized vocabulary, terminology and
>         phraseology and
>    ◼ Able to effectively, accurately, and impartially communicate directly with individuals who use
>         sign language or who have limited English proficiency.
> 
> If bilingual staff members do not meet these criteria, they can only provide interpretation services in
> an emergency involving imminent threat to the safety or welfare of an individual or the public.
> 
> Where to find resources for interpreter services in Oregon
> Use the Health Care Interpreter Registry to find qualified and certified health care interpreters in
> Oregon. The provider is responsible for ensuring that any interpreter used is a qualified or certified
> interpreter.
> 
> To learn more about federal and state interpreter service requirements, read OHA’s fact sheet and
> visit OHA’s Health Care Interpreter Program page.
> 
> 
> 
> 
> Developing a Language Access Plan                                                Last updated 06/10/2021
> 

### p2-0 — page 2, offsets 0–1968

> Are there any tools for patients to inform providers about their language needs?
> Yes, preferred language cards are a tool for patients to communicate their language
> needs. Preferred Language cards are available in 10 languages.
> 
> There are also I Speak Identification Cards that should be readily available at your reception desk to
> allow people with LEP to identify their language easily.
> 
> For individuals who cannot speak you may want to have a communication card available. Here are
> two examples: COVID-19 Communication Card and Covid-19 Vaccine Communication Card
> 
> Where can I go for additional language access resources?
>   ◼ A BluePrint for Advancing National Standards for Culturally and Linguistically Appropriate
>      Services (CLAS)
>   ◼ United States Department of Health & Human Services Guidance to Federal Financial
>      Assistance Recipients
>   ◼ Civil Rights for Providers of Health Care and Human Services
>   ◼ HHS OCR link to LEP Resources and Guidance Documents
>   ◼ National Origin Discrimination – to assist agencies with benefit applications and other
>      administrative procedures, to ensure they do not deter or deny eligible national origin groups
>      from obtaining services
>   ◼ Effective communication YouTube video on improving patient-provider communications
>   ◼ Medical School Curriculum Facilitator's Guide and PowerPoint: “Stopping Discrimination
>      before it Starts: the Impact of Civil Rights Laws on Healthcare Disparities.” (MedEdPORTAL:
>      Pub Id #7740)
>   ◼ LEP Video on Breaking down the Language Barrier: Translating English Proficiency Policy
>      into Practice
>   ◼ Language Access Assessment and Planning Tool: A guide to walk you through your office to
>      review for access
>   ◼ How interpreters juggle two languages at Once Ted-Ed
>   ◼ Hearing Hands Samsung Ad illustrating barrier reduction for Deaf Community Member
> 
> 
> 
> 
> Developing a Language Access Plan                                              Last updated 06/10/2021
> 
