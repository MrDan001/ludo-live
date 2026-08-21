const CACHE_NAME = "ludo-live-shell-v2";
const APP_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Documents must always come from the network so a browser refresh cannot
  // keep showing an older Home/app shell. The cache remains only a fallback
  // for non-document assets when offline.
  if (request.destination === "document") {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }
  // Keep live game/chat/socket data network-only.
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/") || url.pathname.includes("socket")) return;

  event.respondWith(
    fetch(request).then((response) => response).catch(() => caches.match(request))
  );
});
