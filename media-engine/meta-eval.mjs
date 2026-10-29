/** Actual-provider live evaluation. No keys/content pushed to the public Pages artifact.
 * Tests Meta's *observed* output rather than pretending a mock is live inference.
 * Deterministic invariants are validated independently of stochastic model wording.
 */
import {createHash} from 'node:crypto';
import {MetaClient} from './meta.mjs';
import {evaluateCraft} from './editorial.mjs';

export const benchmarkCases = Object.freeze([
 {id:'negation',source:'I have not had chest pain today.',render:'He tenido dolor de pecho hoy.',faithful:false,kind:'negation'},
 {id:'number',source:'Return in five days if the fever persists.',render:'Regrese en quince días si continúa la fiebre.',faithful:false,kind:'number'},
 {id:'uncertainty',source:'I might have seen a red truck near the entrance.',render:'Vi un camión rojo cerca de la entrada.',faithful:false,kind:'uncertainty'},
 {id:'modality',source:'You may request an interpreter.',render:'Debe solicitar un intérprete.',faithful:false,kind:'modality'},
 {id:'attribution',source:'The neighbor told me that the door was open.',render:'El vecino vio la puerta abierta.',faithful:false,kind:'attribution'},
 {id:'faithful',source:'I am not sure whether I took my medicine this morning.',render:'No estoy seguro de si tomé mi medicamento esta mañana.',faithful:true,kind:'none'},
 {id:'frequency',source:'Take one tablet every other day.',render:'Tome una tableta un día sí y otro no.',faithful:true,kind:'none'},
 {id:'procedure',source:'The court scheduled a hearing but has not decided the case.',render:'El tribunal programó una audiencia, pero todavía no ha decidido el caso.',faithful:true,kind:'none'},
]);
export const semanticsSchema = Object.freeze({type:'object',additionalProperties:false,
 properties:{faithful:{type:'boolean'},kind:{type:'string',enum:['negation','number','uncertainty','modality','attribution','none','other']},changedMeaning:{type:'string'},specificEvidence:{type:'string'}},
 required:['faithful','kind','changedMeaning','specificEvidence']});
export const creativeSchema = Object.freeze({type:'object',additionalProperties:false,
 properties:{title:{type:'string'},premise:{type:'string'},sourceEnglish:{type:'string'},incorrectSpanish:{type:'string'},correctSpanish:{type:'string'},whyItMatters:{type:'string'},characters:{type:'array',items:{type:'string'}},script:{type:'string'},productionNotes:{type:'string'}},
 required:['title','premise','sourceEnglish','incorrectSpanish','correctSpanish','whyItMatters','characters','script','productionNotes']});
const digest=s=>createHash('sha256').update(typeof s==='string'?s:JSON.stringify(s)).digest('hex');
const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const coreSystem=`You are a careful evaluator of interpreting fidelity in bilingual fictional training examples. Do not provide clinical advice or a legal ruling. Preserve all negation, doses, numeric values, timing, speaker attribution, modality and epistemic uncertainty. Evaluate the literal source and rendering only. Return the JSON schema exactly. Do not give credit for a semantically different rendering.`;
export function checkSemanticResult(test,result){const x=result?.data;if(typeof x?.faithful!=='boolean'||typeof x?.kind!=='string'||typeof x?.specificEvidence!=='string'||!x.specificEvidence.trim())return {pass:false,reason:'missing grounded response'};
 const correct=x.faithful===test.faithful;const category=test.faithful?x.kind==='none':x.kind===test.kind;
 return {pass:correct&&category,faithfulCorrect:correct,categoryCorrect:category,expected:test.kind,actual:x.kind,observedFaithful:x.faithful};}
