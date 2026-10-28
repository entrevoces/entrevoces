// Interpreting is the organizing principle. Content is reused verbatim from
// supplied knowledge; this module sequences practice and reports real evidence.
import{STAGES,computeLearnerState}from'./learner.js';
export const CURRICULUM_PHASES=Object.freeze([
 {id:'notice',label:'Notice what matters',stages:[1,3],responsibility:'Recognize concepts and identify the information that changes meaning.'},
 {id:'distinguish',label:'Choose precisely',stages:[2,4],responsibility:'Distinguish near-neighbors and choose language appropriate to context.'},
 {id:'carry',label:'Carry the message',stages:[5,7],responsibility:'Preserve register, intent and relationships in a complete response.'},
 {id:'perform',label:'Interpret under load',stages:[6,8],responsibility:'Carry meaning through sequences, competing demands and realistic constraints.'},
]);
export function compileCurriculum({domains,concepts,books=[]}){
 const seen=new Set(),knowledge=[];
 for(const c of concepts){const key=`${c.domainId}:${c.conceptId}`;if(seen.has(key))continue;seen.add(key);knowledge.push(c);}
 const strands=domains.map(d=>({id:d.domainId,label:d.label.en,concepts:knowledge.filter(c=>c.domainId===d.domainId&&!c.referenceOnly).map(c=>c.conceptId),areas:d.translationAreas.map(a=>({id:a.areaId,label:a.label.en,prerequisiteAreaIds:a.prerequisiteAreaIds||[]}))}));
 return{version:1,principle:'Preserve meaning across languages and encounters.',phases:CURRICULUM_PHASES,strands,knowledge,books,stages:STAGES,scope:'Existing sourced concepts plus labeled practice scenarios. Completion measures demonstrated practice within this library, not professional certification.'};
}
export function curriculumProgress({curriculum,events=[],learnerId,now=Date.now()}){
 const byDomain=Object.fromEntries(curriculum.strands.map(d=>[d.id,computeLearnerState({learnerId,domainId:d.id,events,concepts:curriculum.knowledge.filter(c=>c.domainId===d.id),now})]));
 const phases=curriculum.phases.map(p=>{let supported=0,demonstrated=0,attempts=0;for(const c of curriculum.knowledge.filter(c=>!c.referenceOnly)){const s=byDomain[c.domainId];for(const stage of p.stages.filter(s=>!c.evidenceStages||c.evidenceStages.includes(s))){supported++;const cell=s?.stages[c.conceptId]?.[stage];attempts+=cell?.evidenceCount||0;if(cell?.estimate>=.7&&cell.confidence>=.65&&cell.retention>=.65)demonstrated++;}}return{id:p.id,supported,demonstrated,attempts,ratio:supported?demonstrated/supported:0};});
 return{phases,byDomain,demonstrated:phases.reduce((n,p)=>n+p.demonstrated,0),supported:phases.reduce((n,p)=>n+p.supported,0),attempts:phases.reduce((n,p)=>n+p.attempts,0)};
}
export function suggestCurriculumPractice({curriculum,progress}){
 const phase=progress.phases.find(p=>p.ratio<.7)||progress.phases[progress.phases.length-1];const p=curriculum.phases.find(p=>p.id===phase?.id)||curriculum.phases[0];
 return{phaseId:p.id,stages:p.stages,reason:phase?.attempts?'Build independent proof, then return after a delay.':'Begin with meaning and consequential distinctions before adding pressure.'};
}
