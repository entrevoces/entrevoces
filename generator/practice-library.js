// Import a user-supplied authored curriculum, retaining its actual draft status.
import {readFileSync} from 'node:fs';
const sourcePath=new URL('../entre_voces_knowledge_base.json',import.meta.url);
const clean=s=>String(s||'').normalize('NFC').replace(/\s+/g,' ').trim();
const explicit={
 'claim (insurance)':'insurance claim','appeal (coverage)':'coverage appeal',
 'sensitivity (test)':'test sensitivity','specificity (test)':'test specificity',
 'staple (surgical)':'surgical staple','sentence (criminal)':'criminal sentence',
 'charge (criminal)':'criminal charge','count (charge)':'criminal count',
 'information (criminal)':'charging information','complaint (civil)':'civil complaint',
 'appeal (court)':'court appeal','set aside (conviction)':'set aside conviction',
 'attempt (crime)':'attempted crime','affirm (appeal)':'affirm judgment',
 'discharge (from care)':'clinical discharge','impartiality (interpreter)':'impartiality',
};
export function playLabel(value){const s=clean(value);return explicit[s]||clean(s.replace(/\s*\([^)]*\)/g,'').split(/\s+\/\s+/)[0]);}
export function suppliedPracticeLibrary(existing,domains){
 const source=JSON.parse(readFileSync(sourcePath,'utf8')),seen=new Set(existing.map(c=>`${c.domainId}:${clean(c.terms.en.term).toLowerCase()}`));
 const concepts=[],sources=Object.fromEntries(source.sources.map(s=>[s.id,s]));
 for(const t of source.terms){
  const d=domains.find(d=>d.domainId===t.domain);if(!d)continue;
  const key=`${t.domain}:${clean(t.english).toLowerCase()}`;if(seen.has(key))continue;seen.add(key);
  const areaId='practice-'+t.category.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
  if(!d.translationAreas.some(a=>a.areaId===areaId))d.translationAreas.push({areaId,label:{en:t.category},prerequisiteAreaIds:[],riskIfMistranslated:'high'});
  const en=playLabel(t.english),es=playLabel(t.spanish);
  concepts.push({conceptId:'practice-'+t.id.toLowerCase(),domainId:t.domain,areaIds:[areaId],
   terms:{en:{term:clean(t.english),alternatives:[],register:'professional practice'},es:{term:clean(t.spanish),alternatives:t.alternative_es||[],register:'professional practice'}},
   playLabels:{en,es},topic:t.category,gameEligible:!/Oregon|agency|credential/i.test(t.category)&&en.length<=36&&es.length<=42,
   definition:{en:t.definition_en},whyItMatters:t.caution||'Preserve this concept in its actual professional context.',difficulty:t.priority==='core'?2:3,evidenceStages:[2],competences:['terminology'],sourceIds:[t.source_id],
   examples:[],distinctions:[],misconceptions:[],reviewState:t.review_state,
   unresolved:['User-supplied English–Spanish independent-study draft; category references do not independently verify every equivalent. Professional bilingual review remains pending.','Chinese equivalent is not supplied in this resource.'],
   provenance:{kind:'user-supplied-curriculum-draft',path:'entre_voces_knowledge_base.json',originalId:t.id,sourceType:t.source_type,source:sources[t.source_id],reviewState:t.review_state},
  });
 }
 const combined=[...existing,...concepts];
 for(const contrast of source.contrasts||[]){const names=contrast.contrast_en.split(/\s+vs\s+/i).map(s=>playLabel(s).toLowerCase());const group=combined.filter(c=>c.domainId===contrast.domain&&names.includes(playLabel(c.terms.en.term).toLowerCase()));
  for(const c of group){c.distinctions ||= [];c.relationships ||= [];for(const other of group.filter(o=>o!==c)){if(!c.relationships.some(r=>r.type==='confusable-with'&&r.targetId===other.conceptId))c.relationships.push({type:'confusable-with',targetId:other.conceptId});if(!c.distinctions.some(d=>d.contrast===other.terms.en.term))c.distinctions.push({contrast:other.terms.en.term,difference:contrast.critical_distinction,reviewState:contrast.review_state});}}
 }
 return {concepts,sources,imported:concepts.length,total:source.terms.length};
}
