/** Read-only public projection for older catalog items; never rewrites authored source. */
const wc=s=>String(s||'').match(/[\p{L}\p{N}]+/gu)?.length||0;
const durationMinutes=s=>Math.max(1,Math.ceil(wc(s)/135));
export function publicLegacyCatalog(raw){
 const issues=[];
 const items=(raw?.items||[]).map(x=>{
  const item={...x},actualWords=wc(item.body||'');
  // Historical 180-word skits advertised 8–10 minutes. A 'duration' claim must
  // describe actual available media, not a fictional future episode.
  if(item.kind==='telenovela'&&!item.audio&&actualWords<350){
   if(/\d+\s*[–-]\s*\d+\s*min/i.test(item.duration||''))issues.push({id:item.id,code:'overstated-duration',words:actualWords,originalClaim:item.duration});
   item.duration=`short scene · approx. ${durationMinutes(item.body)} min reading`;
   item.format='script-scene';
  }
  if(item.kind==='film'&&!item.video)item.format='storyboard-not-video';
  return item;
 });
 return {catalog:{...raw,items},issues};
}
