// Bundle production learning rules without unrelated demonstration curricula.
import{readFileSync,readdirSync}from'node:fs';import{join}from'node:path';import{fileURLToPath}from'node:url';
const folder=fileURLToPath(new URL('../packages/engine-core/',import.meta.url));
export function learningRuntimeSources(){return Object.fromEntries(readdirSync(folder).filter(f=>f.endsWith('.js')&&f!=='seed-data.js').map(f=>[f,f==='index.js'?readFileSync(join(folder,f),'utf8').split('\n').filter(line=>!line.includes('from "./seed-data.js"')).join('\n'):readFileSync(join(folder,f),'utf8')]));}
