const CACHE_NAME = 'cipher-craft-v8';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './ciphers.js',
  './app.js',
  './manifest.json',
  './logo.png',
  './icon.png',
  './icon.svg',
  'https://unpkg.com/lucide@latest'
];

// Install Event - Precache Assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Pre-caching static assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up Old Caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Cache First, Fallback to Network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Fallback to fetching from network
        return fetch(event.request).then(response => {
          // If response is valid, cache it for subsequent requests
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        }).catch(err => {
          console.warn('[Service Worker] Fetch failed, network unavailable:', err);
          // Return offline fallback if needed
        });
      })
  );
});
