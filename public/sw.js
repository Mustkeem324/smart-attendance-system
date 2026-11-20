// APEX Electronics Enterprise Service Worker v1.0.0
const CACHE_NAME = 'apex-enterprise-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icon.svg',
  '/field-sales/mobile',
  '/distribution',
  '/catalog',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[APEX Service Worker] Pre-caching offline application shell');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[APEX Service Worker] Pre-cache warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[APEX Service Worker] Purging legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET requests (they are handled by offline sync queue engine)
  if (event.request.method !== 'GET') {
    return;
  }

  // 1. Static Assets (Cache-First)
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/employees/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        }).catch(() => caches.match('/icon.svg'));
      })
    );
    return;
  }

  // 2. Navigation & APIs (Network-First with Cache / Offline fallback)
  event.respondWith(
    fetch(event.request)
      .then((networkRes) => {
        if (networkRes.ok && event.request.mode === 'navigate') {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return networkRes;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // If it's a page navigation while offline, serve cached app shell
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('/field-sales/mobile') || await caches.match('/');
          if (fallback) return fallback;
        }

        return new Response(JSON.stringify({ offline: true, message: 'You are currently working in offline mode.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })
  );
});

// Handle Background Sync / Message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
