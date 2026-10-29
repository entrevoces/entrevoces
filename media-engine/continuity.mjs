/** Story-production editorial signals: deterministic flags, not an automatic quality certificate. */
const words=x=>String(x||'').match(/[\p{L}\p{N}]+/gu)||[];
const normalize=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase();
const CATEGORIES=[['negation',/\b(?:no|not|never|sin|nunca|no\s+ha)\b/iu],['conditional',/\b(?:si|if|unless|cuando|when)\b/iu],['uncertainty',/\b(?:perhaps|maybe|might|tal vez|quizas|creo)\b/iu],['quantities',/\b\d+(?:[.,]\d+)?\b/u]];
export function auditScript(item,{minWords=300,existing=[]}={}) {
 const flags=[],warnings=[],script=String(item?.script||item?.body||'');
 const wc=words(script).length;
 if(wc<minWords)flags.push({severity:'major',code:'thin-script',detail:`${wc} words; required ${minWords}`});
 if(/\[(?:insert|tbd|todo|placeholder|add scene|\.{3})\]/iu.test(script))flags.push({severity:'major',code:'placeholder',detail:'Script contains unfinished production text'});
 if(!item?.termIds?.length)warnings.push({code:'no-linked-terms'});
 if(!item?.sourceIds?.length)warnings.push({code:'no-source-ids'});
 if(!item?.takeaway&&!item?.synopsis)warnings.push({code:'no-editorial-summary'});
 if(script&&/\b(?:medical advice|legal advice|definitely must|guaranteed approval)\b/iu.test(script))warnings.push({code:'needs-advice-review'});
 const norm=normalize(script).replace(/[^\p{L}\p{N} ]/gu,' ').replace(/\s+/g,' ');
 for(const peer of existing){if(peer?.id===item?.id)continue;const peerText=normalize(peer?.script||peer?.body||'').replace(/[^\p{L}\p{N} ]/gu,' ').replace(/\s+/g,' ');if(peerText.length>120&&norm.length>120&&norm.slice(0,120)===peerText.slice(0,120))flags.push({severity:'major',code:'duplicate-opening',detail:`Opening duplicates ${peer.id}`})}
 const presence=Object.fromEntries(CATEGORIES.map(([k,p])=>[k,p.test(normalize(script))]));
 const dialogue=script.split(/\n/).filter(l=>/^[\p{L}\p{N} .'-]{2,26}:/u.test(l)).length;
 if(['audio-drama','catch-the-change','podcast'].includes(item?.kind)&&dialogue<4)warnings.push({code:'low-spoken-dialogue',count:dialogue});
 return {wordCount:wc,estimatedNarrationMinutes:Math.round(wc/145*10)/10,dialogueLines:dialogue,meaningTopics:presence,flags,warnings,autoApproved:false};
}
export function auditSeason(items){const episodes=items.filter(x=>x.kind==='audio-drama'||x.kind==='telenovela');const groups={};for(const e of episodes){const series=e.seriesId||'standalone';(groups[series]??=[]).push(e)}const out={};for(const[k,season]of Object.entries(groups)){const order=season.filter(x=>Number.isInteger(x.episode)).sort((a,b)=>a.episode-b.episode);const gaps=[];for(let i=1;i<order.length;i++)if(order[i].episode!==order[i-1].episode+1)gaps.push([order[i-1].episode,order[i].episode]);out[k]={episodes:season.length,gaps,characters:[...new Set(season.flatMap(x=>x.cast||[]).map(c=>typeof c==='string'?c:c.name).filter(Boolean))]};}return out;}
