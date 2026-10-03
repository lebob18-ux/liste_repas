// Service worker : l'app s'ouvre même sans réseau
const V = 'hf-v1';
const BASE = ['./', 'index.html', 'config.js', 'manifest.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(BASE)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => clients.claim()));
});
// Réseau d'abord, mais bascule sur le cache après 2,5 s (magasin avec mauvais réseau)
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || !(u.origin === location.origin || u.hostname === 'cdn.jsdelivr.net')) return;
  e.respondWith((async () => {
    const c = await caches.open(V);
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
    net.catch(() => {});
    const cached = await c.match(e.request, { ignoreSearch: true });
    if (!cached) return net;
    return Promise.race([net, new Promise(r => setTimeout(() => r(cached), 2500))]).catch(() => cached);
  })());
});
