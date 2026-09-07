const CACHE_NAME="ludo-dbase-admin-v1";
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(["/dbase/install","/dbase/login"])).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url);if(u.origin!==self.location.origin||!u.pathname.startsWith("/dbase"))return;e.respondWith(fetch(e.request,{cache:"no-store"}).catch(()=>caches.match(e.request)))});
