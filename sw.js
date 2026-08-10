// ============================================================
//  E-Davetiye Service Worker — çevrimdışı kabuk + "ana ekrana ekle"
//  - Gezinme (navigate): önce ağ (taze HTML), çevrimdışı → önbellekteki sayfa.
//  - Aynı köken statik dosyalar (templates.json, ikon…): stale-while-revalidate.
//  - Çapraz köken (Firebase/gstatic/Firestore): dokunma, ağ geçsin.
//  Bir "#i=" davetiyesi kendi kendine yeter → kabuk önbellekteyse çevrimdışı açılır.
// ============================================================
const CACHE = "e-davetiye-v1";
const SHELL = [
  "./", "./index.html", "./studio.html", "./yanitlar.html",
  "./pricing.html", "./legal.html", "./templates.json", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Çapraz köken (Firebase SDK, Firestore, Storage) → müdahale etme.
  if (url.origin !== location.origin) return;

  // Gezinme istekleri: önce ağ, çevrimdışı → önbellekteki sayfa / kabuk.
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try { return await fetch(req); }
      catch (_) {
        const cache = await caches.open(CACHE);
        return (await cache.match(req, { ignoreSearch: true }))
          || (await cache.match("./index.html"))
          || Response.error();
      }
    })());
    return;
  }

  // Aynı köken statik varlıklar → stale-while-revalidate.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const net = fetch(req).then((r) => {
      if (r && r.status === 200 && r.type === "basic") cache.put(req, r.clone());
      return r;
    }).catch(() => null);
    return cached || (await net) || Response.error();
  })());
});
