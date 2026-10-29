/** Local deterministic media recommendation. Learning evidence is read-only and never inferred from entertainment consumption. */
const key=s=>String(s||'').toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
const typeOf=i=>({'catch-the-change':'listen','audio-drama':'telenovela','audio-mystery':'branching','podcast':'listen','sound-bites':'listen'}[i.kind]||i.kind);
export function recommendMedia(items,{likedIds=[],completedIds=[],seenIds=[],missedConceptIds=[],dueConceptIds=[],preferredLanguage='es',format='',limit=12,seed=0}={}){
 if(!Array.isArray(items))throw Error('Media collection required');
 const liked=new Set(likedIds),seen=new Set(seenIds),completed=new Set(completedIds),missed=new Set(missedConceptIds),due=new Set(dueConceptIds);
 const candidates=items.filter(i=>i?.id&&(!format||typeOf(i)===format));
 const scored=candidates.map(i=>{const ids=i.termIds||[];const reasons=[];let score=0;
  const playable=!!(i.audio||i.externalAudio||i.sunoUrl);score+=playable?18:0;if(playable)reasons.push('available to listen');
  const unseen=!seen.has(i.id)&&!completed.has(i.id);score+=unseen?9:-6;if(unseen)reasons.push('new to you');
  const weak=ids.filter(id=>missed.has(id)).length;score+=Math.min(weak,3)*10;if(weak)reasons.push('practices a challenging distinction');
  const revisiting=ids.filter(id=>due.has(id)).length;score+=Math.min(revisiting,3)*6;if(revisiting)reasons.push('due for review');
  if(liked.has(i.id)){score+=4;reasons.push('saved on this device')}
  if(i.language&&key(i.language).includes(preferredLanguage==='es'?'spanish':preferredLanguage==='zh'?'mandarin':'english'))score+=2;
  if(i.review?.bilingualApproved&&i.review?.domainApproved){score+=5;reasons.push('reviewed by practitioners')}
  const stable=(Array.from(i.id).reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,seed>>>0)%101)/101;
  return {item:i,score:score+stable,reasons};
 });
 scored.sort((a,b)=>b.score-a.score||a.item.id.localeCompare(b.item.id));
 const picked=[],seenTypes=new Map();
 for(const candidate of scored){const type=typeOf(candidate.item);if((seenTypes.get(type)||0)>=3&&scored.length>limit)continue;picked.push(candidate);seenTypes.set(type,(seenTypes.get(type)||0)+1);if(picked.length>=limit)break;}
 for(const c of scored){if(picked.length>=limit)break;if(!picked.includes(c))picked.push(c)}
 return picked;
}
export function coverageByFormat(items){const stats={};for(const x of items){const kind=typeOf(x),s=stats[kind]||={total:0,playable:0,reviewed:0,withTranscript:0};s.total++;if(x.audio||x.externalAudio||x.sunoUrl)s.playable++;if(x.review?.bilingualApproved&&x.review?.domainApproved)s.reviewed++;if(x.transcript)s.withTranscript++;}return stats;}
