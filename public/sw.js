// MusicSync Progressive Web App Service Worker
const CACHE_NAME = 'musicsync-cache-v3';

// Essential assets to cache on install for instant loading and offline shell
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/musicsync-icon-192.png',
  '/musicsync-icon-512.png',
  '/musicsync-icon.svg',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/musicsync-logo.png'
];

// Optional push notifications (Monetag) safely wrapped
try {
  self.options = {
    domain: '5gvci.com',
    zoneId: 11821878
  };
  self.lary = '';
  // Only import when online and reachable
  if (navigator.onLine) {
    importScripts('https://5gvci.com/act/files/service-worker.min.js?r=sw');
  }
} catch (err) {
  // Gracefully continue without breaking PWA functionality
  console.debug('Push notification worker script deferred:', err);
}

// 1. Install Event: Cache essential shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up outdated caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Smart strategy with live streaming/socket bypass
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Bypass WebSockets, Socket.IO, API audio streams, and dynamic data
  if (
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/stream') ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:'
  ) {
    return;
  }

  // Bypass external non-asset requests (e.g. ad networks, analytics)
  if (url.origin !== self.location.origin) {
    // Exception: Google fonts stylesheets or web fonts can be cached
    if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
            }
            return networkResponse;
          }).catch(() => cachedResponse);
        })
      );
    }
    return;
  }

  // A. Navigation requests (HTML pages): Network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const fallback = await caches.match('/index.html');
          return fallback || new Response('Offline - MusicSync requires a connection to join rooms.', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // B. Static Assets (CSS, JS, Images, Icons, SVG): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Handle client messages (e.g., skipWaiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
