import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpokenServer} from '../services/spoken-gateway/server.js';
import {createMetaClient,extractResponseText} from '../services/spoken-gateway/meta-client.js';
import {taskFromKnowledge,parseAssessment,validatePcmWav} from '../services/spoken-gateway/assessment.js';
import {encodeWav,SpokenPractice,normalizeSpokenApiUrl} from '../apps/games/_shared/spoken-client.js';
import {curriculumSource} from '../generator/curriculum-source.js';
import {compileCurriculum} from '../packages/engine-core/curriculum.js';

const knowledge=compileCurriculum(curriculumSource()).knowledge;
const task=taskFromKnowledge(knowledge,{domain:'medical',lang:'es',conceptId:'dose'});
const wave=async()=>Buffer.from(await encodeWav(Float32Array.from({length:24000},(_,i)=>Math.sin(i/11)*.2),24000).arrayBuffer());
const good=JSON.stringify({verdict:'faithful',confidence:.96,languageMatch:true,units:[{source:'Take one dose now',spoken:'Tome una dosis ahora',status:'preserved',reason:'Dose and timing preserved'},{source:'then wait six hours.',spoken:'espere seis horas',status:'preserved',reason:'Wait duration preserved'}],feedback:'Well done.',repairPrompt:'Try with a longer message.'});

test('approved scenarios stay grounded in source-backed bilingual examples',()=>{
  assert.equal(task.sourceText,'Take one dose now, then wait six hours.');
  const reverse=taskFromKnowledge(knowledge,{domain:'medical',lang:'es',conceptId:'dose',direction:'reverse'});
  assert.equal(reverse.sourceText,'Tome una dosis ahora y luego espere seis horas.');
  assert.equal(reverse.referenceText,task.sourceText);assert.equal(reverse.targetLanguage,'en');
  assert.ok(task.sourceIds.length);
  assert.equal(taskFromKnowledge(knowledge,{domain:'medical',lang:'fr',conceptId:'dose'}),null);
  assert.equal(taskFromKnowledge(knowledge,{domain:'legal',lang:'es',conceptId:'dose'}),null);
  assert.equal(taskFromKnowledge(knowledge,{domain:'medical',lang:'es',conceptId:'__proto__'}),null);
});

test('client audio encoder emits valid signed PCM 16kHz for Seamless, never browser webm',async()=>{
  const b=await wave();assert.equal(validatePcmWav(b),true);assert.equal(b.readUInt32LE(24),16000);
  assert.equal(validatePcmWav(Buffer.from('noise')),false);
  const wrong=Buffer.from(b);wrong.writeUInt16LE(2,22);assert.equal(validatePcmWav(wrong),false);
  const huge=Buffer.alloc(1_500_001);assert.equal(validatePcmWav(huge),false);
});

test('public Modal endpoint URL rejects insecure, credential-bearing and query URLs',()=>{
  assert.equal(normalizeSpokenApiUrl('https://example--ev.modal.run/'),'https://example--ev.modal.run');
  assert.equal(normalizeSpokenApiUrl('http://127.0.0.1:8014'),'http://127.0.0.1:8014');
  for(const url of ['http://example.com','https://secret@example.com','https://example.com/?key=abc','javascript:alert(1)','/api'])assert.equal(normalizeSpokenApiUrl(url),'');
});

test('semantic assessor fails closed when quotes are ungrounded, JSON malformed or judgement contradicts units',()=>{
  assert.equal(parseAssessment(good,{sourceText:task.sourceText,transcript:'Tome una dosis ahora y luego espere seis horas.'}).verdict,'faithful');
  assert.equal(parseAssessment('{oops',{sourceText:task.sourceText,transcript:'hola'}).verdict,'indeterminate');
  const invented=good.replace('espere seis horas','quince perros');
  assert.equal(parseAssessment(invented,{sourceText:task.sourceText,transcript:'Tome una dosis ahora y luego espere seis horas.'}).verdict,'indeterminate');
  const contradict=good.replace('"status":"preserved"','"status":"altered"');
  assert.equal(parseAssessment(contradict,{sourceText:task.sourceText,transcript:'Tome una dosis ahora y luego espere seis horas.'}).verdict,'indeterminate');
  const uncertain=good.replace('"confidence":0.96','"confidence":0.4');
  assert.equal(parseAssessment(uncertain,{sourceText:task.sourceText,transcript:'Tome una dosis ahora y luego espere seis horas.'}).verdict,'indeterminate');
  assert.equal(parseAssessment(good.replace('"languageMatch":true','"languageMatch":null'),{sourceText:task.sourceText,transcript:'Tome una dosis ahora y luego espere seis horas.'}).verdict,'indeterminate');
});

