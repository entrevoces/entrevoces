/** Stable JSON Schemas for Meta Muse build-time stages. Shape, never factual approval.
 * Meta's strict JSON schema outputs need finite fields and deterministic types.
 * A branching graph uses dynamic node keys and retains verified JSON-object mode.
 */
const str={type:'string'};
const obj=fields=>({type:'object',additionalProperties:false,properties:fields,required:Object.keys(fields)});
const arr=items=>({type:'array',items});
const enums=(...items)=>({type:'string',enum:items});
const span=obj({speaker:str,language:enums('en','es'),text:str});
const err=obj({id:str,category:enums('negation','quantity','time','frequency','modality','uncertainty','attribution','condition','procedural-status','register','meaning-omission','unsupported-addition'),original:str,wrong:str,repair:str,
 recognizedPhrases:arr(str),audibleSource:str,audibleWrong:str,audibleRepair:str,
 sourceTurnIndex:{type:'integer'},wrongTurnIndex:{type:'integer'},repairTurnIndex:{type:'integer'}});
export const MEDIA_STAGE_SCHEMAS=Object.freeze({
 'creative-direction':obj({title:str,synopsis:str,concept:str,emotionalArc:str,cast:arr(obj({name:str,voice:str,role:str})),originality:str,episodeBeats:arr(str)}),
 script:obj({script:str,sceneDirections:arr(obj({scene:str,setting:str,sound:str,camera:str,expectedDurationSec:{type:'number'}})),productionNotes:arr(str),sourceClaims:arr(obj({termId:str,claim:str,reviewNeeded:{type:'boolean'}}))}),
 'semantic-critique':obj({verdict:enums('accept','revise','reject'),findings:arr(obj({severity:enums('minor','major','blocker'),passage:str,problem:str,suggestion:str,termId:str})),criticalMeaningUnits:arr(obj({text:str,language:str,semanticType:str,sourceTermId:str}))}),
 'narrative-critique':obj({verdict:enums('accept','revise','reject'),appeal:obj({immediateHook:str,characterDepth:str,suspense:str,humor:str,replayValue:str}),findings:arr(obj({severity:enums('minor','major','blocker'),problem:str,suggestion:str}))}),
 production:obj({recording:obj({casting:arr(obj({speaker:str,language:str,voiceTraits:str})),segments:arr(obj({speaker:str,text:str,durationSec:{type:'number'},soundCue:str}))}),art:obj({prompt:str,altText:str}),music:obj({brief:str,stems:arr(str)}),sunoPrompt:str,video:obj({iphoneWorkflow:str,shotList:arr(obj({durationSec:{type:'number'},shot:str,action:str,audio:str}))}),accessibility:obj({transcriptPlan:str,captionsPlan:str,reducedAudioPlan:str})})
});
const withScriptAdditions=(parts)=>obj({...MEDIA_STAGE_SCHEMAS.script.properties,...parts});
const voiceScript=withScriptAdditions({turns:arr(span),errors:arr(err)});
export function schemaForMediaStage(stageId,kind){
 if(stageId==='script'&&kind==='catch-the-change')return voiceScript;
 // Dynamic dictionary keys for branching nodes cannot be safely represented
 // by this deliberately narrow strict schema. The post-response graph auditor
 // independently verifies every target, reachability and multiple endings.
 if(stageId==='script'&&kind==='audio-mystery')return null;
 return MEDIA_STAGE_SCHEMAS[stageId]||null;
}
