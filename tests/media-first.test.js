import test from 'node:test';import assert from 'node:assert/strict';
import{readFileSync,writeFileSync,mkdirSync,mkdtempSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';
import{humanLabel,normalizeCorpus,loadKnowledge,searchKnowledge}from'../media-engine/knowledge.mjs';
import{makeBrief,TYPES,recommendedKinds}from'../media-engine/blueprints.mjs';
import{MetaClient,metaModels}from'../media-engine/meta.mjs';
import{validateProduction,validateCatalog,scoreInterruption,publicationGate}from'../media-engine/validation.mjs';
import{productionPlan,MediaStudio,buildProductionQueue,stagePrompts}from'../media-engine/studio.mjs';
import{detectAudio,ingestAudio,markReviewed}from'../media-engine/ingest.mjs';
import{importLegacyItems,suggestMedia}from'../media-engine/library.mjs';
import{evaluateInterruption,observation}from'../apps/biblioteca-viva/media-app/voice-game.js';

const source=JSON.parse(readFileSync('entre_voces_knowledge_base.json','utf8'));
const kb=normalizeCorpus(source);
const item=()=>({...productionPlan(makeBrief(kb,{kind:'catch-the-change',topic:'negation'})),title:'A subtle omission',synopsis:'A professional conversation with a subtle error',script:'A fictional supervised practice conversation. The clinician first states clearly that the patient does not have fever. The interpreter incorrectly changes the negative statement to a positive statement. The patient asks for clarification, and the interpreter repairs the error with transparent wording.',turns:[{speaker:'clinician',language:'en',text:'He does not have fever.'},{speaker:'interpreter',language:'es',text:'Tiene fiebre.'},{speaker:'patient',language:'es',text:'¿Cómo?'},{speaker:'interpreter',language:'es',text:'No tiene fiebre.'}],errors:[{id:'e1',category:'negation',original:'does not',wrong:'yes',repair:'no tiene',startMs:1500,endMs:3500,recognizedPhrases:['no','negacion'],audibleSource:'He does not have fever',audibleWrong:'Tiene fiebre',audibleRepair:'No tiene fiebre',sourceTurnIndex:0,wrongTurnIndex:1,repairTurnIndex:3}],audio:'media/test.wav'});
test('uses the exact full original knowledge base, never a sample',()=>{assert.equal(kb.termCount,865);assert.equal(kb.terms.length,865);assert.deepEqual(kb.terms.map(t=>t.id),source.terms.map(t=>t.id));assert.equal(kb.terms.filter(t=>t.domain==='medical').length+kb.terms.filter(t=>t.domain==='legal').length,865);});
test('original canonical source is unchanged by normalization',()=>{assert.equal(source.terms.find(t=>t.english==='sentence (criminal)').english,'sentence (criminal)');assert.equal(kb.terms.find(t=>t.canonical_english==='sentence (criminal)').english,'criminal sentence')});
test('human-facing labels contain no parenthetical metadata',()=>{for(const x of kb.terms)assert.doesNotMatch(x.english+' '+x.spanish,/[()]/,x.id)});
test('meaningful criminal, civil, insurance senses are not stripped into homonyms',()=>{assert.equal(humanLabel('information (criminal)'),'criminal information');assert.equal(humanLabel('complaint (civil)'),'civil complaint');assert.equal(humanLabel('claim (insurance)'),'insurance claim');assert.equal(humanLabel('title (property)'),'property title')});
test('parenthetical acronyms move into aliases, not the visible label',()=>{const x=kb.terms.find(t=>t.canonical_english==='Oregon Health Plan (OHP)');assert.equal(x.english,'Oregon Health Plan');assert.deepEqual(x.aliases_en,['OHP']);assert.equal(humanLabel('forcible entry and detainer (FED)'),'forcible entry and detainer')});
test('ordinary meaningful parentheses are not universally erased',()=>{assert.equal(humanLabel('A clause (when applicable) in a long sentence'),'A clause (when applicable) in a long sentence')});
test('search discovers bilingual terms and abbreviations',()=>{assert.ok(searchKnowledge(kb,'infarto').some(x=>x.spanish.includes('infarto')));assert.ok(searchKnowledge(kb,'OHP').some(x=>x.english==='Oregon Health Plan'));});
test('all production recommendations point to actual existing knowledge IDs',()=>{const queue=buildProductionQueue(kb,{max:44});assert.equal(queue.length,44);const ids=new Set(kb.terms.map(t=>t.id));for(const b of queue){assert.ok(TYPES[b.kind]);assert.ok(b.termIds.length>0);assert.ok(b.termIds.every(id=>ids.has(id)));}});
test('dry-run produces prompt packets without any Meta calls',async()=>{const studio=new MediaStudio({client:{textJSON(){throw Error('not called')}}});const draft=await studio.create(makeBrief(kb,{kind:'song',topic:'negation'}),{dryRun:true});assert.equal(draft.callsMade,0);assert.equal(draft.prompts.length,5);assert.equal(draft.proposed.status,'proposed');});
test('Meta client endpoint and model routing match current public docs',()=>{assert.equal(metaModels.bulk,'muse-spark-1.3');assert.equal(metaModels.director,'muse-wonder-1.0');assert.equal(metaModels.speechSynthesis,'NOT_SUPPORTED')});
test('Meta text pipeline sends developer role and parses JSON',async()=>{let url='',init;const c=new MetaClient({apiKey:'TEST',maxRequests:1,fetchImpl:async(u,i)=>{url=u;init=i;return{ok:true,json:async()=>({choices:[{message:{content:'{"ok":true}'}}]})}}});const x=await c.textJSON({system:'Careful',user:{a:1}});assert.equal(x.data.ok,true);assert.ok(url.endsWith('/chat/completions'));assert.equal(JSON.parse(init.body).messages[0].role,'developer');assert.ok(init.headers.Authorization==='Bearer TEST')});
test('Meta request budget prevents runaway spend',async()=>{const c=new MetaClient({apiKey:'TEST',maxRequests:1,fetchImpl:async()=>({ok:true,json:async()=>({choices:[{message:{content:'{}'}}]})})});await c.textJSON({system:'a',user:{}});await assert.rejects(c.textJSON({system:'a',user:{}}),/budget reached/)});
test('Meta client refuses generation without credentials',async()=>{const c=new MetaClient({apiKey:null});await assert.rejects(c.textJSON({system:'a',user:{}}),/MODEL_API_KEY/)});
test('unreviewed semantic game cannot be scored',()=>{assert.equal(scoreInterruption(item(),1600).status,'unscored');assert.equal(evaluateInterruption(item(),{atMs:1600}).state,'unscored')});
test('reviewed and timed spoken game can credit only error detection',()=>{const i=item();i.review={bilingualApproved:true,domainApproved:true,reviewDate:'2026-10-29'};const result=evaluateInterruption(i,{atMs:2000,mode:'voice',spokenText:'No dijo no'});assert.equal(result.state,'detected');assert.equal(result.credit,'error-detection-only');const event=observation(i,result,{atMs:2000,mode:'voice'});assert.equal(event.independentSpokenInterpretation,false)});
test('misheard words and unclear voice do not become spoken interpreting proficiency',()=>{const i=item();i.review={bilingualApproved:true,domainApproved:true};assert.equal(evaluateInterruption(i,{atMs:2500,mode:'voice',spokenText:''}).state,'unscored');assert.equal(evaluateInterruption(i,{atMs:2500,mode:'voice',spokenText:'noise'}).state,'timing-only')});
test('missed targets are not treated as semantic errors',()=>{const i=item();i.review={bilingualApproved:true,domainApproved:true};assert.equal(evaluateInterruption(i,{atMs:8000,mode:'tap'}).state,'miss')});
test('invalid error cue intervals fail',()=>{const i=item();i.errors[0].endMs=1200;assert.ok(validateProduction(i,{knowledge:kb}).errors.some(x=>x.includes('Invalid error cue')))});
test('incomplete voice-first script is rejected',()=>{const i=item();i.turns=[];assert.ok(validateProduction(i).errors.some(x=>x.includes('three turns')))});
test('invalid or unreachable branching story fails',()=>{const i={...productionPlan(makeBrief(kb,{kind:'audio-mystery'})),title:'The wrong corridor',synopsis:'Hearing changes a room',start:'a',nodes:{a:{text:'A',choices:[{label:'Go',next:'b'}]},b:{text:'Done',choices:[]},c:{text:'Hidden',choices:[]}}};assert.ok(validateProduction(i).errors.some(x=>x.includes('Unreachable')))});
test('publication requires rights, real media, transcript and professional sign-off',()=>{const i=item();assert.equal(publicationGate(i).ok,false);i.review={bilingualApproved:true,domainApproved:true,editorialApproved:true};i.rights={status:'cleared'};i.transcript='Long accurate transcript';i.status='published';assert.equal(publicationGate(i).ok,true)});
test('catalog rejects duplicate IDs',()=>{const x=item();const r=validateCatalog({items:[x,x]},{knowledge:kb});assert.equal(r.ok,false);assert.ok(r.errors.some(e=>e.includes('Duplicate')))});
test('Suno link must be exact safe share link',()=>{const i={...productionPlan(makeBrief(kb,{kind:'song'})),title:'Some song',synopsis:'A song',sunoUrl:'https://evil.example.com/track'};assert.ok(validateProduction(i).errors.includes('Invalid Suno share link'))});
test('audio bytes checked by magic signature, not extension alone',()=>{assert.equal(detectAudio(Buffer.alloc(100),'.wav'),false);const b=Buffer.alloc(100);b.write('RIFF',0);b.write('WAVE',8);assert.equal(detectAudio(b,'.wav'),true)});
test('ingest refuses rights omission even for valid recorded audio',()=>{const temp=mkdtempSync(join(tmpdir(),'ev-ingest-'));const b=Buffer.alloc(120);b.write('RIFF',0);b.write('WAVE',8);const wav=join(temp,'test.wav');writeFileSync(wav,b);assert.throws(()=>ingestAudio(item(),{input:wav}),/Rights receipt/);const out=ingestAudio(item(),{input:wav,outputRoot:join(temp,'media'),rights:{creator:'Test narrator',license:'recorded with consent',recordedAt:'2026-10-29',authorization:'written consent'}});assert.equal(out.item.status,'audio-produced');assert.equal(out.item.review.bilingualApproved,false)});
test('human review cannot be fabricated without reviewer and credential',()=>{assert.throws(()=>markReviewed(item(),{}),/Professional signoff/);const i=markReviewed(item(),{reviewer:'Test reviewer',credential:'Qualified bilingual interpreter',reviewDate:'2026-10-29',medicalLegalReviewed:true,languagePair:'en-es',approved:true});assert.equal(i.review.bilingualApproved,true)});
test('legacy catalog imports song external links and correctly tags script-only assets',()=>{const src={items:[{id:'song1',kind:'song',title:'Original music',externalAudio:{url:'https://suno.com/s/abc'},lyrics:'Lyrics'},{id:'story1',kind:'telenovela',title:'Audio pending',body:'Script'}]};const imported=importLegacyItems(src);assert.equal(imported[0].sunoUrl,'https://suno.com/s/abc');assert.equal(imported[1].productionStatus,'script-only')});
test('suggestions prioritize weak concept targets, not demographic stereotypes',()=>{const target=kb.terms[500];const rec=suggestMedia(kb,{weakConceptIds:[target.id],limit:2});assert.equal(rec[0].termId,target.id)});
test('generated covers are requested through the correct Meta image endpoint',async()=>{let payload;const c=new MetaClient({apiKey:'test',maxRequests:1,fetchImpl:async(u,init)=>{payload={u,init:JSON.parse(init.body)};return{ok:true,json:async()=>({data:[{b64_json:Buffer.from('mock-image').toString('base64')}],output_format:'webp'})}}});const a=await c.image({prompt:'Original book art'});assert.equal(a[0].bytes.toString(),'mock-image');assert.ok(payload.u.endsWith('/images/generations'));assert.equal(payload.init.model,'muse-image-1.0')});
import {compareAudioText,productionPacket,advisoryMetaAudioReview} from '../media-engine/quality.mjs';
test('audio QA detects missing negation and changed numbers while refusing self-approval',()=>{const x=compareAudioText('Take 5 tablets? No, never take 15.','Take 15 tablets.');assert.equal(x.autoApproval,false);assert.ok(x.reviewFlags.includes('numbers-differ'));assert.ok(x.reviewFlags.includes('negation-count-differs'))});
test('sound-production packet remains explicit about missing audio and rights',()=>{const i=item();i.script='A sufficiently long, carefully written example script';const x=productionPacket(i);assert.equal(x.notProduced,true);assert.equal(x.metaAsr,'muse-voice-transcribe-1.0');assert.ok(x.requirements.rights)});
test('Meta audio quality review cannot grant professional approval',async()=>{const c={textJSON:async()=>({model:'muse-spark-1.3',data:{verdict:'needs-listening-review',flags:[],speakerNotes:[],cautions:['ASR is imperfect']}})};const x=await advisoryMetaAudioReview(c,{item:{...item(),script:'I have not had pain.'},transcript:'I have had pain.'});assert.equal(x.approved,false);assert.equal(x.humanReviewPending,true)});
test('all authored seed items meet minimum content lengths',()=>{const c=JSON.parse(readFileSync('content/media-production/catalog.json','utf8'));assert.ok(c.items.length>=9);for(const x of c.items){const min=TYPES[x.kind].minWords;assert.ok(x.script.split(/\s+/).length>=min,`${x.id} was too short`);assert.equal(x.status,'script-draft');assert.equal(x.audio,null);assert.equal(x.review.bilingualApproved,false);}});
test('production seed catalog is source-grounded and its branching graph is reachable',()=>{const c=JSON.parse(readFileSync('content/media-production/catalog.json','utf8'));const check=validateCatalog(c,{knowledge:kb,strict:true});assert.equal(check.ok,true,check.errors.join('; '));assert.ok(c.items.some(x=>x.kind==='audio-mystery'));assert.ok(c.items.some(x=>x.kind==='podcast'));assert.ok(c.items.some(x=>x.kind==='audio-drama'));assert.ok(c.items.filter(x=>x.kind==='catch-the-change').length>=5)});
test('browser root foregrounds the library and does not expose drafts',()=>{const html=readFileSync('apps/biblioteca-viva/index.html','utf8');assert.ok(html.includes('id="shelves"'));assert.ok(html.includes('href="practice.html"'));assert.ok(!html.includes('id="game-collection"'));assert.ok(!html.includes('cada-dos-dias-script'));});
test('Meta image-understanding QA submits actual image input, never a textual filename',async()=>{const temp=mkdtempSync(join(tmpdir(),'ev-image-')),file=join(temp,'cover.png');writeFileSync(file,Buffer.from([137,80,78,71,13,10,26,10,0,0]));let payload;const c=new MetaClient({apiKey:'test',maxRequests:1,fetchImpl:async(u,init)=>{payload=JSON.parse(init.body);return{ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({findings:[],readyForHumanReview:true})}}]})}}});const x=await c.inspectImage({imagePath:file});assert.equal(x.review,'advisory-model-only');assert.equal(payload.messages[1].content[1].type,'image_url');assert.ok(payload.messages[1].content[1].image_url.url.startsWith('data:image/png;base64,'))});

