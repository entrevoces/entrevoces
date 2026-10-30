#!/usr/bin/env node
// Verify the exact public artifact against the approved authoring catalog.
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {publicCatalog} from '../media-engine/publication.mjs';
import {loadKnowledge} from '../media-engine/knowledge.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const expect=(ok,message)=>{if(!ok)throw Error(message)};
const source=read('entre_voces_knowledge_base.json'),catalog=read('dist/living-library/collection.json'),authoring=read('content/media-production/catalog.json');
expect(source.terms.length===865,'Original terminology corpus changed');
expect(createHash('sha256').update(readFileSync('entre_voces_knowledge_base.json')).digest('hex')==='802c5c93015293b7759779a6bfc364e89923c70f77c156e4988c422a33f55487','Canonical source bytes changed');
const expected=publicCatalog(authoring,{knowledge:loadKnowledge(),assetRoot:'apps/biblioteca-viva'});
expect(JSON.stringify(catalog.items)===JSON.stringify(expected.items),'Public catalog differs from approved release items');
expect(new Set(catalog.items.map(x=>x.id)).size===catalog.items.length,'Duplicate published item IDs');
const approvedFiles=new Set();
for(const item of catalog.items){
 for(const privateKey of ['script','body','lyrics','prompts','rights','review','generation','productionPlan','sourceClaims','transcript'])expect(!(privateKey in item),`${item.id}: authoring data leaked`);
 for(const file of [item.audio,item.video,item.captions].filter(Boolean)){expect(existsSync(join('dist',file)),`${item.id}: approved media missing`);approvedFiles.add(file)}
}
const mediaDir='dist/media';if(existsSync(mediaDir))for(const file of readdirSync(mediaDir))expect(approvedFiles.has(`media/${file}`),`Unapproved file in public bundle: ${file}`);
expect(!existsSync('dist/cada-dos-dias-script.html'),'Authoring script leaked');
expect(!existsSync('dist/living-library/audio'),'Unapproved legacy audio leaked');
console.log(JSON.stringify({status:'pass',terms:source.terms.length,approved:catalog.items.length,assets:approvedFiles.size}));
