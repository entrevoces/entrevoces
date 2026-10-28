// Opt-in spoken sight-transfer practice. Static GitHub Pages sends only the
// user's consented recording to the separately deployed Modal endpoint.
// No model credentials or demo access code are included in the Pages build.
export function normalizeSpokenApiUrl(value){
  if(!value)return '';
  try{const u=new URL(value);if(u.username||u.password||u.search||u.hash)return '';
    if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)))return '';
    return `${u.origin}${u.pathname.replace(/\/+$/,'')}`;
  }catch{return '';}
}
export function encodeWav(samples,inputRate,targetRate=16000){
  if(!Number.isFinite(inputRate)||inputRate<8000)throw new RangeError('Invalid input sample rate.');
  const n=Math.floor(samples.length*targetRate/inputRate),wav=new ArrayBuffer(44+n*2),view=new DataView(wav),bytes=new Uint8Array(wav);
  const word=(offset,s)=>{for(let i=0;i<s.length;i++)bytes[offset+i]=s.charCodeAt(i);};
  word(0,'RIFF');view.setUint32(4,36+n*2,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,targetRate,true);view.setUint32(28,targetRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,n*2,true);
  for(let i=0;i<n;i++){
    const lo=Math.floor(i*inputRate/targetRate),hi=Math.min(samples.length,Math.max(lo+1,Math.floor((i+1)*inputRate/targetRate)));
    let v=0;for(let j=lo;j<hi;j++)v+=samples[j]||0;v/=Math.max(1,hi-lo);
    view.setInt16(44+i*2,Math.max(-32768,Math.min(32767,Math.round(Math.max(-1,Math.min(1,v))*32767))),true);
  }
  return new Blob([wav],{type:'audio/wav'});
}

const style=`<div class="spoken-backdrop" role="dialog" aria-modal="true" aria-labelledby="spoken-title"><section class="spoken-panel"><button type="button" class="spoken-close" data-action="close" aria-label="Close spoken practice">✕</button><div class="spoken-brow">ENTRE VOCES · VOICE LAB</div><h2 id="spoken-title">Speak the meaning</h2><p class="spoken-caption">Interpret this source message naturally in the other language. Preserve every important fact.</p><blockquote class="spoken-prompt" data-output="prompt"></blockquote><p class="spoken-hint" data-output="language"></p><label class="spoken-access" data-output="access" hidden>Demo access code <input type="password" autocomplete="off" data-input="access" placeholder="Provided by the instructor" /></label><div class="spoken-controls"><button type="button" data-action="swap">⇄ Reverse languages</button><button type="button" data-action="listen">▶ Hear source</button><button type="button" class="spoken-primary" data-action="record">● Record answer</button></div><p role="status" aria-live="polite" class="spoken-status" data-output="status"></p><div class="spoken-result" data-output="result" hidden><h3>What the model heard</h3><p class="spoken-transcript" data-output="transcript"></p><h3>Example rendering</h3><p data-output="reference"></p><div data-output="units"></div><p data-output="feedback"></p><p class="spoken-disclaimer">Compare the transcript with the source and example rendering. ASR is fallible; no automated meaning score is awarded. If it misheard you, record again.</p><button type="button" data-action="retry">↻ It misheard me / try again</button></div><p class="spoken-footer">Up to 30 seconds · With your consent, audio is sent to Meta MMS speech recognition on a CPU container at Modal; this game saves no recording. Use fictional content only.</p></section></div>`;