test('Meta adapter uses documented endpoints and keeps bearer key server side',async()=>{
  const requests=[];
  const client=createMetaClient({apiKey:'test-only-secret',fetchImpl:async(url,options)=>{requests.push({url,options});return{ok:true,async json(){return url.includes('/asr/')?{transcript:'Tome una dosis ahora y luego espere seis horas.'}:{output:[{type:'message',content:[{type:'output_text',text:good}]}]};}};}});
  const r=await client.transcribe(await wave());assert.match(r.transcript,/seis/);
  assert.equal(await client.assess({sourceText:task.sourceText,referenceText:task.referenceText,transcript:r.transcript,language:'es',domain:'medical'}),good);
  assert.equal(requests[0].url,'https://api.meta.ai/v1/asr/transcribe');
  assert.equal(requests[0].options.headers.Authorization,'Bearer test-only-secret');
  const config=JSON.parse(await requests[0].options.body.get('request').text());
  assert.equal(config.model,'muse-voice-transcribe-1.0');assert.equal(config.mode,'PUSH_TO_TALK');
  const spark=JSON.parse(requests[1].options.body);assert.equal(spark.model,'muse-spark-1.3');assert.equal(spark.reasoning.effort,'medium');
  assert.equal(extractResponseText({output:[] ,output_text:'fallback'}),'fallback');
});

async function withServer(options,work){const server=createSpokenServer({knowledge,...options});await new Promise(r=>server.listen(0,'127.0.0.1',r));try{return await work(`http://127.0.0.1:${server.address().port}`);}finally{await new Promise((r,j)=>server.close(e=>e?j(e):r()));}}

test('gateway serves no-answer-key task, returns assessed voice without persisting audio',()=>withServer({metaClient:{transcribe:async()=>({transcript:'Tome una dosis ahora y luego espere seis horas.'}),assess:async()=>good}},async(base)=>{
  const health=await(await fetch(`${base}/api/spoken/health`)).json();assert.equal(health.enabled,true);
  const t=await(await fetch(`${base}/api/spoken/task?domain=medical&lang=es&conceptId=dose`)).json();assert.equal(t.taskId,'medical:es:dose:forward');assert.equal(t.referenceText,undefined);
  const reverse=await(await fetch(`${base}/api/spoken/task?domain=medical&lang=zh&conceptId=dose&direction=reverse`)).json();assert.equal(reverse.sourceLanguage,'zh');assert.equal(reverse.targetLanguage,'en');
  const response=await fetch(`${base}/api/spoken/assess?taskId=${t.taskId}`,{method:'POST',headers:{'Content-Type':'audio/wav'},body:await wave()});assert.equal(response.status,200);
  const scored=await response.json();assert.equal(scored.assessment.verdict,'faithful');assert.equal(scored.stage,7);assert.equal(scored.usableEvidence,true);
  assert.equal((await fetch(`${base}/api/spoken/task?domain=legal&lang=fr&conceptId=dose`)).status,404);
  assert.equal((await fetch(`${base}/api/spoken/assess?taskId=medical:es:dose`,{method:'POST',headers:{'Content-Type':'audio/wav',Origin:'https://evil.invalid'},body:await wave()})).status,403);
  assert.equal((await fetch(`${base}/api/spoken/assess?taskId=${t.taskId}`,{method:'POST',headers:{'Content-Type':'text/plain'},body:'fake'})).status,415);
}));

test('gateway offline state remains available without a Meta API key',()=>withServer({apiKey:''},async(base)=>{
  const r=await fetch(`${base}/api/spoken/health`);assert.equal((await r.json()).enabled,false);
  const denied=await fetch(`${base}/api/spoken/assess?taskId=medical:es:dose`,{method:'POST',headers:{'Content-Type':'audio/wav'},body:await wave()});assert.equal(denied.status,503);
}));

