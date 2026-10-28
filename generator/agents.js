import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
export const AGENT_ROOT=fileURLToPath(new URL('../agents/',import.meta.url));
export const registry=JSON.parse(readFileSync(join(AGENT_ROOT,'registry.json'),'utf8'));
export const agentById=id=>{const a=registry.agents.find(a=>a.id===id);if(!a)throw new Error(`Unknown agent ${id}`);return a;};
export function agentForTask(task){
 if(task==='game-suite-plan')return'game-designer';
 if(task==='library-plan')return'research-planner';
 if(task==='specification')return'spec-analyst';
 if(task==='source-discovery')return'source-researcher';
 if(task==='acquisition-blueprint')return'research-planner';
 if(task==='acquisition-select')return'source-curator';
 if(task==='acquisition-coverage')return'coverage-auditor';
 if(task==='knowledge-passage')return'knowledge-reader';
 if(task.startsWith('knowledge-review')&&!task.endsWith('revision'))return'knowledge-critic';
 if(task.startsWith('knowledge-'))return'knowledge-architect';
 if(task==='handbook-plan')return'handbook-editor';
 if(task==='handbook-chapter')return'handbook-writer';
 if(task==='handbook-audit')return'editorial-critic';
 if(task==='game-framework'||task==='framework-review-revision')return'game-designer';
 if(task.startsWith('framework-review'))return'systems-critic';
 if(task==='game-media-plan')return'art-director';
 if(task==='asset-production')return'asset-builder';
 if(task==='asset-review')return'art-director';
 if(task==='sound-plan')return'sound-designer';
 if(task.startsWith('game-code'))return'game-builder';
 if(task==='code-review'||task==='code-recheck')return'code-critic';
 if(task==='playtest-analysis')return'playtest-analyst';
 if(task.startsWith('design-review-'))return['gameplay-critic','learning-critic','originality-critic','systems-critic'][Number(task.at(-1))-1]||'systems-critic';
 throw new Error(`No agent registered for task ${task}`);
}
export function agentInstructions(id){return readFileSync(join(AGENT_ROOT,'common.md'),'utf8')+'\n\n'+readFileSync(join(AGENT_ROOT,agentById(id).file),'utf8');}
