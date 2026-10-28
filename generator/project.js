// Local project state and artifact lifecycle. There is no HTTP service.
import {mkdirSync,existsSync,readFileSync,writeFileSync,renameSync,openSync,closeSync,unlinkSync,rmSync,readdirSync}from'node:fs';
import {resolve,join,dirname,basename,sep}from'node:path';
import {fileURLToPath}from'node:url';
import {GenerationJobs}from'./generation.js';
import {agentJSON,agentStatus}from'./agent-runner.js';
import {searchSources}from'./research-adapter.js';
import {extractResource}from'./extraction.js';
import {prepareGameMedia}from'./game-media.js';
import {artifactBytes}from'./media.js';
import * as core from'../packages/engine-core/index.js';
export const PROJECT_ROOT=fileURLToPath(new URL('../',import.meta.url));
export function availableDomains(root=PROJECT_ROOT){
 const folder=join(root,'knowledge','domains');
 if(!existsSync(folder))return[];
 return readdirSync(folder).filter(f=>f.endsWith('.json')).map(f=>{const d=JSON.parse(readFileSync(join(folder,f),'utf8'));const gate=core.validateDomainConfig(d);if(!gate.ok)throw new Error(`Invalid public domain ${f}: ${JSON.stringify(gate.errors)}`);return d;});
}
export function readStore(root=PROJECT_ROOT){const p=join(root,'data/store.json');if(!existsSync(p))return{version:3,domains:structuredClone(core.SEED_DOMAINS),concepts:structuredClone(core.CONCEPTS),sources:structuredClone(core.SOURCES),jobs:[],trash:[]};let s;try{s=JSON.parse(readFileSync(p,'utf8'));}catch{throw new Error('Project store is corrupt. Restore data/store.json from backup; nothing overwritten.');}if(!Array.isArray(s.domains)||!Array.isArray(s.jobs))throw new Error('Invalid project store.');return s;}
export class Project {
 constructor({root=PROJECT_ROOT,call=agentJSON,configured=()=>agentStatus().available,search=null,signal=null,onProgress=()=>{}}={}){
  this.root=resolve(root);this.data=join(this.root,'data');mkdirSync(this.data,{recursive:true});this.lock=join(this.data,'authoring.lock');
  try{this.fd=openSync(this.lock,'wx',0o600);writeFileSync(this.fd,JSON.stringify({pid:process.pid,at:new Date().toISOString()}));}catch(e){if(e.code==='EEXIST')throw new Error('Another authoring process holds data/authoring.lock. If it was terminated, verify its PID before removing the stale lock.');throw e;}
  try{this.store=readStore(this.root);this.store.trash||=[];this.artifactRoot=join(this.data,'artifacts');
   this.jobs=new GenerationJobs({getStore:()=>this.store,save:()=>{this.save();onProgress(this.store.jobs.filter(j=>j.status==='running').sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))[0]);},artifactRoot:this.artifactRoot,configured,concurrency:2,jobConcurrency:2,media:prepareGameMedia,call:args=>call({...args,signal}),search:args=>(search||searchSources)({...args,signal})});
  }catch(e){this.close();throw e;}
 }
 save(){const p=join(this.data,'store.json'),temp=p+`.${process.pid}.tmp`;writeFileSync(temp,JSON.stringify(this.store,null,2),{mode:0o600});renameSync(temp,p);}
 close(){if(this.fd!=null){closeSync(this.fd);this.fd=null;unlinkSync(this.lock);}}
 domain(value){let d;if(value?.endsWith('.json'))d=JSON.parse(readFileSync(resolve(value),'utf8'));else d=availableDomains(this.root).find(d=>d.domainId===value)||this.store.domains.find(d=>d.domainId===value)||core.SEED_DOMAINS.find(d=>d.domainId===value);if(!d)throw new Error('Choose a known domain ID or supply --domain domain.json.');const g=core.validateDomainConfig(d);if(!g.ok)throw new Error(`Invalid domain: ${JSON.stringify(g.errors)}`);return structuredClone(d);}
 async knowledge({domain,request,sourcePath,sourceOnly=false,budgets={}}){
  if(!request?.trim())throw new Error('A substantive request file is required.');if(sourceOnly&&!sourcePath)throw new Error('--source-only requires --source.');
  let resource,source;
  if(sourcePath){const bytes=readFileSync(sourcePath);resource=await extractResource({fileName:basename(sourcePath),...(sourcePath.toLowerCase().endsWith('.pdf')?{base64:bytes.toString('base64')}:{text:bytes.toString('utf8')})});source={sourceId:`seed-${resource.fingerprint.slice(0,12)}`,title:basename(sourcePath),publisher:'User-supplied source; verify authority and rights',permittedUse:'Authoring review only',fingerprint:resource.fingerprint};}
  return this.jobs.create({kind:'knowledge',input:{workflowVersion:3,request,domain,context:{request},resource,source,acquisition:{mode:sourceOnly?'source-only':'research',scope:request,budgets}}});
 }
 game({knowledgeId,request,targetLang}){
  const kb=this.jobs.get(knowledgeId);if(!kb||kb.kind!=='knowledge'||kb.status!=='succeeded'||!kb.checkpoints.handbookAudit||kb.checkpoints.handbookAudit.verdict!=='accept')throw new Error('Game generation requires a completed, reviewed knowledge job.');
  const domain=kb.input.domain,draft=kb.checkpoints.knowledge,passages=kb.checkpoints.acquisition?.corpus?.passages||kb.input.resource.passages;
  const concepts=draft.concepts.map(c=>({...structuredClone(c),domainId:domain.domainId,sourceIds:[...new Set(c.claims.flatMap(a=>a.citations.map(x=>passages.find(p=>p.passageId===x.passageId)?.sourceId||kb.input.source?.sourceId)).filter(Boolean))]}));
  for(const c of concepts){const g=core.validateConcept(c,{domain});if(!g.ok)throw new Error(`Knowledge snapshot invalid: ${JSON.stringify(g.errors)}`);}
  const portfolio=this.store.jobs.filter(j=>j.kind==='game'&&j.checkpoints.framework).map(j=>({jobId:j.jobId,framework:j.checkpoints.framework,status:j.status}));
  return this.jobs.create({kind:'game',input:{workflowVersion:3,domain,concepts,request,audience:kb.checkpoints.brief?.audience||kb.input.context,gap:request,portfolio,targetLang:targetLang||domain.languagePairs[0].target,knowledgeJobId:kb.jobId,knowledgeContext:{brief:kb.checkpoints.brief,source:kb.result.source,knowledge:draft,handbookPlan:kb.checkpoints.handbookPlan,handbookChapters:kb.checkpoints.handbookChapters},difficultyPolicy:core.DIFFICULTY_POLICY}});
 }
 async wait(job){while(!['succeeded','failed','interrupted'].includes(job.status)){await this.jobs.drain();if(this.jobs.active)await new Promise(r=>setTimeout(r,20));}return job;}
 export(id,out){const job=this.jobs.get(id);if(!job||job.status!=='succeeded')throw new Error('Export requires a completed job.');const dest=resolve(out||join(this.root,'outputs',job.kind,id));if(existsSync(dest))throw new Error('Export destination already exists. Choose a new directory.');
  // Preflight every path before writing; never allow a manifest to escape.
  for(const f of job.files)if(typeof f.name!=='string'||f.name.includes('\\')||f.name.startsWith('/')||f.name.split('/').some(p=>!p||p==='.'||p==='..')||!resolve(dest,f.name).startsWith(dest+sep))throw new Error('Unsafe artifact path.');
  mkdirSync(dest,{recursive:true});try{for(const f of job.files){const p=join(dest,f.name);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,artifactBytes(f));}writeFileSync(join(dest,'package-status.json'),JSON.stringify({jobId:id,kind:job.kind,design:'reviewed',playtest:job.kind==='game'?'pending':null,publication:'draft',result:job.result},null,2));}catch(e){rmSync(dest,{recursive:true,force:true});throw e;}
  return dest;
 }
 remove(id){const i=this.store.jobs.findIndex(j=>j.jobId===id);if(i<0)throw new Error('Unknown job.');const job=this.store.jobs[i];if(!['succeeded','failed','interrupted'].includes(job.status))throw new Error('Cannot remove an active job.');this.store.jobs.splice(i,1);this.store.trash.push({...job,removedAt:new Date().toISOString()});this.save();return{removed:id,note:'Recoverable with restore. Exported copies are independent files.'};}
 restore(id){const i=this.store.trash.findIndex(j=>j.jobId===id);if(i<0)throw new Error('Unknown removed job.');const job=this.store.trash.splice(i,1)[0];delete job.removedAt;this.store.jobs.push(job);this.save();return job;}
}
