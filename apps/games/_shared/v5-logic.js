/** Pure rules for the expedition trilogy. Movement is never learning evidence. */
export const GAME_IDS={river:'rio-de-palabras',metro:'ultima-parada',pulse:'pulso-de-luz'};
export const label=(item,language)=>item?.playLabels?.[language]||String(item?.terms?.[language]?.term||'').replace(/\s*\([^)]*\)/g,'').split(/\s+\/\s+/)[0].trim();
export function vocabularyDeck(items,domain,language){
 const en=new Set(),translated=new Set();return items.filter(c=>{
  const a=label(c,'en').toLocaleLowerCase(),b=label(c,language).toLocaleLowerCase();
  if(c.domainId!==domain||c.gameEligible===false||c.referenceOnly||c.inferred||!c.sourceIds?.length||!a||!b||a.length>38||b.length>44||en.has(a)||translated.has(b))return false;
  en.add(a);translated.add(b);return true;
 });
}
export class DrawBag{
 constructor(items,rng,recent=[]){this.items=items;this.rng=rng;this.recent=recent.slice(-Math.min(12,Math.max(0,items.length-3)));this.queue=[];}
 draw(count=1){if(!Number.isInteger(count)||count<1||count>this.items.length)throw new RangeError('Draw exceeds the distinct vocabulary deck');const out=[];while(out.length<count){if(!this.queue.length){const old=new Set(this.recent);this.queue=[...this.rng.shuffle(this.items.filter(i=>!old.has(i.conceptId))),...this.rng.shuffle(this.items.filter(i=>old.has(i.conceptId)))];}const item=this.queue.shift();if(!out.some(c=>c.conceptId===item.conceptId)){out.push(item);this.recent.push(item.conceptId);this.recent=this.recent.slice(-12);}}
 return out;}
}
export function shortestPath(edges,start,end,forbidden=new Set()){
 const queue=[[start]],seen=new Set([start]);while(queue.length){const p=queue.shift(),at=p.at(-1);if(at===end)return p;for(const [a,b]of edges){const n=a===at?b:b===at?a:null;if(n===null||seen.has(n)||forbidden.has(n))continue;seen.add(n);queue.push([...p,n]);}}return null;
}
export function connectedEdges(edges,nodeCount,rng,remove=0){let out=edges.map(e=>[...e]);for(const candidate of rng.shuffle(out)){if(remove<=0)break;const next=out.filter(e=>e!==candidate);if(Array.from({length:nodeCount},(_,n)=>shortestPath(next,0,n)).every(Boolean)){out=next;remove--;}}return out;}
class World{
 constructor({bag,rng,level=1,upgrade='capacity'}){this.bag=bag;this.rng=rng;this.level=level;this.upgrade=upgrade;this.events=[];this.message='';this.outcome=null;this.errors=0;this.score=0;this.time=0;this.sequence=0;}
 assess(target,chosen){this.events.push({id:++this.sequence,target,chosen,correct:target===chosen});this.errors+=target!==chosen;}
 takeEvents(){return this.events.splice(0);}
}
export class RiverWorld extends World{
 constructor(opts){super(opts);this.nodes=Array.from({length:9},(_,i)=>({x:.16+(i%3)*.34,y:.16+Math.floor(i/3)*.33}));
 this.harbor=4;this.at=4;this.focus=4;this.hold=[];this.delivered=0;this.capacity=opts.upgrade==='capacity'?3:2;
 const n=this.level>3?3:2;this.manifest=this.bag.draw(n).map(c=>c.conceptId);const cargo=this.rng.shuffle([...this.manifest,...this.bag.draw(8-n).map(c=>c.conceptId)]);this.cargo=Array(9).fill(null);let k=0;for(let i=0;i<9;i++)if(i!==4)this.cargo[i]=cargo[k++];
 const edges=[];for(let i=0;i<9;i++){if(i%3<2)edges.push([i,i+1]);if(i<6)edges.push([i,i+3]);}
 this.edges=connectedEdges(edges,9,this.rng,this.level>2?2:0);this.wind=this.rng.int(0,3);this.tide=32+(opts.upgrade==='tide'?6:0);this.moves=0;this.travelling=null;
 this.message='Collect the manifest in order. Return to the lighthouse to deliver.';}
 desired(){return this.manifest[this.delivered+this.hold.length];}
 neighbors(){return this.edges.flatMap(([a,b])=>a===this.at?[b]:b===this.at?[a]:[]);}
 cost(to){const a=this.nodes[this.at],b=this.nodes[to],upwind=this.wind===0?b.x<a.x:this.wind===1?b.y<a.y:this.wind===2?b.x>a.x:b.y>a.y;return 1+(upwind&&this.upgrade!=='rudder'?1:0);}
 move(to){if(this.outcome||this.travelling||!this.neighbors().includes(to))return false;const cost=this.cost(to);if(this.tide<cost){this.outcome='lost';this.message='The tide is out. Retry this contract with a different route.';return false;}this.tide-=cost;this.moves++;this.travelling={from:this.at,to,t:0};this.focus=to;if(this.moves%4===0)this.wind=(this.wind+1)%4;return true;}
 update(dt){this.time+=dt;if(this.travelling){this.travelling.t+=dt*1.5;if(this.travelling.t>=1){this.at=this.travelling.to;this.travelling=null;}}}
 load(){if(this.outcome||this.travelling)return;if(!this.cargo[this.at]){this.message='No cargo at this dock.';return;}if(this.hold.length>=this.capacity){this.message='Hold full. Deliver at the lighthouse.';return;}const chosen=this.cargo[this.at],desired=this.desired();if(!desired)return;this.assess(desired,chosen);this.tide=Math.max(0,this.tide-1);if(chosen!==desired){this.message='Different meaning. Inspect the cargo, then repair your choice.';if(this.errors>=4)this.outcome='lost';return;}this.hold.push(chosen);this.cargo[this.at]=null;this.score+=120;this.message='Cargo secured. Plan your next stop.';}
 deliver(){if(this.travelling||this.at!==4||!this.hold.length||this.outcome)return;this.delivered+=this.hold.length;this.score+=this.hold.length*100;this.hold=[];this.message='Delivered. The harbor lights are coming back.';if(this.delivered===this.manifest.length){this.score+=this.tide*15;this.outcome='won';}}
 get tools(){return this.at===4?[{id:'deliver',label:'Deliver cargo',disabled:!this.hold.length||!!this.travelling}]:[{id:'load',label:'Load this cargo',disabled:!this.cargo[this.at]||!!this.travelling}];}
 tool(id){if(id==='load')this.load();if(id==='deliver')this.deliver();}
}
export const RAIL_NODES=[{x:.13,y:.17},{x:.87,y:.17},{x:.13,y:.46},{x:.87,y:.46},{x:.13,y:.76},{x:.87,y:.76},{x:.5,y:.29},{x:.5,y:.65},{x:.5,y:.99}];
export const RAIL_EDGES=[[0,6],[1,6],[2,6],[3,7],[4,7],[5,7],[6,7],[0,2],[1,3],[2,4],[3,5],[7,8]];
export class MetroWorld extends World{
 constructor(opts){super(opts);this.nodes=RAIL_NODES;this.edges=connectedEdges(RAIL_EDGES,9,this.rng,this.level>3?1:0);this.stations=this.bag.draw(6).map(c=>c.conceptId);this.jobs=this.rng.shuffle(this.stations).map((id,i)=>({id:i,target:id,at:8,path:null,pathIndex:0,progress:0,state:i<3?'queued':'future',wait:0,deadline:24+i*5,late:false}));this.selected=0;this.station=0;this.delivered=0;this.brakes=this.upgrade==='capacity'?5:3;this.message='Select a train, assign its meaning to a station, then dispatch.';}
 selectedTrain(){return this.jobs.find(t=>t.id===this.selected);}
 assign(station){const t=this.selectedTrain();if(!t||!['queued','ready'].includes(t.state)||this.outcome)return;this.station=station;const chosen=this.stations[station];this.assess(t.target,chosen);if(t.target!==chosen){this.message='That station changes the message. Choose again.';if(this.errors>=5)this.outcome='lost';return;}t.path=shortestPath(this.edges,8,station);t.state='ready';this.message='Route reserved. Dispatch when the line is clear.';}
 dispatch(){const t=this.selectedTrain();if(t?.state!=='ready'||this.outcome)return;t.state='moving';this.message='Train away. Prepare another route.';const next=this.jobs.find(j=>j.state==='queued');if(next)this.selected=next.id;}
 recall(){const t=this.selectedTrain();if(!t||!['moving','waiting'].includes(t.state))return;t.at=8;t.pathIndex=0;t.progress=0;t.state='ready';t.wait=0;t.deadline+=4;this.score=Math.max(0,this.score-25);this.message='Recalled safely. Change the dispatch order.';}
 brake(){const t=this.selectedTrain();if(this.brakes&&['moving','waiting'].includes(t?.state)){t.wait=2.8;this.brakes--;this.message='Signal held. Other trains may pass.';}}
 update(dt){this.time+=dt;if(this.outcome)return;const reserved=new Set(),occupied=new Set(this.jobs.filter(t=>['moving','waiting'].includes(t.state)&&t.at!==8).map(t=>t.at));
 for(const t of this.jobs){if(!['moving','waiting'].includes(t.state))continue;t.deadline-=dt;if(t.deadline<0)t.late=true;if(t.wait>0){t.wait-=dt;continue;}const next=t.path[t.pathIndex+1];if(next==null)continue;const key=[t.at,next].sort((a,b)=>a-b).join(':');if(reserved.has(key)||occupied.has(next)){t.state='waiting';continue;}t.state='moving';reserved.add(key);t.progress+=dt*(this.upgrade==='express'?.6:.43);if(t.progress>=1){occupied.delete(t.at);t.at=next;t.pathIndex++;t.progress=0;if(t.at===t.path.at(-1)){t.state='delivered';this.delivered++;this.score+=t.late?140:240;const future=this.jobs.find(j=>j.state==='future');if(future){future.state='queued';const current=this.selectedTrain();if(!current||['delivered','future'].includes(current.state))this.selected=future.id;}this.message='Message delivered. The district wakes up.';}else occupied.add(t.at);}}
 if(this.delivered===this.jobs.length){this.outcome='won';this.score+=this.brakes*35;}}
 get tools(){const t=this.selectedTrain();return[{id:'dispatch',label:'Dispatch',disabled:t?.state!=='ready'},{id:'brake',label:`Hold signal · ${this.brakes}`,disabled:!this.brakes||!['moving','waiting'].includes(t?.state)},{id:'recall',label:'Recall train',disabled:!['moving','waiting'].includes(t?.state)}];}
 tool(id){if(id==='dispatch')this.dispatch();if(id==='brake')this.brake();if(id==='recall')this.recall();}
}
export function pulseLayout(level,rng){return{targets:[{x:210,y:235+(level%3)*22,r:61},{x:500,y:300-(level%2)*35,r:61},{x:790,y:235+(level%4)*12,r:61}],bumpers:[{x:300+rng.int(-55,35),y:510,r:44,phase:0},{x:700+rng.int(-35,55),y:580,r:40,phase:2.2}],moving:level>2};}
export function pulsePhysics(ball,dt,layout,locked,time,{gravity=70,radius=11}={}){
 const b={...ball,x:ball.x+ball.vx*dt,y:ball.y+ball.vy*dt,vy:ball.vy+gravity*dt,life:ball.life+dt};let bounce=false,hit=false;
 if(b.x<18||b.x>982){b.x=Math.max(18,Math.min(982,b.x));b.vx*= -.96;bounce=true;}if(b.y<70){b.y=70;b.vy=Math.abs(b.vy)*.94;bounce=true;}
 const objects=[...layout.targets.map((t,i)=>({...t,target:i})),...layout.bumpers.map(o=>({...o,x:o.x+(layout.moving?Math.sin(time*.8+o.phase)*85:0)}))];
 for(const o of objects){const d=Math.hypot(b.x-o.x,b.y-o.y);if(d>=o.r+radius)continue;if(o.target===locked){hit=true;break;}const nx=(b.x-o.x)/(d||1),ny=(b.y-o.y)/(d||1),dot=b.vx*nx+b.vy*ny;b.x=o.x+nx*(o.r+radius+1);b.y=o.y+ny*(o.r+radius+1);if(dot<0){b.vx-=1.94*dot*nx;b.vy-=1.94*dot*ny;bounce=true;}}
 return{ball:b,bounce,hit};
}
export function pulseLaunch(aim){const dx=Math.max(-460,Math.min(460,aim.x-500)),dy=Math.min(-150,aim.y-900),length=Math.hypot(dx,dy);return{x:500,y:900,vx:dx/length*640,vy:dy/length*640,life:0};}
export class PulseWorld extends World{
 constructor(opts){super(opts);this.layout=pulseLayout(this.level,this.rng);this.goal=3;this.hits=0;this.energy=this.upgrade==='battery'?15:12;this.gravity=this.upgrade==='stabilizer'?38:70;this.selected=0;this.locked=null;this.ball=null;this.aim={x:500,y:280};this.accumulator=0;this.trail=[];this.charges=0;this.next();this.message='Find the meaning, then bend the light through the chamber.';}
 next(){const items=this.bag.draw(3);this.target=items[0].conceptId;this.options=this.rng.shuffle(items).map(c=>c.conceptId);this.locked=null;this.ball=null;this.trail=[];}
 lock(index){if(this.ball||this.outcome||this.locked!==null)return;const chosen=this.options[index];this.assess(this.target,chosen);this.selected=index;if(chosen===this.target){this.locked=index;this.message='Meaning carried. Aim from the prism and release.';}else{this.message='Different meaning. Repair before launching.';if(this.errors>=4)this.outcome='lost';}}
 launch(){if(this.ball||this.locked===null||this.outcome)return;this.ball=pulseLaunch(this.aim);this.energy--;this.trail=[];}
 update(dt){if(this.outcome)return;this.accumulator+=Math.min(dt,.1);while(this.accumulator>=1/120){this.accumulator-=1/120;this.time+=1/120;if(!this.ball)continue;const r=pulsePhysics(this.ball,1/120,this.layout,this.locked,this.time,{gravity:this.gravity,radius:this.upgrade==='beam'?21:11});this.ball=r.ball;this.trail.push({x:r.ball.x,y:r.ball.y});if(this.trail.length>28)this.trail.shift();if(r.hit){this.hits++;this.score+=250+Math.round(this.ball.life<2?100:50);this.ball=null;if(this.hits===this.goal){this.score+=this.energy*35;this.outcome='won';}else this.next();}else if(this.ball.y>1040||this.ball.life>9){this.ball=null;this.message='Aiming miss only. Your meaning is still locked.';if(this.energy<=0)this.outcome='lost';}}}
 preview(){if(this.locked===null||this.ball)return[];let b=pulseLaunch(this.aim);const points=[];for(let n=0;n<900;n++){const r=pulsePhysics(b,1/120,this.layout,this.locked,this.time+n/120,{gravity:this.gravity,radius:this.upgrade==='beam'?21:11});b=r.ball;if(n%14===0||r.bounce||r.hit)points.push({...b,hit:r.hit,bounce:r.bounce});if(r.hit||b.y>1040)break;}return points;}
 get tools(){return[{id:'launch',label:`Launch · ${this.energy} charge`,disabled:this.ball!==null||this.locked===null}];}
 tool(id){if(id==='launch')this.launch();}
}