test('media studio saves complete stage checkpoints and resumes after interrupted model calls',async()=>{
 const brief=makeBrief(kb,{kind:'story',topic:'negation',index:75});
 const calls=[];let remaining=2;const stageReply=(stage)=>{
  if(stage===1)return {title:'The Word That Was Lost',synopsis:'A family discovers what an omitted word means.',concept:'The effect of missing negation',emotionalArc:'Curiosity to understanding',cast:[{name:'Eva',voice:'warm',role:'trainee'}],originality:'First-person ensemble story',episodeBeats:['A message is heard','It is misunderstood','Correction arrives']};
  if(stage===2)return {script:JSON.parse(readFileSync('content/media-production/catalog.json','utf8')).items.find(x=>x.id==='drama-last-word-special-the-missing-day').script,sceneDirections:[],productionNotes:[],sourceClaims:[]};
  if(stage===3)return {findings:[],criticalMeaningUnits:[],verdict:'accept'};
  if(stage===4)return {findings:[],appeal:{immediateHook:'yes',characterDepth:'yes',suspense:'yes',humor:'yes',replayValue:'yes'},verdict:'accept'};
  return {recording:{casting:[],segments:[]},art:{prompt:'Original cover',altText:'A listener'},music:{brief:'Quiet',stems:[]},sunoPrompt:'',video:{iphoneWorkflow:'Create short',shotList:[]},accessibility:{transcriptPlan:'Complete',captionsPlan:'Complete',reducedAudioPlan:'Text'}};
 };
 let latest;
 const first=new MediaStudio({client:{count:0,async textJSON(){const index=++this.count;calls.push(index);if(index>2)throw Error('Simulated API interruption');return {data:stageReply(index),usage:{tokens:12}};}}});
 await assert.rejects(first.create(brief,{onCheckpoint:({item})=>latest=structuredClone(item)}),/interruption/);
 assert.equal(latest.generation.stages.length,2);
 assert.equal(latest.script.length>500,true,'checkpoint includes complete script payload, not only stage ID');
 const resumed=new MediaStudio({client:{count:0,async textJSON(){const index=++this.count+2;calls.push(index);return {data:stageReply(index),usage:{tokens:12}};}}});
 const result=await resumed.create(brief,{existing:latest,onCheckpoint:({item})=>latest=structuredClone(item)});
 assert.equal(result.item.generation.stages.length,5);
 assert.deepEqual(calls,[1,2,3,3,4,5]);
 assert.equal(result.item.title,'The Word That Was Lost');
 assert.equal(result.item.script.length>500,true);
 assert.equal(result.item.review.bilingualApproved,false);
});

