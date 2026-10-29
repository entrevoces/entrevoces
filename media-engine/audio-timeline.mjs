/** Edit-decision list (EDL) and time-alignment validation for pre-rendered bilingual audio. No TTS model is implied. */
import {createHash} from 'node:crypto';
const LANG=new Set(['en','es','zh']);
const ID=/^[a-z][a-z0-9_-]{1,79}$/;
const normalize=s=>String(s??'').normalize('NFC').trim();
export function compileTimeline({mediaId,segments=[],errors=[],tailMs=500}={}) {
 if(!ID.test(mediaId||''))throw Error('Audio timeline requires a stable media ID');
 if(!Array.isArray(segments)||segments.length<2||segments.length>160)throw Error('Audio timeline requires 2–160 segments');
 if(!Number.isInteger(tailMs)||tailMs<0||tailMs>5000)throw Error('Invalid timeline tail');
 let time=0;const result=[];const ids=new Set();
 for(const seg of segments){
  if(!seg||!ID.test(seg.id||'')||ids.has(seg.id))throw Error('Invalid/duplicate audio segment ID');ids.add(seg.id);
  if(!LANG.has(seg.language)||!normalize(seg.speaker)||!normalize(seg.text))throw Error('Each segment requires speaker, language and script');
  const duration=seg.durationMs,pause=seg.pauseAfterMs??350;
  if(!Number.isInteger(duration)||duration<200||duration>120000||!Number.isInteger(pause)||pause<0||pause>8000)throw Error('Segment requires measured duration and bounded pause in milliseconds');
  result.push({id:seg.id,language:seg.language,speaker:seg.speaker,text:seg.text,startMs:time,endMs:time+duration,pauseAfterMs:pause,role:seg.role||'speaker',asset:seg.asset||null});
  time+=duration+pause;
 }
 if(time>60*60*1000)throw Error('A listening session cannot exceed one hour');
 const aligned=[];
 for(const cue of errors){
  const seg=result.find(x=>x.id===cue.segmentId);
  if(!seg||!ID.test(cue.id||''))throw Error('Cue references a missing segment');
  const a=cue.offsetStartMs,b=cue.offsetEndMs;
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<=a||b>seg.endMs-seg.startMs)throw Error('Cue must fit within the utterance audio');
  if(!normalize(cue.original)||!normalize(cue.wrong)||!normalize(cue.repair)||cue.original===cue.wrong)throw Error('Cue must preserve distinct original, wrong and repaired wording');
  aligned.push({id:cue.id,segmentId:cue.segmentId,startMs:seg.startMs+a,endMs:seg.startMs+b,original:cue.original,wrong:cue.wrong,repair:cue.repair,category:cue.category,recognizedPhrases:cue.recognizedPhrases||[]});
 }
 aligned.sort((a,b)=>a.startMs-b.startMs);
 for(let i=1;i<aligned.length;i++)if(aligned[i].startMs<aligned[i-1].endMs)throw Error('Overlapping errors must be disambiguated before publishing');
 const edl={schemaVersion:1,mediaId,durationMs:time+tailMs,segments:result,errors:aligned,alignmentState:'planned-not-verified'};
 return {...edl,sha256:createHash('sha256').update(JSON.stringify(edl)).digest('hex')};
}
export function verifyRecordedTimeline(timeline,{audioDurationMs,transcript,cueReview={}}={}) {
 const errors=[];
 if(timeline?.schemaVersion!==1||!Array.isArray(timeline.segments)||!Array.isArray(timeline.errors))errors.push('Missing canonical timeline');
 if(!Number.isFinite(audioDurationMs)||audioDurationMs<=0)errors.push('Measured audio duration missing');
 if(Number.isFinite(audioDurationMs)&&Math.abs(audioDurationMs-(timeline.durationMs||0))>1200)errors.push('Audio duration differs from planned timeline by more than 1.2s');
 if(typeof transcript!=='string'||transcript.trim().length<30)errors.push('A substantial faithful transcript is required');
 for(const cue of timeline?.errors||[])if(cueReview[cue.id]!==true)errors.push(`Human-reviewed audible timestamp missing for ${cue.id}`);
 return {ok:errors.length===0,errors,automatedHumanApproval:false};
}
/** Audio-first assessment: matching timing is not the same as identifying the mistake. */
export function assessCatch({timeline,atMs,response='',input='tap',assistance=false,windowBeforeMs=750,windowAfterMs=1000,reviewed=false}={}) {
 const unassessed=reason=>({status:'unassessed',reason,skillCredit:null});
 if(!reviewed||timeline?.alignmentState!=='human-verified')return unassessed('Audio, bilingual meaning and cue boundaries await human signoff');
 if(!Number.isFinite(atMs)||atMs<0||!['tap','speech','keyboard'].includes(input))return unassessed('Invalid interaction');
 const cue=timeline.errors.find(e=>atMs>=e.startMs-windowBeforeMs&&atMs<=e.endMs+windowAfterMs);
 if(!cue)return {status:'miss',reason:'No reviewed error was audible in this window',skillCredit:'error-noticing-only'};
 if(input==='speech'){
  const words=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
  const spoken=words(response);if(!spoken.length)return unassessed('No reliably recognized spoken response');
  const found=(cue.recognizedPhrases||[]).some(x=>{const p=words(x);return p.length>0&&spoken.some((w,i)=>p.every((z,j)=>spoken[i+j]===z));});
  if(!found)return {status:'timing-only',reason:'An interruption was detected; the verbal identification was not established',skillCredit:'error-noticing-only',cueId:cue.id};
 }
 return {status:assistance?'assisted':'caught',cueId:cue.id,category:cue.category,reason:'The response identified a reviewed meaning-change window',skillCredit:'error-noticing-only'};
}
export function toSRT(timeline){if(!timeline?.segments?.length)throw Error('Timeline missing segments');const stamp=t=>{const ms=t%1000,s=Math.floor(t/1000)%60,m=Math.floor(t/60000)%60,h=Math.floor(t/3600000);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`};return timeline.segments.map((s,i)=>`${i+1}\n${stamp(s.startMs)} --> ${stamp(s.endMs)}\n${s.speaker}: ${s.text}\n`).join('\n');}
