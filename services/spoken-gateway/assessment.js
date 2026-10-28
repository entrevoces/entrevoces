// Trust boundary for probabilistic assessment: malformed or ungrounded model
// output becomes indeterminate, never a fabricated pass or failure.
const MAX_UNITS=12;
const norm=s=>String(s).normalize('NFC').replace(/\s+/g,' ').trim();
export function parseAssessment(raw,{sourceText,transcript}={}){
  let value;
  try{value=JSON.parse(String(raw).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}catch{return indeterminate('The model did not return a verifiable assessment.');}
  if(!value||!['faithful','needs-repair','indeterminate'].includes(value.verdict)||![true,false,null].includes(value.languageMatch)||!Number.isFinite(value.confidence)||value.confidence<0||value.confidence>1||!Array.isArray(value.units)||!value.units.length||value.units.length>MAX_UNITS)return indeterminate('The model assessment was incomplete.');
  const src=norm(sourceText),spoken=norm(transcript);
  const units=[];
  for(const unit of value.units){
    if(!unit||!['preserved','altered','omitted','uncertain'].includes(unit.status)||typeof unit.source!=='string'||typeof unit.spoken!=='string'||typeof unit.reason!=='string'||unit.reason.length>220)return indeterminate('The evidence did not pass validation.');
    const s=norm(unit.source),p=norm(unit.spoken);
    if(!s||s.length>240||p.length>240||!src.includes(s)||(p&&!spoken.includes(p))||(unit.status==='preserved'&&!p))return indeterminate('The model could not ground its findings in the source and transcript.');
    units.push({source:s,spoken:p,status:unit.status,reason:unit.reason});
  }
  let verdict=value.verdict;
  // Cross-check that the evaluator actually inspected nearly all source
  // content; an assessor that only quotes an easy phrase cannot claim a pass.
  const sourceWords=(src.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);
  const citedWords=new Set(units.flatMap(u=>u.source.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]));
  const coverage=sourceWords.length?sourceWords.filter(w=>citedWords.has(w)).length/sourceWords.length:0;
  if(coverage<.8&&verdict==='faithful')verdict='indeterminate';
  // A high-stakes pass must not coexist with an admitted omission/alteration.
  if(verdict==='faithful'&&units.some(u=>u.status!=='preserved'))verdict='indeterminate';
  if(verdict==='faithful'&&value.languageMatch!==true)verdict='indeterminate';
  if(verdict==='needs-repair'&&units.every(u=>u.status==='preserved')&&value.languageMatch!==false)verdict='indeterminate';
  if(value.confidence<.7)verdict='indeterminate';
  return {verdict,confidence:value.confidence,languageMatch:value.languageMatch,sourceCoverage:Math.round(coverage*100)/100,units,feedback:typeof value.feedback==='string'?value.feedback.slice(0,220):'',repairPrompt:typeof value.repairPrompt==='string'?value.repairPrompt.slice(0,180):'',provisional:true,assessor:'muse-spark-1.3'};
}
export function indeterminate(reason='We could not assess this response reliably.'){
  return {verdict:'indeterminate',confidence:0,units:[],feedback:reason,repairPrompt:'Check the transcript, then try the utterance again.',provisional:true,assessor:'muse-spark-1.3'};
}
export function taskFromKnowledge(knowledge,{domain,lang,conceptId,direction='forward'}){
  if(!['medical','legal'].includes(domain)||!['es','zh'].includes(lang)||!['forward','reverse'].includes(direction)||typeof conceptId!=='string'||!/^[a-z0-9-]{3,49}$/.test(conceptId))return null;
  const concept=knowledge.find(c=>c.domainId===domain&&c.conceptId===conceptId&&c.inferred!==true&&c.sourceIds?.length&&c.terms?.[lang]?.term);
  const example=concept?.examples?.find(e=>typeof e.en==='string'&&typeof e[lang]==='string'&&e.en.length<500&&e[lang].length<700);
  if(!example)return null;
  const reversed=direction==='reverse';
  return {taskId:`${domain}:${lang}:${conceptId}:${direction}`,conceptId,domain,lang,direction,sourceLanguage:reversed?lang:'en',targetLanguage:reversed?'en':lang,sourceText:reversed?example[lang]:example.en,referenceText:reversed?example.en:example[lang],sourceIds:concept.sourceIds,areaId:concept.areaIds?.[0]||null,mode:'spoken-sight-practice'};
}
export function validatePcmWav(wav){
  if(!Buffer.isBuffer(wav)||wav.length<3244||wav.length>1_500_000||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE'||wav.toString('ascii',12,16)!=='fmt '||wav.readUInt32LE(16)!==16||wav.readUInt16LE(20)!==1||wav.readUInt16LE(22)!==1||![16000,24000].includes(wav.readUInt32LE(24))||wav.readUInt16LE(34)!==16||wav.toString('ascii',36,40)!=='data'||wav.readUInt32LE(40)!==wav.length-44||wav.readUInt16LE(32)!==2||wav.readUInt32LE(28)!==wav.readUInt32LE(24)*2)return false;
  const seconds=(wav.length-44)/(wav.readUInt32LE(24)*2);
  return seconds>=.1&&seconds<=30;
}
