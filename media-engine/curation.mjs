/** Editorial topic-to-evidence mapping. Never pad a brief with unrelated vocabulary. */
export const TOPIC_ANCHORS=Object.freeze({
  negation:{medical:['chest pain','pain','symptom','as needed','dose','side effect'],legal:['testimony','witness','not guilty plea','denial','right to remain silent','notice']},
  frequency:{medical:['dose','dosage','once daily','twice daily','as needed','before meals'],legal:['deadline','calendar day','continuance','filing','notice','hearing']},
  uncertainty:{medical:['patient-reported','chief complaint','symptom','medical history','diagnosis'],legal:['testimony','witness','credibility','evidence','affidavit']},
  'informed consent':{medical:['informed consent','consent form','interpreter services','procedure','risk'],legal:['waiver','right to counsel','plea colloquy','plea agreement','not guilty plea']},
  hearing:{medical:['hearing loss','audiology','hearing screening','hearing aid'],legal:['hearing','judgment','testimony','motion','criminal sentence','witness']},
  attribution:{medical:['patient-reported','medical history','chief complaint','clinical note'],legal:['witness','testimony','affidavit','evidence','declaration','credibility']},
  conditional:{medical:['as needed','dose','follow-up','discharge instructions','side effect'],legal:['unless','waiver','court order','notice','appeal']},
  eviction:{medical:['social worker','housing instability','social determinants of health'],legal:['eviction','notice to vacate','eviction summons','eviction hearing','residential eviction complaint','judgment of restitution']},
  modality:{medical:['informed consent','patient rights','refusal of treatment'],legal:['waiver','right to counsel','court order','right to remain silent']},
  chronology:{medical:['before meals','after meals','onset','medical history'],legal:['filing','notice','hearing','judgment','deadline']},
});
const norm=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const words=s=>new Set(norm(s).split(' ').filter(x=>x.length>2));
export function chooseGroundedTerms(knowledge,{topic,domain,index=0,count=7}={}){
 if(!['medical','legal'].includes(domain))throw Error('Unknown knowledge domain');
 const pool=knowledge?.terms?.filter(t=>t.domain===domain)||[];
 if(!pool.length)throw Error('Missing domain knowledge');
 const topicKey=norm(topic);let anchors=TOPIC_ANCHORS[topicKey]?.[domain];
 // Unknown topics require direct term/synonym matches; never silently switch to unrelated core vocabulary.
 const tWords=words(topic),matches=pool.map(t=>{
  const name=norm(t.english),alt=norm(t.spanish),category=norm(t.category);
  let points=0;
  if(name===topicKey)points+=22;else if(name.startsWith(topicKey+' ')||name.endsWith(' '+topicKey)||name.includes(' '+topicKey+' '))points+=14;
  if(alt===topicKey)points+=14;
  if(category===topicKey)points+=7;
  for(const w of tWords){if(name.split(' ').includes(w))points+=4;if(category.split(' ').includes(w))points+=1;}
  // Broad phrases in definitions/cautions are context, not permission to pull arbitrary terms.
  return {t,points};
 }).filter(x=>x.points>=4).sort((a,b)=>b.points-a.points||a.t.id.localeCompare(b.t.id));
 const result=[],ids=new Set();const push=(t,reason)=>{if(t&&!ids.has(t.id)){ids.add(t.id);result.push({...t,groundingReason:reason})}};
 for(const phrase of anchors||[]){const p=norm(phrase);let hit=pool.find(t=>norm(t.english)===p)||pool.find(t=>norm(t.english).includes(p)&&p.length>=7);if(hit)push(hit,`editorial-topic-anchor:${phrase}`)}
 for(const x of matches)push(x.t,`term-title-topic-match:${topic}`);
 if(!result.length)throw Error(`No substantively grounded ${domain} terms for topic '${topic}'. Curate a topic anchor before generation.`);
 // Diversity from a meaningful pool, never from unconnected source core words.
 const rotated=result.length>count?[result[0],...result.slice(1+(index%Math.max(1,result.length-1))),...result.slice(1,1+(index%Math.max(1,result.length-1)))]:result;
 return rotated.slice(0,count);
}
export function auditBriefGrounding(brief,knowledge){
 const missing=(brief.termIds||[]).filter(id=>!knowledge.terms.some(t=>t.id===id&&t.domain===brief.domain));
 const weak=(brief.knowledge||[]).filter(x=>!x.groundingReason);
 return {ok:missing.length===0&&weak.length===0&&!!brief.termIds?.length,missing,weakCount:weak.length,topic:brief.topic};
}
