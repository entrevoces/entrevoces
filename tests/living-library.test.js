import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCollection} from '../generator/living-library.js';
const collection=JSON.parse(readFileSync('content/living-library/collection.json'));
test('the supplied collection has valid media paths and branching targets',()=>{
 assert.deepEqual(validateCollection(collection),[]);
 assert.equal(collection.items.length,24);
 assert.equal(collection.items.filter(x=>x.audio).length,5);
});
test('broken links, duplicate identifiers and traversal fail the build gate',()=>{
 const bad=structuredClone(collection);bad.items[1].id=bad.items[0].id;bad.items[0].audio='../../private.mp3';
 const story=bad.items.find(x=>x.kind==='branching');story.nodes.entry.choices[0].next='missing';
 const errors=validateCollection(bad);assert.ok(errors.some(x=>x.includes('duplicate')));assert.ok(errors.some(x=>x.includes('audio')));assert.ok(errors.some(x=>x.includes('invalid node')));
});

test('interface languages have the same translations', async()=>{
 const {translations}=await import('../apps/living-library/translations.js');
 const keys=Object.keys(translations.en).sort();
 for(const language of ['es','zh']){
  assert.deepEqual(Object.keys(translations[language]).sort(),keys);
  assert.ok(keys.every(key=>typeof translations[language][key]==='string'&&translations[language][key].trim()));
 }
});
