import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {derivePerformanceLines,recordingPacket,packetToCSV} from '../media-engine/voice-production.mjs';
import {compareAudioText} from '../media-engine/quality.mjs';
const items=JSON.parse(readFileSync('content/media-production/catalog.json','utf8')).items;
test('recording packets cover every substantial authored script and explicitly disclaim recordings',()=>{
 assert.ok(items.length>=17);
 for(const item of items){
  const p=recordingPacket(item);
  assert.equal(p.mediaId,item.id);assert.ok(p.lines.length>=3,item.id);
  assert.equal(p.cannotClaim.includes('does not include recorded audio'),true);
  assert.ok(p.wordCount>=100,item.id);assert.ok(p.approximateDurationSec>0);
  assert.ok(packetToCSV(p).includes('estimatedMs'));
  assert.deepEqual(p.review,{bilingual:false,domain:false,editorial:false});
 }
});
test('bilingual voice exercise cue sheet keeps original/error/repair in separate labelled turns',()=>{
 const exercise=items.find(x=>x.id==='voice-no-promesa');
 const p=recordingPacket(exercise);
 assert.ok(p.cues.length>=1);
 for(const cue of p.cues){
  assert.equal(p.lines[cue.sourceTurnIndex].language,'en');
  assert.equal(p.lines[cue.wrongTurnIndex].language,'es');
  assert.equal(p.lines[cue.repairTurnIndex].language,'es');
  assert.ok(p.lines[cue.wrongTurnIndex].text.toLowerCase().includes(cue.wrong.toLowerCase()));
  assert.equal(cue.alignmentState,'not-aligned');
 }
});
test('voice recording packet has realistic restrictions on pace and missing speech',()=>{
 const item=items[0];assert.throws(()=>derivePerformanceLines(item,{wpm:500}),/Speech pace/);
 assert.throws(()=>derivePerformanceLines({script:''}),/No authored script/);
 assert.ok(recordingPacket(item,{wpm:110}).approximateDurationSec>recordingPacket(item,{wpm:200}).approximateDurationSec);
});
test('recording packet CSV escapes quoted dialogue to remain parseable',()=>{
 const p=recordingPacket({id:'sample',kind:'story',status:'script-draft',title:'Sample',script:'NORA: She said "not yet", not tomorrow.\nELENA: I heard that, too.\nNORA: Repeat it accurately.'});
 const csv=packetToCSV(p);assert.match(csv,/""not yet""/);
});
test('advisory ASR comparison catches spoken-word number changes as well as digits',()=>{
 const en=compareAudioText('Return in five days.','Return in fifteen days.');
 const es=compareAudioText('Tome una tableta cada dos días.','Tome una tableta cada diez días.');
 assert.ok(en.reviewFlags.includes('numbers-differ'));
 assert.ok(es.reviewFlags.includes('numbers-differ'));
 assert.equal(en.autoApproval,false);
});
test('advisory ASR comparison does not call faithful spoken numbers an error',()=>{
 const a=compareAudioText('Take two tablets today','Take 2 tablets today');
 assert.ok(!a.reviewFlags.includes('numbers-differ'));
});
