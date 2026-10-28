import test from 'node:test';
import assert from 'node:assert/strict';
import {SeededRng} from '../packages/game-runtime/rng.js';
import {curriculumSource} from '../generator/curriculum-source.js';
import {compileCurriculum} from '../packages/engine-core/curriculum.js';
import {assessBilingualChoice,validateEvidence,computeLearnerState} from '../packages/engine-core/index.js';
import {MemoryStorage,EngineClient} from '../packages/engine-client/engine-client.js';
import {validTerms,makeChallenge,makeRiverBoard,riverPairs,ensureRiverPair,validateSavedSession,launchVector,advanceBall,advancePulseShot,previewPulseShot} from '../apps/games/_shared/game-logic.js';

const all=compileCurriculum(curriculumSource()).knowledge;

test('4000 generated challenges have distinct choices and known sourced answer keys',()=>{
  for(const domain of ['medical','legal'])for(const lang of ['es','zh']){
    const pool=validTerms(all,domain,lang);assert.ok(pool.length>=4);
    for(let seed=1;seed<=1000;seed++){
      const challenge=makeChallenge(pool,lang,new SeededRng(seed));
      assert.equal(challenge.options.length,3);
      assert.equal(new Set(challenge.options).size,3);
      assert.ok(challenge.options.includes(challenge.target));
      const source=pool.find(x=>x.conceptId===challenge.target);
      const selected=pool.find(x=>x.conceptId===challenge.options[1]);
      const graded=assessBilingualChoice({concept:source,selectedConceptId:selected.conceptId,candidateConcepts:challenge.options.map(id=>pool.find(x=>x.conceptId===id)),targetLanguage:lang});
      assert.equal(graded.assessable,true);
      assert.equal(graded.correct,source.conceptId===selected.conceptId);
      assert.equal(graded.evidence.stage,2);
    }
  }
});

test('4000 river boards have several guaranteed pairs, even after forced regeneration',()=>{
  for(const domain of ['medical','legal'])for(const lang of ['es','zh']){
    const pool=validTerms(all,domain,lang);
    for(let seed=1;seed<=1000;seed++){
      const rng=new SeededRng(seed),board=makeRiverBoard(pool,rng);
      assert.equal(board.length,28);
      assert.ok(riverPairs(board).length>=3);
      const isolated=board.map((b,i)=>({...b,side:i%2,id:pool[i%pool.length].conceptId}));
      if(!riverPairs(isolated).length){ensureRiverPair(isolated,pool,rng);assert.ok(riverPairs(isolated).length);}
    }
  }
});

test('choice evaluator is intentionally unable to assess timeout, ambiguous or missing answers',()=>{
  const [a,b]=validTerms(all,'medical','es');
  const base={concept:a,candidateConcepts:[a,b],targetLanguage:'es'};
  assert.equal(assessBilingualChoice({...base,selectedConceptId:null}).reason,'no-semantic-selection');
  assert.equal(assessBilingualChoice({...base,selectedConceptId:'bogus'}).reason,'selection-outside-options');
  assert.equal(assessBilingualChoice({...base,candidateConcepts:[a,a],selectedConceptId:a.conceptId}).assessable,false);
  assert.equal(assessBilingualChoice({...base,targetLanguage:'fr',selectedConceptId:a.conceptId}).assessable,false);
  const duplicate={...b,terms:{...b.terms,es:{term:a.terms.es.term}}};
  assert.equal(assessBilingualChoice({...base,candidateConcepts:[a,duplicate],selectedConceptId:a.conceptId}).reason,'ambiguous-duplicate-translation');
});

test('new evaluation metadata is backward-compatible and prevents touch evidence at spoken stages',async()=>{
  const c=validTerms(all,'medical','es')[0],d=validTerms(all,'medical','es')[1];
  const domain={domainId:'medical'},storage=new MemoryStorage(),client=new EngineClient({domainId:'medical',fallbackDomain:domain,fallbackConcepts:all.filter(x=>x.domainId==='medical'),storage,core:{validateEvidence,computeLearnerState}});
  await client.init();
  const {evidence}=assessBilingualChoice({concept:c,selectedConceptId:d.conceptId,candidateConcepts:[c,d],targetLanguage:'es'});
  const e=client.recordEvidence({...evidence,eventId:'arcade-1',gameId:'rio-de-palabras'});
  assert.equal(e.correct,false);
  client.recordEvidence({...evidence,eventId:'arcade-1',gameId:'rio-de-palabras'});
  assert.equal(client.localEvidence().length,1);
  assert.equal(validateEvidence({...e,stage:8}).ok,false);
  assert.equal(validateEvidence({...e,confidence:.9}).ok,false);
  assert.equal(validateEvidence({...e,assessmentMethod:'spoken-rendering'}).ok,false);
  const legacy={...e};delete legacy.responseModality;delete legacy.assessmentMethod;
  assert.equal(validateEvidence(legacy).ok,true);
});

