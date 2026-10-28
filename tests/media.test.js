// Transport doubles and deterministic DSP checks, not live asset quality claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSoundPlan,renderSoundAsset,artifactBytes} from '../generator/media.js';
const image={path:'assets/test-world.png',purpose:'An original atmospheric world layer for a test build.',size:'1536x1024',prompt:'TEST FIXTURE ONLY. Original geometric scenery with readable focal hierarchy and generous negative space for independently rendered interactive entities. No letters or borrowed characters.'};
const cue={path:'assets/test-action.wav',purpose:'Deterministic test-only action cue.',duration:.3,seed:42,events:[{time:0,duration:.25,wave:'noise',frequency:300,endFrequency:500,gain:.2,pan:-.2}]};
test('game builder-authored sound data renders reproducible, bounded stereo WAV bytes',()=>{
 const a=renderSoundAsset(cue),b=renderSoundAsset(cue),bytes=artifactBytes(a);assert.equal(a.content,b.content);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');assert.equal(bytes.readUInt16LE(22),2);assert.equal(bytes.readUInt32LE(24),22050);assert.equal(bytes.readUInt32LE(40),bytes.length-44);let peak=0;for(let i=44;i<bytes.length;i+=2)peak=Math.max(peak,Math.abs(bytes.readInt16LE(i)));assert.ok(peak>1000&&peak<32767);assert.notEqual(a.content,renderSoundAsset({...cue,seed:43}).content);assert.throws(()=>renderSoundAsset({...cue,events:[{...cue.events[0],gain:0}]}),/silence/);
});
test('binary media survive standalone ZIP export without base64 corruption',async()=>{
 const {zipArtifacts}=await import('../generator/archive.js');const {mkdtempSync,writeFileSync}=await import('node:fs');const {execFileSync}=await import('node:child_process');const folder=mkdtempSync('/tmp/ev-media-');const file=renderSoundAsset(cue);writeFileSync(`${folder}/media.zip`,zipArtifacts([file]));assert.deepEqual(execFileSync('unzip',['-p',`${folder}/media.zip`,file.name]),artifactBytes(file));
});
