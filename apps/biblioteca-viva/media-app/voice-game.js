/** Browser-independent, deterministic game evidence: error detection only. No interpreting mastery. */
const norm=s=>String(s||'').toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^\p{L}\p{N} ]/gu,'').replace(/\s+/g,' ').trim();
export function evaluateInterruption(item,{atMs,mode='tap',spokenText='',usedHint=false}={}){
 if(!item?.audio||!item?.review?.bilingualApproved||!item?.review?.domainApproved)return {state:'unscored',reason:'pending audio alignment and professional review',credit:'none'};
 if(!Number.isFinite(atMs)||atMs<0)return {state:'unscored',reason:'invalid playback position',credit:'none'};
 const errors=Array.isArray(item.errors)?item.errors:[];
 if(!errors.length||errors.some(e=>!Number.isFinite(e.startMs)||!Number.isFinite(e.endMs)))return {state:'unscored',reason:'no authored, validated cue time windows',credit:'none'};
 const cue=errors.find(e=>atMs>=Math.max(0,e.startMs-1000)&&atMs<=e.endMs+1400);
 if(!cue)return {state:'miss',reason:'No target error in the detected window',credit:'error-detection-only'};
 if(mode==='voice'){
  if(!norm(spokenText))return {state:'unscored',reason:'speech not recognized clearly',credit:'none'};
  const keywords=(cue.recognizedPhrases||[]).map(norm).filter(Boolean);
  if(!keywords.length)return {state:'timing-only',reason:'spoken phrase cue not validated',credit:'error-detection-only'};
  if(!keywords.some(k=>(' '+norm(spokenText)+' ').includes(' '+k+' ')))return {state:'timing-only',reason:'voice arrived in correct window, but phrase requires review',credit:'error-detection-only'};
 }
 return {state:usedHint?'assisted-detection':'detected',errorId:cue.id,category:cue.category,
  reason:'Correctly interrupted an authored meaning-change interval.',credit:'error-detection-only'};
}
export function observation(item,result,{atMs,mode}={}){
 if(!['detected','assisted-detection','timing-only','miss','unscored'].includes(result.state))throw Error('Invalid detection state');
 return {schemaVersion:1,mediaId:item.id,atMs,mode,state:result.state,errorId:result.errorId||null,
  confidence:result.state==='detected'?'bounded':result.state==='assisted-detection'?'assisted':'none',
  evidenceType:'meaning-change-detection',independentSpokenInterpretation:false,
  reviewVersion:item.review?.reviewDate||null};
}
