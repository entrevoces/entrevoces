/** Deliberately public admin drafts: project content only, never receipts or secrets. */
import {createHash} from 'node:crypto';
const limit=240;
export function narrationSegments(script){
 const result=[];
 for(const raw of String(script||'').split(/\r?\n/)){
  let line=raw.trim();if(!line||/^\[[^\]]+\]$/.test(line))continue;
  line=line.replace(/^[\p{L}\p{N} .,'’–-]{2,45}(?:\s*\([^)]{2,60}\))?:\s*/u,'').trim();
  if(!line)continue;
  while(line.length>limit){let cut=line.lastIndexOf(' ',limit);if(cut<40)cut=limit;result.push(line.slice(0,cut).trim());line=line.slice(cut).trim();}
  if(line)result.push(line);
 }
 return result;
}
export function buildAdminCatalog(production,legacy,supplemental=[]){
 const mapped=[];
 for(const x of production.items||[]){if(!x.id||!x.script)continue;mapped.push({id:x.id,title:x.title,kind:x.kind,status:x.status,script:x.script,origin:'production',preview:x.audio?`../admin-media/${x.id}${x.audio.slice(x.audio.lastIndexOf('.'))}`:null,externalAudio:x.sunoUrl||null});}
 for(const x of legacy.items||[]){
  let script=x.body||x.lyrics||'';
  if(x.kind==='listen')script=[`Source: ${x.source||''}`,`Interpretation: ${x.render||''}`,`Change: ${x.bad||''}`,`Note: ${x.tip||''}`].join('\n');
  if(x.kind==='branching'&&x.nodes)script=Object.entries(x.nodes).map(([id,node])=>`${id}\n${node.text||''}\n${(node.choices||[]).map(c=>`Choice: ${c.label}`).join('\n')}`).join('\n\n');
  if(!script)continue;mapped.push({id:`legacy-${x.id}`,title:x.title,kind:x.kind,status:'legacy-draft',script,origin:'legacy',preview:x.audio?`../admin-media/legacy-${x.id}${x.audio.slice(x.audio.lastIndexOf('.'))}`:null,externalAudio:x.externalAudio?.url||null});
 }
 for(const x of supplemental){if(x?.id&&x?.script)mapped.push({id:x.id,title:x.title,kind:x.kind,status:'script-draft',script:x.script,origin:'production',language:x.language});}
 return {schemaVersion:1,items:mapped.map(x=>{const segments=narrationSegments(x.script);return {...x,segments,revision:createHash('sha256').update(JSON.stringify(segments)).digest('hex').slice(0,20),defaultLanguage:x.language|| (x.kind==='song'?'es':'en')};})};
}