test('spoken UI can swap language direction, record PCM, submit, review and close without storing a clip',async()=>{
  const old={document:globalThis.document,window:globalThis.window,navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator'),fetch:globalThis.fetch};
  const fields=new Map(),actions=new Map();
  const element=()=>({disabled:false,hidden:false,textContent:'',replaceChildren(){this.children=[];},append(child){(this.children??=[]).push(child);},focus(){},addEventListener(){},getTracks(){return[];}});
  let stopped=false,submitted=null,callbackResult=null,closed=false,submittedUrl='',submittedCode='';
  class FakeAudioContext{
    constructor(){this.sampleRate=24000;this.destination={};}
    async resume(){}async close(){}
    createMediaStreamSource(){return{connect(){}};}
    createScriptProcessor(){return{connect(){},disconnect(){},onaudioprocess:null};}
  }
  try{
    globalThis.document={createElement(){return{...element(),querySelector(q){const name=q.match(/"([^"]+)"/)?.[1];const map=q.includes('data-output')?fields:actions;if(!map.has(name))map.set(name,element());return map.get(name);}};},body:{append(){}},addEventListener(){}};
    globalThis.window={AudioContext:FakeAudioContext};
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped=true;}}]})}}});
    globalThis.fetch=async(url,options)=>{
      if(String(url).includes('/api/spoken/health'))return{ok:true,json:async()=>({enabled:true,accessRequired:true})};
      if(String(url).includes('/api/spoken/task')){const direction=new URLSearchParams(String(url).split('?')[1]).get('direction');return{ok:true,json:async()=>({...task,sourceText:direction==='reverse'?task.referenceText:task.sourceText,sourceLanguage:direction==='reverse'?'es':'en',targetLanguage:direction==='reverse'?'en':'es',direction,taskId:`medical:es:dose:${direction}`})};}
      if(String(url).includes('/api/spoken/assess')){submittedUrl=String(url);submittedCode=options.headers['X-EV-Access-Code'];submitted=Buffer.from(await options.body.arrayBuffer());return{ok:true,json:async()=>({assessment:{verdict:'faithful',feedback:'Good',units:[]},transcript:'Take one dose now.',usableEvidence:true})};}
      throw Error('Unexpected path');
    };
    const ui=new SpokenPractice();ui.apiBaseUrl='https://demo--entre-voces-spoken-web.modal.run';
    assert.equal(await ui.health(),true);assert.equal(fields.get('access').hidden,false);
    const access=element();access.value='demo-secret-code';actions.set('access',access);
    await ui.start({domain:'medical',lang:'es',conceptId:'dose',onResolved:r=>{callbackResult=r;},onClose:()=>{closed=true;}});
    assert.equal(fields.get('prompt').textContent,task.sourceText);
    ui.swap();await new Promise(r=>setTimeout(r,0));
    assert.equal(fields.get('prompt').textContent,task.referenceText);
    assert.equal(fields.get('language').textContent,'Spanish → English');
    await ui.record();assert.equal(ui.recording,true);
    for(let i=0;i<15;i++)ui.node.onaudioprocess({inputBuffer:{getChannelData:()=>Float32Array.from({length:2048},(_,j)=>Math.sin(j/9)*.3)}});
    await ui.stop();assert.equal(stopped,true);assert.equal(validatePcmWav(submitted),true);
    assert.match(submittedUrl,/^https:\/\/demo--entre-voces-spoken-web\.modal\.run\/api\/spoken\/assess/);
    assert.equal(submittedCode,'demo-secret-code');
    assert.equal(callbackResult.assessment.verdict,'faithful');assert.equal(fields.get('result').hidden,false);
    await ui.close();assert.equal(closed,true);assert.equal(ui.open,false);assert.equal(ui.samples.length,0);
  }finally{
    globalThis.document=old.document;globalThis.window=old.window;globalThis.fetch=old.fetch;
    if(old.navigator)Object.defineProperty(globalThis,'navigator',old.navigator);else delete globalThis.navigator;
  }
});
