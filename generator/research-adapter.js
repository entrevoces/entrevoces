// Search capability belongs to the local research agent. The host separately
// retrieves and audits candidate documents; search results are never evidence.
import {runAgent}from'./agent-runner.js';
export function parseResearchResult({value,trace},{query='',topicId=null}={}){
 if(!trace?.completed||!trace.searchCalls?.length)throw Object.assign(new Error('No observed web search execution; guessed bibliography refused.'),{code:'search-not-executed'});
 if(!Array.isArray(value?.sources)||value.sources.length>20)throw new Error('Research output needs a bounded sources array.');
 const citations=[];
 for(const source of value.sources){let url;try{url=new URL(source.url);}catch{throw new Error('Invalid source URL.');}if(url.protocol!=='https:'||url.username||url.password)throw new Error('Source candidates must use public HTTPS.');if(!citations.some(s=>s.url===url.href))citations.push({url:url.href,title:String(source.title||url.hostname),fit:String(source.fit||''),provenance:'agent-discovered-after-observed-search; host retrieval required'});}
 return{query,topicId,responseId:null,runtime:'local-agent',searchCalls:trace.searchCalls,citations,text:String(value.summary||''),rawOutput:[],workspace:trace.workspace};
}
export async function searchSources({query,instructions='',topicId=null,signal,onEvent}={}, {run=runAgent}={}){
 if(typeof query!=='string'||!query.trim())throw new Error('Search query required.');
 const result=await run({task:'source-discovery',search:true,signal,onEvent,system:`Search the web for this topic using the web search tool. Prefer primary authoritative sources. Return {summary:string,sources:[{url,title,fit}]}. Only list sources actually found during this search. No professional synthesis or invented URLs. ${instructions}`,user:{query,topicId}});
 return parseResearchResult(result,{query,topicId});
}
