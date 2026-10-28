// Build-time art direction, authored SVG assets and deterministic WAV sound.
import {createHash}from'node:crypto';
import {renderSoundAsset,validateSoundPlan}from'./media.js';
export function validateVisualAssets(value){
 const errors=[],seen=new Set();
 if(!Array.isArray(value?.files)||!value.files.length||value.files.length>8)errors.push({field:'files',message:'Provide 1–8 authored SVG assets.'});
 for(const f of value?.files||[]){
  if(!/^assets\/[a-z][a-z0-9-]{2,60}\.svg$/.test(f?.path)||seen.has(f.path))errors.push({field:'path',message:'Unique assets/<slug>.svg required.'});seen.add(f?.path);
  if(typeof f?.content!=='string'||f.content.length<100||f.content.length>500000||!/<svg\b/.test(f.content)||!/<\/svg>\s*$/.test(f.content)||!/(?:viewBox|width)=/.test(f.content)||/<(?:script|foreignObject|iframe|image|use|audio|video)\b|\bon\w+\s*=|(?:href|src)\s*=|@import|<!ENTITY|<!DOCTYPE|url\(\s*(?!['"]?#)/i.test(f.content))errors.push({field:f?.path||'content',message:'Bounded standalone inert SVG with explicit dimensions required; no scripts, external resources or embeds.'});
 }
 return{ok:!errors.length,errors};
}
export async function prepareGameMedia(jobs,job){
 if(!job.checkpoints.mediaPlan){job.checkpoints.mediaPlan=await jobs.checked(job,{task:'game-media-plan',system:'Produce art direction for the saved framework. Return {composition:string,palette:[strings],assets:[{path,purpose,direction}],soundscape:string}. Assets must be original authored SVG (1–8), specific environment/title/entity layers, never flattened game/UI/text. Specify composition, materials, lighting, motion and live entities layered above art. No external model services.',user:{framework:job.checkpoints.framework},validate:d=>({ok:typeof d?.composition==='string'&&d.composition.length>100&&Array.isArray(d.assets)&&d.assets.length>0&&d.assets.length<=8,errors:[{field:'art',message:'Substantial composition and bounded concrete asset plan required.'}]})});jobs.save();}
 if(!job.checkpoints.mediaAssets){
  const visual=await jobs.checked(job,{task:'asset-production',system:'Author original SVG assets matching the supplied plan. Return {files:[{path,content}]}. Complete original vector illustrations, restrained professional composition; no scripts, external references, raster images, UI text or game state baked into art. Every planned path must be present.',user:{framework:job.checkpoints.framework,plan:job.checkpoints.mediaPlan},validate:d=>{const gate=validateVisualAssets(d);for(const a of job.checkpoints.mediaPlan.assets)if(!d?.files?.some(f=>f.path===a.path))gate.errors.push({field:a.path,message:'Missing planned asset.'});return{ok:!gate.errors.length,errors:gate.errors};}});
  job.checkpoints.mediaAssets=visual.files.map(f=>({name:f.path,content:f.content,mediaType:'image/svg+xml',provenance:{author:'asset-builder',sha256:createHash('sha256').update(f.content).digest('hex'),review:'source-review-only; rendering inspection pending'}}));jobs.save();
 }
 if(!job.checkpoints.mediaReview||job.checkpoints.mediaReview.verdict!=='accept'){
  job.checkpoints.mediaReview=await jobs.checked(job,{task:'asset-review',system:'Review original asset SVG source against framework and art direction. Return {verdict,findings:[{severity,field,message}],missingPassageIds:[],limitations:[]}. Detect composition, semantic, consistency, missing layer and content defects. You have source, not rendered images; disclose that limitation. Accept only with no blocker/major.',user:{framework:job.checkpoints.framework,plan:job.checkpoints.mediaPlan,assets:job.checkpoints.mediaAssets},validate:d=>({ok:['accept','repair','reject'].includes(d?.verdict)&&Array.isArray(d.findings),errors:[{field:'review',message:'Structured source review required.'}]})});jobs.save();
 }
 if(job.checkpoints.mediaReview.verdict!=='accept'||job.checkpoints.mediaReview.findings.some(f=>['major','blocker'].includes(f.severity)))throw Object.assign(new Error('Asset source review requires revision; checkpoints retained.'),{code:'asset-review'});
 if(!job.checkpoints.soundPlan){job.checkpoints.soundPlan=await jobs.checked(job,{task:'sound-plan',system:'Return {cues:[{path,purpose,duration,seed,events:[{time,duration,wave,frequency,endFrequency,gain,pan,attack,release}]}]}. Compose action cues, state cues and appropriate ambience, 1–12 cues, total <=180s, each <=45s. Stereo PCM 22050Hz renderer supports sine/triangle/square/saw/noise, frequency20..8000, gain0..0.8, pan-1..1, event duration>=.01s, attack/release .001..duration/2. Every cue path assets/<slug>.wav. Author musical/tonal variation and readable feedback appropriate to framework; do not simulate voice.',user:{framework:job.checkpoints.framework,plan:job.checkpoints.mediaPlan},validate:d=>{const errors=[];if(!Array.isArray(d?.cues)||!d.cues.length||d.cues.length>12||d.cues.reduce((n,c)=>n+c.duration,0)>180)errors.push({field:'cues',message:'1–12 non-silent cues, <=180 seconds total required.'});for(const c of d?.cues||[])for(const message of validateSoundPlan(c).errors)errors.push({field:c.path,message});if(new Set(d?.cues?.map(c=>c.path)).size!==d?.cues?.length)errors.push({field:'path',message:'Duplicate sound paths.'});return{ok:!errors.length,errors};}});jobs.save();}
 const assets=[...job.checkpoints.mediaAssets,...job.checkpoints.soundPlan.cues.map(renderSoundAsset)];
 for(const a of assets)jobs.file(job,a.name,a.content,a.mediaType,a);
 jobs.file(job,'media-manifest.json',JSON.stringify(assets.map(({content,...f})=>f),null,2),'application/json');
 return assets;
}
