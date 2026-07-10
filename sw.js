/**
 * Basementen Aegis - Service Worker
 * Cache-first strategy: the app shell is precached on install so every load
 * (including fully offline) is served from cache. Updated files are fetched
 * in the background when a new service worker version installs; the page
 * shows an "update ready" toast and applies it on reload.
 *
 * Bump CACHE_VERSION whenever any precached file changes so clients pick up
 * the new build.
 */

const CACHE_VERSION = 'aegis-v23';

const PRECACHE_URLS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './dom.js',
    './state.js',
    './ui.js',
    './registry.js',
    './vault.js',
    './ciphers.js',
    './lucide.min.js',
    './qrcode.js',
    './argon2-bundled.min.js',
    './argon2-worker.js',
    './manifest.json',
    './fonts/fonts.css',
    './fonts/outfit.woff2',
    './fonts/jetbrains-mono.woff2',
    './icon.png',
    './icon-maskable.png',
    './logo.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    // No skipWaiting() here: the new version waits until the page opts in via
    // the SKIP_WAITING message (triggered by the "update ready" toast) so we
    // never swap assets out from under a running session.
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        // ignoreSearch: the HTML references some assets with cache-busting
        // query strings (e.g. icon.png?v=8); match them to the precached files.
        caches.match(event.request, { ignoreSearch: true }).then((cached) => {
            if (cached) return cached;

            return fetch(event.request).then((response) => {
                // Cache successful same-origin responses so anything not in the
                // precache list still becomes available offline after first use.
                if (response.ok && new URL(event.request.url).origin === self.location.origin) {
                    const copy = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
                }
                return response;
            });
        })
    );
});
