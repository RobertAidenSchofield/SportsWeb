// Sports Digest Service Worker
const CACHE_NAME = 'sports-digest-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
];

// Install: Pre-cache essential shell assets safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          // Non-fatal if optional asset fails
        }
      }
    })
  );
  self.skipWaiting();
});

// Activate: Clean up older caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first for dynamic content with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Don't intercept Supabase auth, POST/PUT/DELETE requests or browser extensions
  if (
    request.method !== 'GET' ||
    !request.url.startsWith('http') ||
    request.url.includes('/api/auth') ||
    request.url.includes('supabase.co')
  ) {
    return;
  }

  // Static icons & fonts: Cache-first
  if (request.url.includes('/icons/') || request.url.includes('/fonts/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((res) => {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
            return res;
          })
        );
      })
    );
    return;
  }

  // HTML Page Navigation: Network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match('/');
        });
      })
    );
    return;
  }

  // General assets: Network-first
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (!res || res.status !== 200 || res.type !== 'basic') {
          return res;
        }
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
