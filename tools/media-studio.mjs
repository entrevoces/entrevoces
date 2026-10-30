#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync,existsSync}from'node:fs';
import {dirname,resolve}from'node:path';
import {loadKnowledge,searchKnowledge}from'../media-engine/knowledge.mjs';
import {makeBrief}from'../media-engine/blueprints.mjs';
import {MediaStudio,buildProductionQueue,persistStudioResult,repairMediaDraft}from'../media-engine/studio.mjs';
import {MetaClient}from'../media-engine/meta.mjs';
import {validateCatalog,publicationGate}from'../media-engine/validation.mjs';
import{ingestAudio,ingestVideo,markReviewed}from'../media-engine/ingest.mjs';
import{productionPacket,advisoryMetaAudioReview}from'../media-engine/quality.mjs';
const [command='help',...args]=process.argv.slice(2);
function flag(k,defaultValue=''){const i=args.indexOf('--'+k);return i<0?defaultValue:(args[i+1]&&!args[i+1].startsWith('--')?args[i+1]:true)}
function save(path,x){mkdirSync(dirname(resolve(path)),{recursive:true});writeFileSync(path,JSON.stringify(x,null,2)+'\n')}
function print(x){console.log(JSON.stringify(x,null,2))}
function readItem(path,{id=flag('id')}={}){
 const value=JSON.parse(readFileSync(path,'utf8'));
 if(value?.id&&value?.kind)return value;
 if(value?.item?.id&&value?.item?.kind)return value.item;
 if(Array.isArray(value?.items)){
  if(!id)throw Error('Catalog input needs --id <media-id> to select one item');
  const candidate=value.items.find(x=>x.id===id);
  if(!candidate)throw Error('Unknown catalog item '+id);
  return candidate;
 }
 throw Error('Expected a single media item, result.json, or catalog with --id');
}

