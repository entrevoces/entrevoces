/** Meta Model API: authoring-only network client. Not included in the published browser bundle. */
import {readFileSync,writeFileSync} from 'node:fs';
const BASE='https://api.meta.ai/v1';
const VALID_TEXT_MODELS=new Set(['muse-spark-1.3','muse-spark-1.2','muse-wonder-1.0']);
/** Validate the actual RIFF chunks, not only the extension/header. Model API accepts mono signed PCM16 at 16/24kHz. */
export function validateVoiceWav(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<44||bytes.length>32*1024*1024||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Voice Transcribe requires RIFF/WAVE under 32MB');
 let fmt=null,dataBytes=0,offset=12;
 while(offset+8<=bytes.length){
  const name=bytes.toString('ascii',offset,offset+4),len=bytes.readUInt32LE(offset+4);
  if(len>bytes.length-offset-8)throw Error('Corrupt WAV chunk length');
  if(name==='fmt '){if(len<16)throw Error('Incomplete WAV format chunk');fmt={format:bytes.readUInt16LE(offset+8),channels:bytes.readUInt16LE(offset+10),rate:bytes.readUInt32LE(offset+12),bits:bytes.readUInt16LE(offset+22)};}
  if(name==='data')dataBytes+=len;
  offset+=8+len+(len%2);
 }
 if(!fmt||fmt.format!==1||fmt.channels!==1||![16000,24000].includes(fmt.rate)||fmt.bits!==16||!dataBytes)throw Error('Convert recording to mono PCM16 WAV at 16 or 24 kHz first (ffmpeg -ac 1 -ar 24000 -c:a pcm_s16le)');
 const seconds=dataBytes/(fmt.rate*2);
 if(seconds>600)throw Error('Voice transcription is limited to ten minutes per audio file');
 return {sampleRate:fmt.rate,seconds,bytes:dataBytes};
}
export class MetaClient{
 constructor({apiKey=process.env.MODEL_API_KEY,baseUrl=BASE,fetchImpl=fetch,model='muse-spark-1.3',maxRequests=20}={}){
  this.key=apiKey;this.base=baseUrl.replace(/\/$/,'');this.fetch=fetchImpl;this.model=model;this.maxRequests=maxRequests;this.count=0;
  if(!VALID_TEXT_MODELS.has(model))throw Error('Unapproved text model');
  if(!/^https:\/\//.test(this.base)&&this.base!=='http://127.0.0.1:0')throw Error('Meta authoring endpoint must be HTTPS');
 }
 async request(endpoint,{payload,body,headers={},method='POST',retries=2}={}){
  if(!this.key)throw Error('MODEL_API_KEY not set; use --dry-run to produce prompts without an API call.');
  for(let attempt=0;;attempt++){
   // Count every HTTP attempt (including retries), not just logical calls.
   // A temporary HTTP 429 must not bypass a protected paid-request budget.
   if(this.count>=this.maxRequests)throw Error('Authoring request budget reached.');
   this.count++;
   const res=await this.fetch(`${this.base}${endpoint}`,{method,headers:{Authorization:`Bearer ${this.key}`,...(payload?{'Content-Type':'application/json'}:{}),...headers},body:payload?JSON.stringify(payload):body,signal:AbortSignal.timeout(120000)});
   if(res.ok)return await res.json();
   const responseText=(await res.text()).slice(0,400);
   if(attempt<retries&&([429,500,502,503,504].includes(res.status))){await new Promise(resolve=>setTimeout(resolve,Math.min(500*2**attempt,3000)));continue;}
   throw Error(`Meta API HTTP ${res.status}: ${responseText}`);
  }
 }
 async textJSON({system,user,model=this.model,maxTokens=5000,schema=null}={}){
  if(!VALID_TEXT_MODELS.has(model))throw Error('Invalid model');
  const payload={model,messages:[{role:'developer',content:system},{role:'user',content:JSON.stringify(user)}],max_completion_tokens:maxTokens};
  if(schema)payload.response_format={type:'json_schema',json_schema:{name:'entre_voces_live_eval',strict:true,schema}};
  const data=await this.request('/chat/completions',{payload});
  if(data?.choices?.[0]?.finish_reason==='length')throw Error('Meta response truncated at max_completion_tokens; increase bounded token allowance');
  const content=data?.choices?.[0]?.message?.content;
  if(typeof content!=='string'||!content.trim())throw Error('Model returned no usable text');
  let parsed;try{parsed=JSON.parse(content)}catch{const fenced=content.match(/^\s*```(?:json)?\s*([\s\S]+?)```\s*$/);if(!fenced)throw Error('Model response is not valid JSON');parsed=JSON.parse(fenced[1]);}
  if(data.model && data.model!==model)throw Error(`Meta returned unexpected model identifier ${data.model} (requested ${model})`);
  return {data:parsed,usage:data.usage||null,model:data.model||model,requestedModel:model,finishReason:data.choices?.[0]?.finish_reason||null,requestId:data.id||null};
 }
 async image({prompt,n=1,size='1024x1024'}={}){
  const out=await this.request('/images/generations',{payload:{model:'muse-image-1.0',prompt,n,size,response_format:'b64_json'}});
  if(!Array.isArray(out.data)||!out.data[0]?.b64_json)throw Error('Meta Image did not return binary image data');
  return out.data.map(x=>({bytes:Buffer.from(x.b64_json,'base64'),format:out.output_format||'webp',source:'muse-image-1.0'}));
 }
 async inspectImage({imagePath,prompt='Evaluate readability, artifact quality, cultural nuance and accessibility of this original media cover.'}={}){
  const ext=imagePath?.split('.').pop()?.toLowerCase(),mime=ext==='png'?'image/png':ext==='jpg'||ext==='jpeg'?'image/jpeg':ext==='webp'?'image/webp':null;
  if(!mime)throw Error('Image QA requires PNG, JPEG, or WebP file');
  const bytes=readFileSync(imagePath);if(!bytes.length||bytes.length>10*1024*1024)throw Error('Invalid QA image size');
  const content=[{type:'text',text:prompt+'\nReturn JSON {findings:[{severity,issue,remedy}],audienceFit:string,readability:string,readyForHumanReview:boolean}. Never certify rights or editorial validation.'},{type:'image_url',image_url:{url:`data:${mime};base64,${bytes.toString('base64')}`}}];
  const response=await this.request('/chat/completions',{payload:{model:'muse-spark-1.3',messages:[{role:'developer',content:'Advisory visual QA for an original adult interpreter media library. Be specific and critical. JSON only.'},{role:'user',content}],max_completion_tokens:2000}});
  const value=response?.choices?.[0]?.message?.content;if(!value)throw Error('No visual critique returned');
  const out=JSON.parse(value);if(!Array.isArray(out.findings))throw Error('Missing structured visual findings');return {...out,review:'advisory-model-only'};
 }
 async transcribe({wavPath,languageBias=['English','Spanish'],keywords=[],mode='DIARIZATION'}={}){
  const bytes=readFileSync(wavPath);validateVoiceWav(bytes);
  if(!['PUSH_TO_TALK','ENDPOINTING','DIARIZATION'].includes(mode))throw Error('Unsupported Meta transcription mode');
  const names={en:'English',es:'Spanish',zh:'Mandarin Chinese'};
  languageBias=Array.isArray(languageBias)?languageBias.map(x=>names[x]||x):languageBias;
  if(!Array.isArray(languageBias)||languageBias.some(x=>!['English','Spanish','Mandarin Chinese'].includes(x)))throw Error('Unsupported Meta language bias');
  const form=new FormData();form.append('request',new Blob([JSON.stringify({model:'muse-voice-transcribe-1.0',mode,audioEncoding:'WAV',languageBias,keywords:keywords.slice(0,100)})],{type:'application/json'}));
  form.append('audio',new Blob([bytes],{type:'audio/wav'}),'sample.wav');
  const result=await this.request('/asr/transcribe',{body:form,headers:{Accept:'application/json'}});
  if(typeof result.transcript!=='string')throw Error('Missing transcript');return result;
 }
}
export const metaModels=Object.freeze({director:'muse-wonder-1.0',bulk:'muse-spark-1.3',image:'muse-image-1.0',transcribe:'muse-voice-transcribe-1.0',speechSynthesis:'NOT_SUPPORTED'});
