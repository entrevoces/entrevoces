import test from 'node:test';
import assert from 'node:assert/strict';
import {MetaClient} from '../media-engine/meta.mjs';
import {readFileSync} from 'node:fs';
const specimen=JSON.parse(readFileSync('content/media-production/catalog.json','utf8')).items.find(x=>x.id==='drama-last-word-special-the-missing-day').script;
const fullScene=specimen+'\nELENA: todos los días.\nLUPE: un día sí y otro no.\n';
import {checkSemanticResult,checkCreativeSample,semanticsSchema,creativeSchema,benchmarkCases,runMetaLive} from '../media-engine/meta-eval.mjs';

const msg=(content,model='muse-spark-1.3')=>({id:'resp-live-fixture',model,choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}],usage:{total_tokens:90}});
const mockFetch=(response,inspect=()=>{})=>async (url,options)=>{inspect(url,options);return{ok:true,json:async()=>response}};
test('structured outputs use official Meta chat completions response_format',async()=>{
 let p;
 const reply=msg({faithful:false,kind:'negation',changedMeaning:'Negated chest pain',specificEvidence:'not deleted'});
 const cli=new MetaClient({apiKey:'TEST_ONLY_NOT_A_REAL_KEY',fetchImpl:mockFetch(reply,(url,options)=>{
  assert.equal(url,'https://api.meta.ai/v1/chat/completions');p=JSON.parse(options.body);
 }),maxRequests:1});
 const r=await cli.textJSON({model:'muse-spark-1.3',system:'check',user:{text:'hi'},schema:semanticsSchema});
 assert.equal(p.model,'muse-spark-1.3');assert.equal(p.response_format.type,'json_schema');assert.equal(p.response_format.json_schema.strict,true);assert.equal(r.data.kind,'negation');assert.equal(r.requestId,'resp-live-fixture');
});
test('provider mismatched model ID or truncation is a failure',async()=>{
 const bad=new MetaClient({apiKey:'FAKE',fetchImpl:mockFetch(msg({x:1},'other-model'))});await assert.rejects(bad.textJSON({system:'a',user:'b'}),/unexpected model/);
 const truncated=new MetaClient({apiKey:'FAKE',fetchImpl:mockFetch({choices:[{finish_reason:'length',message:{content:'{}'}}]})});await assert.rejects(truncated.textJSON({system:'a',user:'b'}),/truncated/);
});
test('benchmark fails wrong meaning and passes correct classified changes',()=>{
 assert.equal(benchmarkCases.length,8);
 assert.equal(checkSemanticResult(benchmarkCases[0],{data:{faithful:false,kind:'negation',specificEvidence:'not deleted'}}).pass,true);
 assert.equal(checkSemanticResult(benchmarkCases[0],{data:{faithful:false,kind:'none',specificEvidence:'incorrect'}}).pass,false);
 assert.equal(checkSemanticResult(benchmarkCases[5],{data:{faithful:true,kind:'none',specificEvidence:'uncertainty preserved'}}).pass,true);
});
test('creative sample must actually include long, two-character, contrasting, speech-ready scene',()=>{
 const x={};for(const key of Object.keys(creativeSchema.properties))x[key]='example';x.characters=['Elena','Lupe'];x.script=fullScene;x.correctSpanish='un día sí y otro no';x.incorrectSpanish='todos los días';
 assert.equal(checkCreativeSample({data:x}).pass,true);
 x.script='a few words';assert.equal(checkCreativeSample({data:x}).pass,false);x.script=fullScene.replace('un día sí y otro no.','');assert.equal(checkCreativeSample({data:x}).pass,false);
});
test('live harness records real provenance and refuses to pass all-wrong model outputs',async()=>{
 const fake={count:0,textJSON:async ({model,schema,user})=>{fake.count++; if(schema===semanticsSchema){return{model,requestId:'mock-response',data:{faithful:true,kind:'none',specificEvidence:'test evidence'},usage:{}}}const obj={title:'test',premise:'test',sourceEnglish:'take one tablet',incorrectSpanish:'dos pastillas',correctSpanish:'una pastilla',whyItMatters:'frequency',characters:['a','b'],script:fullScene,productionNotes:'test'};return{model,requestId:'mock-response',data:obj,usage:{}}}};
 const r=await runMetaLive({client:fake,models:['muse-spark-1.3']});assert.equal(r.runMode,'injected-test-client');assert.equal(r.summary.pass,false);assert.equal(r.samples.length,1);assert.equal(r.results.length,8);
});
