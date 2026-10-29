/** Preserve the 865-entry source corpus verbatim; create human-ready display labels separately. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const PREFERRED = Object.freeze({
 'claim (insurance)':'insurance claim', 'appeal (coverage)':'coverage appeal',
 'sensitivity (test)':'test sensitivity', 'specificity (test)':'test specificity',
 'staple (surgical)':'surgical staple', 'sentence (criminal)':'criminal sentence',
 'charge (criminal)':'criminal charge', 'count (charge)':'criminal count',
 'information (criminal)':'criminal information', 'complaint (civil)':'civil complaint',
 'appeal (court)':'court appeal', 'set aside (conviction)':'set aside a conviction',
 'attempt (crime)':'attempted crime', 'affirm (appeal)':'affirm a judgment',
 'reverse (appeal)':'reverse a judgment', 'first appearance (eviction)':'first eviction hearing',
 'stipulated agreement (eviction)':'stipulated eviction agreement',
 'consideration (contract)':'contract consideration', 'damages (compensatory)':'compensatory damages',
 'title (property)':'property title',
 });
const PAREN_END = /\s*\(([^()]*)\)\s*$/u;
const normalizeSpaces = s=>String(s??'').normalize('NFC').replace(/\s+/gu,' ').trim();
export function humanLabel(original,{language='en'}={}){
 const text=normalizeSpaces(original);
 if(!text) return '';
 if(language==='en' && PREFERRED[text.toLowerCase()]) return PREFERRED[text.toLowerCase()];
 // Parenthetical agency acronyms are aliases, not part of how someone says the term.
 // Only remove a trailing parenthetical if it is a short acronym or known context marker.
 const match=text.match(PAREN_END);
 if(!match) return text;
 const note=match[1].trim();
 const isAcronym=/^[A-Z0-9]{2,8}$/u.test(note);
 const isSense=/^(insurance|coverage|test|surgical|criminal|charge|civil|court|conviction|crime|appeal|eviction|contract|compensatory|property)$/iu.test(note);
 return isAcronym||isSense?text.slice(0,match.index).trim():text;
}
export function aliases(original){const m=normalizeSpaces(original).match(PAREN_END);return m&&/^[A-Z0-9]{2,8}$/u.test(m[1])?[m[1]]:[];}
export function normalizeCorpus(raw){
 if(!raw||!Array.isArray(raw.terms)||raw.terms.length<800)throw Error('Refusing a truncated source: need the full 800+ term Entre Voces corpus.');
 const ids=new Set(),terms=[];
 for(const t of raw.terms){
  if(!t.id||ids.has(t.id)||!['medical','legal'].includes(t.domain))throw Error(`Invalid or duplicate knowledge term ${t.id}`);ids.add(t.id);
  const en=humanLabel(t.english),es=humanLabel(t.spanish,{language:'es'});
  if(!en||!es||/[()]/u.test(en)||/[()]/u.test(es))throw Error(`Unresolved parenthetical label for ${t.id}: ${en}/${es}`);
  terms.push({id:t.id,domain:t.domain,category:t.category,english:en,spanish:es,
   aliases_en:aliases(t.english),aliases_es:aliases(t.spanish),
   canonical_english:t.english,canonical_spanish:t.spanish,
   context:t.definition_en||'',caution:t.caution||'',priority:t.priority,
   source_id:t.source_id,review_state:t.review_state,source_type:t.source_type,
   alternate_spanish:t.alternative_es||[],provenance:t.provenance});
 }
 const sourceHash=createHash('sha256').update(JSON.stringify(raw)).digest('hex');
 return {schemaVersion:2,sourceId:raw.id,sourceHash,sourceNotice:raw.review_notice,
  labelsPolicy:'Natural spoken and displayed labels; source terms preserved as canonical_english / canonical_spanish.',
  reviewRequired:true,termCount:terms.length,terms,
  concepts:raw.concepts||[],contrasts:raw.contrasts||[],drills:raw.drills||[],
  dialogues:raw.dialogues||[],ethics_decisions:raw.ethics_decisions||[],
  abbreviations:raw.abbreviations||[],competencies:raw.competencies||[],sources:raw.sources||[]};
}
export function loadKnowledge(path='entre_voces_knowledge_base.json') {const bytes=readFileSync(path);return {...normalizeCorpus(JSON.parse(bytes)),sourceFileSha256:createHash('sha256').update(bytes).digest('hex')};}
export function searchKnowledge(knowledge,query,{domain='',limit=24}={}){
 const q=normalizeSpaces(query).toLocaleLowerCase();
 if(!q)return knowledge.terms.filter(t=>!domain||t.domain===domain).slice(0,limit);
 return knowledge.terms.filter(t=>(!domain||t.domain===domain)&&
  [t.english,t.spanish,t.canonical_english,t.canonical_spanish,...t.aliases_en,...t.aliases_es,t.context,t.category].some(x=>String(x||'').toLocaleLowerCase().includes(q))).slice(0,limit);
}
