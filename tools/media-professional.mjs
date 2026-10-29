#!/usr/bin/env node
/** Offline CI/readiness and production tooling. No keys, network, downloads or model calls. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {loadKnowledge} from '../media-engine/knowledge.mjs';
import {releaseReadiness} from '../media-engine/release.mjs';
import {recommendMedia} from '../media-engine/recommender.mjs';
import {compileTimeline,toSRT,verifyRecordedTimeline} from '../media-engine/audio-timeline.mjs';
const [mode='help',...args]=process.argv.slice(2);
const f=k=>{const i=args.indexOf('--'+k);return i===-1?null:args[i+1]};
const write=(path,data)=>{mkdirSync(dirname(resolve(path)),{recursive:true});writeFileSync(path,data)};
const read=path=>JSON.parse(readFileSync(path,'utf8'));
try{
 if(mode==='help'){console.log(`Entre Voces Professional Studio tools:
  npm run media:professional -- readiness [--out reports/media-readiness.json]
  npm run media:professional -- recommend [--limit 12] [--format listen]
  npm run media:professional -- timeline --in input.json --out workshop/edl.json
  npm run media:professional -- captions --in workshop/edl.json --out workshop/script.srt
  npm run media:professional -- audit-timing --in workshop/edl.json --duration-ms 10000 --transcript transcript.txt --cue-review cue-approval.json
Read docs/PROFESSIONAL_MEDIA_STANDARD.md for signoff procedures.`);process.exit(0)}
 const kb=loadKnowledge(),legacy=read('content/living-library/collection.json').items,production=read('content/media-production/catalog.json').items;
 if(mode==='readiness'){
  const r=releaseReadiness({legacy,production,knowledge:kb});if(f('out'))write(f('out'),JSON.stringify(r,null,2)+'\n');
  console.log(JSON.stringify({...r,detail:r.detail.filter(x=>x.issues.length)},null,2));if(!r.releaseCanBuild)process.exitCode=2;
 }else if(mode==='recommend'){
  console.log(JSON.stringify(recommendMedia([...legacy,...production],{limit:Math.min(30,Number(f('limit')||12)),format:f('format')||''}).map(x=>({id:x.item.id,title:x.item.title,reason:x.reasons,score:Math.floor(x.score)})),null,2));
 }else if(mode==='timeline'){
  const input=read(f('in'));const result=compileTimeline(input);write(f('out'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({file:f('out'),durationMs:result.durationMs,segments:result.segments.length,cues:result.errors.length}));
 }else if(mode==='captions'){
  const result=toSRT(read(f('in')));write(f('out'),result);console.log(JSON.stringify({file:f('out'),subtitles:result.split('-->').length-1}));
 }else if(mode==='audit-timing'){
  const result=verifyRecordedTimeline(read(f('in')),{audioDurationMs:Number(f('duration-ms')),transcript:readFileSync(f('transcript'),'utf8'),cueReview:read(f('cue-review'))});console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=2;
 }else throw Error('Unknown mode; run media:professional -- help');
}catch(error){console.error('ERROR:',error.message);process.exitCode=1}
