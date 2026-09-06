/* Service worker – aby appka šla nainstalovat a fungovala i bez signálu */
const CACHE = "rodinny-kalendar-v1";
const SOUBORY = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SOUBORY)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;   // Firebase a fonty necháváme jít napřímo
  e.respondWith(
    fetch(e.request)
      .then(r => { const kopie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, kopie)); return r; })
      .catch(() => caches.match(e.request).then(m => m || caches.match("./")))
  );
});

/* kliknutí na upozornění otevře (nebo přepne na) appku */
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(okna => {
      for (const o of okna) { if (o.url.includes("/kalendar") && "focus" in o) return o.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});
