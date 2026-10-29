/** Explicit public projection: private creative prompts, model traces, rights receipts and reviewer identities stay in authoring storage. */
const select=(obj,keys)=>Object.fromEntries(keys.filter(key=>Object.hasOwn(obj||{},key)).map(key=>[key,obj[key]]));
const PUBLIC_KEYS=['id','kind','title','synopsis','subtitle','domain','direction','termIds','sourceIds','status','script','turns','errors','nodes','start','audio','cover','sunoUrl','lyrics','transcript','duration','reviewNotice','takeaway','language'];
export function publicItem(item){
 if(!item||typeof item!=='object'||!item.id)throw Error('Invalid media object');
 const projected=select(item,PUBLIC_KEYS);
 // Never share reviewer names or their credentials; only a narrow review flag.
 projected.review={bilingualApproved:item.review?.bilingualApproved===true,domainApproved:item.review?.domainApproved===true,editorialApproved:item.review?.editorialApproved===true};
 // Publicly show only original, user-shareable Suno creative prompt; never dump internal generation pipeline output.
 if(item.kind==='song'&&typeof item.prompts?.suno==='string')projected.prompts={suno:item.prompts.suno.slice(0,1000)};
 projected.productionStatus=item.audio?'recorded':item.sunoUrl?'external-audio':'script-only';
 return projected;
}
export function publicCatalog(catalog){return {schemaVersion:catalog.schemaVersion||1,notice:'Source-grounded draft fiction. Professional medical/legal bilingual review may still be pending.',items:(catalog.items||[]).map(publicItem)};}
