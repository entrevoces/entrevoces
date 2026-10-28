// Optional, explicitly invoked Modal-hosted Llama calibration on synthetic
// adversarial examples. Never treats model-to-model agreement as human review.
import {curriculumSource} from '../generator/curriculum-source.js';
import {compileCurriculum} from '../packages/engine-core/curriculum.js';
import {taskFromKnowledge} from '../services/spoken-gateway/assessment.js';

const cases=[
  {id:'medical-dose-es-faithful',domain:'medical',lang:'es',conceptId:'dose',direction:'forward',transcript:'Tome una dosis ahora y luego espere seis horas.',expected:'faithful'},
  {id:'medical-dose-es-time',domain:'medical',lang:'es',conceptId:'dose',direction:'forward',transcript:'Tome una dosis ahora y luego espere doce horas.',expected:'needs-repair'},
  {id:'medical-dose-es-language',domain:'medical',lang:'es',conceptId:'dose',direction:'forward',transcript:'Take one dose now, then wait six hours.',expected:'needs-repair'},
  {id:'medical-dosage-zh-faithful',domain:'medical',lang:'zh',conceptId:'dosage',direction:'forward',transcript:'请严格按照剂量方案服药，每天两次，每次一片，连服七天。',expected:'faithful'},
  {id:'medical-dosage-zh-frequency',domain:'medical',lang:'zh',conceptId:'dosage',direction:'forward',transcript:'请每天只服药一次，一片，连续七天。',expected:'needs-repair'},
  {id:'legal-waiver-es-faithful',domain:'legal',lang:'es',conceptId:'waiver',direction:'forward',transcript:'¿Comprende que al declararse culpable renuncia a su derecho a un juicio con jurado?',expected:'faithful'},
  {id:'legal-waiver-es-negation',domain:'legal',lang:'es',conceptId:'waiver',direction:'forward',transcript:'¿Entiende que si se declara culpable no renuncia al juicio con jurado?',expected:'needs-repair'},
  {id:'legal-probation-zh-time',domain:'legal',lang:'zh',conceptId:'sentence-conditions',direction:'forward',transcript:'您的判决条件要求您在24小时内向缓刑官报到。',expected:'needs-repair'},
  {id:'medical-dose-es-reverse-faithful',domain:'medical',lang:'es',conceptId:'dose',direction:'reverse',transcript:'Take one dose now, then wait six hours.',expected:'faithful'},
  {id:'legal-waiver-zh-reverse-omission',domain:'legal',lang:'zh',conceptId:'waiver',direction:'reverse',transcript:'Do you understand that you have a jury trial?',expected:'needs-repair'},
];

const args=process.argv.slice(2);
const dry=args.includes('--dry-run');
const limitIndex=args.indexOf('--limit');
const limit=limitIndex<0?cases.length:Number(args[limitIndex+1]);
if(!Number.isInteger(limit)||limit<1||limit>cases.length)throw Error(`--limit must be 1..${cases.length}`);
const knowledge=compileCurriculum(curriculumSource()).knowledge;
const selected=cases.slice(0,limit).map(c=>({...c,task:taskFromKnowledge(knowledge,c)}));
if(selected.some(c=>!c.task))throw Error('A calibration task has no approved bilingual source.');
if(dry){console.log(JSON.stringify({type:'synthetic-calibration-preview',cases:selected.map(({id,expected,task})=>({id,expected,sourceText:task.sourceText,direction:task.sourceLanguage+'->'+task.targetLanguage}))},null,2));process.exit(0);}
throw Error('Automatic meaning grading is disabled in the lightweight Meta MMS CPU deployment. Use Voice Lab for transcript review. --dry-run remains available for future human-labelled evaluation.');
const base=String(process.env.EV_SPOKEN_API_URL||'').replace(/\/+$/,'');
const code=process.env.EV_DEMO_ACCESS_CODE;
if(!/^https:\/\/[^/?#]+(?:\/[^?#]*)?$/.test(base)||!code)throw Error('Set EV_SPOKEN_API_URL (HTTPS Modal endpoint) and EV_DEMO_ACCESS_CODE to run billable open-weight calibration.');
const results=[];
for(const c of selected){
  try{
    const response=await fetch(`${base}/api/spoken/calibrate?taskId=${encodeURIComponent(c.task.taskId)}`,{
      method:'POST',headers:{'Content-Type':'application/json','X-EV-Access-Code':code},
      body:JSON.stringify({transcript:c.transcript}),signal:AbortSignal.timeout(180_000),
    });
    if(!response.ok)throw Error(`Modal calibration HTTP ${response.status}`);
    const {assessment}=await response.json();
    results.push({id:c.id,expected:c.expected,observed:assessment.verdict,correct:assessment.verdict===c.expected,confidence:assessment.confidence,feedback:assessment.feedback});
  }catch(e){results.push({id:c.id,expected:c.expected,observed:'error',correct:false,error:e.message});}
}
const accuracy=results.filter(x=>x.correct).length/results.length;
console.log(JSON.stringify({type:'synthetic-adversarial-assessment',model:'meta-llama/Llama-3.1-8B-Instruct on Modal',humanValidated:false,measuredAgreement:accuracy,passed:results.filter(x=>x.correct).length,total:results.length,results},null,2));
if(accuracy<.8)process.exitCode=1;
