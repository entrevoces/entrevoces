/** Multi-stage media authoring. Model proposals never become trusted source facts or reviewed output. */
import {MetaClient,metaModels} from './meta.mjs';
import {makeBrief,TYPES,PRODUCTION_STAGES} from './blueprints.mjs';
import {validateProduction} from './validation.mjs';
import {evaluateCraft,auditContradictions,MASTER_TASTE_NOTE} from './editorial.mjs';
import {schemaForMediaStage} from './stage-schema.mjs';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';

const instruct=`You are the Entre Voces creative studio. Produce sophisticated, delightful entertainment for adult bilingual interpreter trainees. Avoid stereotypes and classroom quizzes. The submitted corpus is a provisional, unreviewed research draft: never assert that entry-level synonyms are clinically/legal-authoritatively verified. Preserve negation, numbers, deadlines, permissions, uncertainty, attribution, and person-first language. Fictional scenarios must not masquerade as official case records. All content is original and culturally nuanced. All output must be plain valid JSON without markdown.`;
const jsonText = o=>JSON.stringify(o,null,2);
const digest=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const hasObj=x=>x&&typeof x==='object'&&!Array.isArray(x);
function safeParse(t){const parsed=typeof t==='string'?JSON.parse(t):t;if(!hasObj(parsed))throw Error('Model output must be a JSON object');return parsed;}
function expectSchema(x,fields){if(!hasObj(x)||fields.some(k=>!Object.hasOwn(x,k)))throw Error(`Incomplete authoring stage. Required: ${fields.join(', ')}`);return x;}

