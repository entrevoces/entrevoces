// Reproducible static hub assembly. No authoring endpoints or runtime AI.
import{mkdirSync,readFileSync,writeFileSync,cpSync,existsSync,rmSync}from'node:fs';import{join,resolve}from'node:path';import{createHash}from'node:crypto';
import*as core from'../packages/engine-core/index.js';import{validateCollection}from'../generator/living-library.js';import{learningRuntimeSources}from'../generator/runtime.js';
const out=resolve('dist');rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});writeFileSync(join(out,'.nojekyll'),'');
const {curriculumSource}=await import('../generator/curriculum-source.js');
const {domains,concepts,books}=curriculumSource();
const curriculum=core.compileCurriculum({domains,concepts,books});
if(books.length){mkdirSync(join(out,'books/language-access'),{recursive:true});cpSync('knowledge/imports/language-access',join(out,'books/language-access'),{recursive:true});}
for(const file of ['index.html','style.css','hub.js'])cpSync(join('apps/learning-hub',file),join(out,file));
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
// Static, locally bundled living-library experiences and authored audio.
const collection=JSON.parse(readFileSync('content/living-library/collection.json'));const mediaErrors=validateCollection(collection);if(mediaErrors.length)throw Error(`Living library validation failed: ${mediaErrors.join('; ')}`);
cpSync('apps/living-library',join(out,'living-library'),{recursive:true});
cpSync('content/living-library/collection.json',join(out,'living-library/collection.json'));
// Version browser assets by content so Pages visitors do not receive mismatched cached files.
const version=path=>createHash('sha256').update(readFileSync(path)).digest('hex').slice(0,12);
const mediaDir=join(out,'living-library'),mediaJS=join(mediaDir,'library.js');
writeFileSync(mediaJS,readFileSync(mediaJS,'utf8').replace('./translations.js',`./translations.js?v=${version(join(mediaDir,'translations.js'))}`));
for(const [dir,files] of [[out,['style.css','hub.js']],[mediaDir,['library.css','library.js']]]){
 const page=join(dir,'index.html');let html=readFileSync(page,'utf8');
 for(const file of files)html=html.replace(`"${file}"`,`"${file}?v=${version(join(dir,file))}"`);
 writeFileSync(page,html);
}

console.log(JSON.stringify({directory:out,concepts:concepts.length,books:books.length,games:gameManifest.games.length}));
