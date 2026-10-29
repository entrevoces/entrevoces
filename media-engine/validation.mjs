import {TYPES,ERROR_CLASSES,PRODUCTION_STAGES} from './blueprints.mjs';
import {existsSync} from 'node:fs';import {resolve,relative} from 'node:path';
const wordCount=s=>String(s||'').match(/\S+/g)?.length||0;
const safeString=x=>typeof x==='string'&&x.trim().length>0;
export function validateProduction(item,{knowledge,assetRoot=null,strict=false}={}){
 const errors=[],warnings=[];
 if(!item||typeof item!=='object')return {ok:false,errors:['Not an object'],warnings};
 if(!/^[a-z0-9][a-z0-9-]{2,96}$/.test(item.id||''))errors.push('Invalid stable media ID');
 if(!TYPES[item.kind])errors.push('Unsupported media format');
 if(!safeString(item.title)||!safeString(item.synopsis))errors.push('Title and synopsis required');
 if(!PRODUCTION_STAGES.includes(item.status))errors.push('Unknown production status');
 if(!Array.isArray(item.termIds)||!item.termIds.length)errors.push('At least one knowledge-linked term required');
 if(knowledge){const known=new Set(knowledge.terms.map(t=>t.id));for(const id of item.termIds||[])if(!known.has(id))errors.push('Unknown knowledge term '+id);}
 if(item.kind==='audio-drama'||item.kind==='podcast'||item.kind==='story'||item.kind==='film'||item.kind==='song'){
  const count=wordCount(item.script);
  if(count<(TYPES[item.kind]?.minWords||0)) (strict?errors:warnings).push(`Draft too short: ${count} words for ${item.kind}; required ${TYPES[item.kind]?.minWords}`);
 }
 if(item.kind==='catch-the-change'){
  if(!Array.isArray(item.turns)||item.turns.length<3)errors.push('Voice-first exercise requires at least three turns');
  const targets=item.errors||[];
  if(!targets.length)errors.push('At least one authored meaning-error target required');
  for(const e of targets){
   if(!ERROR_CLASSES.includes(e.category))errors.push('Unrecognized error class');
   if(!safeString(e.original)||!safeString(e.wrong)||!safeString(e.repair))errors.push('Every error needs exact original, wrong, and repaired wording');
   if(e.startMs!=null&&(!Number.isFinite(e.startMs)||e.startMs<0||!Number.isFinite(e.endMs)||e.endMs<=e.startMs))errors.push('Invalid error cue time window');
   // The original, deliberately wrong, and repaired wording must actually be
   // spoken in the corresponding source, interpreter and repair turns.
   const exact=[['audibleSource','sourceTurnIndex','en'],['audibleWrong','wrongTurnIndex','es'],['audibleRepair','repairTurnIndex','es']];
   for(const [label,indexKey,expectedLang] of exact){
     const turn=item.turns?.[e[indexKey]];
     const norm=x=>String(x||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase().replace(/[^\p{L}\p{N} ]/gu,' ').replace(/\s+/g,' ').trim();
     const phrase=norm(e[label]);
     if((strict||item.status==='published')&&(!phrase||!turn||turn.language!==expectedLang||!(' '+norm(turn.text)+' ').includes(' '+phrase+' ')))errors.push(`${label} not present in the expected ${expectedLang} audio turn`);
     else if(!phrase)warnings.push('Audio phrase alignment is not yet authored');
   }

  }
 }
 if(item.kind==='audio-mystery'){
  const nodes=item.nodes||{};if(!nodes[item.start])errors.push('Missing start node');
  const seen=new Set(),queue=[item.start];let terminals=0;
  while(queue.length){const id=queue.shift();if(seen.has(id))continue;seen.add(id);const n=nodes[id];if(!n){errors.push('Unresolved branch '+id);continue;}if(!Array.isArray(n.choices)||n.choices.length===0){terminals++;continue;}for(const c of n.choices){if(!safeString(c.label)||!nodes[c.next])errors.push('Invalid branch choice');else queue.push(c.next);}}
  if(terminals<2)errors.push('Mystery needs at least two reachable endings');
  if(seen.size!==Object.keys(nodes).length)errors.push('Unreachable story nodes');
 }
 if(item.audio){
  if(!/^media\/[a-z0-9_-]+\.(mp3|m4a|wav|ogg)$/i.test(item.audio))errors.push('Unsafe audio path');
  if(assetRoot){const abs=resolve(assetRoot,item.audio);if(relative(resolve(assetRoot),abs).startsWith('..')||!existsSync(abs))errors.push('Audio asset absent');}
 }
 if(item.cover){if(!/^covers\/[a-z0-9_-]+\.(webp|jpg|png|svg)$/i.test(item.cover))errors.push('Unsafe cover image path');}
 if(item.sunoUrl){try{const u=new URL(item.sunoUrl);if(u.hostname!=='suno.com'||u.protocol!=='https:'||!/^\/s\/[a-zA-Z0-9]+$/.test(u.pathname))throw Error();}catch{errors.push('Invalid Suno share link');}}
 if(item.status==='published'){
  if(!item.rights||item.rights.status!=='cleared')errors.push('Cannot publish without cleared rights');
  if(!item.review?.bilingualApproved)errors.push('Cannot publish without bilingual practitioner review');
  if(['audio-drama','catch-the-change','audio-mystery','podcast'].includes(item.kind)&&!item.audio)errors.push('Cannot publish audio content without audio');
 }
 if(item.status==='published'&&(!item.review?.domainApproved||!item.review?.editorialApproved))errors.push('Domain and editorial human review must be complete before publication');
 if(!item.review?.bilingualApproved)warnings.push('Bilingual/domain review outstanding; no automatic interpreter proficiency award');
 if(item.audio&&!item.transcript)warnings.push('Audio has no aligned transcript/captions');
 return {ok:!errors.length,errors,warnings};
}
export function validateCatalog(catalog,opts={}){
 if(!Array.isArray(catalog.items))return {ok:false,errors:['items must be an array'],warnings:[]};
 const ids=new Set(),errors=[],warnings=[];
 for(const item of catalog.items){if(ids.has(item.id))errors.push('Duplicate media ID '+item.id);ids.add(item.id);const result=validateProduction(item,opts);errors.push(...result.errors.map(e=>`${item.id}: ${e}`));warnings.push(...result.warnings.map(e=>`${item.id}: ${e}`));}
 return {ok:!errors.length,errors,warnings,items:catalog.items.length};
}
export function scoreInterruption(item,atMs,{mode='tap',spokenText=''}={}){
 if(!item||item.kind!=='catch-the-change')throw Error('Not a voice-first error-detection exercise');
 if(!item.audio||!item.review?.bilingualApproved||!item.review?.domainApproved)return {status:'unscored',reason:'Audio and independent bilingual review required for validated scoring'};
 const e=(item.errors||[]).find(e=>e.startMs!=null&&atMs>=e.startMs-1200&&atMs<=e.endMs+2000);
 if(!e)return{status:'miss',reason:'No authored error cue near this point',atMs};
 if(mode==='voice'){
  const spoken=String(spokenText).toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').trim();
  if(!spoken)return{status:'unscored',reason:'No recognized spoken words; manual review needed'};
  const cues=(e.recognizedPhrases||[]).map(x=>x.toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,''));
  if(cues.length&&!cues.some(c=>{const words=x=>x.split(/[^\p{L}\p{N}]+/u).filter(Boolean);const a=words(spoken),b=words(c);return b.length&&a.some((_,i)=>b.every((w,j)=>a[i+j]===w))}))return {status:'timing-only',errorId:e.id,reason:'Timing matched; spoken identification was not established',atMs,skillCredit:'error-detection-only'};
 }
 return {status:'detected',errorId:e.id,category:e.category,atMs,reason:'Detected authored error time window; not independent interpreting proficiency'};
}

/** The media shelf may contain drafts; only the published filter can claim production readiness. */
export function publicationGate(item,options={}){
 const valid=validateProduction(item,{...options,strict:true});
 const errors=[...valid.errors];
 if(!item.audio&&!item.sunoUrl)errors.push('No playable approved media available');
 if(item.rights?.status!=='cleared')errors.push('Rights are not cleared');
 if(!item.review?.bilingualApproved||!item.review?.domainApproved)errors.push('Professional medical/legal and bilingual review incomplete');
 if(item.audio&&!item.transcript)errors.push('Missing accessible transcript');
 if(!String(item.script||item.body||item.lyrics||'').trim())errors.push('No complete accessible authored script supplied');
 return {ok:errors.length===0,errors,warnings:valid.warnings};
}
