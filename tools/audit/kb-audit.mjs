// Inspect actual authored books, not demonstration concept counts.
import{readStore}from'../../generator/project.js';
const ids=['medical','legal','language-foundations'],store=readStore();
const reports=ids.map(volume=>{const job=[...store.jobs].reverse().find(j=>j.kind==='knowledge'&&j.input.libraryVolume===volume);if(!job)return{volume,status:'not-started',comprehensive:false};const acq=job.checkpoints.acquisition,book=job.checkpoints.handbookMetrics;return{volume,jobId:job.jobId,status:job.status,stage:job.stage,sources:acq?.sources?.length||0,passages:acq?.corpus?.passages?.length||0,coverage:acq?.coverageAudits?.at(-1)||null,concepts:job.checkpoints.knowledge?.concepts?.length||0,chapters:book?.chapters||0,words:book?.words||0,editorialVerdict:job.checkpoints.handbookAudit?.verdict||null,comprehensive:job.status==='succeeded'&&acq?.status==='ready'&&job.checkpoints.handbookAudit?.verdict==='accept',error:job.error||null};});
console.log(JSON.stringify({scope:'Actual interpreter library jobs. Model audit acceptance is not professional certification.',volumes:reports},null,2));
if(reports.some(r=>!r.comprehensive))process.exitCode=1;
