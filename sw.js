// Bump CACHE whenever index.html, manifest.json, or the icons change.
// guide.md and CHANGELOG.md are always fetched fresh when online, so a content
// update never needs a cache bump.
const CACHE = 'mfg-v1';
const SHELL = ['./', './index.html', './manifest.json', './guide.md', './CHANGELOG.md',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first, fall back to cache. Keeps content current when online and
// fully usable with no signal.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(stripQuery(e.request), copy)); }
      return res;
    }).catch(() => caches.match(stripQuery(e.request)).then(r => r || caches.match('./index.html')))
  );
});
function stripQuery(req) { const u = new URL(req.url); u.search = ''; return u.toString(); }
