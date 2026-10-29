import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {publicLegacyCatalog} from '../media-engine/legacy-audit.mjs';
const legacy=JSON.parse(readFileSync('fixtures/legacy-library-v1.json','utf8'));
test('legacy episodes cannot advertise 8–10 minutes when only a short written scene exists',()=>{
 const {catalog,issues}=publicLegacyCatalog(legacy);
 const dramas=catalog.items.filter(x=>x.kind==='telenovela');
 assert.ok(dramas.length>=3);assert.ok(issues.length>=3);
 for(const x of dramas){assert.ok(x.duration.includes('short scene'));assert.ok(!x.audio);}
 assert.equal(legacy.items.find(x=>x.id===dramas[0].id).duration,'8–10 min');
});
test('legacy projection does not remove existing Suno song links or synthetic audio',()=>{
 const {catalog}=publicLegacyCatalog(legacy);
 assert.equal(catalog.items.filter(x=>x.audio).length,5);
 assert.equal(catalog.items.filter(x=>x.externalAudio).length,1);
});
