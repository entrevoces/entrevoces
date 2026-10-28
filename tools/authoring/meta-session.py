"""Build-time Meta authoring session. Credentials enter via hidden stdin only.
No credential is saved, logged, placed in URLs, or bundled into static play.
"""
import getpass,json,os,sys,time,base64,hashlib
from pathlib import Path
import httpx
key=os.environ.get('MODEL_API_KEY') or getpass.getpass('Meta API key (hidden): ')
os.environ['MODEL_API_KEY']=key
client=httpx.Client(base_url='https://api.meta.ai/v1',headers={'Authorization':'Bearer '+key},timeout=300)
r=client.get('/models')
print(json.dumps({'check':'meta-model-access','http':r.status_code,'models':[m.get('id') for m in r.json().get('data',[])] if r.is_success else []}),flush=True)
if not r.is_success:sys.exit(2)
print('READY_FOR_AUTHORING',flush=True)
for line in sys.stdin:
 try:
  task=json.loads(line)
  if task.get('action')=='stop':break
  if task['action']=='image':
   at=time.monotonic();r=client.post('/images/generations',json={'model':'muse-image-1.0','prompt':task['prompt'],'n':1,'size':'1024x1024','response_format':'b64_json','output_format':'png'})
   if not r.is_success: print(json.dumps({'id':task['id'],'http':r.status_code,'error':r.text[:500]}),flush=True);continue
   v=r.json();data=base64.b64decode(v['data'][0]['b64_json'],validate=True)
   out=Path(task['path']);out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(data)
   receipt={'provider':'Meta Model API','model':'muse-image-1.0','endpoint':'https://api.meta.ai/v1/images/generations','id':task['id'],'prompt':task['prompt'],'path':str(out),'sha256':hashlib.sha256(data).hexdigest(),'seconds':round(time.monotonic()-at,2),'requestId':r.headers.get('x-request-id'),'bytes':len(data)}
   out.with_suffix('.provenance.json').write_text(json.dumps(receipt,indent=2,ensure_ascii=False))
   print(json.dumps({'id':task['id'],'http':200,'path':str(out),'bytes':len(data)}),flush=True)
  elif task['action']=='text':
   at=time.monotonic();payload={'model':task.get('model','muse-spark-1.3'),'input':[{'role':'system','content':task['system']},{'role':'user','content':task['prompt']}],'store':False}
   r=client.post('/responses',json=payload)
   if not r.is_success:print(json.dumps({'id':task['id'],'http':r.status_code,'error':r.text[:500]}),flush=True);continue
   v=r.json();answer='\n'.join(c.get('text','') for o in v.get('output',[]) if o.get('type')=='message' for c in o.get('content',[]) if c.get('type')=='output_text') or v.get('output_text','')
   if not answer:raise ValueError('Meta response contained no authored text')
   out=Path(task['path']);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(answer)
   out.with_suffix(out.suffix+'.receipt.json').write_text(json.dumps({'provider':'Meta Model API','model':payload['model'],'requestId':v.get('id'),'seconds':round(time.monotonic()-at,2),'characters':len(answer),'prompt':task['prompt'],'system':task['system']},indent=2))
   print(json.dumps({'id':task['id'],'http':200,'path':str(out),'characters':len(answer)}),flush=True)
 except Exception as e: print(json.dumps({'error':type(e).__name__,'message':str(e)[:250]}),flush=True)
