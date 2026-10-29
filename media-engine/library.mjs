/** Map historical media into coherent reader/listener schema without asserting missing audio. */
import {recommendedKinds,makeBrief} from './blueprints.mjs';
const MAP={listen:'catch-the-change',telenovela:'audio-drama',branching:'audio-mystery',story:'story',song:'song',film:'film'};
export function importLegacyItems(catalog){
 if(!Array.isArray(catalog?.items))throw Error('Legacy catalog absent');
 return catalog.items.map(item=>({id:item.id,kind:MAP[item.kind]||item.kind,title:item.title,synopsis:item.subtitle||item.label||'',legacyKind:item.kind,
  script:item.body||item.lyrics||'',source:item.source||'',interpretation:item.render||'',
  semanticChange:item.bad||'',explanation:item.tip||item.takeaway||'',
  critical:item.critical||[],termIds:[],sourceIds:item.source_id?[item.source_id]:[],
  productionStatus:item.audio?'audio-demo':item.externalAudio?'external-audio':'script-only',
  audio:item.audio?`living-library/${item.audio}`:null,
  externalAudio:item.externalAudio?.url||null,
  sunoUrl:item.externalAudio?.url||null,
  prompts:item.prompt?{suno:item.prompt}:null,
  review:{bilingualApproved:false},rights:{status:item.externalAudio?'external-link-only':'pending'},
  duration:item.duration,language:item.language||'English–Spanish',
  storyNodes:item.nodes||null,storyStart:item.start||null,guide:item.guide||null,
  legacy:true}));
}
export function suggestMedia(knowledge,{completed=[],favorites=[],weakConceptIds=[],selectedDomain=null,limit=8,history=[]}={}){
 const fav=new Set(favorites),done=new Set(completed),seen=new Set(history),counts={};
 const terms=knowledge.terms.filter(t=>!selectedDomain||t.domain===selectedDomain);
 const ranked=terms.map(t=>({term:t,score:(weakConceptIds.includes(t.id)?30:0)+(t.priority==='core'?8:0)+(fav.has(t.id)?4:0)-(done.has(t.id)?15:0)-(seen.has(t.id)?8:0)})).sort((a,b)=>b.score-a.score||a.term.id.localeCompare(b.term.id));
 return ranked.slice(0,limit).map(({term},i)=>({id:`rec-${term.id}`,title:`${term.english} · ${term.spanish}`,domain:term.domain,kind:recommendedKinds(term.caution||term.context)[i%3],termId:term.id,sourceId:term.source_id,reason:weakConceptIds.includes(term.id)?'Targeted review of a recorded learning gap':'Core professional meaning in context',isGenerated:false}));
}
