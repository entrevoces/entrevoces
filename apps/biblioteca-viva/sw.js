/* Static, same-origin cache for GitHub Pages. Never caches API calls or cross-origin music. */
const CACHE='entre-voces-biblioteca-v2';
const SHELL=['./','./index.html','./media-app/style.css','./media-app/app.js','./media-app/audio-companion.js','./media-app/recommender.js','./media-app/voice-game.js','./media-data/knowledge.json','./media-data/production.json','./living-library/collection.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(async cache=>{for(const path of SHELL){try{await cache.add(new Request(path,{cache:'reload'}))}catch{/* one unavailable asset must not prevent app installation */}}}));self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(x=>x.startsWith('entre-voces-')&&x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 if(url.pathname.endsWith('.json')){event.respondWith(fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(cache=>cache.put(req,c))}return r}).catch(()=>caches.match(req)));return}
 if(req.destination==='audio'||url.pathname.includes('/audio/'))return; // audio ranges and licensing are handled by the browser
 event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(cache=>cache.put(req,c))}return r})));
});
