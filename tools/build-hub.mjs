// Reproducible static hub assembly. No authoring endpoints or runtime AI.
import{mkdirSync,readFileSync,writeFileSync,cpSync,existsSync,rmSync}from'node:fs';import{join,resolve}from'node:path';import{createHash}from'node:crypto';
import{loadKnowledge}from'../media-engine/knowledge.mjs';import{buildAdminCatalog}from'../media-engine/admin-catalog.mjs';import{validateCatalog}from'../media-engine/validation.mjs';import{publicCatalog}from'../media-engine/publication.mjs';
import*as core from'../packages/engine-core/index.js';import{validateCollection}from'../generator/living-library.js';import{learningRuntimeSources}from'../generator/runtime.js';
const out=resolve('dist');rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});writeFileSync(join(out,'.nojekyll'),'');
const {curriculumSource}=await import('../generator/curriculum-source.js');
const {domains,concepts,books}=curriculumSource();
const curriculum=core.compileCurriculum({domains,concepts,books});
if(books.length){mkdirSync(join(out,'books/language-access'),{recursive:true});cpSync('knowledge/imports/language-access',join(out,'books/language-access'),{recursive:true});}
for(const file of ['style.css','hub.js'])cpSync(join('apps/learning-hub',file),join(out,file));
cpSync('apps/learning-hub/index.html',join(out,'practice.html'));
cpSync('apps/biblioteca-viva',out,{recursive:true,filter:src=>!/(?:^|\/)(media|cada-dos-dias-script\.html)$/.test(src)});
mkdirSync(join(out,'runtime/engine-core'),{recursive:true});for(const[f,s]of Object.entries(learningRuntimeSources()))writeFileSync(join(out,'runtime/engine-core',f),s);cpSync('packages/engine-client/engine-client.js',join(out,'runtime/engine-client.js'));
// Browser games share one maintained gameplay runtime instead of copying engines.
cpSync('packages/game-runtime',join(out,'runtime/game-runtime'),{recursive:true});
writeFileSync(join(out,'curriculum.json'),JSON.stringify(curriculum));writeFileSync(join(out,'domains.json'),JSON.stringify(domains));
// Public address only: GitHub Pages must NEVER contain a model credential.
// The app keeps working without this URL; only opt-in voice is unavailable.
const apiUrl=String(process.env.EV_SPOKEN_API_URL||'').trim();
if(apiUrl){const parsed=new URL(apiUrl);if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash)throw Error('EV_SPOKEN_API_URL must be a credential-free HTTPS origin/path.');}
writeFileSync(join(out,'spoken-config.json'),JSON.stringify({apiBaseUrl:apiUrl.replace(/\/+$/,'')}));
const gameManifest=existsSync('knowledge/game-suite/manifest.json')?JSON.parse(readFileSync('knowledge/game-suite/manifest.json')):{games:[]};
try{if(process.env.CI)throw Error('Local authoring state is private.');const {readStore}=await import('../generator/project.js');if(readStore().jobs.some(j=>/usage limit/i.test(j.error?.message||'')))gameManifest.authoringNote='The local authoring account is at its usage limit. Saved briefs and accepted checkpoints remain available for resume.';}catch{/* Static knowledge can still build without authoring state. */}
writeFileSync(join(out,'games.json'),JSON.stringify(gameManifest));
for(const g of gameManifest.games){if(g.path&&existsSync(g.path))cpSync(g.path,join(out,'games',g.id),{recursive:true});}
if(existsSync('apps/games/_shared'))cpSync('apps/games/_shared',join(out,'games/_shared'),{recursive:true});
cpSync('assets/game-vectors',join(out,'games/_shared/media'),{recursive:true});
// Only signed-off and explicitly published production items enter the public bundle.
const production=JSON.parse(readFileSync('content/media-production/catalog.json'));const kb=loadKnowledge();
const mediaCheck=validateCatalog(production,{knowledge:kb,assetRoot:'apps/biblioteca-viva'});if(!mediaCheck.ok)throw Error(`Production catalog invalid: ${mediaCheck.errors.join('; ')}`);
const legacy=JSON.parse(readFileSync('content/living-library/collection.json'));const legacyErrors=validateCollection(legacy);if(legacyErrors.length)throw Error(`Invalid admin archive: ${legacyErrors.join('; ')}`);const admin=buildAdminCatalog(production,legacy,[{id:'cada-dos-dias-video-script',title:'Cada dos días · One-minute video',kind:'film',language:'es',externalAudio:'https://suno.com/song/9fe7cfec-a73b-47d8-9321-91941484ea7b',script:readFileSync('content/media-production/cada-dos-dias-video.txt','utf8')}]);mkdirSync(join(out,'admin-data'),{recursive:true});writeFileSync(join(out,'admin-data/catalog.json'),JSON.stringify(admin));
for(const i of admin.items.filter(i=>i.preview)){const original=i.origin==='legacy'?legacy.items.find(x=>`legacy-${x.id}`===i.id):production.items.find(x=>x.id===i.id);const root=i.origin==='legacy'?'apps/living-library':'apps/biblioteca-viva';const dest=join(out,i.preview.replace('../',''));mkdirSync(resolve(dest,'..'),{recursive:true});cpSync(join(root,original.audio),dest);}
const published=publicCatalog(production,{knowledge:kb,assetRoot:'apps/biblioteca-viva'});
mkdirSync(join(out,'living-library'),{recursive:true});
writeFileSync(join(out,'living-library/collection.json'),JSON.stringify(published));
writeFileSync(join(out,'living-library/index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=../"><title>Library moved</title></head><body><a href="../">Open the library</a></body></html>');
for(const item of published.items)for(const path of [item.audio,item.video,item.captions].filter(Boolean)){
 const dest=join(out,path);mkdirSync(resolve(dest,'..'),{recursive:true});cpSync(join('apps/biblioteca-viva',path),dest);
}
// Version browser assets by content so Pages visitors do not receive mismatched cached files.
const version=path=>createHash('sha256').update(readFileSync(path)).digest('hex').slice(0,12);
const page=join(out,'index.html');let html=readFileSync(page,'utf8');
for(const file of ['media-app/style.css','media-app/app.js'])html=html.replace(`"${file}"`,`"${file}?v=${version(join(out,file))}"`);
writeFileSync(page,html);
{const adminPage=join(out,'admin/index.html');let html=readFileSync(adminPage,'utf8');for(const file of ['admin.js','admin.css'])html=html.replace(`"${file}"`,`"${file}?v=${version(join(out,'admin',file))}"`);writeFileSync(adminPage,html);}

// Invalidate cached game modules and styles when Voice Lab changes.
{const shared=join(out,'games/_shared');const v5=join(shared,'v5.js');if(existsSync(v5)){
 let source=readFileSync(v5,'utf8');source=source.replace("'./spoken-client.js'",`'./spoken-client.js?v=${version(join(shared,'spoken-client.js'))}'`);writeFileSync(v5,source);
 for(const game of gameManifest.games){const page=join(out,'games',game.id,'index.html');if(!existsSync(page))continue;let html=readFileSync(page,'utf8');for(const file of ['v5.js','voice.css'])html=html.replace(`"../_shared/${file}"`,`"../_shared/${file}?v=${version(join(shared,file))}"`);writeFileSync(page,html);}
}}

// Practice retains its own cache-busted assets; the library uses a versioned service-worker cache.
{const page=join(out,'practice.html');let html=readFileSync(page,'utf8');for(const file of ['style.css','hub.js'])html=html.replace(`"${file}"`,`"${file}?v=${version(join(out,file))}"`);writeFileSync(page,html);}

console.log(JSON.stringify({directory:out,concepts:concepts.length,books:books.length,games:gameManifest.games.length}));
