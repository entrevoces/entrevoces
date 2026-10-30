import {creativeDNA} from './creative-bible.mjs';
import {chooseGroundedTerms} from './curation.mjs';
/* Host-owned creative requirements. Models may invent stories, but not invent qualifications or source evidence. */
export const TYPES=Object.freeze({
 'audio-drama':{minWords:600,sections:5,brief:'An original episodic audio drama with recurring adult characters, dry humor, layered motives, escalating stakes, believable speech, a satisfying ending and an episode hook.',deliverable:'full script with dialogue, SFX and music cues, characters, glossary, error moments and scene durations'},
 'catch-the-change':{minWords:230,sections:4,brief:'A 3-person spoken interpreting simulation: source utterance, plausible incorrect interpretation, intervention, repair and continuation. Error is subtle but significant.',deliverable:'multiple turns, verbatim source and interpreted lines, exactly specified erroneous claims, correction, cue timing plan'},
 'audio-mystery':{minWords:500,sections:4,brief:'An uncanny choice-driven audio mystery where chronology, probability, attribution, or negation changes the outcome. At least three meaningful choices.',deliverable:'complete reachable branch-node graph, dialogue, cues, alternate conclusions'},
 'story':{minWords:450,sections:4,brief:'An emotionally engaging, warm and surprising standalone narrative, told as entertainment rather than instructional prose.',deliverable:'complete narrative, characters, voice narration beats and learning takeaway'},
 'podcast':{minWords:650,sections:5,brief:'Friendly original talk-show, interview or call-in podcast episode with authentic host dynamics and memorable examples.',deliverable:'complete host/guest script, scene breaks, actionable listening prompts'},
 'song':{minWords:140,sections:3,brief:'Memorable original Spanish-language song using elegant or witty metaphor, with meaningful chorus, emotional arc, varied rhyme and singable lines.',deliverable:'complete original lyrics, production concept, <=1000-character Suno prompt, curriculum connections'},
 'film':{minWords:180,sections:5,brief:'An emotionally vivid short film with striking situation, audible dialogue and visual punchline. Realistic iPhone production strategy.',deliverable:'complete script, timecoded storyboard, captions, iPhone production directions; mark video pending'},
 'sound-bites':{minWords:160,sections:3,brief:'A collection of concise, natural spoken phrases about one professional concept, showing dialect and register without stereotypes.',deliverable:'8 to 12 contextual utterances, translations, critical distinctions and speaker directions'}
});
export const ERROR_CLASSES=['negation','quantity','time','frequency','modality','uncertainty','attribution','condition','procedural-status','register','meaning-omission','unsupported-addition'];
export const PRODUCTION_STAGES=['proposed','script-draft','semantic-reviewed','editorially-reviewed','audio-pending','audio-produced','video-produced','bilingual-reviewed','published'];
export function recommendedKinds(skill){
 const s=String(skill||'').toLowerCase();
 if(/negat|time|dose|frequency|number|uncertain|modality|condition|attribut|fidel|omission/.test(s))return ['catch-the-change','audio-drama','song'];
 if(/knowledge|procedure|legal|medical|concept|terminolog/.test(s))return ['audio-mystery','podcast','story','song'];
 return ['audio-drama','catch-the-change','podcast','song'];
}
export function makeBrief(knowledge,{topic='negation',domain='medical',kind='catch-the-change',index=0}={}){
 if(!TYPES[kind])throw Error(`Unknown media kind: ${kind}`);
 const selection=chooseGroundedTerms(knowledge,{topic,domain,index,count:7});
 const id=`${kind}-${domain}-${index+1}`;
 return {id,kind,topic,domain,direction:'en-es',creativeDNA:creativeDNA({id,kind,topic,domain}),
  audience:'Adult interpreters in training; mature warmth and wit, without gender or cultural stereotypes.',
  primarySkill:topic,termIds:selection.map(x=>x.id),sourceIds:[...new Set(selection.map(x=>x.source_id))],
  knowledge:selection.map(x=>({id:x.id,en:x.english,es:x.spanish,context:x.context,caution:x.caution,review:x.review_state,source_id:x.source_id,groundingReason:x.groundingReason})),
  brief:TYPES[kind].brief,deliverable:TYPES[kind].deliverable,minWords:TYPES[kind].minWords,
  editorialConstraint:'Every important topic must be grounded in the selected domain. Treat clinical/legal guidance as provisional; write character-driven entertainment with truthful, explicitly fictional interpretation repairs.',
  review:'Every bilingual interpretation is a draft until reviewed by a qualified bilingual practitioner.',
  audioPolicy:'Author text, timing, sound-design and casting manifests now. Never call a transcription API a speech synthesizer; do not assert audio exists until ingested.'};
}
