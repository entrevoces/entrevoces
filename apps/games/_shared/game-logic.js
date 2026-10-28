/** Deterministic, browser-independent rules shared by the three arcade worlds. */
export const GAME_IDS = Object.freeze({river:'rio-de-palabras',metro:'ultima-parada',pulse:'pulso-de-luz'});
export const LANGUAGES = Object.freeze(['es','zh']);
export const DOMAINS = Object.freeze(['medical','legal']);
export const BOARD_COLUMNS = 4;
export const BOARD_ROWS = 7;

export function validTerms(items,domain,lang){
  if(!DOMAINS.includes(domain)||!LANGUAGES.includes(lang))return [];
  const seen=new Set(),seenSource=new Set();
  return items.filter(item=>{
    if(item?.domainId!==domain||item?.inferred===true||!item.terms?.en?.term||!item.terms?.[lang]?.term||!Array.isArray(item.sourceIds)||!item.sourceIds.length)return false;
    const key=item.terms[lang].term.normalize('NFC').trim().toLowerCase();
    const source=item.terms.en.term.normalize('NFC').trim().toLowerCase();
    if(seen.has(key)||seenSource.has(source))return false;seen.add(key);seenSource.add(source);return true;
  });
}

/** Sample one concept and 2-3 distinct answers. Prefer genuinely confusable concepts. */
export function makeChallenge(pool,lang,rng,n=3,previous=null,priorityIds=[]){
  if(pool.length<n)throw new RangeError('Not enough bilingual concepts');
  const eligible=pool.filter(item=>item.conceptId!==previous);
  const preferred=eligible.filter(item=>priorityIds.includes(item.conceptId));
  const target=rng.pick(preferred.length&&rng.chance(.7)?preferred:eligible.length?eligible:pool);
  const associated=new Set([target.areaIds?.[0],...(target.relationships||[]).filter(r=>r.type==='confusable-with').map(r=>r.targetId)]);
  const close=pool.filter(item=>item.conceptId!==target.conceptId&&(associated.has(item.conceptId)||item.areaIds?.some(a=>associated.has(a))));
  const distant=pool.filter(item=>item.conceptId!==target.conceptId&&!close.includes(item));
  const distractors=[...rng.shuffle(close),...rng.shuffle(distant)].slice(0,n-1);
  const options=rng.shuffle([target,...distractors]);
  if(new Set(options.map(item=>item.conceptId)).size!==n||new Set(options.map(item=>item.terms[lang].term)).size!==n)throw new Error('Non-distinct answer choices');
  return {target:target.conceptId,options:options.map(item=>item.conceptId)};
}

export function riverPairs(board,cols=BOARD_COLUMNS){
  const found=[];
  for(let i=0;i<board.length;i++){
    if(!board[i])continue;
    for(const j of [i+1,i+cols]){
      if(j>=board.length||(j===i+1&&Math.floor(i/cols)!==Math.floor(j/cols)))continue;
      if(board[j]?.id===board[i].id&&board[j].side!==board[i].side)found.push([i,j]);
    }
  }
  return found;
}

export function makeRiverBoard(pool,rng,distinctCount=9,priorityIds=[]){
  if(pool.length<4)throw new RangeError('Not enough bilingual concepts');
  const preferred=rng.shuffle(pool.filter(item=>priorityIds.includes(item.conceptId))).slice(0,3);
  const chosen=[...preferred,...rng.shuffle(pool.filter(item=>!preferred.includes(item)))].slice(0,Math.min(Math.max(4,distinctCount),pool.length));
  const board=Array.from({length:BOARD_COLUMNS*BOARD_ROWS},(_,i)=>({id:rng.pick(chosen).conceptId,side:(i+Math.floor(i/BOARD_COLUMNS))%2}));
  // Plant at least three intentionally recognizable bilingual matches.
  for(const row of [1,3,5]){
    const col=rng.int(0,BOARD_COLUMNS-2),item=rng.pick(chosen);
    board[row*BOARD_COLUMNS+col]={id:item.conceptId,side:0};
    board[row*BOARD_COLUMNS+col+1]={id:item.conceptId,side:1};
  }
  if(riverPairs(board).length<3)throw new Error('River generator failed to plant pairs');
  return board;
}

export function ensureRiverPair(board,pool,rng){
  if(riverPairs(board).length)return;
  const i=rng.int(0,(BOARD_ROWS-1)*BOARD_COLUMNS-1);
  board[i+BOARD_COLUMNS]={...board[i],side:1-board[i].side};
}

