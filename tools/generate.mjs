#!/usr/bin/env node
import {readFileSync}from'node:fs';
import {pathToFileURL}from'node:url';
import {Project,readStore,availableDomains}from'../generator/project.js';
import {registry}from'../generator/agents.js';
import {agentStatus}from'../generator/agent-runner.js';
import * as core from'../packages/engine-core/index.js';
const help=`Entre Voces — knowledge and game generator
  agents                         List executable authoring roles
  doctor                         Check local agent and PDF tools
  domains                        List active interpreter domain IDs
  spec --domain ID|file.json --request brief.md
  knowledge --domain ID|file.json --request brief.md [--source book.pdf] [--source-only]
  game --knowledge JOB --request game-brief.md [--language es]
  status [JOB]                   Inspect persisted jobs (no agent execution)
  resume JOB                     Retry failed/interrupted generation
  continue JOB                   Extend incomplete source acquisition
  expand JOB --request brief.md   Deepen a completed handbook
  export JOB [--out directory]    Write a reviewed draft package
  remove JOB / restore JOB        Recoverable experiment removal
  validate                       Validate bundled domain and concept contracts
All generation runs locally authenticated agents at authoring time. Games are static.
No admin UI, model API credentials, authoring web service or runtime AI.
`;
function parse(args){const positional=[],options={};for(let i=0;i<args.length;i++){const a=args[i];if(a.startsWith('--')){const k=a.slice(2);if(!['domain','request','source','source-only','knowledge','language','out'].includes(k))throw new Error(`Unknown option ${a}`);if(k==='source-only')options[k]=true;else{if(!args[i+1]||args[i+1].startsWith('--'))throw new Error(`Missing value for ${a}`);options[k]=args[++i];}}else positional.push(a);}return{command:positional[0]||'help',id:positional[1],options};}
const print=v=>process.stdout.write(typeof v==='string'?v+'\n':JSON.stringify(v,null,2)+'\n');
const summary=j=>({jobId:j.jobId,kind:j.kind,status:j.status,stage:j.stage,error:j.error||null,files:j.files.map(f=>f.name),result:j.result||null});
export async function main(args=process.argv.slice(2),deps={}){
 const {command,id,options:o}=parse(args);
 if(command==='help'){print(help);return;}
 if(command==='agents'){print(registry);return;}
 if(command==='doctor'){const {extractionCapabilities}=await import('../generator/extraction.js');print({agent:agentStatus(),extraction:await extractionCapabilities()});return;}
 if(command==='domains'){print(availableDomains(deps.root).map(d=>({domainId:d.domainId,label:d.label.en})));return;}
 if(command==='status'){const store=readStore(deps.root);const jobs=id?store.jobs.filter(j=>j.jobId===id):store.jobs;if(id&&!jobs.length)throw new Error('Unknown job.');print(jobs.map(summary));return;}
 if(command==='validate'){const errors=[];for(const d of core.SEED_DOMAINS)errors.push(...core.validateDomainConfig(d).errors);for(const c of core.CONCEPTS)errors.push(...core.validateConcept(c,{domain:core.SEED_DOMAINS.find(d=>d.domainId===c.domainId),sourceIds:new Set(core.SOURCES.map(s=>s.sourceId))}).errors);const active=availableDomains(deps.root); for(const d of active)errors.push(...core.validateDomainConfig(d).errors);print({activeDomains:active.length,sampleDomains:core.SEED_DOMAINS.length,sampleConcepts:core.CONCEPTS.length,errors});if(errors.length)throw new Error('Validation failed.');return;}
 if(!['spec','knowledge','game','resume','continue','expand','export','remove','restore'].includes(command))throw new Error(`Unknown command ${command}. Run help.`);
 const controller=new AbortController(),cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 let last='',project;try{
  project=new Project({...deps,signal:controller.signal,onProgress:j=>{const e=j?.events.at(-1),line=e?`${j.jobId} ${e.stage}: ${e.detail}`:'';if(line&&line!==last){process.stderr.write(line+'\n');last=line;}}});
  const request=()=>{if(!o.request)throw new Error('--request must point to a brief file.');const text=readFileSync(o.request,'utf8');if(text.length<20||text.length>50000)throw new Error('Request must contain 20–50,000 characters.');return text;};
  let job;
  if(command==='spec')job=project.jobs.create({kind:'specification',input:{workflowVersion:3,domain:project.domain(o.domain),request:request()}});
  if(command==='knowledge')job=await project.knowledge({domain:project.domain(o.domain),request:request(),sourcePath:o.source,sourceOnly:!!o['source-only']});
  if(command==='game')job=project.game({knowledgeId:o.knowledge,request:request(),targetLang:o.language});
  if(command==='resume')job=project.jobs.retry(id);
  if(command==='continue')job=project.jobs.continueAcquisition(project.jobs.get(id));
  if(command==='expand')job=project.jobs.createExpansion(project.jobs.get(id),request());
  if(command==='export'){print({directory:project.export(id,o.out)});return;}
  if(command==='remove'){print(project.remove(id));return;}
  if(command==='restore'){print(summary(project.restore(id)));return;}
  await project.wait(job);print(summary(job));if(job.status!=='succeeded')throw new Error(`${job.jobId}: ${job.error?.message||job.status}`);
 }finally{project?.close();process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1;});
