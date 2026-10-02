// Offline support for rarmas.cl/card/ only (scope: /card/).
// Network-first for the page so updates show up; cache-first for hashed build assets.
const CACHE = `card-v5:${new URL(self.registration.scope).pathname}`;
const SCOPE = new URL(self.registration.scope).pathname; // '/card/' or '/es/card/'
const PRECACHE = [SCOPE, '/rodo-armas.vcf', '/logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          // Only clean this scope's old caches (and pre-v5 names); the other language's card keeps its own.
          keys
            .filter((k) => k !== CACHE && (k.endsWith(`:${SCOPE}`) || !k.includes(':')))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' || url.pathname === '/rodo-armas.vcf') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(url.pathname === SCOPE.slice(0, -1) ? SCOPE : req, copy));
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match(SCOPE))),
    );
    return;
  }

  if (url.pathname.startsWith('/_astro/') || url.pathname === '/logo.png') {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
