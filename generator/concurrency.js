// Bounded independent work. On failure, stop scheduling, let in-flight work
// checkpoint, then reject. Never leave orphaned mutations behind a failed job.
export async function mapLimit(items,limit,work){
 const output=new Array(items.length);let cursor=0,failure=null;
 await Promise.all(Array.from({length:Math.min(Math.max(1,Math.trunc(limit)||1),items.length)},async()=>{
  while(!failure){const index=cursor++;if(index>=items.length)return;try{output[index]=await work(items[index],index);}catch(e){failure||=e;}}
 }));
 if(failure)throw failure;return output;
}