export function productionPlan(brief){
 return {id:brief.id,kind:brief.kind,topic:brief.topic,domain:brief.domain,
  status:'proposed',title:`${brief.kind.replace(/-/g,' ')}: ${brief.topic}`,synopsis:'Creative concept awaiting authorship',termIds:brief.termIds,
  sourceIds:brief.sourceIds,knowledgeHash:digest(brief.knowledge),direction:brief.direction,
  script:'',turns:[],errors:[],casting:[],audio:null,cover:null,
  review:{bilingualApproved:false,domainApproved:false,editorialApproved:false},
  rights:{status:'uncleared',license:null},transcript:null,
  generation:{model:null,stages:[],usage:[],stageOutputs:{},briefHash:digest(brief),template:'media-studio-v1'},
  prompts:{suno:null,image:null,voice:null,video:null},
  reviewerNotes:[],limitations:['No generated speech is automatically provided by Meta Voice Transcribe.','Medical/legal equivalents require qualified bilingual review.']};
}
const tasks=[
 {id:'creative-direction',model:metaModels.director,required:['title','synopsis','concept','emotionalArc','cast','originality','episodeBeats'],output:'Return {title,synopsis,concept,emotionalArc,cast:[{name,voice,role}],originality,episodeBeats:[string]}.'},
 {id:'script',model:metaModels.bulk,required:['script','sceneDirections','productionNotes','sourceClaims'],output:'Return {script: a FULL-length complete script,sceneDirections:[{scene,setting,sound,camera,expectedDurationSec}],productionNotes:[string],sourceClaims:[{termId,claim,reviewNeeded}]}. For catch-the-change ALSO return turns:[{speaker,language,text}], errors:[{id,category,original,wrong,repair,recognizedPhrases:[string],audibleSource:string,audibleWrong:string,audibleRepair:string,sourceTurnIndex:integer,wrongTurnIndex:integer,repairTurnIndex:integer}]. Every audible* phrase must occur EXACTLY in its referenced actual spoken turn; the deliberately wrong utterance is in Spanish and the source utterance in English. No paraphrased-only cue metadata.  For audio-mystery ALSO return start:string, nodes:{[nodeId]:{text:string,choices:[{label,next}]}} with at least two reachable terminal endings. Do not write a teaser or outline; satisfy minimum word target.'},
 {id:'semantic-critique',model:metaModels.director,required:['findings','criticalMeaningUnits','verdict'],output:'Return {verdict:"accept"|"revise"|"reject",findings:[{severity:"minor"|"major"|"blocker",passage,problem,suggestion,termId}],criticalMeaningUnits:[{text,language,semanticType,sourceTermId}]}. Inspect dates/negation/amounts/uncertainty, legal/medical accuracy, language direction and authoritativeness.'},
 {id:'narrative-critique',model:metaModels.bulk,required:['findings','verdict','appeal'],output:'Return {verdict:"accept"|"revise"|"reject",appeal:{immediateHook,characterDepth,suspense,humor,replayValue},findings:[{severity,problem,suggestion}]}. Reject patronizing education disguised as entertainment, stereotypes, shallow outlines.'},
 {id:'production',model:metaModels.bulk,required:['recording','art','music','sunoPrompt','video','accessibility'],output:'Return {recording:{casting:[{speaker,language,voiceTraits}],segments:[{speaker,text,durationSec,soundCue}]},art:{prompt,altText},music:{brief,stems:[string]},sunoPrompt:string under 1000 characters (only for song),video:{iphoneWorkflow,shotList:[{durationSec,shot,action,audio}]},accessibility:{transcriptPlan,captionsPlan,reducedAudioPlan}}. Meta text/ASR endpoints are NOT TTS. Mark unproduced outputs pending.'}
];
export function stagePrompts(brief,stage,context){
 return {stage:stage.id,model:stage.model,schema:schemaForMediaStage(stage.id,brief.kind),system:`${instruct}\n${stage.output}\n${brief.brief}\nFormat ${brief.kind}. Aim for at least ${brief.minWords} words of distinct, substantive, performable content. ${MASTER_TASTE_NOTE}`,user:{brief,context}};
}
export class MediaStudio{
 constructor({client=new MetaClient(),maxRequests=15}={}){this.client=client;this.maxRequests=maxRequests;}
 async create(brief,{dryRun=false,existing=null,onCheckpoint=null}={}){
  let item=existing?structuredClone(existing):productionPlan(brief);
  if(item.generation.briefHash!==digest(brief))throw Error('Cannot resume media authoring with a changed, unfrozen brief');
  const prompts=[];let state=structuredClone(item.generation.stageOutputs||{});
  for(const stage of tasks){
   const input=stagePrompts(brief,stage,state);prompts.push(input);
   if(dryRun||state[stage.id])continue;
   // A failed model critique cannot be brushed aside by producing a polished cover.
   // Repair the unchanged source brief, then invalidate and re-run BOTH critics.
   if(stage.id==='production'&&item.semanticReview&&item.narrativeReview){
    const approved=()=>item.semanticReview?.verdict==='accept'&&item.narrativeReview?.verdict==='accept'&&
      ![...(item.semanticReview?.findings||[]),...(item.narrativeReview?.findings||[])].some(x=>['major','blocker'].includes(x.severity));
    let repairCount=0;
    while(!approved()&&repairCount<2){
      const revised=await repairMediaDraft(brief,item,{client:this.client,maxRevisions:2,onCheckpoint});
      if(!revised.changed)break;
      item=revised.item;state=item.generation.stageOutputs;repairCount++;
      for(const critic of tasks.filter(x=>x.id==='semantic-critique'||x.id==='narrative-critique')){
        const reviewInput=stagePrompts(brief,critic,state);
        const response=await this.client.textJSON({system:reviewInput.system,user:reviewInput.user,model:critic.model,maxTokens:3500,schema:reviewInput.schema});
        const reviewed=expectSchema(safeParse(response.data),critic.required);
        if(!['accept','revise','reject'].includes(reviewed.verdict)||!Array.isArray(reviewed.findings))throw Error(`Invalid ${critic.id} review`);
        state[critic.id]=reviewed;item.generation.stageOutputs=state;
        item.generation.stages.push({id:critic.id,model:critic.model,contentHash:digest(reviewed),revision:repairCount});
        item.generation.usage.push({stage:critic.id,revision:repairCount,usage:response.usage});
        if(critic.id==='semantic-critique')item.semanticReview=reviewed;
        else item.narrativeReview=reviewed;
        if(onCheckpoint)await onCheckpoint({brief,item,completedStage:critic.id+'-revision-'+repairCount});
      }
    }
    if(!approved()){
      item.reviewerNotes.push('REJECTED BY MODEL CRITICS after the bounded repair budget. Full transcript and criticisms retained; production plan intentionally not generated.');
      return {brief,item,checks:validateProduction(item,{}),callsMade:this.client.count,productionBlocked:true};
    }
   }
   if(stage.id==='production'){
     const craft=evaluateCraft(item);item.craftAudit=craft;
     if(!craft.readyForModelCritique){item.reviewerNotes.push('PRODUCTION BLOCKED BY INDEPENDENT DETERMINISTIC CRAFT AUDIT: '+craft.issues.map(x=>x.code).join(', '));
       return {brief,item,checks:validateProduction(item,{}),callsMade:this.client.count,productionBlocked:true};}
   }
   const reply=await this.client.textJSON({system:input.system,user:input.user,model:stage.model,maxTokens:stage.id==='script'?7500:4000,schema:input.schema});
   const data=expectSchema(safeParse(reply.data),stage.required);
   if(stage.id==='script'){const words=(data.script.match(/\S+/g)||[]).length;if(words<brief.minWords)throw Error(`Incomplete ${brief.kind} script: ${words} words; required ${brief.minWords}. Retry with an expanded complete scene, not filler.`);if((data.sourceClaims||[]).some(x=>!brief.termIds.includes(x.termId)))throw Error('Model invented a source term outside the frozen knowledge snapshot');if(brief.kind==='catch-the-change'&&(!Array.isArray(data.turns)||data.turns.length<3||!Array.isArray(data.errors)||!data.errors.length))throw Error('Missing complete voice-game turns and error targets');if(brief.kind==='audio-mystery'&&(!data.start||!data.nodes))throw Error('Missing branching audio story graph');const candidate={...item,script:data.script,turns:data.turns||[],errors:data.errors||[],nodes:data.nodes||null,start:data.start||null};const contradictions=auditContradictions({item:candidate,brief});if(!contradictions.ok)throw Error(`Script failed source/utterance grounding: ${contradictions.issues.join('; ')}`);const structured=validateProduction(candidate,{strict:true});if(!structured.ok)throw Error(`Incomplete or inaudible authored script: ${structured.errors.join('; ')}`);item.craftAudit=evaluateCraft(candidate);}
   if(stage.id==='production'&&brief.kind==='song'&&(!data.sunoPrompt||data.sunoPrompt.length>1000))throw Error('Song must have one valid Suno prompt under 1000 characters');
   item.generation.stages.push({id:stage.id,model:stage.model,contentHash:digest(data)});
   item.generation.usage.push({stage:stage.id,usage:reply.usage});
   state[stage.id]=data;item.generation.stageOutputs=state;
   if(stage.id==='creative-direction'){item.title=data.title;item.synopsis=data.synopsis;item.cast=data.cast;item.outline=data.episodeBeats;}
   if(stage.id==='script'){item.script=data.script;item.turns=data.turns||[];item.errors=data.errors||[];item.nodes=data.nodes||null;item.start=data.start||null;item.sceneDirections=data.sceneDirections;item.productionNotes=data.productionNotes;item.sourceClaims=data.sourceClaims;item.status='script-draft';}
   if(stage.id==='semantic-critique'){item.semanticReview=data;item.review.domainApproved=false;}
   if(stage.id==='narrative-critique'){item.narrativeReview=data;item.review.editorialApproved=false;}
   if(stage.id==='production'){item.productionPlan=data;item.prompts={suno:data.sunoPrompt||null,image:data.art?.prompt||null,video:data.video||null,voice:data.recording||null};}
   if(onCheckpoint)await onCheckpoint({brief,item,completedStage:stage.id});
  }
  if(dryRun)return {brief,proposed:item,prompts,callsMade:0};
  item.generation.model=`${metaModels.director} + ${metaModels.bulk}`;
  const blockers=[...(item.semanticReview?.findings||[]),...(item.narrativeReview?.findings||[])].filter(f=>['blocker','major'].includes(f.severity));
  if(item.semanticReview?.verdict!=='accept'||item.narrativeReview?.verdict!=='accept'||blockers.length)item.reviewerNotes.push('MODEL CRITIQUE NEEDS REVISION. Do not publish; request edits and re-review.');
  item.craftAudit=evaluateCraft(item);
  if(!item.craftAudit.readyForModelCritique)item.reviewerNotes.push('CRAFT AUDIT: '+item.craftAudit.issues.map(x=>x.code).join(', ')+'. Revise before promotion.');
  const check=validateProduction(item,{});
  if(!check.ok)item.reviewerNotes.push(...check.errors);
  return {brief,item,checks:check,callsMade:this.client.count};
 }
}
export function buildProductionQueue(knowledge,{kinds=['catch-the-change','audio-drama','audio-mystery','podcast','story','song','film'],topics=['negation','frequency','uncertainty','informed consent','hearing','attribution','conditional','eviction'],max=24}={}){
 const queue=[];for(let i=0;i<max;i++){const kind=kinds[i%kinds.length],domain=i%2?'legal':'medical',topic=topics[i%topics.length];queue.push(makeBrief(knowledge,{topic,domain,kind,index:i}));}return queue;
}
export function persistStudioResult(result,outputRoot='media-workshop'){
 const id=result.item?.id||result.brief.id;
 if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid output path');
 const dir=join(outputRoot,id);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'result.json'),jsonText(result));
 writeFileSync(join(dir,'README.md'),`# ${result.item?.title||id}\n\nProduction status: ${result.item?.status||'proposed'}\n\nAll references are provisional. Do not publish clinical/legal instructional claims without independent review.\n\n- Term IDs: ${(result.brief.termIds||[]).join(', ')}\n- Source IDs: ${(result.brief.sourceIds||[]).join(', ')}\n- Generated audio: ${result.item?.audio?'present':'NOT PRODUCED'}\n- Review: pending\n`);
 return dir;
}