test('resuming with a changed brief is forbidden',async()=>{
 const brief=makeBrief(kb,{kind:'song',topic:'frequency',index:23});
 const draft=await new MediaStudio().create(brief,{dryRun:true});
 await assert.rejects(new MediaStudio().create({...brief,topic:'changed'},{dryRun:true,existing:draft.proposed}),/changed/);
});

test('voice cue matching never treats noise as the standalone word no',()=>{
 const i=item();i.review={bilingualApproved:true,domainApproved:true};
 const x=scoreInterruption(i,2000,{mode:'voice',spokenText:'I heard noise'});
 assert.equal(x.status,'timing-only');
 assert.match(x.reason,/not established/);
});

import {publicItem,publicCatalog} from '../media-engine/publication.mjs';
test('public media projection excludes scripts, prompts, reviews and credentials',()=>{
 const full={...item(),kind:'song',script:'PRIVATE SCRIPT',lyrics:'PRIVATE LYRICS',generation:{secret:'PRIVATE PROMPT'},review:{credential:'PRIVATE CREDENTIAL'},rights:{authorization:'PRIVATE RELEASE'},prompts:{suno:'PRIVATE PROMPT'}};
 const raw=JSON.stringify(publicItem(full));for(const secret of ['PRIVATE SCRIPT','PRIVATE LYRICS','PRIVATE PROMPT','PRIVATE CREDENTIAL','PRIVATE RELEASE'])assert.ok(!raw.includes(secret));
});
test('the public media snapshot excludes unpublished drafts and rejects improperly approved items',()=>{
 const source=JSON.parse(readFileSync('content/media-production/catalog.json','utf8'));assert.equal(publicCatalog(source).items.length,0);
 const bad={...source.items[0],status:'published'};assert.throws(()=>publicCatalog({items:[bad]}),/failed release gate/);
});

