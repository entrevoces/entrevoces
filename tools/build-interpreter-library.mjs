#!/usr/bin/env node
// Builds actual agent-authored resources; no hand-written knowledge or canned books.
import{mkdirSync,writeFileSync,readFileSync,existsSync}from'node:fs';
import{join}from'node:path';
import{Project,PROJECT_ROOT}from'../generator/project.js';
import{agentJSON}from'../generator/agent-runner.js';
import{validateDomainConfig}from'../packages/engine-core/index.js';
const ids=['medical','legal','language-foundations'];
const controller=new AbortController();process.once('SIGINT',()=>controller.abort());process.once('SIGTERM',()=>controller.abort());
const languages=process.env.INTERPRETER_LANGUAGES==='es'?['es']:['es','zh'];
const p=new Project({signal:controller.signal,onProgress:j=>{const e=j?.events.at(-1);if(e&&e.at!==p.lastEvent){p.lastEvent=e.at;process.stderr.write(`${j.jobId} ${e.stage}: ${e.detail}\n`);}}});
try{
 const folder=join(PROJECT_ROOT,'knowledge'),planPath=join(folder,'library-plan.json');let plan;
 const briefs=Object.fromEntries(ids.map(id=>[id,readFileSync(join(folder,'briefs',id+'.md'),'utf8')]));
 if(existsSync(planPath))plan=JSON.parse(readFileSync(planPath,'utf8'));
 else{
  plan=await agentJSON({task:'library-plan',signal:controller.signal,system:`Return {rationale:string,volumes:[{id,request,domain}]}. Exactly three IDs: medical, legal, language-foundations. Create distinct comprehensive professional coverage responsibilities for each supplied brief. domain must satisfy supplied schema and runtime validator: domainId stable slug, label:{en}, jurisdiction:{country:'cross-jurisdictional',region:'General interpreter practice; specific legal/clinical rules labeled by source'}, profession medical|legal|other, languagePairs:[{source:'en',target:configured language,direction:'both'}], modalities:['consecutive','simultaneous','sight','remote'], translationAreas:[{areaId,label:{en},prerequisiteAreaIds:[],riskIfMistranslated:low|medium|high|critical,description}], competencyWeights:{competence:0..1},status:'draft'. Derive substantive topic areas from real work. Priorities are professional scope and source coverage, not arbitrary term counts. No Oregon-specific framing. The host will generate the knowledge through separate researched jobs. request should expand the supplied brief into executable research/handbook acceptance, never actual unsourced professional knowledge.`,user:{briefs,languages,domainSchema:JSON.parse(readFileSync(join(PROJECT_ROOT,'packages/engine-core/schemas/domain-config.schema.json'),'utf8'))}});
  if(plan.volumes?.length!==3||ids.some(id=>plan.volumes.filter(v=>v.id===id).length!==1))throw Error('Library plan must contain exactly the three requested volumes.');
  for(const v of plan.volumes){const g=validateDomainConfig(v.domain);if(!g.ok||typeof v.request!=='string'||v.request.length<600)throw Error(`Invalid library volume: ${v.id} ${JSON.stringify(g.errors)}`);}
  writeFileSync(planPath,JSON.stringify(plan,null,2));
 }
 const jobs=[];
 for(const v of plan.volumes){mkdirSync(join(folder,'domains'),{recursive:true});writeFileSync(join(folder,'domains',v.id+'.json'),JSON.stringify(v.domain,null,2));
  let job=p.store.jobs.find(j=>j.kind==='knowledge'&&j.input.libraryVolume===v.id&&!['failed','interrupted'].includes(j.status));
  if(!job){const prior=[...p.store.jobs].reverse().find(j=>j.kind==='knowledge'&&j.input.libraryVolume===v.id);if(prior?.checkpoints.acquisition?.status==='incomplete')job=p.jobs.continueAcquisition(prior,{additionalRounds:2,additionalSources:8,additionalCharacters:200000});else if(prior)job=p.jobs.retry(prior.jobId);else{job=await p.knowledge({domain:v.domain,request:briefs[v.id]+'\n\nAgent coverage brief:\n'+v.request,budgets:{maxRounds:5,maxSources:32,maxCharacters:1000000}});job.input.libraryVolume=v.id;p.save();}}
  jobs.push(job);
 }
 for(const job of jobs){await p.wait(job);if(job.status==='succeeded'){const out=join(folder,'generated',job.input.libraryVolume,job.jobId);if(!existsSync(out))p.export(job.jobId,out);}process.stdout.write(JSON.stringify({volume:job.input.libraryVolume,jobId:job.jobId,status:job.status,error:job.error||null})+'\n');}
 if(jobs.some(j=>j.status!=='succeeded'))process.exitCode=1;
}finally{p.close();}
