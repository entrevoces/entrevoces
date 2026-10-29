#!/usr/bin/env node
// Verify the actual multilingual library artifact, not the overlay preview.
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {detectAudio} from '../media-engine/ingest.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const expect=(ok,message)=>{if(!ok)throw Error(message)};
const source=read('entre_voces_knowledge_base.json'),catalog=read('dist/living-library/collection.json'),original=read('content/living-library/collection.json'),drafts=read('content/media-production/catalog.json');
expect(source.terms.length===865,'Original terminology corpus changed');
expect(createHash('sha256').update(readFileSync('entre_voces_knowledge_base.json')).digest('hex')==='802c5c93015293b7759779a6bfc364e89923c70f77c156e4988c422a33f55487','Canonical source bytes changed');
expect(catalog.items.length===original.items.length+drafts.items.length,'Published catalog is incomplete');
expect(new Set(catalog.items.map(x=>x.id)).size===catalog.items.length,'Duplicate published item IDs');
for(const item of drafts.items){const publicItem=catalog.items.find(x=>x.id===item.id);expect(publicItem&&publicItem.productionKind===item.kind,`${item.id}: draft missing`);expect(!publicItem.audio&&!publicItem.externalAudio,`${item.id}: draft is incorrectly labeled as audio`);for(const privateKey of ['rights','generation','productionPlan','sourceClaims'])expect(!(privateKey in publicItem),`${item.id}: private authoring data leaked`)}
let audio=0;for(const item of original.items.filter(x=>x.audio)){const path=join('dist/living-library',item.audio);expect(existsSync(path)&&detectAudio(readFileSync(path),'.mp3'),`Invalid audio: ${item.id}`);audio++}
expect(audio===5,'Original demo audio missing');expect(catalog.items.some(x=>x.externalAudio?.url==='https://suno.com/s/hhYzXEDsEJr7lFWW'),'Suno song missing');
console.log(JSON.stringify({status:'pass',terms:source.terms.length,legacy:original.items.length,drafts:drafts.items.length,audio}));
