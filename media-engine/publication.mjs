/** Public catalog is derived only from explicitly published, reviewed media. */
import {publicationGate} from './validation.mjs';
const PUBLIC_KEYS=['id','kind','title','synopsis','subtitle','audio','video','captions','sunoUrl','duration','language'];
export function publicItem(item){
 if(!item||typeof item!=='object'||!item.id)throw Error('Invalid media object');
 return Object.fromEntries(PUBLIC_KEYS.filter(key=>Object.hasOwn(item,key)).map(key=>[key,item[key]]));
}
export function publicCatalog(catalog,options={}){
 const items=[];
 for(const item of catalog.items||[]){
  if(item.status!=='published')continue;
  const gate=publicationGate(item,options);
  if(!gate.ok)throw Error(`Published media ${item.id} failed release gate: ${gate.errors.join('; ')}`);
  items.push(publicItem(item));
 }
 return {schemaVersion:1,notice:'Approved media only.',items};
}