/** Controlled repair loop: preserves the frozen brief and original rejected draft in revision history. */
export async function repairMediaDraft(brief,item,{client=new MetaClient(),maxRevisions=2,onCheckpoint=null}={}){
 if(!item?.generation||item.generation.briefHash!==digest(brief))throw Error('Repair refused: inconsistent or missing frozen brief');
 const outputs=item.generation.stageOutputs||{},script=outputs.script;
 if(!script?.script||!item.semanticReview||!item.narrativeReview)throw Error('Repair requires a completed script and two independent critique outputs');
 const findings=[...(item.semanticReview.findings||[]),...(item.narrativeReview.findings||[])];
 if(!findings.length&&item.semanticReview.verdict==='accept'&&item.narrativeReview.verdict==='accept')return {item,changed:false,reason:'No repairs requested'};
 const revisions=item.generation.revisions||[];
 if(revisions.length>=maxRevisions)throw Error('Revision budget exhausted; human editor must inspect the rejected draft');
 const oldHash=digest(script),reply=await client.textJSON({model:'muse-wonder-1.0',maxTokens:8500,
  schema:schemaForMediaStage('script',brief.kind),system:`${instruct}\nRevise the EXISTING complete script, do not replace it with an outline, new setting or generic learning exercise. Address each major/blocker critique. Do not fabricate source claims. Return full JSON compatible with the original script-stage fields, including all required fields. Previous rejected draft is retained for audit.`,
  user:{brief,original:script,semanticReview:item.semanticReview,narrativeReview:item.narrativeReview,iteration:revisions.length+1}});
 const data=expectSchema(safeParse(reply.data),tasks.find(t=>t.id==='script').required);
 if((data.script.match(/\S+/g)||[]).length<brief.minWords)throw Error('Revised script is still below the full-length word target');
 if(data.sourceClaims?.some(x=>!brief.termIds.includes(x.termId)))throw Error('Revision invented a source term outside frozen brief');
 if(brief.kind==='catch-the-change'&&(!Array.isArray(data.turns)||data.turns.length<3||!data.errors?.length))throw Error('Revised listening game lost its spoken turns or error cue');
 if(brief.kind==='audio-mystery'&&(!data.start||!data.nodes))throw Error('Revised mystery lost its branch graph');
 const revisedCandidate={...item,script:data.script,turns:data.turns||[],errors:data.errors||[],nodes:data.nodes||null,start:data.start||null};
 const structural=validateProduction(revisedCandidate,{strict:true});if(!structural.ok)throw Error('Revised script is not voice-aligned or structurally complete: '+structural.errors.join('; '));
 const next=structuredClone(item);next.generation.revisions=[...revisions,{iteration:revisions.length+1,previousScriptHash:oldHash,newScriptHash:digest(data),model:reply.model,usage:reply.usage||null,findings:findings.map(f=>({severity:f.severity,problem:f.problem||f.message||''}))}];
 next.generation.stageOutputs.script=data;
 for(const stage of ['semantic-critique','narrative-critique','production'])delete next.generation.stageOutputs[stage];
 next.generation.stages=next.generation.stages.filter(s=>!['semantic-critique','narrative-critique','production'].includes(s.id));
 next.script=data.script;next.turns=data.turns||[];next.errors=data.errors||[];next.nodes=data.nodes||null;next.start=data.start||null;
 next.sceneDirections=data.sceneDirections;next.productionNotes=data.productionNotes;next.sourceClaims=data.sourceClaims;
 delete next.semanticReview;delete next.narrativeReview;delete next.productionPlan;
 next.review={bilingualApproved:false,domainApproved:false,editorialApproved:false};next.status='script-draft';
 next.reviewerNotes.push('Script revised by a model; all independent and human reviews reset.');
 if(onCheckpoint)await onCheckpoint({brief,item:next,completedStage:'bounded-repair'});
 return {item:next,changed:true,revision:next.generation.revisions.length};
}