try{
 if(command==='help'){console.log(`Entre Voces media authoring\n  node tools/media-studio.mjs audit\n  node tools/media-studio.mjs queue --max 30 --out media-workshop/queue.json\n  node tools/media-studio.mjs brief --kind audio-drama --topic negation --domain medical --out media-workshop/brief.json\n  node tools/media-studio.mjs author --brief media-workshop/brief.json --dry-run\n  node tools/media-studio.mjs author --brief media-workshop/brief.json --out media-workshop --live [--resume-checkpoint media-workshop/<id>/checkpoint.json]\n  node tools/media-studio.mjs image --prompt 'cover art prompt' --out media-workshop/cover.webp --live\n  node tools/media-studio.mjs transcribe --audio sound.wav --out media-workshop/transcript.json --live\n  node tools/media-studio.mjs batch --queue content/media-production/queue.json --out media-workshop --limit 5 [--live]
  node tools/media-studio.mjs packet --item content/media-production/catalog.json --id voice-hearing-not-verdict --out media-workshop/recording.json
  node tools/media-studio.mjs ingest --item media-workshop/episode.json --audio track.wav --rights media-workshop/rights.json --out media-workshop/episode-with-audio.json
  node tools/media-studio.mjs ingest --item media-workshop/film.json --video film.mp4 --rights media-workshop/rights.json --out media-workshop/film-with-video.json
  node tools/media-studio.mjs quality --item media-workshop/episode-with-audio.json --audio track.wav --out media-workshop/quality.json --live
  node tools/media-studio.mjs signoff --item media-workshop/episode-with-audio.json --review media-workshop/human-review.json --out media-workshop/reviewed.json
  node tools/media-studio.mjs publish --item media-workshop/reviewed.json --rights-approval media-workshop/rights-approval.json [--replace]
  node tools/media-studio.mjs validate --file media-workshop/catalog.json\n  node tools/media-studio.mjs labels --query 'sentence'\nNote: live calls require MODEL_API_KEY; live output is a draft, never publication approval.`);process.exit(0)}
 if(command==='packet'){const i=readItem(flag('item'));const out=flag('out','media-workshop/recording.json');save(out,productionPacket(i));print({out,audioExists:!!i.audio});process.exit(0)}
 if(command==='ingest'){const i=readItem(flag('item')),rights=JSON.parse(readFileSync(flag('rights'),'utf8'));const audio=flag('audio'),video=flag('video');if(!!audio===!!video)throw Error('Provide exactly one of --audio or --video');const transcriptPath=flag('transcript');const transcript=transcriptPath?readFileSync(transcriptPath,'utf8'):null;const res=video?ingestVideo(i,{input:video,rights,transcript,captions:flag('captions')||null}):ingestAudio(i,{input:audio,rights,transcript});const out=flag('out','media-workshop/ingested.json');save(out,res.item);print({out,artifact:res.artifact,sha256:res.sha256,review:'pending'});process.exit(0)}
 if(command==='signoff'){const i=readItem(flag('item')),review=JSON.parse(readFileSync(flag('review'),'utf8'));const approved=markReviewed(i,review);const out=flag('out','media-workshop/reviewed.json');save(out,approved);print({out,review:'recorded from user-supplied reviewer metadata; credentials not independently authenticated'});process.exit(0)}
 if(command==='publish'){const item=readItem(flag('item')),rights=JSON.parse(readFileSync(flag('rights-approval'),'utf8'));if(rights.status!=='cleared'||!rights.approvedBy||!rights.evidence||!rights.date)throw Error('Separate rights clearance receipt required');item.rights={...item.rights,...rights};item.status='published';const gate=publicationGate(item,{knowledge:loadKnowledge(),assetRoot:'apps/biblioteca-viva'});if(!gate.ok)throw Error(gate.errors.join('; '));const path='content/media-production/catalog.json';const catalog=JSON.parse(readFileSync(path,'utf8'));const ix=catalog.items.findIndex(x=>x.id===item.id);if(ix>=0&&!args.includes('--replace'))throw Error('Media ID exists; use --replace after reviewing provenance and version history');if(ix>=0){if(catalog.items[ix].status==='published')throw Error('Published media must be versioned under a new ID');catalog.items[ix]=item}else catalog.items.push(item);save(path,catalog);print({path,id:item.id,status:'published',review:'provider credentials and rights claims are recorded but not independently authenticated by this tool'});process.exit(0)}
 if(command==='validate'){const c=JSON.parse(readFileSync(flag('file'),'utf8'));const r=validateCatalog(c);print(r);process.exit(r.ok?0:1)}
 const kb=loadKnowledge();
 if(command==='audit'){print({sourceId:kb.sourceId,terms:kb.termCount,medical:kb.terms.filter(x=>x.domain==='medical').length,legal:kb.terms.filter(x=>x.domain==='legal').length,unreviewed:kb.terms.filter(x=>x.review_state!=='approved').length,parentheticalLabels:kb.terms.filter(x=>/[()]/.test(x.english+' '+x.spanish)).length,sourceHash:kb.sourceHash,sourceFileSha256:kb.sourceFileSha256,concepts:kb.concepts.length,drills:kb.drills.length,dialogues:kb.dialogues.length});process.exit(0)}
 if(command==='labels'){print(searchKnowledge(kb,flag('query',''),{limit:20}));process.exit(0)}
 if(command==='queue'){const out=buildProductionQueue(kb,{max:Math.min(100,Math.max(1,Number(flag('max',24))))});save(flag('out','media-workshop/queue.json'),out);print({queued:out.length,path:flag('out','media-workshop/queue.json')});process.exit(0)}
 if(command==='brief'){const item=makeBrief(kb,{kind:flag('kind','audio-drama'),topic:flag('topic','negation'),domain:flag('domain','medical'),index:Number(flag('index',0))});const out=flag('out','media-workshop/brief.json');save(out,item);print({path:out,termIds:item.termIds});process.exit(0)}
 if(command==='batch'){
  const queue=JSON.parse(readFileSync(flag('queue','content/media-production/queue.json'),'utf8'));
  if(!Array.isArray(queue))throw Error('Invalid production queue');
  const dryRun=!args.includes('--live'),limit=Math.min(100,Math.max(1,Number(flag('limit',5)))),root=flag('out','media-workshop');
  const maxCalls=Number(flag('budget',20));const client=new MetaClient({maxRequests:maxCalls});const studio=new MediaStudio({client});const output=[];
  for(const brief of queue.slice(0,limit)){
   if(!/^[a-z0-9-]+$/.test(brief.id))throw Error('Invalid production brief ID');
   const checkpointPath=`${root}/${brief.id}/checkpoint.json`;
   const existing=existsSync(checkpointPath)?JSON.parse(readFileSync(checkpointPath,'utf8')).item:null;
   const result=await studio.create(brief,{dryRun,existing,onCheckpoint:async({item,completedStage})=>save(checkpointPath,{briefId:brief.id,completedStage,item,checkpointVersion:1})});
   const dir=persistStudioResult(result,root);output.push({id:brief.id,dir,status:dryRun?'prompts-only':result.item.status});
   if(!dryRun&&client.count+5>maxCalls)break;
  }
  print({batch:output,modelCalls:client.count,live:!dryRun,budget:maxCalls});process.exit(0);
 }
 if(command==='quality'){if(!args.includes('--live'))throw Error('Audio QA requires --live for Meta transcription');const item=readItem(flag('item'));const c=new MetaClient({maxRequests:2});const heard=await c.transcribe({wavPath:flag('audio'),languageBias:['en','es'],keywords:(item.termIds||[]).slice(0,20)});const report=await advisoryMetaAudioReview(c,{item,transcript:heard.transcript});const out=flag('out','media-workshop/audio-qa.json');save(out,{...report,asr:heard});print({out,approved:false});process.exit(0)}
 if(command==='author'){
  const brief=JSON.parse(readFileSync(flag('brief'),'utf8'));
  const dryRun=!args.includes('--live'),outputRoot=flag('out','media-workshop');
  if(!/^[a-z0-9-]+$/.test(brief.id))throw Error('Unsafe brief ID');
  const checkpointPath=flag('resume-checkpoint',`${outputRoot}/${brief.id}/checkpoint.json`);
  const existing=existsSync(checkpointPath)?JSON.parse(readFileSync(checkpointPath,'utf8')).item:null;
  const studio=new MediaStudio({client:new MetaClient({maxRequests:Number(flag('budget',15))})});
  const result=await studio.create(brief,{dryRun,existing,onCheckpoint:async ({item,completedStage})=>{
   save(checkpointPath,{briefId:brief.id,completedStage,item,checkpointVersion:1});
  }});
  const dir=persistStudioResult(result,outputRoot);
  print({dir,checkpoint:dryRun?null:checkpointPath,callsMade:result.callsMade,status:dryRun?'prompt-packet':result.item.status,review:'professional bilingual review required'});process.exit(0)
 }
 if(command==='repair'){
  if(!args.includes('--live'))throw Error('Script repair requires explicit --live and counts against Meta API budget');
  const brief=JSON.parse(readFileSync(flag('brief'),'utf8'));
  const candidate=JSON.parse(readFileSync(flag('item'),'utf8'));
  const existing=candidate.item?.id?candidate.item:candidate;
  const result=await repairMediaDraft(brief,existing,{client:new MetaClient({maxRequests:Number(flag('budget',2))})});
  const out=flag('out',`media-workshop/${brief.id}/repaired.json`);save(out,result.item);
  print({out,changed:result.changed,revision:result.revision||0,next:'Rerun the complete independent semantic and narrative critiques; then seek human bilingual review.'});process.exit(0);
 }
 if(command==='image'){if(!args.includes('--live'))throw Error('Image generation is opt-in with --live.');const out=flag('out','media-workshop/cover.webp');const client=new MetaClient({maxRequests:1});const [asset]=await client.image({prompt:flag('prompt')});mkdirSync(dirname(resolve(out)),{recursive:true});writeFileSync(out,asset.bytes);print({out,bytes:asset.bytes.length,model:asset.source});process.exit(0)}
 if(command==='transcribe'){if(!args.includes('--live'))throw Error('Transcription is opt-in with --live.');const out=flag('out','media-workshop/transcript.json');const client=new MetaClient({maxRequests:1});const result=await client.transcribe({wavPath:flag('audio'),languageBias:['en','es']});save(out,result);print({out,turns:result.turns?.length??0,review:'ASR transcription is not bilingual semantic review'});process.exit(0)}
 throw Error('Unknown command. Run help.');
}catch(e){console.error('ERROR:',e.message);process.exitCode=1}
