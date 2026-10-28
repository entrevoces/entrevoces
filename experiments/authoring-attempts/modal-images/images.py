"""Build-time image generation. No GPU image service is published to players.
Run: modal run services/modal-authoring/images.py
"""
from pathlib import Path
import modal
app=modal.App('entre-voces-image-authoring')
image=(modal.Image.debian_slim(python_version='3.11')
       .pip_install('torch==2.7.1','diffusers==0.37.0','transformers==4.57.3',
                    'accelerate==1.12.0','safetensors==0.7.0','Pillow==11.3.0','sentencepiece==0.2.1'))
cache=modal.Volume.from_name('entre-voces-image-weights',create_if_missing=True)

@app.cls(image=image,gpu='L40S',cpu=2,memory=32768,timeout=900,
         min_containers=0,max_containers=1,scaledown_window=2,
         volumes={'/root/.cache/huggingface':cache})
class Artist:
 @modal.enter()
 def load(self):
  import torch
  from diffusers import ZImagePipeline
  self.pipe=ZImagePipeline.from_pretrained('Tongyi-MAI/Z-Image-Turbo',torch_dtype=torch.bfloat16).to('cuda')
  cache.commit()
 @modal.method()
 def render(self,tasks):
  import torch,io,time
  results=[]
  for i,t in enumerate(tasks):
   at=time.monotonic()
   img=self.pipe(prompt=t['prompt'],height=768,width=768,num_inference_steps=9,
                 guidance_scale=0.0,generator=torch.Generator('cuda').manual_seed(77121+i)).images[0]
   data=io.BytesIO();img.save(data,format='PNG')
   results.append({'id':t['id'],'data':data.getvalue(),'seconds':round(time.monotonic()-at,2),'seed':77121+i})
  return results

@app.local_entrypoint()
def main():
 import json,hashlib,io
 from collections import deque
 from PIL import Image
 root=Path(__file__).resolve().parents[2]
 tasks=json.loads((root/'assets/meta/asset-requests.json').read_text())['tasks']
 outputs=Artist().render.remote(tasks)
 for t,r in zip(tasks,outputs):
  out=root/'assets/modal';out.mkdir(exist_ok=True)
  original=out/(r['id']+'-original.png');original.write_bytes(r['data'])
  # Deterministic connected-background cutout, preserving interior white marks.
  im=Image.open(io.BytesIO(r['data'])).convert('RGBA');p=im.load();w,h=im.size
  q=deque([(x,0)for x in range(w)]+[(x,h-1)for x in range(w)]+[(0,y)for y in range(h)]+[(w-1,y)for y in range(h)])
  seen=set()
  while q:
   x,y=q.popleft()
   if (x,y)in seen or not(0<=x<w and 0<=y<h):continue
   seen.add((x,y));red,green,blue,alpha=p[x,y]
   if min(red,green,blue)<215 or max(red,green,blue)-min(red,green,blue)>28:continue
   p[x,y]=(red,green,blue,0)
   q.extend([(x+1,y),(x-1,y),(x,y+1),(x,y-1)])
  final=out/(r['id']+'.webp');im.save(final,format='WEBP',quality=92)
  receipt={'provider':'Modal-hosted open-weight inference','model':'Tongyi-MAI/Z-Image-Turbo','license':'Apache-2.0',
           'requestedMetaApi':'Muse Image unavailable: API account billing exhausted','prompt':t['prompt'],
           'seed':r['seed'],'seconds':r['seconds'],'sha256':hashlib.sha256(final.read_bytes()).hexdigest(),
           'original':str(original.relative_to(root)),'asset':str(final.relative_to(root)),
           'postprocess':'Connected neutral-white background alpha cutout; original retained','review':'pending-visual-inspection'}
  final.with_suffix('.provenance.json').write_text(json.dumps(receipt,indent=2))
  print(json.dumps({'id':r['id'],'path':str(final),'bytes':final.stat().st_size}),flush=True)