import {validateVoiceWav} from '../media-engine/meta.mjs';
function minimalWav({rate=24000,channels=1,bits=16,dataBytes=800}={}){
 const b=Buffer.alloc(44+dataBytes);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(channels,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*channels*(bits/8),28);b.writeUInt16LE(channels*(bits/8),32);b.writeUInt16LE(bits,34);b.write('data',36);b.writeUInt32LE(dataBytes,40);return b;
}
test('Meta voice input enforces supported mono PCM 16/24kHz, actual chunks and size',()=>{
 assert.equal(validateVoiceWav(minimalWav({rate:16000})).sampleRate,16000);
 assert.equal(validateVoiceWav(minimalWav({rate:24000})).sampleRate,24000);
 assert.throws(()=>validateVoiceWav(minimalWav({rate:44100})),/Convert recording/);
 assert.throws(()=>validateVoiceWav(minimalWav({channels:2})),/Convert recording/);
 assert.throws(()=>validateVoiceWav(minimalWav({bits:8})),/Convert recording/);
 const broken=minimalWav();broken.writeUInt32LE(999999,40);assert.throws(()=>validateVoiceWav(broken),/Corrupt WAV/);
});
test('Meta voice upload uses multipart request and never guesses an assessment',async()=>{
 const temp=mkdtempSync(join(tmpdir(),'ev-meta-wav-'));const path=join(temp,'voice.wav');writeFileSync(path,minimalWav());
 let captured;const client=new MetaClient({apiKey:'FAKE',maxRequests:1,fetchImpl:async(u,opts)=>{captured={u,opts};return{ok:true,json:async()=>({transcript:'I have not had chest pain.',turns:[{text:'I have not had chest pain.'}]})}}});
 const result=await client.transcribe({wavPath:path,languageBias:['en','es']});
 assert.match(captured.u,/\/asr\/transcribe$/);assert.equal(captured.opts.headers.Authorization,'Bearer FAKE');
 assert.ok(captured.opts.body instanceof FormData);assert.equal(result.transcript,'I have not had chest pain.');
 assert.equal(Object.hasOwn(result,'professionalGrade'),false);
});

