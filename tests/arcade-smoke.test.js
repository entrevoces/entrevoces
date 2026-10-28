import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {riverPairs,advanceBall,launchVector} from '../apps/games/_shared/game-logic.js';

function solvePulseAim(target){
  for(let aimX=30;aimX<=360;aimX+=7)for(let aimY=170;aimY<=500;aimY+=13){
    let b={x:195,y:625,...launchVector(aimX,aimY),life:0},hit=false;
    for(let tick=0;tick<480;tick++){
      b=advanceBall(b,1/60);
      for(let i=0;i<3;i++){
        const px=74+i*121,py=321+i%2*56,dist=Math.hypot(b.x-px,b.y-py);
        if(dist>=48)continue;
        if(i===target){hit=true;break;}
        const nx=(b.x-px)/(dist||1),ny=(b.y-py)/(dist||1),dot=b.vx*nx+b.vy*ny;
        b.x=px+nx*49;b.y=py+ny*49;
        if(dot<0){b.vx-=1.8*dot*nx;b.vy-=1.8*dot*ny;}
      }
      if(hit||b.y>720||b.life>8)break;
    }
    if(hit)return {x:aimX,y:aimY};
  }
  throw new Error(`Pulse target ${target} has no collision-valid shot`);
}

// A minimal canvas+DOM harness catches module load, first-frame and input faults
// without requiring a packaged browser in a sandboxed CI environment.
for (const width of [390,320]) for (const mode of ['river','metro','pulse']) {
  test(`${mode} ${width}px first render, semantic input, restart and persistence`, async () => {
    const events={},frames=[];
    const drawing=new Proxy({
      measureText(s){return {width:String(s).length*7};},
      createRadialGradient(){return {addColorStop(){}};},
    },{get(t,k){return k in t?t[k]:()=>{};},set(t,k,v){t[k]=v;return true;}});
    const height=width===320?568:740,scale=Math.min(width/390,height/740),ox=(width-390*scale)/2,oy=(height-740*scale)/2;
    const canvas={width,height,style:{},getContext(){return drawing;},getBoundingClientRect(){return {left:0,top:0,width,height};},addEventListener(k,fn){events[k]=fn;},setPointerCapture(){}};
    const storage=new Map();
    globalThis.devicePixelRatio=1;
    globalThis.innerWidth=width;
    globalThis.innerHeight=height;
    globalThis.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
    globalThis.cancelAnimationFrame=()=>{};
    globalThis.addEventListener=()=>{};
    globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    globalThis.document={body:{dataset:{game:mode}},querySelector:s=>s==='canvas'?canvas:{textContent:''},addEventListener(){},hidden:false};
    globalThis.window={};
    globalThis.fetch=async path=>({json:async()=>JSON.parse(await readFile(new URL(`../dist/${path.replace(/^\.\.\/\.\.\//,'')}`,import.meta.url),'utf8'))});
    await import(`../dist/games/_shared/game.js?smoke=${mode}-${width}`);
    const readyKey=`ev:arcade:${{river:'rio-de-palabras',metro:'ultima-parada',pulse:'pulso-de-luz'}[mode]}`;
    for(let wait=0;wait<200&&!storage.has(readyKey);wait++)await new Promise(resolve=>setTimeout(resolve,5));
    assert.ok(storage.has(readyKey),'knowledge loading must finish before the first action');
    assert.ok(frames.length);
    assert.doesNotThrow(()=>frames.at(-1)(performance.now()));
    const tap=(x,y)=>{const e={clientX:x*scale+ox,clientY:y*scale+oy,pointerId:1};events.pointerdown(e);events.pointerup(e);};
    let clock=performance.now();
    const advance=ticks=>{for(let j=0;j<ticks;j++){clock+=17;frames.at(-1)(clock);}};
    tap(195,450); // start
    const key=`ev:arcade:${{river:'rio-de-palabras',metro:'ultima-parada',pulse:'pulso-de-luz'}[mode]}`;
    const read=()=>JSON.parse(storage.get(key));
    if(mode==='river'){
      const [a,b]=riverPairs(read().state.board)[0];
      for(const i of [a,b])tap(26+(i%4)*84+39,205+Math.floor(i/4)*62+27);
      assert.ok(read().score>0,'correct semantic pair must score');
      assert.equal(read().state.moves,1);
      // A complete perfect game must never soft-lock on a board with no pairs.
      for(let move=1;move<18;move++){
        const pairs=riverPairs(read().state.board);
        assert.ok(pairs.length,`turn ${move} needs a legal pair`);
        for(const i of pairs[0])tap(26+(i%4)*84+39,205+Math.floor(i/4)*62+27);
      }
      assert.equal(read().finished,true);
      assert.equal(read().state.moves,18);
    }
    if(mode==='metro'){
      const chosen=read().state.options.indexOf(read().state.target);
      tap(190,369+chosen*72+25);
      advance(120);
      tap(299,639);
      assert.equal(read().state.delivered,1);
      for(let delivered=1;delivered<12;delivered++){
        const state=read().state,choice=state.options.indexOf(state.target);
        tap(190,369+choice*72+25);advance(120);tap(299,639);
      }
      assert.equal(read().finished,true);
      assert.equal(read().state.delivered,12);
    }
    if(mode==='pulse'){
      for(let hit=0;hit<10;hit++){
        const chosen=read().state.options.indexOf(read().state.target);
        tap(74+chosen*121,321+chosen%2*56);
        assert.equal(read().state.locked,chosen,'choice locks the physical target');
        const angle=solvePulseAim(chosen);
        const down={clientX:195*scale+ox,clientY:625*scale+oy,pointerId:1};
        const up={clientX:angle.x*scale+ox,clientY:angle.y*scale+oy,pointerId:1};
        events.pointerdown(down);events.pointermove(up);events.pointerup(up);
        advance(480);
        assert.equal(read().state.hits,hit+1,`physical target must be achievable on hit ${hit}`);
      }
      assert.equal(read().finished,true);
    }
    const logKeys=[...storage.keys()].filter(k=>k.startsWith('ev:log:'));
    assert.ok(logKeys.length);
    const evidence=logKeys.flatMap(k=>JSON.parse(storage.get(k)||'[]'));
    assert.ok(evidence.some(e=>e.gameId===({river:'rio-de-palabras',metro:'ultima-parada',pulse:'pulso-de-luz'}[mode])));
    assert.ok(evidence.every(e=>e.stage===2&&e.assessmentMethod==='visible-term-choice'));
    assert.equal(evidence.length,mode==='river'?18:mode==='metro'?12:10);
    assert.doesNotThrow(()=>frames.at(-1)(performance.now()+30));
    tap(340,35); // new run
    assert.ok(storage.has(key));
  });
}
