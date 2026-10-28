export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const lerp=(a,b,t)=>a+(b-a)*t;
export function rr(c,x,y,w,h,r,fill,stroke=null){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
export function circle(c,x,y,r,fill,stroke=null){c.beginPath();c.arc(x,y,Math.max(.1,r),0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
export function line(c,points,color,width=1){if(!points.length)return;c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
export function text(c,s,x,y,size=14,color='#eaf2df',align='center',font='sans-serif'){c.font=`${size}px ${font}`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(String(s),x,y);}
export function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');circle(c,x,y,r,g);}
export function poly(c,pts,fill,stroke=null){if(!pts.length)return;c.beginPath();c.moveTo(...pts[0]);for(const p of pts.slice(1))c.lineTo(...p);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
export function stars(c,w,h,time,seed=1,color='#b5d8b6'){c.save();for(let i=0;i<65;i++){const x=((i*137.51+seed*51)%997)/997*w,y=((i*83.17+seed*33)%773)/773*h;circle(c,x,y,((i%3)+1)*.55,color+(Math.round((.08+Math.sin(i+time*.35)*.05)*255).toString(16).padStart(2,'0')));}c.restore();}
export function backdrop(c,w,h,top,bottom){const g=c.createLinearGradient(0,0,w*.7,h);g.addColorStop(0,top);g.addColorStop(1,bottom);c.fillStyle=g;c.fillRect(0,0,w,h);}
export function focus(c,x,y,r,color='#efffbd'){c.save();c.setLineDash([4,5]);c.lineWidth=1.5;circle(c,x,y,r,null,color);c.restore();}
export function person(c,x,y,color,scale=1,selected=false){c.save();c.translate(x,y);c.scale(scale,scale);glow(c,0,5,30,color+'20');circle(c,0,12,13,'#0003');rr(c,-10,-2,20,23,8,color);circle(c,0,-10,8,'#ead9b7');line(c,[[-8,6],[-16,13]],color,5);line(c,[[8,6],[16,13]],color,5);if(selected)focus(c,0,4,27);c.restore();}
export function diamond(c,x,y,r,fill){poly(c,[[x,y-r],[x+r,y],[x,y+r],[x-r,y]],fill);}
export function wrap(c,s,maxWidth){const chars=String(s).split(/(\s+|(?=[\u4e00-\u9fff]))/),lines=[];let current='';for(const part of chars){if(c.measureText(current+part).width>maxWidth&&current){lines.push(current.trim());current=part;}else current+=part;}if(current.trim())lines.push(current.trim());return lines;}
export function pill(c,s,x,y,w=60,color='#d4f5a1'){rr(c,x-w/2,y-13,w,26,13,'#112920',color+'50');text(c,s,x,y,12,color);}
