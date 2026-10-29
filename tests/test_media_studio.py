import importlib.util, json, subprocess, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
from argparse import Namespace

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('media_studio',ROOT/'tools/media-studio/studio.py')
studio=importlib.util.module_from_spec(spec);spec.loader.exec_module(studio)

class VideoStudioTests(unittest.TestCase):
 def plan(self):return {'title':'Example','shots':[{'id':'one','durationSeconds':1,'visualPrompt':'A simple blue circle','narration':'A sample.'}]}
 def test_validation_rejects_bad_shots_and_duplicate_ids(self):
  self.assertEqual(studio.validate(self.plan()),1)
  for value in ['', '../bad','UPPER']:
   plan=self.plan();plan['shots'][0]['id']=value
   with self.assertRaises(studio.StudioError):studio.validate(plan)
  plan=self.plan();plan['shots'].append(dict(plan['shots'][0]))
  with self.assertRaises(studio.StudioError):studio.validate(plan)
 def test_muse_responses_are_saved_resumed_and_not_silently_overwritten(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);plan=root/'plan.json';plan.write_text(json.dumps(self.plan()));out=root/'frames'
   result={'status':'completed','id':'response-1','output':[{'type':'image_generation_call','result':'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2ioAAAAASUVORK5CYII='}]}
   args=Namespace(storyboard=str(plan),output=str(out),continuity=True,resume=False,max_images=1)
   with patch.object(studio,'post',return_value=result) as call:studio.images(args);self.assertEqual(call.call_count,1)
   args.resume=True
   with patch.object(studio,'post') as call:studio.images(args);call.assert_not_called()
   (out/'one.png').write_bytes(b'changed')
   with self.assertRaises(studio.StudioError):studio.images(args)
 def test_baseten_storyboard_uses_open_weight_model_and_rejects_invented_narration(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);script=root/'script.txt';script.write_text('A sample. This is a sufficiently long script for the storyboard test.')
   args=Namespace(script=str(script),provider='baseten',model=None,seconds=1,output=str(root/'plan.json'))
   result={'id':'real-shape-test','choices':[{'finish_reason':'stop','message':{'content':json.dumps(self.plan())}}]}
   with patch.object(studio,'post',return_value=result) as call:
    studio.storyboard(args)
    self.assertEqual(call.call_args.args[0],studio.BASETEN+'/chat/completions')
    self.assertEqual(call.call_args.args[2]['model'],'meta-models/muse-spark-open')
   saved=json.loads((root/'plan.json').read_text());self.assertEqual(saved['provenance']['provider'],'baseten')
   result['choices'][0]['message']['content']=json.dumps({**self.plan(),'shots':[{'id':'one','durationSeconds':1,'visualPrompt':'blue','narration':'Made up.'}]})
   args.output=str(root/'invalid.json')
   with patch.object(studio,'post',return_value=result),self.assertRaises(studio.StudioError):studio.storyboard(args)
 def test_render_creates_a_real_video_from_image_and_audio(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);frames=root/'frames';frames.mkdir();plan=root/'plan.json';plan.write_text(json.dumps(self.plan()))
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=blue:s=320x180','-frames:v','1','-threads','1',str(frames/'one.png')],check=True)
   args=Namespace(storyboard=str(plan),images=str(frames),audio=str(ROOT/'apps/living-library/audio/aud01.mp3'),allow_silent=False,output=str(root/'demo.mp4'))
   studio.render(args);self.assertGreater((root/'demo.mp4').stat().st_size,1000)
   probe=subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_type','-of','csv=p=0',str(root/'demo.mp4')],text=True)
   self.assertIn('video',probe);self.assertIn('audio',probe)
   self.assertFalse(json.loads((root/'demo.provenance.json').read_text())['containsMotionClips'])
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc=size=320x180:rate=24','-t','1','-pix_fmt','yuv420p','-threads','1',str(frames/'one.mp4')],check=True)
   args.output=str(root/'motion.mp4');studio.render(args)
   self.assertTrue(json.loads((root/'motion.provenance.json').read_text())['containsMotionClips'])