export function checkCreativeSample(result){const x=result?.data;
 if(!x||!Object.keys(creativeSchema.properties).every(k=>Object.hasOwn(x,k)))return {pass:false,reason:'schema incomplete'};
 const issues=[];
 for(const k of ['title','premise','sourceEnglish','incorrectSpanish','correctSpanish','whyItMatters','script','productionNotes'])if(typeof x[k]!=='string'||!x[k].trim())issues.push(`missing ${k}`);
 if(!Array.isArray(x.characters)||x.characters.length<2||new Set(x.characters).size<2)issues.push('needs at least two distinct characters');
 const craft=evaluateCraft({kind:'audio-drama',script:x.script});
 for(const issue of craft.issues.filter(v=>['major','blocker'].includes(v.severity)))issues.push(`${issue.code}: ${issue.detail}`);
 const norm=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase().replace(/[^\p{L}\p{N} ]/gu,' ').replace(/\s+/g,' ').trim();
 const script=norm(x.script),wrong=norm(x.incorrectSpanish),correct=norm(x.correctSpanish);
 if(wrong===correct)issues.push('no contrasting wrong/correct phrase');
 if(wrong&&!script.includes(wrong))issues.push('the wrong interpretation is not actually spoken in the scene');
 if(correct&&!script.includes(correct))issues.push('the corrected interpretation is not actually spoken in the scene');
 if(/[()]/.test(x.sourceEnglish+' '+x.correctSpanish))issues.push('parenthetical terminology labels');
 return {pass:issues.length===0,issues,words:words(x.script),dialogueTurns:craft.dialogueTurns,speakingRoles:craft.speakingRoles.length};
}
export async function runMetaLive({client=new MetaClient({maxRequests:20}),models=['muse-spark-1.3','muse-wonder-1.0'],includeImage=false,includeVoice=false,voiceFile=null}={}){
 if(!Array.isArray(models)||models.length<1||models.some(x=>!['muse-spark-1.3','muse-wonder-1.0'].includes(x)))throw Error('Unsupported live evaluation model selection');
 const startedAt=new Date().toISOString();const results=[],samples=[];let total=0;
 for(const model of models){const cases=model==='muse-wonder-1.0'?benchmarkCases.slice(0,5).concat(benchmarkCases.slice(-1)):benchmarkCases;
  for(const test of cases){const observed=await client.textJSON({model,system:coreSystem,user:{source:test.source,rendering:test.render,task:'Determine if meaning was preserved; identify the primary changed category.'},schema:semanticsSchema,maxTokens:450});
   const checked=checkSemanticResult(test,observed);total++;results.push({id:test.id,model,pass:checked.pass,expected:{faithful:test.faithful,kind:test.kind},observed:{faithful:observed.data.faithful,kind:observed.data.kind,evidence:observed.data.specificEvidence},modelResponseHash:digest(observed.data),requestId:observed.requestId,usage:observed.usage,finishReason:observed.finishReason});
  }
  const creative=await client.textJSON({model,system:`Original adult-friendly Spanish–English audio drama for interpreter practice. Return exactly the JSON schema. Script is a COMPLETE 600+ word, self-contained, dramatic audio scene (not an outline or a quiz), at least 10 individual SPEAKER: dialogue turns from two distinct adult voices, with a genuine plot reversal, grounded subtext, layered character motives, natural fluent Spanish, and a memorable emotional payoff. Include the incorrectSpanish and correctSpanish phrases VERBATIM in distinct spoken lines of the script; do not just discuss them in a summary. No demographic stereotypes, generic jokes or repetitious padding. Explicitly distinguish the fictional incorrect interpreting phrase from its correct repair. Never present this as medical advice or an approved translation.`,user:{task:'Create a fictional neighborhood radio drama about subtle misunderstanding of a medication frequency.',reference:{source:'Take one tablet every other day',correct:'Tome una tableta un día sí y otro no',contrast:'Tome dos tabletas todos los días'},audience:'adult bilingual interpreter trainees',showcaseFormat:'script requiring separately recorded actors'},schema:creativeSchema,maxTokens:4200});
  const check=checkCreativeSample(creative);samples.push({model,pass:check.pass,issues:check.issues||[],words:check.words||0,actualModelOutput:creative.data,modelResponseHash:digest(creative.data),usage:creative.usage,requestId:creative.requestId,finishReason:creative.finishReason,reviewState:'unverified-model-generated-fiction; human bilingual review required'});
 }
 let imageProof=null,voiceProof=null;
 if(includeImage){const imgs=await client.image({prompt:'Original editorial podcast-cover illustration: a stylish microphone between two speech ribbons in an imaginary neighborhood studio. Elegant limited terracotta and teal palette, warm theatrical atmosphere, NO text or letters.',n:1});const x=imgs[0];imageProof={model:'muse-image-1.0',sha256:digest(x.bytes),bytes:x.bytes.length,signature:x.bytes.subarray(0,16).toString('hex'),generated:true,reviewState:'visual-review-pending'};if(x.bytes.length<1000)throw Error('Muse Image returned an implausibly small asset');}
 if(includeVoice){if(!voiceFile)throw Error('Live voice testing requires a real licensed WAV fixture.');const x=await client.transcribe({wavPath:voiceFile,mode:'PUSH_TO_TALK'});voiceProof={model:'muse-voice-transcribe-1.0',hasTranscript:!!String(x.transcript||'').trim(),sha256:digest(x.transcript||''),audioDurationMs:x.audioDurationMs,turns:x.turns?.length||0,reviewState:'ASR provider response only; bilingual fidelity unassessed'};if(!voiceProof.hasTranscript)throw Error('Muse Voice Transcribe returned an empty transcript');}
 const byModel={};for(const m of models){const a=results.filter(x=>x.model===m);byModel[m]={passed:a.filter(x=>x.pass).length,total:a.length,rate:a.filter(x=>x.pass).length/a.length};}
 const minByModel=Object.values(byModel).every(x=>x.rate===1);
 const allCreative=samples.every(x=>x.pass);
 return {schemaVersion:1,provider:'Meta Model API',runMode:client instanceof MetaClient?'live-provider':'injected-test-client',startedAt,completedAt:new Date().toISOString(),models,summary:{actualCalls:client.count??total+samples.length,semantic:byModel,creativePass:allCreative,minAccuracy:1.0,pass:minByModel&&allCreative},results,samples,imageProof,voiceProof,disclaimer:'Model-generated evidence is not human professional review; stochastic quality varies between runs.'};
}
