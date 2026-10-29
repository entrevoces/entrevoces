#!/usr/bin/env python3
"""Authoring-only storyboard, Muse Image and video assembly pipeline.

All network operations are explicit commands. Credentials are environment-only;
no generated work is promoted to the learner site by this tool.
"""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.request

META='https://api.meta.ai/v1'
BASETEN='https://inference.baseten.co/v1'
ID=re.compile(r'^[a-z0-9][a-z0-9-]{0,39}$')

class StudioError(Exception): pass

def post(url, key, payload):
    if not key: raise StudioError('Required provider API key is not set in the environment.')
    data=json.dumps(payload,ensure_ascii=False).encode()
    request=urllib.request.Request(url,data=data,headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=300) as response:
            if int(response.headers.get('content-length','0') or 0)>25_000_000: raise StudioError('Provider response exceeds size limit.')
            raw=response.read(25_000_001)
            if len(raw)>25_000_000: raise StudioError('Provider response exceeds size limit.')
            return json.loads(raw)
    except urllib.error.HTTPError as error:
        raise StudioError(f'Provider returned HTTP {error.code}; check access, credits and model availability.') from None
    except (urllib.error.URLError,TimeoutError,json.JSONDecodeError) as error:
        raise StudioError(f'Provider request failed: {type(error).__name__}.') from None

def validate(plan):
    if not isinstance(plan,dict) or not isinstance(plan.get('shots'),list) or not 1<=len(plan['shots'])<=60: raise StudioError('Storyboard requires 1–60 shots.')
    if not isinstance(plan.get('title'),str) or not plan['title'].strip():raise StudioError('Storyboard requires a title.')
    ids=set(); total=0
    for shot in plan['shots']:
        if not isinstance(shot,dict):raise StudioError('Each shot must be an object.')
        sid=shot.get('id');duration=shot.get('durationSeconds')
        if not isinstance(sid,str) or not ID.fullmatch(sid) or sid in ids:raise StudioError('Shot IDs must be unique lowercase slugs.')
        if type(duration) not in (int,float) or not 1<=duration<=60:raise StudioError(f'{sid}: duration must be between 1 and 60 seconds.')
        if any(not isinstance(shot.get(k),str) or not shot[k].strip() for k in ('visualPrompt','narration')):raise StudioError(f'{sid}: visualPrompt and narration are required.')
        ids.add(sid);total+=duration
    if total>600:raise StudioError('Storyboard is limited to ten minutes.')
    return total

def write_json(path, data):
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix(path.suffix+'.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');tmp.replace(path)

def storyboard(args):
    script=Path(args.script).read_text(encoding='utf8')
    if not 30<=len(script)<=40000:raise StudioError('Script must contain 30–40,000 characters.')
    base,key,model=(META,os.getenv('MODEL_API_KEY'),args.model or 'muse-wonder-1.0') if args.provider=='meta' else (BASETEN,os.getenv('BASETEN_API_KEY'),args.model or 'meta-models/muse-spark-open')
    if not model:raise StudioError('Specify --model for the selected Baseten model.')
    instruction=('Create an original video storyboard from the supplied script. Return only a JSON object with title and shots. '
      'Each shot has a unique lowercase hyphenated id, durationSeconds between 1 and 60, a detailed visualPrompt for one still image, and exact narration text drawn from the script. '
      'Keep consistent characters, visual style and location; no legible generated text or medical instructions in imagery. '
      'Preserve important meaning, quantities, negation and uncertainty. Do not add clinical facts. Duration target: '+str(args.seconds)+' seconds. '
      'Use fictional people, no private information. The returned plan is a draft requiring editorial and bilingual review.')
    result=post(base+'/chat/completions',key,{'model':model,'messages':[{'role':'system','content':instruction},{'role':'user','content':script}],'temperature':0.4,'max_tokens':6000})
    try:
        if result['choices'][0].get('finish_reason') not in (None,'stop'):raise StudioError('Provider output was incomplete.')
        text=result['choices'][0]['message']['content']; plan=json.loads(text.strip().removeprefix('```json').removesuffix('```').strip())
    except (KeyError,IndexError,TypeError,json.JSONDecodeError):raise StudioError('Provider did not return a valid storyboard JSON object.') from None
    seconds=validate(plan)
    normalized=' '.join(script.split())
    if any(' '.join(shot['narration'].split()) not in normalized for shot in plan['shots']):raise StudioError('Storyboard narration must be verbatim from the supplied script; review and retry.')
    plan['provenance']={'provider':args.provider,'model':model,'scriptSha256':hashlib.sha256(script.encode()).hexdigest(),'requestId':result.get('id'),'review':'draft'}
    if abs(seconds-args.seconds)>max(15,args.seconds*.15):raise StudioError(f'Storyboard duration {seconds:g}s differs substantially from requested {args.seconds}s; revise before use.')
    path=Path(args.output)
    if path.exists():raise StudioError('Output already exists; choose a new path to preserve prior work.')
    write_json(path,plan); print(f'Saved draft storyboard: {path} ({seconds:g}s)')

