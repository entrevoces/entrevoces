// Authored local assets and deterministic build-time sound rendering.
import {createHash} from 'node:crypto';
export const MEDIA_LIMITS=Object.freeze({images:8,imageBytes:12*1024*1024,audioSeconds:180,cueSeconds:45,sampleRate:22050,events:1600});
const fail=message=>Object.assign(new Error(message),{code:'media-contract'});
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
export function validateSoundPlan(cue){
 const errors=[];
 if(!/^assets\/[a-z][a-z0-9-]{2,60}\.wav$/.test(cue?.path))errors.push('Sound path must be assets/<slug>.wav.');
 if(typeof cue?.purpose!=='string'||cue.purpose.trim().length<12)errors.push('State the actual game action/ambience served by this sound.');
 if(!finite(cue?.duration,.03,MEDIA_LIMITS.cueSeconds))errors.push('Sound duration must be 0.03–45 seconds.');
 if(!Array.isArray(cue?.events)||!cue.events.length||cue.events.length>MEDIA_LIMITS.events)errors.push('Provide 1–1,600 authored sound events.');
 for(const [i,e]of(Array.isArray(cue?.events)?cue.events:[]).entries()){
  if(!e||!finite(e.time,0,cue.duration)||!finite(e.duration,.01,cue.duration)||e.time+e.duration>cue.duration+.001||!['sine','triangle','square','saw','noise'].includes(e.wave)||!finite(e.frequency,20,8000)||!finite(e.endFrequency??e.frequency,20,8000)||!finite(e.gain,0,.8)||!finite(e.pan??0,-1,1)||!finite(e.attack??Math.min(.01,e.duration/2),.001,Math.max(.001,e.duration/2))||!finite(e.release??Math.min(.03,e.duration/2),.001,Math.max(.001,e.duration/2)))errors.push(`Invalid or out-of-range sound event ${i}.`);
  if(e?.lowpassHz!=null&&!finite(e.lowpassHz,20,10000))errors.push(`Invalid low-pass frequency in event ${i}.`);
 }
 if(cue?.delay!=null&&(!finite(cue.delay.seconds,.01,1)||!finite(cue.delay.feedback,0,.7)||!finite(cue.delay.mix,0,.5)))errors.push('Invalid delay parameters.');
 return{ok:!errors.length,errors};
}
export function renderSoundAsset(cue){
 const gate=validateSoundPlan(cue);if(!gate.ok)throw fail(gate.errors.join(' '));
 const sr=MEDIA_LIMITS.sampleRate,n=Math.ceil(cue.duration*sr),left=new Float64Array(n),right=new Float64Array(n);let seed=(cue.seed??1)>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};
 for(const e of cue.events){const start=Math.floor(e.time*sr),count=Math.floor(e.duration*sr),attack=e.attack??Math.min(.01,e.duration/2),release=e.release??Math.min(.03,e.duration/2);let phase=0,low=0;const cut=Math.min(8000,e.lowpassHz??8000),alpha=1-Math.exp(-2*Math.PI*cut/sr),pan=e.pan??0,lGain=Math.sqrt((1-pan)/2),rGain=Math.sqrt((1+pan)/2);
  for(let i=0;i<count&&start+i<n;i++){const t=i/sr,p=i/count,f=e.frequency*((e.endFrequency??e.frequency)/e.frequency)**p;phase=(phase+f/sr)%1;let x;if(e.wave==='noise')x=random();else if(e.wave==='sine')x=Math.sin(phase*2*Math.PI);else{const harmonics=Math.min(32,Math.floor((sr/2-100)/f));x=0;for(let h=1;h<=harmonics;h++){if(e.wave==='saw')x+=Math.sin(h*phase*2*Math.PI)/h;else if(h%2)x+=Math.sin(h*phase*2*Math.PI)*(e.wave==='triangle'?((h%4===1?1:-1)/(h*h)):1/h);}x*=e.wave==='triangle'?8/(Math.PI*Math.PI):e.wave==='square'?4/Math.PI:2/Math.PI;}
   low+=alpha*(x-low);const envelope=Math.min(1,t/attack,(e.duration-t)/release);const sample=low*Math.max(0,envelope)*e.gain;left[start+i]+=sample*lGain;right[start+i]+=sample*rGain;
  }
 }
 if(cue.delay){const d=Math.max(1,Math.floor(cue.delay.seconds*sr));for(let i=d;i<n;i++){left[i]+=right[i-d]*cue.delay.feedback*cue.delay.mix;right[i]+=left[i-d]*cue.delay.feedback*cue.delay.mix;}}
 let peak=0;for(let i=0;i<n;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));if(!peak)throw fail('Sound plan rendered silence; no silent placeholder was accepted.');const scale=Math.min(1,.88/peak),bytes=Buffer.alloc(44+n*4);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(2,22);bytes.writeUInt32LE(sr,24);bytes.writeUInt32LE(sr*4,28);bytes.writeUInt16LE(4,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(n*4,40);for(let i=0;i<n;i++){bytes.writeInt16LE(Math.round(left[i]*scale*32767),44+i*4);bytes.writeInt16LE(Math.round(right[i]*scale*32767),46+i*4);}
 return{name:cue.path,mediaType:'audio/wav',encoding:'base64',content:bytes.toString('base64'),provenance:{provider:'authored-deterministic-render',purpose:cue.purpose,duration:cue.duration,sampleRate:sr,sha256:createHash('sha256').update(bytes).digest('hex'),review:'pending-listening-inspection'}};
}
export const artifactBytes=(file)=>file.encoding==='base64'?Buffer.from(file.content,'base64'):Buffer.from(file.content,'utf8');
