#!/usr/bin/env node
/** CLI: npm run media:packets. Does not synthesize voices or publish content. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {recordingPacket,packetToCSV} from '../media-engine/voice-production.mjs';
const catalog=JSON.parse(readFileSync('content/media-production/catalog.json','utf8'));
const root=resolve(process.argv.includes('--out')?process.argv[process.argv.indexOf('--out')+1]:'media-workshop/recording-packets');
const items=catalog.items.filter(x=>x.script?.trim());
let total=0;
for(const item of items){
 const p=recordingPacket(item);const dir=join(root,item.id);mkdirSync(dir,{recursive:true});
 writeFileSync(join(dir,'production-packet.json'),JSON.stringify(p,null,2)+'\n');
 writeFileSync(join(dir,'actor-cue-sheet.csv'),packetToCSV(p));
 writeFileSync(join(dir,'script.txt'),item.script+'\n');
 if(item.kind==='song'){writeFileSync(join(dir,'suno-original-lyrics.txt'),item.lyrics||item.script);if(item.prompts?.suno)writeFileSync(join(dir,'suno-style-prompt.txt'),item.prompts.suno+'\n');}
 writeFileSync(join(dir,'RECORDING_INSTRUCTIONS.md'),`# ${item.title}\n\n**Status:** ${item.status} — no audio is supplied, no professional signoff has been claimed.\n\nCast: ${p.speakers.join(', ')}. Estimated duration: ${p.approximateDurationSec} seconds, not validated.\n\n## Director's notes\n\n1. Record independently with natural, intelligent adult performances. Do not caricature cultural accents. Separate speaker and sound effects stems.\n2. Keep hesitation, uncertainty, negative particles, numbers and discourse markers audible. Do not improve incorrect lines by accident: they are intentionally faulty in the learning exercise.\n3. Follow the speaker-language cue sheet; verify all unconfirmed lines. Listen back in the actual language of each actor.\n4. After editing, transcribe the final mix, hand-align error onsets and offsets, and obtain a qualified bilingual domain review.\n5. Add captions and scripts, listening-speed options, media licensing records and real-device playtest proof before publishing.\n\n**Automatic generation and production are NOT the same.** This is an authoring packet.\n`);
 total++;
}
console.log(JSON.stringify({output:root,packets:total,recordingsCreated:0,modelCalls:0}));
