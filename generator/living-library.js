// Validates authored media before inclusion in the static library. No provider calls.
import {existsSync} from 'node:fs';
import {resolve,relative} from 'node:path';
const KINDS=new Set(['listen','telenovela','branching','story','song','film']);
export function validateCollection(collection,{assetRoot='apps/living-library'}={}){
 const errors=[],ids=new Set(),root=resolve(assetRoot);
 if(!collection||collection.schemaVersion!==1||!Array.isArray(collection.items))return ['Expected a version 1 collection with an items array.'];
 for(const item of collection.items){
  if(!item||typeof item!=='object'){errors.push('An item is not an object.');continue}
  const id=item.id;
  if(typeof id!=='string'||! /^[a-z0-9-]+$/.test(id)||ids.has(id))errors.push(`Invalid or duplicate ID: ${id}`);else ids.add(id);
  if(!KINDS.has(item.kind)||typeof item.title!=='string'||!item.title.trim())errors.push(`${id}: missing title or unsupported kind.`);
  if(item.audio){const path=typeof item.audio==='string'?resolve(root,item.audio):root;if(typeof item.audio!=='string'||!/^audio\/[a-z0-9-]+\.(mp3|m4a|wav)$/.test(item.audio)||relative(root,path).startsWith('..')||!existsSync(path))errors.push(`${id}: missing or unsafe audio.`)}
  if(item.externalAudio){try{const url=new URL(item.externalAudio.url);if(url.protocol!=='https:'||url.hostname!=='suno.com'||!url.pathname.startsWith('/s/'))throw Error();}catch{errors.push(`${id}: unsupported external audio URL.`)}}
  if(item.kind==='listen'&&['source','render','bad','tip'].some(key=>typeof item[key]!=='string'||!item[key].trim()))errors.push(`${id}: incomplete listening comparison.`);
  if(item.kind==='branching'){
   const nodes=item.nodes||{};if(!Object.hasOwn(nodes,item.start))errors.push(`${id}: missing start node.`);
   for(const [name,node] of Object.entries(nodes))if(!node||typeof node.text!=='string'||!Array.isArray(node.choices)||node.choices.some(c=>!c.label||!Object.hasOwn(nodes,c.next)))errors.push(`${id}: invalid node ${name}.`);
  }
  if(item.kind==='song'&&(!item.lyrics||!item.prompt))errors.push(`${id}: missing song concept.`);
  if(['film','story','telenovela'].includes(item.kind)&&!item.body)errors.push(`${id}: missing authored body.`);
 }
 return errors;
}
