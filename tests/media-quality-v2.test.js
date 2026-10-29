import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadKnowledge} from '../media-engine/knowledge.mjs';
import {makeBrief} from '../media-engine/blueprints.mjs';
import {chooseGroundedTerms,auditBriefGrounding} from '../media-engine/curation.mjs';
import {creativeDNA} from '../media-engine/creative-bible.mjs';
import {evaluateCraft,auditContradictions} from '../media-engine/editorial.mjs';
import {validateProduction,publicationGate} from '../media-engine/validation.mjs';
import {MediaStudio} from '../media-engine/studio.mjs';
import {MetaClient} from '../media-engine/meta.mjs';
import {guessLanguage,splitNarration} from '../apps/biblioteca-viva/media-app/audio-companion.js';
const knowledge=loadKnowledge(),catalog=JSON.parse(readFileSync('content/media-production/catalog.json')).items;
const old=10,newEntries=catalog.slice(old);
test('curation of missing concepts fails rather than silently selecting anatomy',()=>{
 assert.throws(()=>makeBrief(knowledge,{topic:'antimatter tornado',domain:'medical'}),/No substantively grounded/);
 assert.ok(makeBrief(knowledge,{topic:'negation',domain:'medical'}).knowledge.every(x=>x.en!=='anatomy'));
});
test('curated legal hearing and medical hearing are not interchanged',()=>{
 const legal=chooseGroundedTerms(knowledge,{topic:'hearing',domain:'legal'});
 const medical=chooseGroundedTerms(knowledge,{topic:'hearing',domain:'medical'});
 assert.equal(legal[0].english,'hearing');
 assert.equal(medical[0].english,'hearing loss');
 assert.ok(medical.every(x=>x.domain==='medical'));
});
test('consent in legal context uses a right or waiver, not clinical consent',()=>{
 const brief=makeBrief(knowledge,{topic:'informed consent',domain:'legal'});
 assert.equal(auditBriefGrounding(brief,knowledge).ok,true);
 assert.ok(brief.knowledge.some(x=>x.en==='waiver'));
 assert.ok(!brief.knowledge.some(x=>x.en==='informed consent'));
});
test('creative DNA is reproducible and gives distinctive audio directions',()=>{
 const a=creativeDNA({id:'scene-11',kind:'song',topic:'uncertainty',domain:'legal'});
 const b=creativeDNA({id:'scene-11',kind:'song',topic:'uncertainty',domain:'legal'});
 assert.deepEqual(a,b);assert.match(a.music,/bolero|son|milonga|pop|cumbia|folk/);
 assert.notDeepEqual(a,creativeDNA({id:'scene-14',kind:'film',topic:'negation',domain:'medical'}));
});
test('all newly written showcase media are substantive, review-marked and domain linked',()=>{
 assert.equal(catalog.length,17);
 for(const x of newEntries){
  const craft=evaluateCraft(x);
  assert.equal(craft.readyForModelCritique,true,x.id+': '+JSON.stringify(craft.issues));
  assert.ok(x.script.length>1000,x.id);
  assert.ok(x.termIds.every(id=>knowledge.terms.some(t=>t.id===id&&t.domain===x.domain)),x.id);
  assert.equal(x.review.bilingualApproved,false);
  assert.equal(x.status,'script-draft');
  assert.equal(x.audio,null);
 }
});
test('every catch exercise anchors original, wrong and repair in actual utterances',()=>{
 const exercises=catalog.filter(x=>x.kind==='catch-the-change');assert.ok(exercises.length>=7);
 for(const x of exercises){
  const v=validateProduction(x,{knowledge,strict:true});assert.equal(v.ok,true,x.id+' '+v.errors.join(','));
  assert.equal(evaluateCraft(x).issues.some(f=>f.code==='untraceable-error'),false,x.id);
 }
});
test('a wrong-language or missing audio phrase cannot be released',()=>{
 const x=structuredClone(catalog.find(x=>x.id==='voice-no-promesa'));x.errors[0].audibleWrong='se lo garantizo';
 assert.ok(validateProduction(x,{strict:true}).errors.some(x=>x.includes('audibleWrong')));
 const y=structuredClone(catalog.find(x=>x.id==='voice-no-era-lo-mismo'));y.errors[0].wrongTurnIndex=0;
 assert.ok(validateProduction(y,{strict:true}).errors.some(x=>x.includes('audibleWrong')));
});
test('cheap script padding is rejected even if it exceeds the word target',()=>{
 const script=('NORA: I am speaking words again, repeating the same line again and again.\n').repeat(75);
 const craft=evaluateCraft({kind:'audio-drama',script});assert.ok(craft.wordCount>600);
 assert.ok(craft.issues.some(x=>x.code==='repetitive-padding'));
});
test('drafts cannot claim rights or professional approval just by having a model response',()=>{
 const item=structuredClone(catalog.find(x=>x.id==='voice-no-era-lo-mismo'));
 item.audio='media/audible.mp3';item.transcript='Transcript exists';item.status='published';
 assert.equal(publicationGate(item).ok,false);
 assert.ok(publicationGate(item).errors.some(x=>/Rights|review/.test(x)));
});
test('device narration respects actual source languages when turns are explicit',()=>{
 assert.equal(guessLanguage({text:'I cannot promise that the form has been approved.',language:'en'}),'en-US');
 assert.equal(guessLanguage({text:'No puedo prometer que se haya aprobado el formulario.',language:'es'}),'es-ES');
 assert.equal(guessLanguage({text:'That is what the neighbor told me.'},'es'),'en-US');
 assert.equal(guessLanguage({text:'La vecina me dijo que estaba abierta.'},'en'),'es-ES');
 assert.equal(splitNarration('NORA: We should check before we decide.').length,1);
});
test('frozen brief preserves source links after repeated content-generation attempts',()=>{
 const b=makeBrief(knowledge,{kind:'audio-drama',topic:'eviction',domain:'legal',index:17});
 const rebuilt=makeBrief(knowledge,{kind:'audio-drama',topic:'eviction',domain:'legal',index:17});
 assert.deepEqual(b,rebuilt);assert.ok(b.knowledge.length>=3);
});
test('independent critiques rejecting a script trigger two revisions, never automatic approval',async()=>{
 const b=makeBrief(knowledge,{kind:'story',topic:'negation',domain:'medical',index:0});
 const good=catalog.find(x=>x.id==='drama-last-word-special-the-missing-day').script;
 let scripts=0,critics=0;const responses=[];
 const client={count:0,async textJSON({system}){
  this.count++;
  if(system.includes('Revise the EXISTING complete script')){scripts++;return{model:'muse-wonder-1.0',usage:{},data:{script:good,sceneDirections:[],productionNotes:[],sourceClaims:[]}}}
  if(system.includes('Return {title,synopsis,concept'))return {model:'muse-wonder-1.0',usage:{},data:{title:'The Roof Key',synopsis:'A thoughtful and funny misunderstanding',concept:'The cost of unclear messages',emotionalArc:'Hope to accountability',cast:[{name:'Teresa'},{name:'Lupe'}],originality:'Original',episodeBeats:['A key','A message','A choice']}};
  if(system.includes('Return {script:'))return {model:'muse-spark-1.3',usage:{},data:{script:good,sceneDirections:[],productionNotes:[],sourceClaims:[]}};
  if(system.includes('criticalMeaningUnits')){critics++;return {model:'muse-wonder-1.0',usage:{},data:{verdict:'revise',findings:[{severity:'major',problem:'Invented detail'}],criticalMeaningUnits:[]}};}
  if(system.includes('Return {recording:'))throw Error('Production must not run after two rejected rounds');
  return{model:'muse-spark-1.3',usage:{},data:{verdict:'revise',appeal:{},findings:[{severity:'major',problem:'Unclear stakes'}]}};
 }};
 const result=await new MediaStudio({client}).create(b);
 assert.equal(result.productionBlocked,true);
 assert.equal(result.item.generation.revisions?.length,2);
 assert.equal(result.item.status,'script-draft');
 assert.equal(result.item.review.bilingualApproved,false);
 assert.equal(result.item.generation.stageOutputs.production,undefined);
 assert.ok(scripts===2&&critics>=3);
});
test('listening comparison is hidden until explicit reveal in the actual browser source',()=>{
 const source=readFileSync('apps/biblioteca-viva/media-app/app.js','utf8');
 assert.match(source,/detailRevealed\?/);assert.match(source,/data-reveal-comparison/);
 assert.match(source,/detailRevealed=false/);
 assert.match(readFileSync('apps/biblioteca-viva/index.html','utf8'),/audio-speed/);
});

test('paid-call budget includes retried HTTP attempts and never silently overspends',async()=>{
 let attempts=0;const fake=async()=>{attempts++;return {ok:false,status:429,text:async()=> 'Simulated rate limit'}};
 const c=new MetaClient({apiKey:'TEST_ONLY',fetchImpl:fake,maxRequests:2});
 await assert.rejects(c.textJSON({system:'demo',user:{}}),/budget reached/);
 assert.equal(attempts,2);assert.equal(c.count,2);
});
