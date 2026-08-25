const CACHE_NAME = "ludo-live-shell-v3";
const APP_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || "You have a new Ludo Live notification." }; }
  event.waitUntil(self.registration.showNotification(payload.title || "Ludo Live", {
    body: payload.body || "You have a new update.", icon: payload.icon || "/icons/icon.svg", badge: payload.badge || "/icons/icon.svg",
    tag: payload.tag || "ludo-live", data: { url: payload.url || "/home" }, renotify: Boolean(payload.renotify)
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/home";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => "focus" in client);
    if (existing) return existing.navigate(target).then(() => existing.focus());
    return clients.openWindow(target);
  }));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.destination === "document") { event.respondWith(fetch(request, { cache: "no-store" })); return; }
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/") || url.pathname.includes("socket")) return;
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
