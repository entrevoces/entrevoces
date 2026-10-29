/** Release readiness: inspect actual data and show shortages. Does not self-certify bilingual accuracy. */
import {auditScript,auditSeason} from './continuity.mjs';
import {coverageByFormat} from './recommender.mjs';
const ready=x=>!!(x.audio||x.externalAudio||x.sunoUrl);
export function releaseReadiness({legacy=[],production=[],knowledge,reviewRequired=true}={}){
 const all=[...legacy,...production],warnings=[],blockers=[];
 const stats={items:all.length,recordings:all.filter(x=>x.audio).length,externalMusic:all.filter(x=>x.externalAudio||x.sunoUrl).length,
  scripts:all.filter(x=>x.body||x.script||x.lyrics).length,professionalReview:all.filter(x=>x.review?.bilingualApproved&&x.review?.domainApproved).length,
  audioFirst:all.filter(x=>x.kind==='listen'||x.kind==='catch-the-change'||x.kind==='podcast'||x.kind==='audio-drama').length,
  naturallyUsableTerms:knowledge?.terms?.filter(x=>!/[()]/.test(x.english+' '+x.spanish)).length||0,terms:knowledge?.terms?.length||0};
 if(stats.terms!==865)blockers.push(`Expected 865 canonical medical/legal terms; got ${stats.terms}`);
 if(stats.naturallyUsableTerms!==stats.terms)blockers.push('Parenthesized labels remain in public terminology');
 if(stats.recordings<5)blockers.push('Historic local audio samples disappeared');
 if(stats.externalMusic<1)blockers.push('Existing Suno recording is missing');
 if(stats.items<33)blockers.push('Original library plus expanded scripts missing');
 if(stats.professionalReview<stats.items)warnings.push('Most content has not received independent professional bilingual/subject review');
 if(stats.audioFirst<=stats.recordings)warnings.push('Audio-first scripts need further production and alignment');
 const detailed=[];
 for(const x of production){
  const audit=auditScript(x,{minWords: x.status==='script-draft'&&x.kind==='catch-the-change'?160:x.status==='script-draft'?350:0,existing:production});
  const issues=[...audit.flags.map(f=>f.code),...(x.status==='published'&&!ready(x)?['published-without-playback']:[])];
  detailed.push({id:x.id,kind:x.kind,status:x.status,words:audit.wordCount,audible:ready(x),reviewed:!!(x.review?.bilingualApproved&&x.review?.domainApproved),issues});
  if(issues.length)warnings.push(`${x.id}: ${issues.join(', ')}`);
 }
 const coverage=coverageByFormat(all),season=auditSeason(all);
 const releaseCanBuild=blockers.length===0;
 const isProductionReady=releaseCanBuild&&warnings.length===0&&stats.professionalReview===stats.items;
 return {schemaVersion:1,releaseCanBuild,isProductionReady,stats,coverage,season,blockers,warnings,detail:detailed,
  verdict:isProductionReady?'human-review-complete-and-technical-gates-pass':releaseCanBuild?'engineering-preview-pending-media-and-human-review':'blocked',
  note:'This audit inspects files and metadata, not entertainment quality, medical correctness, external licensing, model inference or real-user behavior.'};
}
