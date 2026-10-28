// Reproducible static hub assembly. No authoring endpoints or runtime AI.
import{mkdirSync,readFileSync,writeFileSync,cpSync,existsSync,rmSync}from'node:fs';import{join,resolve}from'node:path';
import*as core from'../packages/engine-core/index.js';import{learningRuntimeSources}from'../generator/runtime.js';
const out=resolve('dist');mkdirSync(out,{recursive:true});
const {curriculumSource}=await import('../generator/curriculum-source.js');
const {domains,concepts,books}=curriculumSource();
const curriculum=core.compileCurriculum({domains,concepts,books});
if(books.length){mkdirSync(join(out,'books/language-access'),{recursive:true});cpSync('knowledge/imports/language-access',join(out,'books/language-access'),{recursive:true});}
for(const file of ['index.html','style.css','hub.js'])cpSync(join('apps/learning-hub',file),join(out,file));
mkdirSync(join(out,'runtime/engine-core'),{recursive:true});for(const[f,s]of Object.entries(learningRuntimeSources()))writeFileSync(join(out,'runtime/engine-core',f),s);cpSync('packages/engine-client/engine-client.js',join(out,'runtime/engine-client.js'));
writeFileSync(join(out,'curriculum.json'),JSON.stringify(curriculum));writeFileSync(join(out,'domains.json'),JSON.stringify(domains));
const gameManifest=existsSync('knowledge/game-suite/manifest.json')?JSON.parse(readFileSync('knowledge/game-suite/manifest.json')):{games:[]};
try{const {readStore}=await import('../generator/project.js');if(readStore().jobs.some(j=>/usage limit/i.test(j.error?.message||'')))gameManifest.authoringNote='The local authoring account is at its usage limit. Saved briefs and accepted checkpoints remain available for resume.';}catch{/* Static knowledge can still build without authoring state. */}
writeFileSync(join(out,'games.json'),JSON.stringify(gameManifest));
for(const g of gameManifest.games){if(g.path&&existsSync(g.path))cpSync(g.path,join(out,'games',g.id),{recursive:true});}
console.log(JSON.stringify({directory:out,concepts:concepts.length,books:books.length,games:gameManifest.games.length}));
