export const DIRS=[[1,0],[0,1],[-1,0],[0,-1]];
export const opposite=d=>(d+2)%4;
export function qualifierMessage(target,lang='en'){
 const number={en:['one','two','three'],es:['una','dos','tres'],zh:['一','二','三']}[lang]||['one','two','three'];
 const n=number[target.count-1]||String(target.count);
 if(lang==='es')return`${target.uncertain?'Quizá ':''}${target.negative?'no envíes':'envía'} ${n} señal${target.count===1?'':'es'}.`;
 if(lang==='zh')return`${target.uncertain?'也许，':''}${target.negative?'不要发送':'发送'}${n}个信号。`;
 return`${target.uncertain?'Perhaps, ':''}${target.negative?'do not send':'send'} ${n} signal${target.count===1?'':'s'}.`;
}
export function equalMeaning(a,b){return !!a&&a.negative===b.negative&&a.uncertain===b.uncertain&&a.count===b.count;}
export function routeTrace(board,n=5){
 let x=0,y=Math.floor(n/2),dir=0;const points=[[-1,y]],visited=new Set(),meaning={negative:false,uncertain:false,count:1},cells=[];
 for(let hop=0;hop<100;hop++){
  if(x===n&&y===Math.floor(n/2))return{connected:true,points,meaning,cells,reason:'receiver'};
  if(x<0||y<0||x>=n||y>=n)return{connected:false,points,meaning,cells,reason:'edge'};
  const key=`${x},${y},${dir}`;if(visited.has(key))return{connected:false,points,meaning,cells,reason:'loop'};visited.add(key);
  const node=board[y*n+x],ports=node.type==='straight'?[node.rot%2,(node.rot%2+2)%4]:[node.rot%4,(node.rot+1)%4];
  const entry=opposite(dir);points.push([x,y]);cells.push(y*n+x);
  if(!ports.includes(entry))return{connected:false,points,meaning,cells,reason:'blocked'};
  if(node.gate==='not')meaning.negative=!meaning.negative;if(node.gate==='maybe')meaning.uncertain=true;if(node.gate==='plus')meaning.count++;
  dir=ports.find(p=>p!==entry);x+=DIRS[dir][0];y+=DIRS[dir][1];
 }
 return{connected:false,points,meaning,cells,reason:'loop'};
}
export function makeCircuit(rng,level){
 const n=5,rowA=rng.pick([0,1,3,4]),rowB=rowA<2?rng.pick([3,4]):rng.pick([0,1]),path=[[0,2]];
 function go(x,y){let p=path.at(-1);while(p[0]!==x){p=[p[0]+Math.sign(x-p[0]),p[1]];path.push(p);}while(p[1]!==y){p=[p[0],p[1]+Math.sign(y-p[1])];path.push(p);}}
 go(0,rowA);go(2,rowA);go(2,rowB);go(4,rowB);go(4,2);
 const board=Array.from({length:25},()=>({type:rng.chance(.5)?'straight':'elbow',rot:rng.int(0,3),gate:null}));
 for(let i=0;i<path.length;i++){
  const [x,y]=path[i],prev=path[i-1]||[-1,2],next=path[i+1]||[5,2];const a=DIRS.findIndex(d=>d[0]===prev[0]-x&&d[1]===prev[1]-y),b=DIRS.findIndex(d=>d[0]===next[0]-x&&d[1]===next[1]-y);let rot,type;
  if(opposite(a)===b){type='straight';rot=a%2;}else{type='elbow';rot=[0,1,2,3].find(r=>[r,(r+1)%4].includes(a)&&[r,(r+1)%4].includes(b));}
  board[y*n+x]={type,rot,gate:null,solution:rot};
 }
 const target={negative:level>1&&rng.chance(.65),uncertain:level>3&&rng.chance(.65),count:level<3?1:rng.int(1,Math.min(3,1+Math.floor(level/3)))};
 const slots=rng.shuffle(path.slice(1,-1).map(([x,y])=>y*n+x));let k=0;if(target.negative)board[slots[k++]].gate='not';if(target.uncertain)board[slots[k++]].gate='maybe';for(let i=1;i<target.count;i++)board[slots[k++]].gate='plus';
 const solved=routeTrace(board);if(!solved.connected||!equalMeaning(solved.meaning,target))throw Error('Circuit construction failed its own invariant.');
 const solution=board.map(b=>b.rot);for(const b of board)b.rot=rng.int(0,b.type==='straight'?1:3);
 return{board,target,solution,path};
}
export function gridPath(start,goal,n,walls=new Set()){
 const queue=[start],seen=new Map([[start,null]]);for(let i=0;i<queue.length;i++){const p=queue[i];if(p===goal){const path=[];let x=goal;while(x!==start){path.unshift(x);x=seen.get(x);}return path;}const x=p%n,y=Math.floor(p/n);for(const [dx,dy]of DIRS){const xx=x+dx,yy=y+dy,v=yy*n+xx;if(xx<0||yy<0||xx>=n||yy>=n||walls.has(v)||seen.has(v))continue;seen.set(v,p);queue.push(v);}}return null;
}
export function directionWord(id,lang='en'){const names={en:['North','East','South','West','Center'],es:['Norte','Este','Sur','Oeste','Centro'],zh:['北','东','南','西','中央']};return(names[lang]||names.en)[id];}
