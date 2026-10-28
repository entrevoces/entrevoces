// Structural reuse of existing content. No generated definitions or translations.
import{readFileSync,existsSync}from'node:fs';import{fileURLToPath}from'node:url';import{join}from'node:path';import*as core from'../packages/engine-core/index.js';
const root=fileURLToPath(new URL('../',import.meta.url));
export function curriculumSource(){
 const medical={...structuredClone(core.OREGON_MEDICAL),domainId:'medical',label:{en:'Medical interpreting'},jurisdiction:{country:'cross-jurisdictional',region:'Source-specific clinical and institutional context'}};
 const legal={...structuredClone(core.OREGON_LEGAL),domainId:'legal',label:{en:'Legal interpreting'},jurisdiction:{country:'cross-jurisdictional',region:'Legal rules retain their source jurisdiction'}};
 const foundations={...medical,domainId:'language-foundations',profession:'other',label:{en:'Interpreting foundations'},translationAreas:[{areaId:'interpreting-practice',label:{en:'Interpreting practice'},prerequisiteAreaIds:[],riskIfMistranslated:'high'}]};
 const concepts=[...core.SEED_CONCEPTS_BY_DOMAIN['oregon-medical'].map(c=>({...structuredClone(c),domainId:'medical',originDomainId:c.domainId})),...core.SEED_CONCEPTS_BY_DOMAIN['oregon-legal'].map(c=>({...structuredClone(c),domainId:'legal',originDomainId:c.domainId}))];
 const taxonomy=readFileSync(join(root,'docs/research/interpreter-skill-taxonomy.md'),'utf8');
 for(const line of taxonomy.split('\n')){
  const match=line.match(/^\| S(\d+) \| \*\*(.+?)\*\* — (.+?) \| (.+?) \|/);if(!match)continue;
  const[,number,term,definition,consequence]=match;
  concepts.push({conceptId:`interpreting-skill-${number}`,domainId:foundations.domainId,areaIds:['interpreting-practice'],terms:{en:{term,alternatives:[],register:'professional practice'}},definition:{en:definition},whyItMatters:consequence,difficulty:2,evidenceStages:[3,5,8],competences:[],sourceIds:['existing-interpreter-skill-taxonomy'],examples:[],distinctions:[],misconceptions:[],unresolved:['Reused existing research notes; not a newly verified professional standard. Spanish/Chinese equivalents are not established in this source.'],provenance:{path:'docs/research/interpreter-skill-taxonomy.md',kind:'existing-pedagogical-notes'}});
 }
 const path=join(root,'knowledge/imports/language-access/knowledgebase.json'),books=[];
 if(existsSync(path)){const kb=JSON.parse(readFileSync(path));concepts.push(...kb.draft.concepts.map(c=>({...structuredClone(c),domainId:foundations.domainId,sourceIds:[kb.source.sourceId],referenceOnly:true,provenance:{source:kb.source,kind:'historical-reviewed-draft'}})));books.push({id:'language-access',title:kb.source.title,path:'books/language-access/handbook.md',conceptIds:kb.draft.concepts.map(c=>c.conceptId),scope:'Historical handbook on language-access planning. Its institutional and jurisdiction-specific guidance is optional reference, not the organizing principle of this curriculum.'});}
 return{domains:[medical,legal,foundations],concepts,books};
}
