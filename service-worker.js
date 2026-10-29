const CACHE_NAME = 'elite-football-manager-v3';
// The whole app is one page with no external scripts, so the shell is all that needs caching.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './background.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate' || new URL(req.url).pathname.endsWith('/index.html') || new URL(req.url).pathname.endsWith('/');

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (isPage) {
      // Pages: try the network first so updates appear straight away; use the saved copy only when offline.
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put('./index.html', res.clone()).catch(() => {});
        return res;
      } catch (err) {
        const shell = await cache.match('./index.html');
        if (shell) return shell;
        throw err;
      }
    }
    // Other files (icons, background, manifest): use the saved copy when present.
    const cached = await cache.match(req);
    if (cached) return cached;
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  })());
});
