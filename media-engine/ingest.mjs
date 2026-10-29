/** Safe, offline intake: recorded audio/artwork exist only after an actual file and rights receipt. */
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join,dirname,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {validateProduction} from './validation.mjs';
export function detectAudio(bytes,ext){
 if(!Buffer.isBuffer(bytes)||bytes.length<44)return false;
 if(ext==='.wav')return bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE';
 if(ext==='.mp3')return bytes.toString('ascii',0,3)==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224);
 if(ext==='.m4a')return bytes.toString('ascii',4,8)==='ftyp';
 if(ext==='.ogg')return bytes.toString('ascii',0,4)==='OggS';
 return false;
}
export function ingestAudio(item,{input,outputRoot='apps/biblioteca-viva/media',rights,transcript=null}={}){
 if(!item||!item.id||!/^[a-z0-9-]{3,96}$/.test(item.id))throw Error('Invalid media ID');
 const ext=extname(input||'').toLowerCase();if(!['.wav','.mp3','.m4a','.ogg'].includes(ext))throw Error('Unsupported audio type');
 const bytes=readFileSync(input);if(bytes.length>60*1024*1024||!detectAudio(bytes,ext))throw Error('Audio file signature or size invalid');
 if(!rights?.creator||!rights?.license||!rights?.recordedAt||!rights?.authorization)throw Error('Rights receipt requires creator, license, date, authorization');
 const filename=`${item.id}${ext}`,rel=`media/${filename}`,out=join(outputRoot,filename);
 mkdirSync(dirname(out),{recursive:true});copyFileSync(input,out);
 const next={...item,audio:rel,rights:{status:'pending',...rights,sha256:createHash('sha256').update(bytes).digest('hex')},
  transcript,review:{...item.review,bilingualApproved:false},status:'audio-produced'};
 // Source or automated audio-text comparison is NOT human verification.
 return {item:next,artifact:out,sha256:next.rights.sha256,size:bytes.length};
}
export function markReviewed(item,{reviewer,credential,reviewDate,medicalLegalReviewed,languagePair,approved,notes}={}){
 if(!reviewer||!credential||!reviewDate||!languagePair||approved!==true)throw Error('Professional signoff with reviewer identity, credentials, date and approval is required');
 if(!medicalLegalReviewed)throw Error('Domain concept review must be documented');
 return {...item,review:{bilingualApproved:true,domainApproved:true,editorialApproved:true,reviewer,credential,reviewDate,languagePair,notes},status:item.audio?'bilingual-reviewed':'editorially-reviewed'};
}
