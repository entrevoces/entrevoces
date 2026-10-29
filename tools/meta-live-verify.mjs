#!/usr/bin/env node
import {mkdirSync,writeFileSync} from 'node:fs';
import {runMetaLive} from '../media-engine/meta-eval.mjs';
const allowed=new Set(['--image','--voice','--spark-only','--dry-run']);
for(const arg of process.argv.slice(2))if(!allowed.has(arg))throw Error('Unknown flag '+arg);
const flags=new Set(process.argv.slice(2));
if(flags.has('--dry-run')){
 console.log(JSON.stringify({mode:'dry-run',provider:'Meta Model API',models:['muse-spark-1.3','muse-wonder-1.0'],calls:16,live:false,meaning:'Only outputs real observed provider results when --dry-run is omitted'}));process.exit(0);
}
if(!process.env.MODEL_API_KEY)throw Error('MODEL_API_KEY GitHub Actions secret is required for Meta live verification. Refusing to fake a successful run.');
const result=await runMetaLive({models:flags.has('--spark-only')?['muse-spark-1.3']:undefined,includeImage:flags.has('--image'),includeVoice:flags.has('--voice'),voiceFile:process.env.EV_VOICE_FIXTURE||null});
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/meta-live-report.json',JSON.stringify(result,null,2));
const detail={provider:result.provider,mode:result.runMode,summary:result.summary,images:result.imageProof?.model||'not-run',voice:result.voiceProof?.model||'not-run',artifact:'artifacts/meta-live-report.json'};
console.log(JSON.stringify(detail));
if(!result.summary.pass)process.exitCode=1;