def images(args):
    plan=json.loads(Path(args.storyboard).read_text());validate(plan)
    out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    key=os.getenv('MODEL_API_KEY');previous=None; calls=0
    for shot in plan['shots']:
        target=out/(shot['id']+'.png');receipt=out/(shot['id']+'.json')
        prompt_hash=hashlib.sha256(shot['visualPrompt'].encode()).hexdigest()
        if target.exists() or receipt.exists():
            if not args.resume or not target.is_file() or not receipt.is_file():raise StudioError(f'{shot["id"]}: output exists; use --resume only with intact receipts.')
            saved=json.loads(receipt.read_text())
            if saved.get('promptSha256')!=prompt_hash or saved.get('sha256')!=hashlib.sha256(target.read_bytes()).hexdigest():raise StudioError(f'{shot["id"]}: existing image or prompt changed; use a new directory.')
            previous=saved.get('requestId');continue
        if calls>=args.max_images:raise StudioError('Image request budget reached; resume with an explicit larger budget.')
        calls+=1
        payload={'model':'muse-image-1.0','input':shot['visualPrompt']+'\nCreate one 16:9 illustrated key frame. No text, lettering or logos.','store':bool(args.continuity)}
        if previous and args.continuity:payload['previous_response_id']=previous
        response=post(META+'/responses',key,payload)
        if response.get('status')!='completed':raise StudioError(f'{shot["id"]}: image request did not complete.')
        item=next((x for x in response.get('output',[]) if x.get('type')=='image_generation_call'),None)
        if not item:raise StudioError(f'{shot["id"]}: no image was returned.')
        try: data=base64.b64decode(item['result'],validate=True)
        except (ValueError,KeyError):raise StudioError(f'{shot["id"]}: invalid image payload.') from None
        # Preserve the actual format supplied by the model; ffmpeg detects by content.
        if len(data)>20_000_000 or not (data.startswith((b'\x89PNG\r\n\x1a\n',b'\xff\xd8\xff')) or (data.startswith(b'RIFF') and data[8:12]==b'WEBP')):raise StudioError(f'{shot["id"]}: invalid image type or size.')
        target.write_bytes(data);previous=response.get('id')
        write_json(receipt,{'provider':'Meta Model API','model':'muse-image-1.0','requestId':previous,'sha256':hashlib.sha256(data).hexdigest(),'shotId':shot['id'],'promptSha256':prompt_hash,'review':'unreviewed'})
        print(f'Saved {target}; review before publication.',flush=True)

def render(args):
    plan=json.loads(Path(args.storyboard).read_text());duration=validate(plan);out=Path(args.output).resolve();frames=Path(args.images).resolve()
    if out.exists() or out.with_suffix('.provenance.json').exists():raise StudioError('Output or receipt exists; choose a new file.')
    if not args.audio and not args.allow_silent:raise StudioError('Supply --audio or explicitly use --allow-silent.')
    contains_motion=any((frames/(shot['id']+'.mp4')).is_file() for shot in plan['shots'])
    with __import__('tempfile').TemporaryDirectory(prefix='ev-video-') as tmp:
        tmp=Path(tmp);segments=[]
        for index,shot in enumerate(plan['shots']):
            clip=frames/(shot['id']+'.mp4');still=frames/(shot['id']+'.png')
            source=clip if clip.is_file() else still
            if not source.is_file():raise StudioError(f'Missing clip or image for {shot["id"]}.')
            segment=tmp/f'{index:03}.mp4';sec=shot['durationSeconds']
            inputs=['-stream_loop','-1'] if source==clip else ['-loop','1','-framerate','24']
            cmd=['ffmpeg','-hide_banner','-loglevel','error','-y',*inputs,'-i',str(source),'-t',str(sec),'-vf','fps=24,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x172824,setsar=1,format=yuv420p','-c:v','libx264','-preset','veryfast','-crf','23','-an',str(segment)]
            subprocess.run(cmd,check=True);segments.append(segment)
        listing=tmp/'segments.txt';listing.write_text(''.join("file '"+str(p)+"'\n" for p in segments))
        video=tmp/'joined.mp4';subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(listing),'-c','copy',str(video)],check=True)
        cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(video)]
        if args.audio:cmd+=['-i',str(Path(args.audio).resolve()),'-map','0:v','-map','1:a','-c:a','aac','-af','apad','-t',str(duration)]
        cmd+=['-c:v','copy','-movflags','+faststart',str(out)];subprocess.run(cmd,check=True)
    write_json(out.with_suffix('.provenance.json'),{'type':'assembled-video','containsMotionClips':contains_motion,'durationSeconds':duration,'storyboard':str(Path(args.storyboard)),'audio':str(args.audio) if args.audio else None,'review':'draft','note':'Assembled from supplied stills and/or video clips; no motion-generation provider is called.'})
    print(f'Rendered draft video: {out} ({duration:g}s)')

def main():
    parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='command',required=True)
    p=sub.add_parser('storyboard');p.add_argument('--script',required=True);p.add_argument('--provider',choices=['meta','baseten'],required=True);p.add_argument('--model');p.add_argument('--seconds',type=int,default=180);p.add_argument('--output',required=True);p.set_defaults(fn=storyboard)
    p=sub.add_parser('images');p.add_argument('--storyboard',required=True);p.add_argument('--output',required=True);p.add_argument('--continuity',action='store_true',help='Use Meta server-managed conversation state across image turns.');p.add_argument('--resume',action='store_true');p.add_argument('--max-images',type=int,default=5);p.set_defaults(fn=images)
    p=sub.add_parser('render');p.add_argument('--storyboard',required=True);p.add_argument('--images',required=True);p.add_argument('--audio');p.add_argument('--allow-silent',action='store_true');p.add_argument('--output',required=True);p.set_defaults(fn=render)
    args=parser.parse_args()
    try:args.fn(args)
    except (StudioError,OSError,ValueError,subprocess.CalledProcessError) as error: print(f'Error: {error}',file=sys.stderr);return 1
    return 0
if __name__=='__main__':sys.exit(main())
