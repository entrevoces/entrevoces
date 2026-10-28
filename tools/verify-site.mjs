// Inspect exactly the artifact Pages publishes, including repo-subpath imports.
import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {resolve,relative,dirname,extname} from 'node:path';
const root=resolve('dist'),files=[];
function walk(path){for(const d of readdirSync(path,{withFileTypes:true})){if(d.isSymbolicLink())throw Error('Symlink in public artifact');const p=resolve(path,d.name);d.isDirectory()?walk(p):files.push(p);}}
walk(root);
for(const p of files){
 const rel=relative(root,p);
 if(/(^|\/)(services|data|\.git|\.env)(\/|$)|\.(py|zip|pem|key)$/.test(rel))throw Error(`Private/server file in public build: ${rel}`);
 if(!['.js','.html','.css','.json','.md',''].includes(extname(p)))continue;
 const text=readFileSync(p,'utf8');
 if(/LLM_\d{10,}_|hf_[A-Za-z0-9]{25,}|sk-[A-Za-z0-9]{25,}/.test(text))throw Error(`Credential pattern in ${rel}`);
 const source=text.replace(/^\s*\/\/.*$/gm,'');
 const links=extname(p)==='.html'?[...text.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(x=>x[1]):extname(p)==='.js'?[...source.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/g)].map(x=>x[1]):[];
 for(const link of links){if(/^(#|https?:|data:|mailto:)/.test(link))continue;const clean=link.split(/[?#]/)[0];if(!clean)continue;if(clean.startsWith('/'))throw Error(`Root-relative URL breaks project Pages: ${rel}: ${link}`);const target=resolve(dirname(p),clean);if(relative(root,target).startsWith('..')||!existsSync(target))throw Error(`Broken public dependency: ${rel}: ${link}`);}
}
const config=JSON.parse(readFileSync(resolve(root,'spoken-config.json')));
if(Object.keys(config).some(k=>k!=='apiBaseUrl'))throw Error('Unexpected spoken configuration: public URL only.');
const games=JSON.parse(readFileSync(resolve(root,'games.json'))).games;
if(games.length!==3||games.some(g=>!existsSync(resolve(root,'games',g.id,'index.html'))))throw Error('Expected all three integrated games.');
console.log(JSON.stringify({files:files.length,games:games.length,brokenDependencies:0,privateFiles:0,voiceConfigured:!!config.apiBaseUrl}));
