// Live vector world rendering. Every map, route and physical object is interactive.
const TAU=Math.PI*2;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function round(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}
function dot(c,x,y,r,fill,stroke){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function line(c,points,color,width=2,dash=[]){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.setLineDash(dash);c.stroke();c.setLineDash([]);}
function words(c,value,x,y,width,{size=14,color='#fff',max=4,weight=650}={}){
 let rows;for(;;){c.font=`${weight} ${size}px system-ui`;rows=[];let row='';const tokens=String(value).match(/[\u3400-\u9fff]|[^\s\u3400-\u9fff]+/g)||[];for(const t of tokens){const next=row+(row?' ':'')+t;if(c.measureText(next).width>width&&row){rows.push(row);row=t;}else row=next;}if(row)rows.push(row);if(rows.length<=max||size<=11)break;size--;}
 c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';rows.forEach((row,i)=>c.fillText(row,x,y+(i-(rows.length-1)/2)*(size+3),width));return rows.length*(size+3);
}
function image(c,img,x,y,size,rotation=0){if(!img?.complete||!img.naturalWidth)return; c.save();c.translate(x,y);c.rotate(rotation);c.drawImage(img,-size/2,-size/2,size,size);c.restore();}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');dot(c,x,y,r,g);}
function panelLabel(c,text,x,y,width,dark=false){round(c,x-width/2,y-23,width,46,13,dark?'#172a46ee':'#fff9ebf5',dark?'#8cabc744':'#fff9eb');words(c,text,x,y,width-14,{size:13,color:dark?'#f6f0dc':'#203f46',max:3});}
export class WorldRenderer{
 constructor(host){this.h=host;this.hits=[];this.focus=0;this.arena=null;}
 draw(c,g,w,h,time){this.hits=[];this.w=w;this.height=h;if(this.h.mode==='river')this.river(c,g,w,h,time);else if(this.h.mode==='metro')this.metro(c,g,w,h,time);else this.pulse(c,g,w,h,time);}
 point(n,w=this.w,h=this.height){return{x:30+n.x*(w-60),y:28+n.y*(h-84)};}
 river(c,g,w,h,t){
 const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#a1ded0');bg.addColorStop(1,'#51aaa9');c.fillStyle=bg;c.fillRect(0,0,w,h);
 for(let i=0;i<16;i++){const y=(i/16)*h;const pts=[];for(let x=-40;x<w+50;x+=28)pts.push([x,y+Math.sin(x*.012+i+t*.25)*13]);line(c,pts,'#efffdb25',1.5);}
 // Soft shoreline fragments frame an open, readable navigable lagoon.
 for(const [x,y,r]of [[-20,h*.2,80],[w+20,h*.7,90],[w*.75,-45,105]]){dot(c,x,y,r+12,'#cee7b0');dot(c,x,y,r,'#76b87d');for(let k=0;k<7;k++)dot(c,x+Math.cos(k)*r*.6,y+Math.sin(k)*r*.6,r*.25,'#519978');}
 for(const [a,b]of g.edges){const p=this.point(g.nodes[a]),q=this.point(g.nodes[b]);const active=a===g.at||b===g.at;line(c,[[p.x,p.y],[q.x,q.y]],active?'#f9ffe69a':'#e5fff03c',active?3:2,[3,11]);if(active){const f=.5;const x=p.x+(q.x-p.x)*f,y=p.y+(q.y-p.y)*f;dot(c,x,y,12,'#297a7c');words(c,String(g.cost(a===g.at?b:a)),x,y,18,{size:11});}}
 const nearby=g.neighbors();g.nodes.forEach((n,i)=>{const p=this.point(n),selected=g.focus===i,harbor=i===4;dot(c,p.x,p.y+6,harbor?43:35,'#2b858566');dot(c,p.x,p.y,harbor?43:35,'#f4e7ba',selected?'#fff8dc':null);dot(c,p.x,p.y-4,harbor?34:27,harbor?'#395f64':'#7db983');
 if(harbor){round(c,p.x-9,p.y-31,18,45,5,'#fff2d7');round(c,p.x-13,p.y-31,26,9,4,'#e6aa60');glow(c,p.x,p.y-28,25,'#fff3a46b');dot(c,p.x,p.y-28,5,'#ffe398');}
 else{const colors=['#f1be80','#9b8ebf','#f3a18a'];round(c,p.x-13,p.y-13,26,22,5,colors[i%3]);line(c,[[p.x,p.y-11],[p.x,p.y+7]],'#fff2c2',3);dot(c,p.x-21,p.y-18,9,'#4c916f');dot(c,p.x+17,p.y-22,10,'#5f9f74');}
 if(nearby.includes(i)&&!g.travelling)dot(c,p.x+26,p.y-26,8,'#ffe0a1','#fff9df');
 const title=harbor?'Lighthouse':g.cargo[i]?this.h.term(g.cargo[i]):'Empty dock';panelLabel(c,title,p.x,p.y+51,Math.min(125,(w-35)/3-8));
 this.hits.push({type:'island',id:i,x:p.x,y:p.y,r:37});this.hits.push({type:'island',id:i,rect:{x:p.x-Math.min(125,(w-35)/3-8)/2,y:p.y+28,w:Math.min(125,(w-35)/3-8),h:46}});});
 const move=g.travelling,at=this.point(g.nodes[move?move.from:g.at]);let bx=at.x,by=at.y;if(move){const to=this.point(g.nodes[move.to]),f=clamp(move.t,0,1);bx+=(to.x-at.x)*f;by+=(to.y-at.y)*f;}
 for(let i=0;i<3;i++)line(c,[[bx-15-i*7,by+22+i*4],[bx+15+i*7,by+22+i*4]],'#efffe68c',2);
 image(c,this.h.media.boat,bx,by-8,88);if(!this.h.media.boat?.naturalWidth){dot(c,bx,by,15,'#ffde8d');}
 words(c,`TIDE ${g.tide}`,w-62,20,110,{size:12,color:'#1e6265'});
 }
 metro(c,g,w,h,t){
 const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#162b44');bg.addColorStop(1,'#0c1b32');c.fillStyle=bg;c.fillRect(0,0,w,h);
 // A compact city built from reusable vector buildings, not a flat backdrop.
 for(let i=0;i<20;i++){const x=(i*137+27)%w,y=(i*83+42)%h,bw=18+i%4*9,bh=24+i%5*13;if(x>w*.2&&x<w*.8)continue;round(c,x,y,bw,bh,4,'#243b55');for(let j=0;j<3;j++)for(let k=0;k<2;k++)round(c,x+5+k*9,y+6+j*11,4,5,1,(i+j)%3?'#a89b6b66':'#ffd28d99');}
 const pts=g.nodes.map(n=>this.point(n));
 for(const[a,b]of g.edges){const p=pts[a],q=pts[b];line(c,[[p.x,p.y+6],[q.x,q.y+6]],'#050f2344',22);line(c,[[p.x,p.y],[q.x,q.y]],'#314b63',14);line(c,[[p.x,p.y],[q.x,q.y]],'#92a6a3',2,[2,9]);}
 const active=g.selectedTrain();if(active?.path)line(c,active.path.map(i=>[pts[i].x,pts[i].y]),'#f6c3827a',6);
 for(let i=0;i<6;i++){const p=pts[i],color=['#80d1be','#e9b278','#b1a9e6'][i%3];if(i===g.station)dot(c,p.x,p.y,42,'#ffffff08','#ffdb9a');round(c,p.x-31,p.y-15,62,33,10,color);round(c,p.x-21,p.y-29,42,18,6,'#e5e4d8');dot(c,p.x,p.y-20,5,'#ffe2a6');panelLabel(c,this.h.term(g.stations[i]),p.x,p.y+43,Math.min(150,w*.43),true);this.hits.push({type:'station',id:i,x:p.x,y:p.y,r:35});this.hits.push({type:'station',id:i,rect:{x:p.x-Math.min(150,w*.43)/2,y:p.y+20,w:Math.min(150,w*.43),h:46}});}
 for(const i of [6,7]){const p=pts[i];dot(c,p.x,p.y,10,'#254b64','#7ac7b6');}
 g.jobs.forEach(train=>{if(train.state==='future'||train.state==='delivered')return;let p=pts[train.at];if(['queued','ready'].includes(train.state)){const slot=g.jobs.filter(j=>['queued','ready'].includes(j.state)).indexOf(train);p={x:w*.25+slot*w*.25,y:h-43};}else if(train.path){const next=pts[train.path[train.pathIndex+1]??train.at];p={x:p.x+(next.x-p.x)*train.progress,y:p.y+(next.y-p.y)*train.progress};}
 const selected=train.id===g.selected;glow(c,p.x,p.y,selected?43:24,selected?'#ffd58b45':'#6ad7c92e');image(c,this.h.media.train,p.x,p.y,selected?80:64);dot(c,p.x+24,p.y-22,12,selected?'#ffd392':'#3b6380');words(c,String(train.id+1),p.x+24,p.y-22,20,{size:11,color:selected?'#283b4a':'#fff'});if(train.state==='waiting')dot(c,p.x-22,p.y-23,6,'#ff9e8d');this.hits.push({type:'train',id:train.id,x:p.x,y:p.y,r:37});});
 words(c,`${g.delivered} / 6 DELIVERED`,w/2,14,220,{size:11,color:'#b0d3d9'});
 }
 pulse(c,g,w,h,t){
 const bg=c.createRadialGradient(w/2,h*.38,20,w/2,h*.38,Math.max(w,h));bg.addColorStop(0,'#29335c');bg.addColorStop(.6,'#171c37');bg.addColorStop(1,'#10152c');c.fillStyle=bg;c.fillRect(0,0,w,h);
 for(let i=0;i<65;i++){const x=(i*139+33)%w,y=(i*73+91)%h;dot(c,x,y,i%7?1:2,i%5?'#adc5e539':'#ffdaaa77');}
 const size=Math.min(w-18,h-12),x=(w-size)/2,y=(h-size)/2;this.arena={x,y,size};const p=(a,b)=>({x:x+a/1000*size,y:y+b/1000*size}),rad=r=>r/1000*size;
 round(c,x+8,y+20,size-16,size-29,40,'#0e183b35','#8e8bba22');
 for(let k=0;k<4;k++){c.save();c.translate(w/2,y+size*.48);c.rotate(k*.7+(this.h.reduced?0:t*.025));c.strokeStyle='#beb4f315';c.lineWidth=1.5;c.beginPath();c.ellipse(0,0,size*.4,size*.21,0,0,TAU);c.stroke();c.restore();}
 for(const b of g.layout.bumpers){const at=p(b.x+(g.layout.moving?Math.sin(g.time*.8+b.phase)*85:0),b.y);glow(c,at.x,at.y,rad(b.r*2.3),'#9e8bef2d');dot(c,at.x,at.y,rad(b.r),'#696099','#c2b2ed');line(c,[[at.x-rad(b.r*.6),at.y],[at.x+rad(b.r*.6),at.y]],'#ead4ff',3);}
 g.layout.targets.forEach((o,i)=>{const at=p(o.x,o.y),selected=i===g.locked;colorCrystal(c,at.x,at.y,rad(o.r),selected);if(this.h.media.prism?.naturalWidth)image(c,this.h.media.prism,at.x,at.y,rad(140));const labelY=at.y+rad(o.r)+22;panelLabel(c,this.h.term(g.options[i]),at.x,labelY,Math.max(84,Math.min(size*.3,150)),true);this.hits.push({type:'crystal',id:i,x:at.x,y:at.y,r:Math.max(33,rad(o.r))});const labelWidth=Math.max(84,Math.min(size*.3,150));this.hits.push({type:'crystal',id:i,rect:{x:at.x-labelWidth/2,y:labelY-23,w:labelWidth,h:46}});});
 const launch=p(500,900);glow(c,launch.x,launch.y,45,'#b28fe65c');image(c,this.h.media.prism,launch.x,launch.y,80);dot(c,launch.x,launch.y,9,'#fff2cc');
 for(const q of g.preview()){const at=p(q.x,q.y);dot(c,at.x,at.y,q.hit?5:q.bounce?4:1.7,q.hit?'#a9ffe1':'#ffdb9c99');}
 for(const [i,q]of g.trail.entries()){const at=p(q.x,q.y);dot(c,at.x,at.y,(i/g.trail.length)*5,'#f9cfab55');}
 if(g.ball){const at=p(g.ball.x,g.ball.y);glow(c,at.x,at.y,28,'#ffdaa485');dot(c,at.x,at.y,rad(g.upgrade==='beam'?21:12),'#fff0bd');}
 const aim=p(g.aim.x,g.aim.y);if(g.locked!==null&&!g.ball){line(c,[[aim.x-8,aim.y],[aim.x+8,aim.y]],'#ffffff77',1.5);line(c,[[aim.x,aim.y-8],[aim.x,aim.y+8]],'#ffffff77',1.5);}
 words(c,`${g.hits} / ${g.goal} PRISMS LIT`,w/2,15,220,{size:11,color:'#cec6ee'});
 }
 hit(x,y){return[...this.hits].reverse().find(t=>t.rect?x>=t.rect.x&&x<=t.rect.x+t.rect.w&&y>=t.rect.y&&y<=t.rect.y+t.rect.h:Math.hypot(t.x-x,t.y-y)<=t.r);}
}
function colorCrystal(c,x,y,r,active){glow(c,x,y,r*2.4,active?'#ffe0ac66':'#9a9be338');c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*.75,y);c.lineTo(x,y+r);c.lineTo(x-r*.75,y);c.closePath();c.fillStyle=active?'#dcb2d5':'#7775ba';c.fill();}
