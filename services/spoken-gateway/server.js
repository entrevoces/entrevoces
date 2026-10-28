import {createServer} from 'node:http';
import {readFileSync,statSync,realpathSync} from 'node:fs';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createMetaClient,MetaGatewayError} from './meta-client.js';
import {taskFromKnowledge,validatePcmWav,parseAssessment,indeterminate} from './assessment.js';

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.wav':'audio/wav','.woff2':'font/woff2'};
const ROOT=resolve(fileURLToPath(new URL('../../dist/',import.meta.url)));
const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin'};
function json(res,status,data){res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function fail(res,e){const status=e instanceof MetaGatewayError?e.status:500;json(res,status,{error:status===500?'The spoken practice service encountered an error.':e.message});}
function urlTask(knowledge,url){const parts=(url.searchParams.get('taskId')||'').split(':');return parts.length===4?taskFromKnowledge(knowledge,{domain:parts[0],lang:parts[1],conceptId:parts[2],direction:parts[3]}):null;}
async function readBounded(req,limit){const parts=[];let size=0;for await(const b of req){size+=b.length;if(size>limit){req.destroy();throw new MetaGatewayError('Recording exceeds the 30-second limit.',413);}parts.push(b);}return Buffer.concat(parts);}
function serveStatic(res,pathname,root){
  let relative;
  try{relative=decodeURIComponent(pathname).replace(/^\/+/, '')||'index.html';}catch{return json(res,400,{error:'Invalid path.'});}
  if(relative.split('/').some(x=>x==='..'||x.startsWith('.'))||relative.includes('\\')||relative.includes('\0'))return json(res,403,{error:'Forbidden path.'});
  const path=resolve(root,relative);
  if(!path.startsWith(root+sep)&&path!==join(root,'index.html'))return json(res,403,{error:'Forbidden path.'});
  const mime=MIME[extname(path)];if(!mime)return json(res,404,{error:'Not found.'});
  try{const real=realpathSync(path);if((!real.startsWith(root+sep)&&real!==join(root,'index.html'))||!statSync(real).isFile())throw new Error('unsafe file');const body=readFileSync(real);res.writeHead(200,{...headers,'Content-Type':mime,'Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(body);}
  catch{json(res,404,{error:'Not found. Run npm run build first.'});}
}

/** Create an injectable, local-first server. No learner audio or transcripts are written to disk. */
export function createSpokenServer({root=ROOT,knowledge=null,metaClient=null,apiKey=process.env.MODEL_API_KEY,fetchImpl,now=()=>Date.now()}={}){
  const corpus=knowledge??JSON.parse(readFileSync(join(root,'curriculum.json'),'utf8')).knowledge;
  const client=metaClient??(apiKey?createMetaClient({apiKey,fetchImpl}):null);
  const rate=new Map();let inFlight=0;
  return createServer(async(req,res)=>{
    const requestUrl=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
    const path=requestUrl.pathname;
    if(!path.startsWith('/api/spoken/')){if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed.'});return serveStatic(res,path,root);}
    if(req.headers.origin){
      let origin;try{origin=new URL(req.headers.origin);}catch{return json(res,403,{error:'Invalid request origin.'});}
      if(origin.host!==req.headers.host||!['http:','https:'].includes(origin.protocol))return json(res,403,{error:'Cross-origin requests are not allowed.'});
    }
    if(path==='/api/spoken/health'&&req.method==='GET')return json(res,200,{enabled:!!client,speechModel:'muse-voice-transcribe-1.0',assessmentModel:'muse-spark-1.3',maxSeconds:30,liveStreaming:false});
    if(path==='/api/spoken/task'&&req.method==='GET'){
      const task=taskFromKnowledge(corpus,{domain:requestUrl.searchParams.get('domain'),lang:requestUrl.searchParams.get('lang'),conceptId:requestUrl.searchParams.get('conceptId'),direction:requestUrl.searchParams.get('direction')||'forward'});
      if(!task)return json(res,404,{error:'No reviewed speaking scenario for that concept.'});
      const {referenceText,...publicTask}=task;return json(res,200,publicTask);
    }
    if(path!=='/api/spoken/assess'||req.method!=='POST')return json(res,405,{error:'Unsupported spoken endpoint.'});
    if(!client)return json(res,503,{error:'Set MODEL_API_KEY on the server to enable spoken practice.'});
    const task=urlTask(corpus,requestUrl);if(!task)return json(res,400,{error:'Unknown approved speaking task.'});
    if(req.headers['content-type']!=='audio/wav')return json(res,415,{error:'Send uncompressed 16-bit mono WAV.'});
    if(Number(req.headers['content-length'])>1_500_000)return json(res,413,{error:'Recording too large.'});
    const address=req.socket.remoteAddress||'local';const recent=(rate.get(address)||[]).filter(t=>now()-t<60_000);
    if(recent.length>=12)return json(res,429,{error:'Too many recordings. Wait a minute and retry.'});
    if(inFlight>=3)return json(res,429,{error:'Three voice assessments are already running. Try again in a moment.'});
    recent.push(now());rate.set(address,recent);
    inFlight++;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30_000);
    try{
      const audio=await readBounded(req,1_500_000);
      if(!validatePcmWav(audio))return json(res,422,{error:'Invalid audio. Use up to 30 seconds of mono 16/24 kHz PCM WAV.'});
      const {transcript}=await client.transcribe(audio,{signal:controller.signal});
      if(!transcript)return json(res,200,{taskId:task.taskId,transcript:'',assessment:indeterminate('No clear speech was detected. Please try again.'),stage:7,usableEvidence:false});
      const raw=await client.assess({sourceText:task.sourceText,referenceText:task.referenceText,transcript,language:task.targetLanguage,domain:task.domain},{signal:controller.signal});
      const assessment=parseAssessment(raw,{sourceText:task.sourceText,transcript});
      return json(res,200,{taskId:task.taskId,transcript,assessment,stage:7,usableEvidence:assessment.verdict!=='indeterminate'&&assessment.confidence>=.8,sourceIds:task.sourceIds});
    }catch(e){fail(res,e);}finally{clearTimeout(timeout);inFlight--;}
  });
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const host=process.env.SPOKEN_HOST||'127.0.0.1';
  if(!['127.0.0.1','localhost','::1'].includes(host))throw new Error('Public binding is disabled in this development gateway. Use authenticated HTTPS reverse proxy for deployment.');
  const port=Number(process.env.SPOKEN_PORT||8014);
  createSpokenServer().listen(port,host,()=>console.log(`Entre Voces voice server: http://${host}:${port} (Meta API ${process.env.MODEL_API_KEY?'configured':'not configured'})`));
}
