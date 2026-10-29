import test from 'node:test';import assert from 'node:assert/strict';
import {schemaForMediaStage,MEDIA_STAGE_SCHEMAS} from '../media-engine/stage-schema.mjs';
import {stagePrompts} from '../media-engine/studio.mjs';
import {makeBrief} from '../media-engine/blueprints.mjs';
import {loadKnowledge} from '../media-engine/knowledge.mjs';
const kb=loadKnowledge();
test('every fixed Meta stage sends a strict finite structured-output schema',()=>{
 for(const [name,s] of Object.entries(MEDIA_STAGE_SCHEMAS)){
  assert.equal(s.type,'object',name);assert.equal(s.additionalProperties,false,name);
  assert.deepEqual([...s.required].sort(),Object.keys(s.properties).sort(),name);
 }
});
test('voice-first generation requires exact paired bilingual and timed anchoring fields',()=>{
 const s=schemaForMediaStage('script','catch-the-change');assert.ok(s.properties.turns);assert.ok(s.properties.errors);
 for(const name of ['audibleSource','audibleWrong','audibleRepair','sourceTurnIndex','wrongTurnIndex','repairTurnIndex'])assert.ok(s.properties.errors.items.required.includes(name),name);
});
test('dynamic branch-node graph retains JSON mode with strict post-response graph validation',()=>{
 assert.equal(schemaForMediaStage('script','audio-mystery'),null);
});
test('stage prompts include actual provider schema where possible',()=>{
 const b=makeBrief(kb,{kind:'catch-the-change',topic:'uncertainty',domain:'legal'});
 const p=stagePrompts(b,{id:'script',model:'muse-spark-1.3',output:'Complete script'},{});
 assert.ok(p.schema.properties.turns);assert.ok(p.schema.properties.errors);
});
