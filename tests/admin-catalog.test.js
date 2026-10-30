import test from 'node:test';import assert from 'node:assert/strict';
import {buildAdminCatalog,narrationSegments} from '../media-engine/admin-catalog.mjs';
test('admin catalog retains draft scripts without private authoring metadata',()=>{
 const production={items:[{id:'draft-1',title:'Draft',kind:'story',status:'script-draft',script:'[MUSIC]\nNARRATOR: A fictional line.',generation:{secret:'PRIVATE'},rights:{secret:'PRIVATE'}}]};
 const data=buildAdminCatalog(production,{items:[]});assert.equal(data.items.length,1);assert.equal(data.items[0].script,production.items[0].script);assert.deepEqual(data.items[0].segments,['A fictional line.']);assert.doesNotMatch(JSON.stringify(data),/PRIVATE/);
});
test('voice segments are bounded and edits change the revision',()=>{
 const base={id:'draft-1',title:'Draft',kind:'story',status:'script-draft',script:'word '.repeat(200)};
 const a=buildAdminCatalog({items:[base]},{items:[]}).items[0],b=buildAdminCatalog({items:[{...base,script:base.script+'changed'}]},{items:[]}).items[0];assert.ok(a.segments.every(x=>x.length<=240));assert.notEqual(a.revision,b.revision);assert.equal(narrationSegments('[MUSIC]\n').length,0);
});