test('the exact knowledge file used in the earlier Entre Voces corpus remains the source for the new media engine',async()=>{
 const raw=readFileSync('entre_voces_knowledge_base.json');
 const used=loadKnowledge();assert.equal(used.sourceFileSha256,(await import('node:crypto')).createHash('sha256').update(raw).digest('hex'));
 assert.equal(used.sourceFileSha256,'802c5c93015293b7759779a6bfc364e89923c70f77c156e4988c422a33f55487');
});

test('video moves from unreviewed intake through explicit release and stops if its file changes',async()=>{
 const {ingestVideo}=await import('../media-engine/ingest.mjs');
 const root=mkdtempSync(join(tmpdir(),'ev-film-')),media=join(root,'media');mkdirSync(media);
 const file=join(root,'clip.mp4'),bytes=Buffer.alloc(48);bytes.write('ftyp',4);writeFileSync(file,bytes);const captions=join(root,'captions.vtt');writeFileSync(captions,'WEBVTT\n\n00:00.000 --> 00:01.000\nHello\n');
 const base={...productionPlan(makeBrief(kb,{kind:'film',topic:'negation',index:91})),title:'A film',synopsis:'A short film',script:Array(200).fill('scene').join(' ')};
 const rights={creator:'Creator',license:'demo',recordedAt:'2026-10-29',authorization:'written'};
 const draft=ingestVideo(base,{input:file,outputRoot:media,rights,transcript:'Accessible transcript',captions}).item;
 assert.equal(publicCatalog({items:[draft]},{knowledge:kb,assetRoot:root}).items.length,0);
 const reviewed=markReviewed(draft,{reviewer:'Reviewer',credential:'Qualified interpreter',reviewDate:'2026-10-29',medicalLegalReviewed:true,languagePair:'en-es',approved:true});
 const released={...reviewed,status:'published',rights:{...reviewed.rights,status:'cleared'}};
 const published=publicCatalog({items:[released]},{knowledge:kb,assetRoot:root});assert.equal(published.items.length,1);assert.equal(published.items[0].video,`media/${base.id}.mp4`);assert.equal(published.items[0].script,undefined);
 writeFileSync(join(root,released.video),Buffer.alloc(48));assert.throws(()=>publicCatalog({items:[released]},{knowledge:kb,assetRoot:root}),/hash does not match/);
});