test('saved sessions fail closed against malformed board and fabricated choices',()=>{
  const pool=validTerms(all,'medical','es'),rng=new SeededRng(5),board=makeRiverBoard(pool,rng);
  const session={v:3,mode:'river',seed:5,domain:'medical',lang:'es',score:100,errors:0,round:0,evidenceIndex:0,started:true,finished:false,comfort:true,tier:1,state:{board,moves:1,selected:-1,hintPair:null}};
  const ids=pool.map(x=>x.conceptId);
  assert.equal(validateSavedSession(session,'river',ids),true);
  assert.equal(validateSavedSession({...session,state:{board:[...board.slice(0,27),{id:'fake',side:0}],moves:1}},'river',ids),false);
  assert.equal(validateSavedSession({...session,score:Infinity},'river',ids),false);
  assert.equal(validateSavedSession({...session,lang:'fr'},'river',ids),false);
});

test('all three ricochet targets are physically reachable by at least one launch',()=>{
  for(let target=0;target<3;target++){
    const px=74+target*121,py=321+target%2*56;
    let reachable=false;
    for(let aimX=30;aimX<=360&&!reachable;aimX+=8){
      for(let aimY=180;aimY<=500&&!reachable;aimY+=16){
        let ball={x:195,y:625,...launchVector(aimX,aimY),life:0};
        for(let tick=0;tick<480;tick++){
          ball=advanceBall(ball,1/60);
          if(Math.hypot(ball.x-px,ball.y-py)<47){reachable=true;break;}
          if(ball.y>720||ball.life>8)break;
        }
      }
    }
    assert.ok(reachable,`target ${target} must be shootable`);
  }
});

test('aim forecast matches the actual ricochet trajectory including physical bumpers',()=>{
  for(let locked=0;locked<3;locked++)for(const aim of [{x:50,y:250},{x:195,y:340},{x:360,y:240}]){
    const forecast=previewPulseShot(aim,locked,{maxFrames:250});
    let ball={x:195,y:625,...launchVector(aim.x,aim.y),life:0};
    let lastFrame=0,hit=false;
    for(let frame=0;frame<250;frame++){
      const step=advancePulseShot(ball,1/60,locked);ball=step.ball;
      if(frame%12===0||step.bounced||step.hit!==null){
        const point=forecast[lastFrame++];assert.ok(point);
        assert.ok(Math.hypot(ball.x-point.x,ball.y-point.y)<.00001);
        assert.equal(point.hit,step.hit!==null);
      }
      if(step.hit!==null||ball.y>720||ball.life>8){hit=true;break;}
    }
    assert.equal(forecast.length,lastFrame);
    assert.equal(typeof hit,'boolean');
  }
});

test('saved transit signal state is bounded and restart-proof',()=>{
  const pool=validTerms(all,'medical','es'),options=pool.slice(0,3).map(x=>x.conceptId);
  const base={v:3,mode:'metro',seed:5,domain:'medical',lang:'es',score:200,errors:0,round:2,world:16,evidenceIndex:0,started:true,finished:false,comfort:false,tier:2,state:{options,target:options[0],trainX:99,chosen:1,delivered:3,signalEnergy:2,holdUntil:18.8,voiceBoost:1,spokenRewards:[options[0]]}};
  const ids=pool.map(x=>x.conceptId);
  assert.equal(validateSavedSession(base,'metro',ids),true);
  assert.equal(validateSavedSession({...base,state:{...base.state,holdUntil:500}},'metro',ids),false);
  assert.equal(validateSavedSession({...base,state:{...base.state,voiceBoost:999}},'metro',ids),false);
  assert.equal(validateSavedSession({...base,state:{...base.state,spokenRewards:['fabricated']}},'metro',ids),false);
});