export function validateSavedSession(saved,mode,availableIds){
  if(!saved||saved.v!==3||saved.mode!==mode||!GAME_IDS[mode])return false;
  if(!DOMAINS.includes(saved.domain)||!LANGUAGES.includes(saved.lang))return false;
  if(!Number.isSafeInteger(saved.seed)||saved.seed<1||saved.seed>0xffffffff)return false;
  if(saved.world!=null&&(!Number.isFinite(saved.world)||saved.world<0||saved.world>1_000_000))return false;
  if(!Number.isFinite(saved.score)||saved.score<0||saved.score>1e9)return false;
  if(!Number.isInteger(saved.errors)||saved.errors<0||saved.errors>100)return false;
  if(!Number.isInteger(saved.round)||saved.round<0||saved.round>10000)return false;
  if(!Number.isInteger(saved.evidenceIndex)||saved.evidenceIndex<0||saved.evidenceIndex>100000)return false;
  if(typeof saved.started!=='boolean'||typeof saved.finished!=='boolean'||!saved.state||typeof saved.state!=='object')return false;
  if(typeof saved.comfort!=='boolean'||!Number.isInteger(saved.tier)||saved.tier<1||saved.tier>5)return false;
  const allowed=new Set(availableIds),s=saved.state;
  if(s.voiceBoost!=null&&(!Number.isInteger(s.voiceBoost)||s.voiceBoost<0||s.voiceBoost>3))return false;
  if(s.lastConcept!=null&&!allowed.has(s.lastConcept))return false;
  if(s.spokenRewards!=null&&(!Array.isArray(s.spokenRewards)||s.spokenRewards.length>availableIds.length||new Set(s.spokenRewards).size!==s.spokenRewards.length||s.spokenRewards.some(id=>!allowed.has(id))))return false;
  if(mode==='river')return Array.isArray(s.board)&&s.board.length===BOARD_COLUMNS*BOARD_ROWS&&s.board.every(b=>b&&allowed.has(b.id)&&(b.side===0||b.side===1))&&Number.isInteger(s.moves)&&s.moves>=0&&s.moves<=18&&Number.isInteger(s.selected)&&s.selected>=-1&&s.selected<s.board.length&&(s.hintPair==null||(Array.isArray(s.hintPair)&&s.hintPair.length===2&&s.hintPair.every(i=>Number.isInteger(i)&&i>=0&&i<s.board.length)));
  if(!Array.isArray(s.options)||s.options.length!==3||new Set(s.options).size!==3||!s.options.every(id=>allowed.has(id))||!s.options.includes(s.target))return false;
  if(mode==='metro')return Number.isFinite(s.trainX)&&s.trainX>=0&&s.trainX<=360&&(s.chosen===null||[0,1,2].includes(s.chosen))&&Number.isInteger(s.delivered)&&s.delivered>=0&&s.delivered<=12&&(s.signalEnergy==null||(Number.isInteger(s.signalEnergy)&&s.signalEnergy>=0&&s.signalEnergy<=3))&&(s.holdUntil==null||(Number.isFinite(s.holdUntil)&&s.holdUntil>=0&&s.holdUntil<=(saved.world||0)+3));
  if(mode==='pulse')return Number.isInteger(s.shots)&&s.shots>=0&&s.shots<=30&&Number.isInteger(s.hits)&&s.hits>=0&&s.hits<=10&&s.hits<=s.shots&&(s.locked===null||[0,1,2].includes(s.locked))&&Number.isInteger(s.missedShots)&&s.missedShots>=0&&s.missedShots<=3&&s.aim&&Number.isFinite(s.aim.x)&&Number.isFinite(s.aim.y)&&(!s.ball||(['x','y','vx','vy','life'].every(k=>Number.isFinite(s.ball[k]))&&s.ball.life>=0&&s.ball.life<=8));
  return false;
}

export function launchVector(x,y,originX=195,originY=625){
  let dx=Math.max(-190,Math.min(190,x-originX));
  let dy=Math.max(-400,Math.min(-100,y-originY));
  // Minimum upward impulse prevents nearly horizontal, unwinnable launches.
  const length=Math.hypot(dx,dy)||1;
  return {vx:dx/length*360,vy:dy/length*360};
}

export function advanceBall(ball,dt){
  if(!Number.isFinite(dt)||dt<=0||dt>1/30)throw new RangeError('Physics requires bounded fixed timestep');
  const next={...ball,x:ball.x+ball.vx*dt,y:ball.y+ball.vy*dt,vy:ball.vy+65*dt,life:ball.life+dt};
  if(next.x<19){next.x=19;next.vx=Math.abs(next.vx)*.94;}
  if(next.x>371){next.x=371;next.vx=-Math.abs(next.vx)*.94;}
  if(next.y<85){next.y=85;next.vy=Math.abs(next.vy)*.82;}
  return next;
}

/** Common physical model for both flight and the player's trajectory preview. */
export function advancePulseShot(ball,dt,locked){
  const next=advanceBall(ball,dt);
  for(let i=0;i<3;i++){
    const px=74+i*121,py=321+i%2*56,dist=Math.hypot(next.x-px,next.y-py);
    if(dist>=48)continue;
    if(i===locked)return {ball:next,hit:i,bounced:false};
    const nx=dist>0.00001?(next.x-px)/dist:1,ny=dist>0.00001?(next.y-py)/dist:0,dot=next.vx*nx+next.vy*ny;
    next.x=px+nx*49;next.y=py+ny*49;
    if(dot<0){next.vx-=1.8*dot*nx;next.vy-=1.8*dot*ny;}
    return {ball:next,hit:null,bounced:true};
  }
  return {ball:next,hit:null,bounced:false};
}

export function previewPulseShot(aim,locked,{maxFrames=320}={}){
  let ball={x:195,y:625,...launchVector(aim.x,aim.y),life:0};const points=[];
  for(let frame=0;frame<maxFrames;frame++){
    const step=advancePulseShot(ball,1/60,locked);ball=step.ball;
    if(frame%12===0||step.bounced||step.hit!==null)points.push({x:ball.x,y:ball.y,bounced:step.bounced,hit:step.hit!==null});
    if(step.hit!==null||ball.y>720||ball.life>8)break;
  }
  return points;
}
