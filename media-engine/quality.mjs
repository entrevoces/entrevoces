/** Advisory audio QA; transcription accuracy is imperfect, and cannot self-certify medical/legal correctness. */
// Deliberately advisory: ASR may write 'fifteen' instead of '15'. Detect common
// English/Spanish quantities without using fuzzy guesses that could certify speech.
const NUMBER_WORDS=Object.freeze({zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,
 cero:0,un:1,una:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20});
const numeric=s=>{
 const tokens=String(s||'').toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').match(/\d+(?:[.,]\d+)?|\p{L}+/gu)||[];
 return new Set(tokens.flatMap(token=>/^[0-9]+(?:[.,][0-9]+)?$/.test(token)?[String(Number(token.replace(',','.')))]:Object.hasOwn(NUMBER_WORDS,token)?[String(NUMBER_WORDS[token])]:[]));
};
const patterns={negation:/\b(?:not|no|never|without|sin|nunca|ningun[ao]?|jamás|tampoco)\b/giu,
 uncertainty:/\b(?:might|maybe|perhaps|possibly|unsure|uncertain|tal vez|quizá|quizás|probablemente|podría)\b/giu,
 permission:/\b(?:may|must|shall|should|puede|debe|tiene que)\b/giu};
const groups=(s,pattern)=>[...(String(s||'').match(pattern)||[])].map(x=>x.toLocaleLowerCase());
export function compareAudioText(expected,heard){
 const flags=[],e=numeric(expected),h=numeric(heard);
 if([...e].some(v=>!h.has(v))||[...h].some(v=>!e.has(v)))flags.push('numbers-differ');
 for(const[k,re]of Object.entries(patterns)){const a=groups(expected,re),b=groups(heard,re);if(a.length!==b.length)flags.push(`${k}-count-differs`);}
 const words=s=>String(s||'').toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').match(/\p{L}+/gu)||[];
 const a=words(expected),b=words(heard),freq=new Map();for(const w of b)freq.set(w,(freq.get(w)||0)+1);
 let overlap=0;for(const w of a){if(freq.get(w)>0){overlap++;freq.set(w,freq.get(w)-1)}}
 return {wordOverlap:a.length?overlap/a.length:0,reviewFlags:flags,autoApproval:false,description:'Heuristic transcription comparison; not bilingual interpretation assessment'};
}
export function productionPacket(item){
 if(!item?.script)throw Error('A complete written script is required for sound production');
 return {mediaId:item.id,title:item.title,languagePair:'en-es',text:item.script,
  casting:item.cast||item.productionPlan?.recording?.casting||[],
  plannedSegments:item.productionPlan?.recording?.segments||item.turns||[],
  sourceConcepts:item.termIds||[],voiceSource:'human narrator or independently licensed speech synthesis',
  metaAsr:'muse-voice-transcribe-1.0',requirements:{channels:'reviewed voice recording, one speaker per stem when feasible',
   format:'compressed MP3 or M4A plus lossless WAV master',transcripts:'faithful subtitles per speaker and optional bilingual line alignment',
   cueTimes:'reconcile exact audible start/end of the incorrect phrase after final mixing',
   review:'independent qualified bilingual practitioner listens to source and target language audio',rights:'voice/performer/musical rights receipt',
   privacy:'fictional scenarios, never private patient or case recordings'},
  notProduced:true};
}
export async function advisoryMetaAudioReview(client,{item,transcript}={}){
 if(!item||typeof transcript!=='string'||transcript.length<5)throw Error('Record and transcribe actual source audio first');
 const comparable=compareAudioText(item.script||'',transcript);
 const result=await client.textJSON({model:'muse-spark-1.3',system:'You are an advisory recording QA reviewer. Compare an expected script with a fallible ASR transcript. Output JSON {verdict:"needs-listening-review"|"re-record-recommended",flags:[{kind,segment,explanation}],speakerNotes:string[],cautions:string[]}. Pay particular attention to negation, numbers, uncertainty, medication and legal status. DO NOT claim independently validated bilingual accuracy or human credentials. No diagnosis, legal advice, or invented certainty.',user:{expectedScript:item.script,heardASR:transcript,heuristics:comparable,termIds:item.termIds},maxTokens:2200});
 if(!Array.isArray(result.data.flags)||!Array.isArray(result.data.cautions))throw Error('Unstructured QA response');
 return {model:result.model,modelReview:result.data,heuristics:comparable,approved:false,humanReviewPending:true};
}
