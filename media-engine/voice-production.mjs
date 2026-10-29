/** Sound production documents generated from scripts: estimated timings, never fake audio. */
const chunk=s=>String(s||'').normalize('NFC').trim();
const wc=s=>chunk(s).match(/[\p{L}\p{N}]+/gu)?.length||0;
const lang=x=>({en:'en',es:'es',zh:'zh'}[x]||'unconfirmed');
const LABEL=/^([\p{L}\p{N} .,'’–-]{2,45})(?:\s*\(([^)]{2,60})\))?:\s*(.+)$/u;
const direction=s=>/\b(?:spanish|español|es)\b/iu.test(s)?'es':/\b(?:english|inglés|en)\b/iu.test(s)?'en':/\b(?:mandarin|chinese|中文|zh)\b/iu.test(s)?'zh':'unconfirmed';
const ident=s=>chunk(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'').slice(0,48)||'voice';
export function derivePerformanceLines(item,{wpm=135}={}){
 if(!Number.isFinite(wpm)||wpm<90||wpm>220)throw Error('Speech pace must be 90–220 words/minute');
 if(!item?.script?.trim())throw Error('No authored script to prepare');
 if(item.kind==='catch-the-change'&&item.turns?.length){
  return item.turns.map((turn,i)=>({lineId:'line-'+String(i+1).padStart(3,'0'),speaker:chunk(turn.speaker)||'Unknown',language:lang(turn.language),text:chunk(turn.text),estimatedMs:Math.max(700,Math.round(wc(turn.text)*60000/wpm)),source:'explicit-bilingual-turn'}));
 }
 const out=[];let index=0;
 for(const raw of item.script.split(/\r?\n/)){
  let x=raw.trim();if(!x)continue;
  if(/^\[.*\]$/.test(x)){out.push({lineId:'cue-'+String(++index).padStart(3,'0'),type:'production-cue',text:x.slice(1,-1),requiresHumanMix:true});continue;}
  const m=LABEL.exec(x);
  if(m){let speaker=m[1].trim();const parenthetical=m[2]||'',text=m[3];
   if(/^(?:SCENE|EPISODE|ACT|CHAPTER)\b/i.test(speaker))continue;
   out.push({lineId:'line-'+String(++index).padStart(3,'0'),speaker,language:direction(parenthetical),text,estimatedMs:Math.max(700,Math.round(wc(text)*60000/wpm)),source:'parsed-script-label'});
  }else out.push({lineId:'line-'+String(++index).padStart(3,'0'),speaker:'NARRATOR',language:'unconfirmed',text:x,estimatedMs:Math.max(700,Math.round(wc(x)*60000/wpm)),source:'narrative-body'});
 }
 if(!out.some(x=>x.speaker))throw Error('No speakable text found');
 return out;
}
export function recordingPacket(item,{wpm=135}={}){
 const lines=derivePerformanceLines(item,{wpm}),speakers=[...new Set(lines.filter(x=>x.speaker).map(x=>x.speaker))];
 const recorded=lines.filter(x=>x.speaker),unknownLanguage=recorded.filter(x=>x.language==='unconfirmed').length;
 const spoken=recorded.reduce((n,l)=>n+l.estimatedMs,0);
 const pauseBudget=Math.round(recorded.length*420+lines.filter(x=>x.type==='production-cue').length*900);
 const cues=(item.errors||[]).map(e=>({errorId:e.id,category:e.category,
   original:e.audibleSource||e.original,wrong:e.audibleWrong||e.wrong,repair:e.audibleRepair||e.repair,
   sourceTurnIndex:e.sourceTurnIndex??null,wrongTurnIndex:e.wrongTurnIndex??null,repairTurnIndex:e.repairTurnIndex??null,
   requiredAfterRecording:'mark true phrase boundaries in final audio waveform; verify by a bilingual human; do not use estimated timestamps',alignmentState:'not-aligned'}));
 return {schemaVersion:2,mediaId:item.id,title:item.title,kind:item.kind,status:item.status,
  intendedLanguagePair:'English/Spanish',licenseState:item.rights?.status||'uncleared',review:{bilingual:false,domain:false,editorial:false},
  scriptSource:'authored project draft',speakers,lines,cues,wordCount:wc(item.script),approximateDurationSec:Math.round((spoken+pauseBudget)/1000),
  production:{speakerStemPolicy:'one dry mono WAV stem per actor + separately recorded SFX/music stems',masters:'lossless 48kHz 24-bit WAV project master, accessible web M4A/MP3 plus captions',
   intelligibility:'mix spoken words above music; proof numbers, negative particles, hedges and speaker identities in the final mix',
   playback:'recheck native audio playback in mobile Safari with headphones and speakers',
   languagePolicy:'review every unconfirmed line language; do not assume English/Spanish from speaker ethnicity',
   soundPolicy:'silence may carry emotion; preserve consonants and headroom; sound cues never obscure an error anchor',
   licensing:'collect actor/voice/talent releases, music/sample license, cover and performance rights before deployment',
   asr:'export 16/24 kHz mono PCM16 for Meta Voice Transcribe; ASR only advises, never certifies bilingual fidelity'},
  pending:[`language of ${unknownLanguage} parsed lines must be confirmed`, 'all planned pauses and timings must be replaced with real measurements',
   'actual recording and listening-quality inspection', 'source-to-translation semantic review','legal and medical domain review','rights sign-off'],
  cannotClaim:'This packet does not include recorded audio, authentic performance, final cue alignment or professional validation.'};
}
export function packetToCSV(packet){
 const esc=x=>'"'+String(x??'').replace(/"/g,'""').replace(/\r?\n/g,' ')+'"';
 return [['lineId','speaker','language','estimatedMs','text'],...packet.lines.map(x=>[x.lineId,x.speaker||'SFX',x.language||'',x.estimatedMs||0,x.text])].map(row=>row.map(esc).join(',')).join('\n')+'\n';
}
