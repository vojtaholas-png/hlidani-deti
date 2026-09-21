/* Service worker – aby appka šla nainstalovat a fungovala i bez signálu */
const CACHE = "rodinny-kalendar-v2";
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
      if (self.clients.openWindow) return self.clients.openWindow((e.notification.data && e.notification.data.url) || "./");
    })
  );
});

/* přijatá upozornění z Workeru — dorazí, i když je appka zavřená */
self.addEventListener("push", e => {
  let d = { titulek: "Rodinný kalendář", text: "Něco se změnilo", url: "./" };
  try { if (e.data) d = Object.assign(d, e.data.json()); } catch (_) {
    try { d.text = e.data.text(); } catch (__) {}
  }
  e.waitUntil(self.registration.showNotification(d.titulek, {
    body: d.text,
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: d.titulek,
    renotify: true,
    vibrate: [80, 40, 80],
    data: { url: d.url || "./" }
  }));
});

/* když push službě vyprší odběr, přihlásíme se znovu při dalším otevření appky */
self.addEventListener("pushsubscriptionchange", e => {
  e.waitUntil(self.registration.showNotification("Rodinný kalendář", {
    body: "Otevři appku, ať se upozornění znovu přihlásí.",
    icon: "icon-192.png", badge: "icon-192.png", data: { url: "./" }
  }));
});
