/** Explicit editorial craft audit. A deterministic warning system, never a substitute for people listening. */
const words=s=>String(s||'').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)||[];
const norm=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
const staged=/\[(?:TODO|TBD|insert|finish|write|placeholder|add (?:more|scene)|example only)[^\]]*\]/giu;
const stereotyped=/(?:all (?:latinas|hispanics|immigrants) (?:love|are|always)|spicy latina|broken english for laughs)/iu;
const didactic=/(?:the lesson (?:today )?is|and that is why interpreters must|as an interpreter, you should always|now let's review what we learned|in today's module)/giu;
const creativeCliches=/(?:the room fell silent|little did (?:she|he|they) know|what happened next would change everything|a chill ran down (?:her|his|their) spine)/giu;
const lines=s=>String(s||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const spokenLine=/^([\p{L}][\p{L}\p{N} .’'-]{0,35})(?:\s*\([^)]{1,60}\))?:\s+(.+)$/u;
const floor={
 'audio-drama':{minWords:600,minDialogue:10,minVoices:2},
 'podcast':{minWords:650,minDialogue:10,minVoices:2},
 'catch-the-change':{minWords:230,minDialogue:4,minVoices:2},
 'audio-mystery':{minWords:500,minDialogue:3,minVoices:1},
 'story':{minWords:450,minDialogue:0,minVoices:0},
 'song':{minWords:140,minDialogue:0,minVoices:0},
 'film':{minWords:180,minDialogue:4,minVoices:2},
 'sound-bites':{minWords:160,minDialogue:6,minVoices:2}
};
const ngrams=s=>{const w=words(norm(s));const m=new Map();for(let i=0;i<w.length-5;i++){const g=w.slice(i,i+6).join(' ');m.set(g,(m.get(g)||0)+1);}return [...m.values()].filter(x=>x>=3).length};
export function evaluateCraft(item,{phase='draft'}={}){
 const s=item?.script||item?.body||'',kind=item?.kind;
 const spec=floor[kind]||{minWords:300,minDialogue:0,minVoices:0};
 const raw=lines(s),dialogue=raw.map(l=>spokenLine.exec(l)).filter(Boolean);
 const speakers=[...new Set(dialogue.map(m=>norm(m[1]).trim()).filter(x=>!/(narrator|narradora|announcer|narración|narration)/.test(x)))];
 const issue=(severity,code,detail)=>({severity,code,detail});
 const issues=[];const wc=words(s).length;
 if(wc<spec.minWords)issues.push(issue('major','underwritten',`${kind} has ${wc} words; needs ${spec.minWords} genuine words`));
 if(dialogue.length<spec.minDialogue)issues.push(issue('major','not-enough-dialogue',`${dialogue.length} dialogue turns; minimum ${spec.minDialogue}`));
 if(speakers.length<spec.minVoices)issues.push(issue('major','indistinct-voices',`Found ${speakers.length} distinct speaking roles; minimum ${spec.minVoices}`));
 if((s.match(staged)||[]).length)issues.push(issue('blocker','placeholder','Incomplete script-stage placeholders'));
 if(stereotyped.test(s))issues.push(issue('blocker','stereotype','A demographic stereotype replaces character writing'));
 if((s.match(didactic)||[]).length>=2)issues.push(issue('major','lecture-disguised-as-story','Explicit lectures crowd out drama'));
 if((s.match(creativeCliches)||[]).length>=3)issues.push(issue('minor','stock-prose','Repeated generic storytelling clichés'));
 if(ngrams(s)>=4)issues.push(issue('major','repetitive-padding','Repeated six-word sequences suggest length padding'));
 if(kind==='song'){
  const verses=(s.match(/(?:^|\n)\s*\[(?:verse|coro|chorus|puente|bridge|estribillo|estrofa)\b/giu)||[]).length;
  if(verses<2)issues.push(issue('minor','unspecified-song-structure','Mark verse, chorus and bridge for production'));
 }
 if(item?.errors?.some(e=>{
   const turns=item.turns||[];
   const exact=[['audibleSource','sourceTurnIndex'],['audibleWrong','wrongTurnIndex'],['audibleRepair','repairTurnIndex']];
   const normalized=x=>norm(x).replace(/[^\p{L}\p{N} ]/gu,' ').replace(/\s+/g,' ').trim();
   return !exact.every(([key,index])=>e[key]&&Number.isInteger(e[index])&&(' '+normalized(turns[e[index]]?.text)+' ').includes(' '+normalized(e[key])+' '));
 }))issues.push(issue('major','untraceable-error','The exact source, wrong and repaired audio phrases must be traceable to the right dialogue turns'));
 const block=issues.some(x=>x.severity==='blocker'||x.severity==='major');
 return {phase,kind,wordCount:wc,dialogueTurns:dialogue.length,speakingRoles:speakers,issues,readyForModelCritique:!block,certifiesQuality:false,
  note:'An automated craft audit can catch deficiencies, but cannot certify originality, humor, meaning, emotional impact or performance.'};
}
const same=a=>JSON.stringify(a);
export function auditContradictions({item,brief}={}){
 const issues=[];
 if(item?.domain!==brief?.domain)issues.push('Domain drift from frozen source brief');
 if(item?.kind!==brief?.kind)issues.push('Media format drift');
 if(item?.sourceClaims?.some(c=>!brief.termIds.includes(c.termId)))issues.push('A source claim uses a term outside the cited snapshot');
 if(item?.errors?.some(e=>e.original?.trim()===e.wrong?.trim()))issues.push('The supposed wrong and original utterances are identical');
 if(item?.turns?.some(t=>!['en','es','zh'].includes(t.language)))issues.push('Turn language outside supported direction');
 if(item?.kind==='catch-the-change'&&item?.errors?.length){const utterances=(item.turns||[]).map(t=>t.text).join('\n');for(const e of item.errors||[])if(!utterances.includes(e.wrong))issues.push(`Error ${e.id}: the wrong phrase is not audibly authored in the turn transcript`)}
 return {ok:!issues.length,issues};
}
export const MASTER_TASTE_NOTE=`Creative north star: produce audio storytelling that someone chooses for pleasure, not a lecture or vocabulary drill.\n
Craft requirements: start in a surprising specific human situation; recurring characters have incompatible reasonable desires; allow subtext, silence, interruption and a comic turn rooted in personality. Each scene changes someone's plan, status or knowledge. The interpreting distinction must cause an actual believable consequence, not appear in a final lecture. Adult humor is affectionate, layered, never an ethnic stereotype or a caricatured accent. Write natural conversational Spanish and English at the level of the character, with explicit language labels and appropriate registers. Preserve all key numbers, negation, uncertainty, attribution, jurisdiction and consent boundaries. Never invent authoritatively correct clinical advice or court outcomes; let a character ask a qualified person when necessary. Avoid procedural trivia as emotional resolution. No 'today we learned', 'the lesson is', generic mentor monologues, cliffhanger without preceding payoff, or token-length padding. Add moments of sound and atmosphere that remain meaningful without a screen.`;
