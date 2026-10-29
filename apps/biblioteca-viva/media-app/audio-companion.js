/** Optional local device narration preview for unrecorded scripts; not a produced audio asset. */
let active=0;
const speech=()=>typeof window!=='undefined'&&'speechSynthesis' in window&&typeof window.SpeechSynthesisUtterance!=='undefined';
export function canPreview(){return speech()}
export function stopPreview(){active++;if(speech())window.speechSynthesis.cancel()}
export function splitNarration(input,{maxChars=180}={}){
 const text=String(input||'').replace(/\r/g,'').trim();if(!text)return [];
 const segments=[];
 for(const raw of text.split(/\n+/)){
  let line=raw.trim();if(!line)continue;
  const role=/^([\p{L}][\p{L}\p{N} .'-]{1,28}):\s*(.*)$/u.exec(line);
  const speaker=role?role[1].trim():null;if(role)line=role[2];
  if(/^\[[^\]]+\]$/.test(line))continue;
  const sentences=line.match(/[^.!?。！？]+[.!?。！？]?/gu)||[line];let buffer='';
  for(const sentence of sentences){
   if((buffer+sentence).length>maxChars&&buffer){segments.push({speaker,text:buffer.trim()});buffer=''}
   if(sentence.length>maxChars){if(buffer){segments.push({speaker,text:buffer.trim()});buffer=''}for(let i=0;i<sentence.length;i+=maxChars)segments.push({speaker,text:sentence.slice(i,i+maxChars).trim()})}
   else buffer+=' '+sentence.trim();
  }
  if(buffer.trim())segments.push({speaker,text:buffer.trim()});
 }
 return segments.filter(x=>x.text);
}
export function guessLanguage(segment,defaultLanguage='es'){
 const s=String(segment.text||'');
 if(segment.language==='en'||segment.language==='en-US')return 'en-US';
 if(segment.language==='es'||segment.language==='es-ES')return 'es-ES';
 if(segment.language==='zh'||segment.language==='zh-CN')return 'zh-CN';
 if(/[\u3400-\u9fff]/u.test(s))return 'zh-CN';
 const tokens=s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').match(/[a-z]+/g)||[];
 const enWords=new Set('the that was were with have been would could should from there those this these does did do what why where when who about before after said told your you they we are not our their it of and can may must for on as but i she he'.split(' '));
 const esWords=new Set('el la los las un una que con por para desde hasta habria puede debe ayer hoy manana habia dijo vio cree tengo tiene estaba estaba estoy no mi su usted ellos ella cuando quien donde como porque pero si en del al y se me lo le nos hay'.split(' '));
 let en=0,es=0;for(const x of tokens){if(enWords.has(x))en++;if(esWords.has(x))es++;}
 if(en>=es+2)return 'en-US';if(es>=en+2)return 'es-ES';
 return defaultLanguage==='en'?'en-US':defaultLanguage==='zh'?'zh-CN':'es-ES';
}
/** Must originate from a user gesture; no model calls or audio uploads. */
export function previewNarration(input,{defaultLanguage='es',onState=()=>{},rate=0.93}={}){
 stopPreview();if(!speech())return {ok:false,reason:'Speech synthesis not available in this browser'};
 const parts=Array.isArray(input)?input.filter(t=>t&&typeof t.text==='string'&&t.text.trim()).map(t=>({speaker:t.speaker||null,text:t.text,language:t.language||defaultLanguage})):splitNarration(input);if(!parts.length)return {ok:false,reason:'Nothing to read'};
 const token=active;const engine=window.speechSynthesis;
 // iOS/Safari often reports voices asynchronously. Fallback to default locale without blocking.
 const voices=engine.getVoices?.()||[];let n=0;
 function next(){if(token!==active)return;if(n>=parts.length){onState({status:'complete'});return}
  const seg=parts[n++],utter=new window.SpeechSynthesisUtterance(seg.text);utter.lang=guessLanguage(seg,defaultLanguage);utter.rate=Math.max(.7,Math.min(1.15,rate));utter.pitch=1;
  const candidates=voices.filter(v=>v.lang.toLowerCase().startsWith(utter.lang.slice(0,2).toLowerCase()));if(candidates.length)utter.voice=candidates[seg.speaker?[...seg.speaker].reduce((n,c)=>n+c.charCodeAt(0),0)%candidates.length:0];
  utter.onend=next;utter.onerror=()=>{if(token===active){onState({status:'error',reason:'Device voice playback was interrupted'});stopPreview()}};
  onState({status:'speaking',current:n,total:parts.length,speaker:seg.speaker||'Narrator',text:seg.text});engine.speak(utter)
 }
 onState({status:'starting',total:parts.length});next();return {ok:true,segments:parts.length,kind:'unvalidated-device-voice-preview'};
}
