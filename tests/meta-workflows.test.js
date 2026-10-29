import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const qa=read('.github/workflows/meta-live-qa.yml');
const drafts=read('.github/workflows/meta-produce-draft.yml');
const ci=read('.github/workflows/media-first-ci.yml');
test('paid Meta jobs are explicit opt-in, no paid PR triggers, and require protected credentials',()=>{
 for(const workflow of [qa,drafts]){
  assert.match(workflow,/workflow_dispatch:/);
  assert.match(workflow,/environment: meta-production/);
  assert.match(workflow,/secrets.MODEL_API_KEY/);
  assert.doesNotMatch(workflow,/^  pull_request:/m);
  assert.doesNotMatch(workflow,/^  push:/m);
  assert.match(workflow,/timeout-minutes:/);
  assert.match(workflow,/contents: read/);
 }
});
test('GitHub paid QA actually calls real provider and retains observed artifact',()=>{
 assert.match(qa,/node tools\/meta-live-verify\.mjs/);
 assert.match(qa,/meta-actual-output/);
 assert.match(qa,/if-no-files-found: warn/);
 assert.match(drafts,/node tools\/media-studio\.mjs author .*--live/);
 assert.match(drafts,/meta-content-draft/);
 assert.match(drafts,/--budget/);
});
test('offline checks are cheap and never expose paid credentials',()=>{
 assert.match(ci,/pull_request:/);assert.match(ci,/npm test/);assert.match(ci,/npm run build/);
 assert.doesNotMatch(ci,/secrets.MODEL_API_KEY|MODEL_API_KEY:/);
});
test('production publication and state-gates remain separate from model test results',()=>{
 const p=read('media-engine/publication.mjs');
 assert.match(p,/review|rights/i);
 const studio=read('media-engine/studio.mjs');
 assert.match(studio,/stageOutputs/);assert.match(studio,/semantic-critique/);
});
