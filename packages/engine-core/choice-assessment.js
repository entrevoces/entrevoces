// Narrow assessment boundary for game-like choice interactions.
// This module NEVER infers speech, listening, professional competence or
// interpreting fidelity from touch/motor events. It does not mutate progress.

const LANGS=new Set(['en','es','zh']);

/**
 * Evaluate an actual, explicit term-selection opportunity. Unknown/duplicate
 * options and timeouts yield "unassessed" rather than an incorrect skill mark.
 * A game may show any animation or award any entertainment score separately.
 */
export function assessBilingualChoice({concept,selectedConceptId,candidateConcepts,sourceLanguage='en',targetLanguage='es',assistance=[],opportunityId=''}) {
  const fail=reason=>({assessable:false,reason,evidence:null});
  if(!LANGS.has(targetLanguage)||!LANGS.has(sourceLanguage)||sourceLanguage===targetLanguage)return fail('unsupported-language');
  if(!concept?.conceptId||!concept.terms?.[sourceLanguage]?.term||!concept.terms?.[targetLanguage]?.term||!Array.isArray(concept.sourceIds)||!concept.sourceIds.length)return fail('unverified-source-concept');
  if(!Array.isArray(candidateConcepts)||candidateConcepts.length<2||candidateConcepts.length>6)return fail('invalid-options');
  if(!Array.isArray(assistance)||assistance.length>20||assistance.some(v=>typeof v!=='string'||!v||v.length>120))return fail('invalid-assistance');
  const byId=new Map(candidateConcepts.map(c=>[c?.conceptId,c]));
  if(byId.size!==candidateConcepts.length||!byId.has(concept.conceptId))return fail('invalid-options');
  const translated=new Set(),sources=new Set();
  for(const c of candidateConcepts){
    if(c?.domainId!==concept.domainId||!c.terms?.[targetLanguage]?.term||!c.terms?.[sourceLanguage]?.term)return fail('unsupported-option');
    const key=c.terms[targetLanguage].term.normalize('NFC').toLocaleLowerCase();
    if(translated.has(key))return fail('ambiguous-duplicate-translation');
    translated.add(key);
    const sourceKey=c.terms[sourceLanguage].term.normalize('NFC').toLocaleLowerCase();
    if(sources.has(sourceKey))return fail('ambiguous-source-terms');
    sources.add(sourceKey);
  }
  if(selectedConceptId==null)return fail('no-semantic-selection');
  if(!byId.has(selectedConceptId))return fail('selection-outside-options');
  const correct=selectedConceptId===concept.conceptId;
  const selected=byId.get(selectedConceptId);
  return {assessable:true,correct,reason:correct?'equivalent-preserved':'different-concept-selected',
    evidence:{conceptId:concept.conceptId,areaId:concept.areaIds?.[0]??null,activityType:'bilingual',stage:2,languageDirection:`${sourceLanguage}->${targetLanguage}`,responseModality:'touch',assessmentMethod:'visible-term-choice',correct,score:correct?1:0,confidence:.7,assistance:assistance.slice(),...(correct?{}:{misconceptionTag:'bilingual-distinction'}),responseSummary:`${concept.terms[sourceLanguage].term} → ${selected.terms[targetLanguage].term}${opportunityId?` [${opportunityId}]`:''}`.slice(0,280)}
  };
}
