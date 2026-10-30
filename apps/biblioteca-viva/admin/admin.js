const $=id=>document.getElementById(id);
const h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalog=[],selected=null,db=null,api='',running=false,bulk=false,stop=false,playUrl=null,voiceLang='en';
const key=(i,lang,n)=>`${i.id}:${i.revision}:${lang}:${n}`;
function openDb(){return new Promise((resolve,reject)=>{const q=indexedDB.open('entre-voces-admin-voice',1);q.onupgradeneeded=()=>q.result.createObjectStore('clips',{keyPath:'key'});q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
function getClip(k){return new Promise((resolve,reject)=>{const tx=db.transaction('clips','readonly'),q=tx.objectStore('clips').get(k);q.onsuccess=()=>resolve(q.result?.blob||null);q.onerror=()=>reject(q.error);});}
function saveClip(k,blob){return new Promise((resolve,reject)=>{const tx=db.transaction('clips','readwrite');tx.objectStore('clips').put({key:k,blob});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
function dropClips(prefix){return new Promise((resolve,reject)=>{const tx=db.transaction('clips','readwrite'),q=tx.objectStore('clips').openCursor();q.onsuccess=()=>{const c=q.result;if(c){if(c.key.startsWith(prefix))c.delete();c.continue();}};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
function waveParts(bytes){const v=new DataView(bytes);const word=n=>String.fromCharCode(...new Uint8Array(bytes,n,4));if(bytes.byteLength<44||word(0)!=='RIFF'||word(8)!=='WAVE')throw Error('A generated segment is not a WAV file.');let fmt=null,data=null;for(let p=12;p+8<=bytes.byteLength;){const name=word(p),n=v.getUint32(p+4,true),start=p+8;if(start+n>bytes.byteLength)throw Error('Incomplete voice segment.');if(name==='fmt '&&n>=16)fmt={format:v.getUint16(start,true),channels:v.getUint16(start+2,true),rate:v.getUint32(start+4,true),bits:v.getUint16(start+14,true)};if(name==='data')data=new Uint8Array(bytes,start,n);p=start+n+(n%2);}if(!fmt||!data||fmt.format!==1||fmt.channels!==1||fmt.bits!==16)throw Error('Unsupported voice format.');return {fmt,data};}
async function combine(blobs){const parts=[];for(const b of blobs)parts.push(waveParts(await b.arrayBuffer()));const rate=parts[0].fmt.rate;if(parts.some(p=>p.fmt.rate!==rate))throw Error('Voice sample rates differ.');const gap=Math.floor(rate*.25)*2,total=parts.reduce((n,p)=>n+p.data.length,0)+gap*(parts.length-1);const out=new ArrayBuffer(44+total),v=new DataView(out),u=new Uint8Array(out);const put=(p,s)=>[...s].forEach((c,i)=>u[p+i]=c.charCodeAt(0));put(0,'RIFF');v.setUint32(4,36+total,true);put(8,'WAVE');put(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);put(36,'data');v.setUint32(40,total,true);let offset=44;parts.forEach((p,i)=>{u.set(p.data,offset);offset+=p.data.length;if(i<parts.length-1)offset+=gap;});return new Blob([out],{type:'audio/wav'});}
function list(){const q=$('search').value.toLocaleLowerCase().trim(),f=$('filter').value;const shown=catalog.filter(i=>(!q||`${i.title} ${i.script} ${i.kind}`.toLocaleLowerCase().includes(q))&&(f==='all'||(f==='other'?!['song','film','audio-drama','catch-the-change','story'].includes(i.kind):i.kind===f)));$('count').textContent=`${shown.length} files`;$('items').innerHTML=shown.length?shown.map(i=>`<button type="button" data-id="${h(i.id)}" aria-current="${i.id===selected?.id}"><strong>${h(i.title)}</strong><small>${h(i.kind)} · ${h(i.status)}</small></button>`).join(''):'<p>No matching files.</p>';}
function releaseAudio(){if(playUrl){URL.revokeObjectURL(playUrl);playUrl=null;}}
async function render(){releaseAudio();list();if(!selected){$('reader').innerHTML='<p>Choose a script to begin.</p>';return;}const i=selected;voiceLang=i.defaultLanguage||'en';$('reader').innerHTML=`<p class="eyebrow">${h(i.kind)} · ${h(i.status)}</p><h2>${h(i.title)}</h2><p class="meta">${h(i.origin)} · ${i.segments.length} voice segments</p>${i.preview?`<h3>Existing audio demo</h3><audio controls preload="none" src="${h(i.preview)}"></audio><p class="meta">Unreviewed synthetic demonstration; not released to the library.</p>`:''}${i.externalAudio?`<p><a href="${h(i.externalAudio)}" target="_blank" rel="noopener noreferrer">Open existing music ↗</a></p>`:''}<h3>Script</h3><div class="script">${h(i.script)}</div><section class="voice-box"><h3>Voice draft</h3><p>Generate a spoken reading of this script using Meta MMS on Modal. One synthetic voice reads the dialogue in the chosen language; some stage directions and speaker labels are omitted, and songs are spoken, not sung. Check mixed-language dialogue and pronunciation before using the result.</p><div class="controls"><label>Voice language<select id="voice-language"><option value="en">English</option><option value="es">Spanish</option></select></label><button type="button" class="primary" id="generate">Generate voice</button><button type="button" class="secondary" id="pause" hidden>Pause</button><button type="button" class="secondary" id="clear">Delete local draft</button></div><div class="progress" aria-hidden="true"><span id="progress-fill"></span></div><p id="voice-status" role="status" aria-live="polite"></p><div id="voice-output"></div><p class="meta">Completed segments are saved in this browser so you can resume. They are not published or uploaded to the library. The model is CC BY-NC 4.0.</p></section>`;$('voice-language').value=voiceLang;if(running){$('generate').disabled=true;$('clear').disabled=true;$('voice-language').disabled=true;$('pause').hidden=false;}if(!db||!api){$('generate').disabled=true;$('clear').disabled=true;$('voice-status').textContent=!db?'Browser storage is unavailable. Scripts remain readable.':'Voice service is not configured.';}$('voice-language').onchange=async e=>{voiceLang=e.target.value;await refreshVoice()};$('generate').onclick=()=>generate(i,voiceLang);$('pause').onclick=pauseQueue;$('clear').onclick=async()=>{try{await dropClips(`${i.id}:${i.revision}:${voiceLang}:`);await refreshVoice();}catch{$('voice-status').textContent='Could not remove the local draft.'}};await refreshVoice();}
async function refreshVoice(){const i=selected,lang=voiceLang;if(!i||!db)return;releaseAudio();try{const chunks=[];let count=0;for(let n=0;n<i.segments.length;n++){const b=await getClip(key(i,lang,n));chunks.push(b);if(b)count++;}if(i!==selected||lang!==voiceLang)return;$('progress-fill').style.width=`${i.segments.length?count/i.segments.length*100:0}%`;$('voice-status').textContent=count===i.segments.length&&count?`Voice draft ready · ${count} segments`:`${count} of ${i.segments.length} segments saved`;$('generate').textContent=count?'Resume / generate voice':'Generate voice';$('voice-output').replaceChildren();if(count===i.segments.length&&count){const wav=await combine(chunks);if(i!==selected||lang!==voiceLang)return;playUrl=URL.createObjectURL(wav);const audio=document.createElement('audio');audio.controls=true;audio.src=playUrl;const a=document.createElement('a');a.href=playUrl;a.download=`${i.id}-${lang}-voice-draft.wav`;a.textContent='Download voice draft ↓';a.className='secondary';$('voice-output').append(audio,a);}}catch{$('voice-status').textContent='Could not read the local voice draft. Check browser storage.'}}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function pauseQueue(){stop=true;$('queue-status').textContent='Pausing after the current segment…';if($('voice-status'))$('voice-status').textContent='Pausing after the current segment…';}
$('queue-pause').onclick=pauseQueue;
async function generate(item,lang){
 if(running||!db||!api)return false;
 running=true;stop=false;let completed=false;$('generate-all').disabled=true;$('queue-pause').hidden=false;
 if($('generate')){$('generate').disabled=true;$('clear').disabled=true;$('voice-language').disabled=true;$('pause').hidden=false;}
 const isVisible=()=>selected===item&&voiceLang===lang;
 const status=message=>{$('queue-status').textContent=`${item.title}: ${message}`;if(isVisible()&&$('voice-status'))$('voice-status').textContent=message;};
 try{
  for(let n=0;n<item.segments.length;n++){
   if(stop)break;const k=key(item,lang,n);if(await getClip(k))continue;
   status(`Generating segment ${n+1} of ${item.segments.length}…`);
   let response;
   for(let tries=0;tries<3;tries++){
    response=await fetch(`${api}/api/admin/synthesize`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,revision:item.revision,segment:n,language:lang})});
    if(response.status!==429)break;status('Voice service is busy. Waiting before retrying…');
    for(let i=0;i<60&&!stop;i++)await sleep(1000);if(stop)break;
   }
   if(stop&&!response?.ok)break;
   if(!response?.ok){let msg='Voice generation is unavailable. Try again.';try{const body=await response.json();msg=body.detail||msg}catch{}throw Error(msg);}
   const blob=await response.blob();await saveClip(k,blob);
   if(isVisible()&&$('progress-fill'))$('progress-fill').style.width=`${(n+1)/item.segments.length*100}%`;
  }
  await refreshVoice();completed=!stop;
  if(stop)$('queue-status').textContent='Voice queue paused. Completed segments are saved.';
  else if(!bulk)$('queue-status').textContent=`${item.title}: voice draft ready.`;
 }catch(error){status(error.message||'Voice generation failed. Try again.');}
 finally{
  running=false;$('queue-pause').hidden=true;
  if($('generate')){$('generate').disabled=!api||!db;$('clear').disabled=!db;$('voice-language').disabled=false;$('pause').hidden=true;}
  $('generate-all').disabled=bulk||!api||!db;
 }
 return completed;
}
$('generate-all').onclick=async()=>{
 if(bulk||running||!db||!api)return;bulk=true;$('generate-all').disabled=true;let completed=true;
 for(const item of catalog){if(!await generate(item,item.defaultLanguage||'en')){completed=false;break;}}
 bulk=false;$('generate-all').disabled=false;if(completed)$('queue-status').textContent='All voice drafts are ready in this browser.';
};
$('items').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(!b)return;selected=catalog.find(i=>i.id===b.dataset.id);history.replaceState(null,'',`#${encodeURIComponent(selected.id)}`);render()});
$('search').addEventListener('input',list);$('filter').addEventListener('change',list);
try{const [catalogResponse,configResponse]=await Promise.all([fetch('../admin-data/catalog.json',{cache:'no-store'}),fetch('../spoken-config.json',{cache:'no-store'})]);if(!catalogResponse.ok||!configResponse.ok)throw Error('Admin data is unavailable.');const data=await catalogResponse.json(),config=await configResponse.json();catalog=data.items||[];api=config.apiBaseUrl||'';if(api){const url=new URL(api);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('Invalid voice service configuration.');api=api.replace(/\/$/,'');}try{db=await openDb()}catch{db=null;$('generate-all').disabled=true}selected=catalog.find(i=>i.id===decodeURIComponent(location.hash.slice(1)))||catalog[0]||null;await render();if(!api){$('generate-all').disabled=true;}if(!api&&selected){$('generate').disabled=true;$('voice-status').textContent='Voice service is not configured.'}}catch(error){$('reader').textContent=`Could not open the media studio: ${error.message}.`;}