export class SpokenPractice {
  constructor(){this.available=false;this.apiBaseUrl='';this.accessRequired=false;this.open=false;this.recording=false;this.busy=false;this.node=null;this.recorder=null;this.context=null;this.stream=null;this.samples=[];this.timer=null;this.startedAt=0;this.task=null;this.callback=null;this.closeCallback=null;this.generation=0;this.direction='forward';this.selection=null;
    this.root=document.createElement('div');this.root.className='spoken-shell';this.root.hidden=true;this.root.innerHTML=style;document.body.append(this.root);
    this.root.addEventListener('click',e=>{const action=e.target.closest('button[data-action]')?.dataset.action;if(!action)return;if(action==='close')this.close();if(action==='listen')this.listen();if(action==='record')this.recording?this.stop():this.record();if(action==='retry')this.resetAttempt();if(action==='swap')this.swap();});
    document.addEventListener('keydown',e=>{if(this.open&&e.key==='Escape'){e.stopPropagation();this.close();}},{capture:true});
  }
  field(name){return this.root.querySelector(`[data-output="${name}"]`);}
  action(name){return this.root.querySelector(`[data-action="${name}"]`);}
  status(message){this.field('status').textContent=message;}
  async health(){this.available=false;if(!this.apiBaseUrl)return false;
    try{const r=await fetch(`${this.apiBaseUrl}/api/spoken/health`,{cache:'no-store'});const data=r.ok?await r.json():null;this.available=data?.enabled===true;this.accessRequired=data?.accessRequired===true;this.field('access').hidden=!this.accessRequired;}catch{this.available=false;}
    return this.available;}
  async start({domain,lang,conceptId,onResolved,onClose}){
    if(this.open)return;
    this.returnFocus=document.activeElement;
    this.background=document.querySelector?.('main');if(this.background)this.background.inert=true;
    this.open=true;this.root.hidden=false;this.callback=onResolved;this.closeCallback=onClose;this.selection={domain,lang,conceptId};this.direction='forward';
    this.resetAttempt();this.field('prompt').textContent='Loading sourced scenario…';this.field('language').textContent=lang==='es'?'English → Spanish':'English → Mandarin';
    this.action('record').disabled=true;this.action('listen').disabled=true;
    if(!this.available){this.status('Voice service is not configured or currently unavailable. The arcade games still work offline.');return;}
    await this.loadTask();
  }
  async loadTask(){
    const sequence=++this.generation;this.task=null;this.resetAttempt();this.action('record').disabled=true;this.action('listen').disabled=true;this.action('swap').disabled=true;
    this.field('prompt').textContent='Loading sourced scenario…';
    try{const r=await fetch(`${this.apiBaseUrl}/api/spoken/task?${new URLSearchParams({...this.selection,direction:this.direction})}`,{cache:'no-store'});
      if(!r.ok)throw Error('No reviewed speaking scenario for this concept.');const task=await r.json();if(!this.open||sequence!==this.generation)return;
      this.task=task;this.field('prompt').textContent=task.sourceText;
      const label={en:'English',es:'Spanish',zh:'Mandarin'};this.field('language').textContent=`${label[task.sourceLanguage]} → ${label[task.targetLanguage]}`;
      this.action('record').disabled=false;this.action('listen').disabled=!('speechSynthesis' in window);this.action('swap').disabled=false;
      this.status('Take your time. Press Record when ready.');this.action('record').focus();
    }catch(e){if(sequence===this.generation){this.action('swap').disabled=false;this.status(e.message);}}
  }
  swap(){if(this.recording||this.busy||!this.available)return;window.speechSynthesis?.cancel();this.direction=this.direction==='forward'?'reverse':'forward';this.loadTask();}
  listen(){if(!this.task||!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(this.task.sourceText);u.lang=this.task.sourceLanguage==='zh'?'zh-CN':this.task.sourceLanguage==='es'?'es-ES':'en-US';u.rate=.86;window.speechSynthesis.speak(u);this.status('Playing with your device’s speech synthesizer (not Meta-generated audio).');}
  resetAttempt(){this.field('result').hidden=true;this.field('transcript').textContent='';this.field('units').replaceChildren();this.field('feedback').textContent='';this.status('');this.action('record').textContent='● Record answer';this.action('record').disabled=false;}
  async record(){if(!this.task||this.recording||this.busy)return;
    if(this.accessRequired&&!this.root.querySelector('[data-input="access"]')?.value?.trim()){this.status('Enter the demo access code first, then press Record.');this.root.querySelector('[data-input="access"]')?.focus();return;}
    if(!navigator.mediaDevices?.getUserMedia){this.status('Microphone capture needs a secure browser context (HTTPS or localhost).');return;}
    const generation=this.generation;
    try{
      // Construct and resume while the user gesture is still active, notably
      // for iOS Safari; permission dialogs may resolve outside that gesture.
      this.context=new (window.AudioContext||window.webkitAudioContext)();
      await this.context.resume();
      if(!this.open||generation!==this.generation){await this.release();return;}
      const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
      if(!this.open||generation!==this.generation){stream.getTracks().forEach(t=>t.stop());await this.release();return;}
      this.stream=stream;this.samples=[];
      const source=this.context.createMediaStreamSource(this.stream);
      if(this.context.audioWorklet){try{await this.context.audioWorklet.addModule('../_shared/pcm-worklet.js');this.node=new AudioWorkletNode(this.context,'entre-voces-pcm');this.node.port.onmessage=e=>{if(this.recording&&e.data?.length)this.samples.push(e.data);};}catch{/* browser fallback below */}}
      if(!this.open||generation!==this.generation){await this.release();return;}
      if(!this.node){this.node=this.context.createScriptProcessor(2048,1,1);this.node.onaudioprocess=e=>{if(this.recording)this.samples.push(new Float32Array(e.inputBuffer.getChannelData(0)));};}
      source.connect(this.node);this.node.connect(this.context.destination);
      this.recording=true;this.startedAt=Date.now();this.action('swap').disabled=true;this.action('record').textContent='■ Stop & review';this.status('Recording… Speak in the target language.');
      this.timer=setTimeout(()=>this.stop(),30_000);
    }catch(e){await this.release();this.status(e.name==='NotAllowedError'?'Microphone permission denied. Enable it for this site and retry.':'Microphone unavailable. Please check the device and retry.');}
  }
  async release(){clearTimeout(this.timer);this.timer=null;this.recording=false;try{this.node?.disconnect();}catch{}try{this.stream?.getTracks().forEach(t=>t.stop());}catch{}try{await this.context?.close();}catch{}this.node=null;this.context=null;this.stream=null;}
  async stop(){if(!this.recording)return;const rate=this.context.sampleRate,parts=this.samples;this.samples=[];await this.release();this.action('record').textContent='● Record answer';this.action('swap').disabled=false;
    if(!this.open)return;
    const total=parts.reduce((s,p)=>s+p.length,0);if(total<rate*.35){this.status('Too short to assess. Try a complete sentence.');return;}
    const merged=new Float32Array(total);let at=0;for(const p of parts){merged.set(p,at);at+=p.length;}
    let peak=0;for(let i=0;i<merged.length;i++)peak=Math.max(peak,Math.abs(merged[i]));
    if(peak<.012){this.status('No clear voice was captured. Check your microphone and try again.');return;}
    if(this.accessRequired&&!this.root.querySelector('[data-input="access"]')?.value?.trim()){this.status('Demo access code missing. Enter it and retry.');return;}
    const wav=encodeWav(merged,rate);this.busy=true;this.action('record').disabled=true;this.status('Meta MMS is transcribing on CPU. First use may take time to load the speech model…');const seq=this.generation;
    try{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),610_000);let r;try{const headers={'Content-Type':'audio/wav'};if(this.accessRequired)headers['X-EV-Access-Code']=this.root.querySelector('[data-input="access"]').value.trim();r=await fetch(`${this.apiBaseUrl}/api/spoken/assess?${new URLSearchParams({taskId:this.task.taskId})}`,{method:'POST',headers,body:wav,signal:controller.signal});}finally{clearTimeout(timer);}
      const result=await r.json();if(!r.ok)throw Error(result.detail||result.error||'Voice assessment unavailable.');if(!this.open||seq!==this.generation)return;
      this.show(result);this.callback?.(result,this.task);
    }catch(e){if(this.open&&seq===this.generation)this.status(e.name==='AbortError'?'The voice request took too long. Please retry.':e.message);}
    finally{this.busy=false;if(this.open&&seq===this.generation){this.action('record').disabled=false;this.action('swap').disabled=false;}}
  }
  show(result){const assessment=result.assessment||{};this.field('result').hidden=false;this.field('transcript').textContent=result.transcript||'No speech detected';this.field('reference').textContent=result.referenceText||'No example rendering supplied.';const container=this.field('units');container.replaceChildren();
    for(const unit of assessment.units||[]){const line=document.createElement('p');line.className=`spoken-unit spoken-${unit.status}`;line.textContent=`${unit.status==='preserved'?'✓':unit.status==='altered'?'!':'?'} ${unit.source} — ${unit.reason}`;container.append(line);}
    this.field('feedback').textContent=`${assessment.verdict==='faithful'?'Meaning preserved.':assessment.verdict==='needs-repair'?'Repair this meaning:':'Assessment uncertain:'} ${assessment.feedback||''} ${assessment.repairPrompt||''}`;
    this.status('Review the transcript before accepting feedback. You can always retry.');
  }
  async close(){if(!this.open)return;++this.generation;this.open=false;this.root.hidden=true;this.busy=false;this.task=null;this.callback=null;window.speechSynthesis?.cancel();await this.release();this.samples=[];if(this.background)this.background.inert=false;this.background=null;this.returnFocus?.focus?.();this.closeCallback?.();this.closeCallback=null;}
}
