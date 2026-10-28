// Entre Voces original arcade trilogy. Static play is always available;
// spoken practice optionally calls open-weight Meta models on Modal.
import * as core from '../../runtime/engine-core/index.js';
import {EngineClient} from '../../runtime/engine-client.js';
import {GameLoop,SeededRng} from '../../runtime/game-runtime/index.js';
import {GAME_IDS,validTerms,makeChallenge,makeRiverBoard,riverPairs,ensureRiverPair,validateSavedSession,launchVector,advancePulseShot,previewPulseShot} from './game-logic.js';
import {SpokenPractice,normalizeSpokenApiUrl} from './spoken-client.js';

const MODE=document.body.dataset.game;
const ID=GAME_IDS[MODE];
const META={river:['RÍO DE PALABRAS','MAKE A MATCH. START A CASCADE.','#0d3446','#0cc6b0'],metro:['ÚLTIMA PARADA','THE CITY MOVES WHEN YOU DO.','#30213f','#feae65'],pulse:['PULSO DE LUZ','EVERY SHOT CAN CHANGE THE SKY.','#121f45','#a59dff']}[MODE];
const c=document.querySelector('canvas'),ctx=c.getContext('2d'),status=document.querySelector('#status');
const W=390,H=740;
let scale=1,ox=0,oy=0,world=0,started=false,finished=false,paused=false,domain='medical',lang='es',clients={},pool=[],rng,seed=0,round=0,score=0,combo=0,errors=0,assisted=false,feedback='',feedbackTime=0,focus=0,muted=false,inputModality='touch',sessionNonce=0,tier=1,comfort=true;
let state={},pointer=null,audio=null,loading=true,particles=[];
// The headless canvas smoke harness deliberately has no DOM construction.
const voice=typeof document.createElement==='function'?new SpokenPractice():{available:false,open:false,health:async()=>false,start:()=>{}};
function voiceTask(){const target=state.lastConcept||state.target||state.board?.find(b=>b)?.id;return pool.find(c=>c.conceptId===target)?.conceptId||null;}
function spokenFeedback(result){
  // ASR is a transcript aid, never an interpretation grade. Even an unexpected
  // response claiming fidelity cannot mint learning evidence or power rewards.
  announce(result.transcript?'Transcript ready · review it against the source.':'No clear speech detected · try recording again.');
}
function startVoice(){
  const conceptId=voiceTask();if(!conceptId){announce('Play one meaning first to unlock its speaking practice.');return;}
  const wasPaused=paused;paused=true;voice.start({domain,lang,conceptId,onResolved:spokenFeedback,onClose:()=>{paused=wasPaused;persist();}});
}
const idFor=(i)=>`${ID}:${seed}:${round}:${i}`;
function resize(){let dpr=Math.min(devicePixelRatio||1,2);c.width=Math.round(innerWidth*dpr);c.height=Math.round(innerHeight*dpr);let s=Math.min(c.width/W,c.height/H);scale=s;ox=(c.width-W*s)/2;oy=(c.height-H*s)/2;}
addEventListener('resize',resize);resize();c.tabIndex=0;
function rect(x,y,w,h,color,r=0){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function line(x,y,x2,y2,color,width=2){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function text(t,x,y,size=16,color='#fff',align='center',weight=600){ctx.fillStyle=color;ctx.font=`${weight} ${size}px system-ui,-apple-system,sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(t),x,y);}
function wrap(t,x,y,width,size=15,color='#fff',maxLines=3){
  // Keep Latin words intact; CJK naturally wraps at character boundaries.
  const tokens=String(t).match(/[\u3400-\u9fff]|[^\s\u3400-\u9fff]+|\s+/g)||[],rows=[];let row='';ctx.font=`600 ${size}px system-ui`;
  for(const token of tokens){
    if(ctx.measureText(row+token).width>width&&row.trim()){rows.push(row.trim());row='';}
    if(!row&&/^\s+$/.test(token))continue;
    for(const char of [...token]){
      if(ctx.measureText(row+char).width>width&&row){rows.push(row.trim());row='';}
      row+=char;
    }
  }
  if(row.trim())rows.push(row.trim());
  if(rows.length>maxLines){rows.length=maxLines;let last=rows[maxLines-1];while(ctx.measureText(last+'…').width>width&&last)last=last.slice(0,-1);rows[maxLines-1]=last+'…';}
  rows.forEach((s,i)=>text(s,x,y+(i-(rows.length-1)/2)*(size+5),size,color));
}
function button(label,x,y,w,h,active=false){rect(x,y,w,h,active?'#f9d994':'#ffffff19',14);text(label,x+w/2,y+h/2,15,active?'#1b3040':'#eef5f5');}
function hit(x,y,rx,ry,rw,rh){return x>=rx&&x<=rx+rw&&y>=ry&&y<=ry+rh;}
function announce(s){feedback=s;feedbackTime=world+3;status.textContent=s;}
function persist(){try{localStorage.setItem(`ev:arcade:${ID}`,JSON.stringify({v:3,mode:MODE,seed,round,score,combo,errors,domain,lang,started,finished,paused,assisted,muted,state,world,evidenceIndex:state.evidenceIndex||0,rngState:rng?.state,sessionNonce,tier,comfort}));}catch{status.textContent='Storage unavailable. Your current session remains playable.';}}
function restore(){try{let p=JSON.parse(localStorage.getItem(`ev:arcade:${ID}`));if(!p||!['medical','legal'].includes(p.domain)||!['es','zh'].includes(p.lang))return false;const choices=validTerms(window.__curriculum.knowledge,p.domain,p.lang).map(x=>x.conceptId);if(!validateSavedSession(p,MODE,choices))return false;({seed,round,score,combo,errors,domain,lang,started,finished,paused,assisted,muted,state,sessionNonce,tier,comfort}=p);world=p.world||0;state.voiceBoost??=0;state.spokenRewards??=[];if(MODE==='metro'){state.signalEnergy??=2;state.holdUntil??=0;}state.savedRngState=p.rngState;return true;}catch{}return false;}
function randomItem(exclude=[]){let possible=pool.filter(x=>!exclude.includes(x.conceptId));return rng.pick(possible.length?possible:pool);}
function term(item,language=lang){return item?.terms?.[language]?.term||'';}
function short(t,n=24){return t.length>n?t.slice(0,n-1)+'…':t;}
function choosePool(){pool=validTerms(window.__curriculum?.knowledge||[],domain,lang);if(pool.length<4)throw new Error('Not enough source-backed terms in this language and domain.');}
function practicePriorities(){
  const client=clients[domain];if(!client)return [];
  const state=core.computeLearnerState({learnerId:client.learnerId,domainId:domain,events:client.localEvidence(),concepts:pool});
  const due=state.dueForReview.map(x=>x.conceptId);
  const practiced=pool.filter(c=>state.stages[c.conceptId]?.[2]?.evidenceCount>0).sort((a,b)=>state.stages[a.conceptId][2].estimate-state.stages[b.conceptId][2].estimate);
  const unseen=pool.filter(c=>!state.stages[c.conceptId]?.[2]?.evidenceCount);
  return [...new Set([...due,...practiced.map(c=>c.conceptId),...unseen.map(c=>c.conceptId)])].slice(0,Math.max(4,Math.ceil(pool.length/2)));
}
function setDomain(d){domain=d;choosePool();restart();}
function setLanguage(l){lang=l;choosePool();restart();}
function restart(){sessionNonce++;let entropy=Date.now()^Math.imul(sessionNonce,0x9e3779b1);try{entropy^=crypto.getRandomValues(new Uint32Array(1))[0];}catch{}seed=(entropy>>>0)||1;rng=new SeededRng(seed);score=0;combo=0;round=0;world=0;errors=0;assisted=false;started=false;finished=false;paused=false;let events=clients[domain]?.localEvidence().filter(e=>e.gameId===ID&&e.languageDirection===`en->${lang}`&&e.assessmentMethod==='visible-term-choice')||[];tier=core.analyzeDifficulty({events,stage:2,currentTier:tier,comfort}).tier;newRound();persist();}
function recordChoice(item,chosenId,choices,sourceLanguage='en',targetLanguage=lang){
  const result=core.assessBilingualChoice({concept:item,selectedConceptId:chosenId,candidateConcepts:choices,sourceLanguage,targetLanguage,assistance:assisted?['hint']:[],opportunityId:`${ID}:${round}`});
  if(!result.assessable){announce('This choice cannot be assessed safely.');return null;}
  try{const evidence={...result.evidence,eventId:idFor(state.evidenceIndex=(state.evidenceIndex||0)+1),gameId:ID,responseModality:inputModality};clients[domain].recordEvidence(evidence);}
  catch(e){console.warn('Evidence not stored',e);announce('Learning record unavailable; the game still works.');}
  assisted=false;
  return result.correct;
}
function sound(ok){if(muted||(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches))return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();let o=audio.createOscillator(),g=audio.createGain();o.type=ok?'sine':'triangle';o.frequency.setValueAtTime(ok?520:180,audio.currentTime);o.frequency.exponentialRampToValueAtTime(ok?780:120,audio.currentTime+.15);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.2);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.21);}catch{}}
function award(n){score+=n*(1+Math.min(combo,4)*.25);combo++;sound(true);}
function miss(s){errors++;combo=0;sound(false);announce(s);}
function burst(x,y,color='#ffdda5',count=18){
  const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced)return;
  for(let i=0;i<count;i++){
    const angle=(i/count)*Math.PI*2+(rng?.next()||0)*.25,speed=40+(rng?.next()||0)*145;
    particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.65,color,size:2+(i%3)});
  }
  if(particles.length>140)particles.splice(0,particles.length-140);
}
function drawEffects(){for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/.65);circle(p.x,p.y,p.size,p.color);}ctx.globalAlpha=1;}

// RIVER — a spatial, cascading pair puzzle. Pairs match by concept identity,
// never by spelling. The first tile presents English, the second target language.
const COLS=4,ROWS=7;
function riverNew(){state={board:makeRiverBoard(pool,rng,Math.min(pool.length,3+tier*2),practicePriorities()),selected:-1,moves:0,evidenceIndex:0,hintPair:null,voiceBoost:0,spokenRewards:[]};}
function riverCollapse(){for(let x=0;x<COLS;x++){let stack=[];for(let y=ROWS-1;y>=0;y--)if(state.board[y*COLS+x])stack.push(state.board[y*COLS+x]);for(let y=ROWS-1;y>=0;y--)state.board[y*COLS+x]=stack[ROWS-1-y]||{id:randomItem().conceptId,side:rng.int(0,1)};}}
function riverTap(x,y){
  if(hit(x,y,260,638,112,52)){const pairs=riverPairs(state.board);if(pairs.length){state.hintPair=rng.pick(pairs);assisted=true;announce('A matching pair glows. This attempt will be marked assisted.');persist();}return;}
  let gx=Math.floor((x-26)/84),gy=Math.floor((y-205)/62);
  if(gx<0||gx>=COLS||gy<0||gy>=ROWS)return;
  let i=gy*COLS+gx,one=state.board[i];if(!one)return;
  if(state.selected<0){state.selected=i;persist();return;}
  if(state.selected===i){state.selected=-1;persist();return;}
  const p=state.selected,two=state.board[p],adj=(Math.abs(p-i)===COLS)||(Math.floor(p/COLS)===Math.floor(i/COLS)&&Math.abs(p-i)===1);
  state.selected=-1;
  if(!adj){announce('Connect neighboring tiles.');return;}
  if(two.side===one.side){announce('Connect English with its translated meaning.');return;}
  const first=pool.find(e=>e.conceptId===two.id),other=pool.find(e=>e.conceptId===one.id);
  const candidates=[first,other,...pool.filter(e=>e.conceptId!==first.conceptId&&e.conceptId!==other.conceptId).slice(0,3)];
  const good=recordChoice(first,other.conceptId,[...new Map(candidates.map(x=>[x.conceptId,x])).values()],two.side?'es'===lang?'es':'zh':'en',two.side?'en':lang);
  state.hintPair=null;
  if(good!==true){if(good===false)miss('These terms are not equivalent.');if(errors>=6)finish();persist();return;}
  state.lastConcept=first.conceptId;award(100+(state.voiceBoost?90:0));if(state.voiceBoost)state.voiceBoost--;
  for(const index of [p,i])burst(26+(index%COLS)*84+39,205+Math.floor(index/COLS)*62+28,'#c3fae1',12);
  state.board[p]=null;state.board[i]=null;riverCollapse();
  // Resolve every pair on each post-gravity board simultaneously. Each wave
  // is a real state-dependent cascade; no randomly chosen automatic clears.
  let cascades=0;while(cascades<4){const found=riverPairs(state.board);if(!found.length)break;const cleared=new Set(found.flat());for(const index of cleared){burst(26+(index%COLS)*84+39,205+Math.floor(index/COLS)*62+28,'#9bfcde',5);state.board[index]=null;}score+=cleared.size*45*(cascades+1);cascades++;riverCollapse();}
  state.moves++;ensureRiverPair(state.board,pool,rng);
  announce(cascades?`CHAIN REACTION ×${cascades+1} · beautiful cascade!`:'Meaning connected · +100');
  if(state.moves>=18||errors>=6)finish();persist();
}
function riverDraw(){text('LINK THE TWO LANGUAGES',W/2,133,13,'#95dcd4');wrap('Tap neighboring tiles that carry the same idea in both languages.',W/2,163,337,13,'#c4d9da');for(let i=0;i<state.board.length;i++){let b=state.board[i];if(!b)continue;let x=26+(i%COLS)*84,y=205+Math.floor(i/COLS)*62,item=pool.find(e=>e.conceptId===b.id);let sel=state.selected===i,hinted=state.hintPair?.includes(i);rect(x,y,79,56,sel?'#f4d193':hinted?'#b6e8a5':b.side?'#1c6774':'#36516c',12);rect(x+3,y+3,73,50,'#ffffff09',10);text(b.side?(lang==='es'?'ES':'中文'):'EN',x+39,y+12,9,sel||hinted?'#304356':'#b4ddde');wrap(short(b.side?term(item):item?.terms.en.term||'',23),x+39,y+34,72,11,sel||hinted?'#273c45':'#f6fbf8');}text(`${18-state.moves} LINKS LEFT`,130,668,14,'#f9d49b');button('HINT ✦',260,638,112,52);}

// METRO — three independent conveyor rails and a choice of physical switching
// platforms. The player has to assign an incoming source term to a destination.
function metroNew(){state={...makeChallenge(pool,lang,rng,3,null,practicePriorities()),trainX:52,chosen:null,delivered:0,evidenceIndex:0,level:1,voiceBoost:0,spokenRewards:[],signalEnergy:2,holdUntil:0};}
function metroNext(){const next=makeChallenge(pool,lang,rng,3,state.target,practicePriorities());state.options=next.options;state.target=next.target;state.trainX=52;state.chosen=null;state.holdUntil=0;round++;}
function metroHold(){if(state.signalEnergy<=0){announce('No more brake signals. Earn one after three arrivals.');return;}if(state.holdUntil>world){announce('The train is already holding.');return;}state.signalEnergy--;state.holdUntil=world+2.8;announce('Signal held · 2.8 seconds to think!');sound(true);persist();}
function metroTap(x,y){if(y>=368&&y<=574){let i=Math.floor((y-368)/72);if(i>=0&&i<3){state.chosen=i;announce(`Switch set to platform ${i+1}`);persist();}}else if(hit(x,y,30,610,188,56)){metroHold();}else if(hit(x,y,240,615,125,54)){if(state.trainX<95){announce('The train is approaching. Set your switch.');return;}metroDeliver();}}
function metroDeliver(){
  if(state.chosen===null){miss('No switch set. The train needs a destination.');}
  else{
    const target=pool.find(v=>v.conceptId===state.target);
    const good=recordChoice(target,state.options[state.chosen],state.options.map(id=>pool.find(v=>v.conceptId===id)));
    if(good){state.lastConcept=target.conceptId;award(130+Math.round((354-state.trainX)/4)+(state.voiceBoost?100:0));if(state.voiceBoost)state.voiceBoost--;burst(state.trainX,305,'#ffd496',24);state.delivered++;if(state.delivered%3===0)state.signalEnergy=Math.min(3,state.signalEnergy+1);announce('Faithful arrival. The line lights up!');}
    else if(good===false)miss(`Wrong destination. ${target.terms.en.term} = ${term(target)}.`);
  }
  if(state.delivered>=12||errors>=5){finish();return;}
  metroNext();persist();
}
function metroStep(dt){if(state.holdUntil>world)return;state.trainX=Math.min(354,state.trainX+dt*(comfort?28:28+tier*7+state.delivered*2)*(state.voiceBoost?0.8:1));if(state.trainX>=354&&!comfort)metroDeliver();}
function metroDraw(){let target=pool.find(x=>x.conceptId===state.target);text('NEXT EXPRESS MESSAGE',W/2,134,12,'#efbdde');rect(25,160,340,95,'#ffffff14',20);wrap(target?.terms.en.term||'',195,195,290,26,'#fff');text('SET THE SWITCH BEFORE THE TRAIN ARRIVES',195,237,11,'#d3c5df');line(26,302,361,302,'#997ba9',5);for(let i=0;i<3;i++)line(42,304,370,378+i*72,'#806b8a',2);rect(state.trainX-21,280,44,43,state.holdUntil>world?'#b5f1df':'#f9d49b',9);rect(state.trainX-12,288,26,13,'#725b87',5);circle(state.trainX-10,319,5,'#2a2541');circle(state.trainX+12,319,5,'#2a2541');for(let i=0;i<3;i++){let y=369+i*72;line(28,y+26,360,y+26,i===state.chosen?'#ffbb80':'#7a638c',8);rect(29,y-1,328,52,i===state.chosen?'#f7b77d':'#554866',14);let item=pool.find(x=>x.conceptId===state.options[i]);text(`${i+1}`,51,y+25,18,'#251c34');wrap(short(term(item),36),202,y+25,265,16,i===state.chosen?'#32253b':'#fff');}button(`BRAKE  ${state.signalEnergy||0} ◼`,30,610,188,56,state.holdUntil>world);button('DISPATCH ↗',239,611,129,55,state.chosen!==null);text(`ARRIVALS  ${state.delivered} / 12`,140,691,14,'#e8c5dc');}

// PULSE — physics ricochet: aim by dragging from the launcher; target meaning
// is visible before release and remains the only assessed action.
function pulseNew(){state={...makeChallenge(pool,lang,rng,3,null,practicePriorities()),ball:null,aim:{x:195,y:320},locked:null,shots:0,hits:0,missedShots:0,evidenceIndex:0,voiceBoost:0,spokenRewards:[]};}
function pulseNext(){const next=makeChallenge(pool,lang,rng,3,state.target,practicePriorities());state.options=next.options;state.target=next.target;state.ball=null;state.locked=null;state.missedShots=0;round++;}
function pulseTap(x,y,release=false){
  if(!release){
    if(state.ball)return;
    if(state.locked===null){
      for(let i=0;i<3;i++){
        if(Math.hypot(x-(74+i*121),y-(321+i%2*56))<=51){
          const target=pool.find(v=>v.conceptId===state.target);
          const good=recordChoice(target,state.options[i],state.options.map(id=>pool.find(v=>v.conceptId===id)));
          if(good===true){state.locked=i;state.lastConcept=target.conceptId;announce('Meaning secured. Now aim and release the light.');}
          else if(good===false){miss(`Not equivalent. ${target.terms.en.term} = ${term(target)}.`);if(errors>=5)finish();else pulseNext();}
          persist();return;
        }
      }
    }
    return;
  }
  if(state.ball||state.locked===null){if(state.locked===null)announce('Select the matching meaning first.');return;}
  const shot=launchVector(x,y);
  state.ball={x:195,y:625,...shot,life:0};state.shots++;persist();
}
function pulseStep(dt){
  if(!state.ball)return;
  const impact=advancePulseShot(state.ball,Math.min(1/60,dt),state.locked),b=impact.ball;state.ball=b;
  if(impact.hit!==null){const px=74+impact.hit*121,py=321+impact.hit%2*56;award(160+Math.max(0,3-state.missedShots)*30+(state.voiceBoost?130:0));if(state.voiceBoost)state.voiceBoost--;burst(px,py,'#f4d0ff',26);state.hits++;announce('Perfect connection!');if(state.hits>=10||state.shots>=30)finish();else pulseNext();persist();return;}
  if(impact.bounced)burst(b.x,b.y,'#b8efff',6);
  if(b.y>720||b.life>8){state.ball=null;combo=0;state.missedShots++;announce('The light missed. Try another angle.');if(state.missedShots>=3||state.shots>=30){miss('Three missed shots. A new constellation appears.');if(errors>=5||state.shots>=30)finish();else pulseNext();}persist();}
}
function pulseDraw(){let target=pool.find(x=>x.conceptId===state.target);text(state.locked===null?'FIND THIS MEANING':'NOW BANK THE SHOT',W/2,136,12,'#b9c1ff');rect(25,154,340,85,'#ffffff16',18);wrap(target?.terms.en.term||'',195,187,320,26);text(state.locked===null?'TAP THE EQUIVALENT TO LOCK YOUR TARGET':'DRAG FROM THE LAUNCHER · RELEASE TO FIRE',W/2,226,11,'#d6d4fd');for(let i=0;i<3;i++){let x=74+i*121,y=321+i%2*56;circle(x,y,47,i===state.locked?'#f9d49b':'#ffffff16');circle(x,y,41,['#4b73a5','#5e608e','#467c83'][i]);circle(x,y,35,'#ffffff0d');let item=pool.find(v=>v.conceptId===state.options[i]);wrap(short(term(item),20),x,y,76,12);}for(let j=0;j<17;j++){let x=14+j*23;circle(x,509+Math.sin(j*.9+world)*16,2,'#ffffff31');}line(195,629,195,550,'#ffffff30',3);circle(195,625,26,'#ddc5ff');circle(195,625,15,'#7553a3');if(!state.ball&&state.locked!==null){const path=previewPulseShot(state.aim,state.locked,{maxFrames:state.voiceBoost?420:Math.max(110,330-tier*30)});for(const point of path)circle(point.x,point.y,point.hit?8:point.bounced?5:2.5,point.hit?'#9dfbd3':point.bounced?'#ffcf9c':'#f8d79a');}else if(state.ball)circle(state.ball.x,state.ball.y,13,'#ffe6aa');text(state.locked===null?'CHOOSE A TARGET':'OTHER ORBS DEFLECT SHOTS',118,691,11,'#bdc6e9');text(`HITS ${state.hits}/10   ·   SHOTS ${state.shots}/30`,131,710,12,'#d9d1ff');}

function newRound(){rng=new SeededRng(seed||1);if(MODE==='river')riverNew();else if(MODE==='metro')metroNew();else pulseNew();}
function finish(){
  finished=true;
  const observations=clients[domain]?.localEvidence().filter(e=>e.gameId===ID&&e.eventId.startsWith(`${ID}:${seed}:`))||[];
  const choices=observations.filter(e=>e.assessmentMethod==='visible-term-choice');
  state.learningSummary={assessed:choices.length,correct:choices.filter(e=>e.correct).length,assisted:choices.filter(e=>e.assistance.length).length,spoken:observations.filter(e=>e.assessmentMethod==='spoken-rendering').length};
  announce(score>0?'A beautiful run. Play again?':'Try again. Every attempt teaches a little.');persist();
}
function handle(x,y,release=false){
  if(loading)return;
  if(voice.open)return;
  if(hit(x,y,8,7,82,58)){paused=!paused;persist();return;}
  if(hit(x,y,96,7,72,58)){setDomain(domain==='medical'?'legal':'medical');return;}
  if(hit(x,y,174,7,70,58)){setLanguage(lang==='es'?'zh':'es');return;}
  if(hit(x,y,250,7,58,58)){muted=!muted;persist();announce(muted?'Sound off':'Sound on');return;}
  if(hit(x,y,314,7,68,58)){restart();return;}
  if((!started||finished||paused)&&hit(x,y,82,492,226,52)){comfort=!comfort;persist();announce(comfort?'Gentle mode on':'Brisk mode on');return;}
  if(paused){if(hit(x,y,82,421,226,58)){paused=false;persist();}return;}
  if(!started){started=true;persist();return;}
  if(finished){restart();started=true;persist();return;}
  if(hit(x,y,260,686,112,45)){startVoice();return;}
  if(MODE==='river')riverTap(x,y);else if(MODE==='metro')metroTap(x,y);else pulseTap(x,y,release);
}
function coords(e){let b=c.getBoundingClientRect(),px=(e.clientX-b.left)*(c.width/b.width),py=(e.clientY-b.top)*(c.height/b.height);return{x:(px-ox)/scale,y:(py-oy)/scale};}
c.addEventListener('pointerdown',e=>{c.setPointerCapture(e.pointerId);inputModality='touch';pointer=coords(e);if(MODE==='pulse'&&started&&!finished&&!paused&&pointer.y>500){state.aim=pointer;}else handle(pointer.x,pointer.y);});
c.addEventListener('pointermove',e=>{if(MODE==='pulse'&&pointer&&started&&!state.ball){state.aim=coords(e);}});
c.addEventListener('pointerup',e=>{if(MODE==='pulse'&&pointer&&started&&!finished&&!paused&&pointer.y>500)pulseTap(coords(e).x,coords(e).y,true);pointer=null;});
c.addEventListener('pointercancel',()=>pointer=null);
addEventListener('keydown',e=>{
  if(voice.open)return;
  inputModality='keyboard';const key=e.key.toLowerCase();
  if(key==='v'&&started&&!finished&&!paused){startVoice();e.preventDefault();return;}
  if(key==='escape'||key==='p'){paused=!paused;persist();e.preventDefault();return;}
  if(key==='m'){muted=!muted;persist();e.preventDefault();return;}
  if(key==='r'){restart();e.preventDefault();return;}
  if(key==='d'){setDomain(domain==='medical'?'legal':'medical');e.preventDefault();return;}
  if(key==='l'){setLanguage(lang==='es'?'zh':'es');e.preventDefault();return;}
  if(!started||finished){if(key==='enter'||key===' '){handle(190,450);e.preventDefault();}return;}
  if(paused){if(key==='enter'||key===' '){paused=false;persist();e.preventDefault();}return;}
  if(MODE==='river'){
    if(e.key.startsWith('Arrow')){const row=Math.floor(focus/COLS),col=focus%COLS;const dy=key==='arrowup'?-1:key==='arrowdown'?1:0,dx=key==='arrowleft'?-1:key==='arrowright'?1:0;focus=Math.max(0,Math.min(ROWS-1,row+dy))*COLS+Math.max(0,Math.min(COLS-1,col+dx));e.preventDefault();}
    if(key==='h'){riverTap(300,658);e.preventDefault();}
    if(key===' '||key==='enter'){riverTap(26+(focus%COLS)*84+39,205+Math.floor(focus/COLS)*62+27);e.preventDefault();}
  }else if(MODE==='metro'){
    if(/^[123]$/.test(key)){state.chosen=Number(key)-1;persist();}
    if(key==='s'){metroHold();e.preventDefault();}
    if(key===' '||key==='enter'){if(state.trainX>=95)metroDeliver();else announce('Set a switch while the train approaches.');e.preventDefault();}
  }else{
    if(/^[123]$/.test(key)&&state.locked===null){let i=Number(key)-1;pulseTap(74+i*121,321+i%2*56);e.preventDefault();}
    if(key==='arrowleft')state.aim.x=Math.max(15,state.aim.x-25);
    if(key==='arrowright')state.aim.x=Math.min(375,state.aim.x+25);
    if(key==='arrowup')state.aim.y=Math.max(230,state.aim.y-25);
    if(key==='arrowdown')state.aim.y=Math.min(525,state.aim.y+25);
    if(key===' '||key==='enter'){pulseTap(state.aim.x,state.aim.y,true);e.preventDefault();}
  }
});

function backdrop(){let [bg,accent]=[META[2],META[3]];rect(0,0,W,H,bg);for(let i=0;i<25;i++){let x=(i*79+45)%W,y=(i*127+world*10*(i%3+1))%H;circle(x,y,1+i%3,'#ffffff13');}let gr=ctx.createRadialGradient(190,230,20,190,230,370);gr.addColorStop(0,accent+'22');gr.addColorStop(1,bg+'00');rect(0,0,W,H,gr);}
function top(){button(paused?'RESUME':'PAUSE',8,7,82,58);button(domain==='medical'?'MED':'LAW',96,7,72,58);button(lang==='es'?'ES':'中文',174,7,70,58);button(muted?'OFF':'♫',250,7,58,58);button('NEW ↺',314,7,68,58);text(META[0],W/2,91,23,'#ffffff', 'center',800);text(`SCORE ${Math.round(score)}   ·   COMBO ×${Math.max(combo,1)}   ·   ERRORS ${errors}`,W/2,111,11,'#e3e5ec');}
function overlay(title,body,action){rect(0,0,W,H,'#0b1323bd');rect(25,214,340,354,'#26394c',25);text(title,195,268,25,'#fff');wrap(body,195,347,285,15,'#d8e2ec',5);button(action,82,421,226,58,true);button(comfort?'GENTLE PACE ✓':'BRISK PACE ⚡',82,492,226,52);text(`PRACTICE LEVEL ${tier} / 5 · SELECT YOUR PACE`,195,560,11,'#c5d5de');}
function draw(){
  const back=document.querySelector('.hub-back');if(back)back.hidden=started&&!paused&&!finished;
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);ctx.setTransform(scale,0,0,scale,ox,oy);backdrop();top();
  if(loading){overlay('LOADING','Preparing the reviewed terminology for this domain.','ONE MOMENT');return;}
  if(!state?.options&&!state?.board){overlay('UNAVAILABLE',feedback||'The knowledge base did not load.','RELOAD');return;}
  if(MODE==='river')riverDraw();else if(MODE==='metro')metroDraw();else pulseDraw();drawEffects();
  if(started&&!finished&&!paused){button(voice.available?'🎙 SPEAK':'VOICE LAB',260,686,112,45,voice.available);if(state.voiceBoost)text(`✦ ${state.voiceBoost} POWERED MOVES`,110,723,11,'#e5f6bf');}
  if(world<feedbackTime&&feedback){rect(22,576,346,53,'#101a2ee7',10);wrap(feedback,195,602,328,12,'#ffffff');}
  if(!started)overlay(META[0],MODE==='river'?'Connect adjacent English and translated concepts to create cascades. 18 successful matches make a session.':MODE==='metro'?'Choose one of three tracks for each incoming message. Deliver 12 safely before five mistakes.':'Tap the matching translation to lock it, then aim the orb. Ten hits make a session.','LET’S PLAY');
  else if(finished){let s=state.learningSummary||{assessed:0,correct:0,assisted:0,spoken:0};overlay('RUN COMPLETE',`${s.correct}/${s.assessed} term choices · ${s.spoken||0} provisional spoken assessments · Arcade score ${Math.round(score)}. Spoken practice is not certification.`,'PLAY AGAIN');}
  else if(paused)overlay('TAKE A BREATH','Your world is paused. Nothing moves while you are away.','RESUME');
}
function step(dt){if(!paused&&started&&!finished){world+=dt/1000;for(const p of particles){p.life-=dt/1000;p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=110*dt/1000;}particles=particles.filter(p=>p.life>0);if(MODE==='pulse')pulseStep(dt/1000);if(MODE==='metro'){metroStep(dt/1000);if(Math.floor(world*2)!==Math.floor((world-dt/1000)*2))persist();}}}
async function init(){try{fetch('../../spoken-config.json').then(r=>r.ok?r.json():null).then(config=>{voice.apiBaseUrl=normalizeSpokenApiUrl(config?.apiBaseUrl);return voice.health();}).catch(()=>{});let [curriculum,domains]=await Promise.all([fetch('../../curriculum.json').then(x=>x.json()),fetch('../../domains.json').then(x=>x.json())]);window.__curriculum=curriculum;for(const d of domains.filter(d=>['medical','legal'].includes(d.domainId))){clients[d.domainId]=new EngineClient({core,domainId:d.domainId,fallbackDomain:d,fallbackConcepts:curriculum.knowledge.filter(x=>x.domainId===d.domainId)});await clients[d.domainId].init();}let recovered=restore();choosePool();if(!recovered)restart();else{rng=new SeededRng(seed);if(Number.isFinite(state.savedRngState)){rng.state=state.savedRngState;delete state.savedRngState;}}loading=false;announce('Ready to play. Tap to start.');}catch(e){loading=false;started=false;feedback=e.message;status.textContent=e.message;console.error(e);}}
const loop=new GameLoop({step,render:draw,visibilityTarget:document,autoPauseOnHidden:false});
function suspend(){if(started&&!finished){paused=true;persist();}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
window.addEventListener?.('pagehide',suspend);
loop.start();init();
