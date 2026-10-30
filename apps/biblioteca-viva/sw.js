/* Network-first so removed or unapproved media is not kept in an offline cache. */
self.addEventListener('install',event=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('entre-voces-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
