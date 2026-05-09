// A minimal service worker to satisfy PWA install requirements
const CACHE_NAME = 'synced-cache-v1';

// We only cache the absolute bare minimum offline fallback shell
const urlsToCache = [
    '/'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// The magical Fetch listener. 
// Chrome DEMANDS this exists for a PWA, but we are telling it to just 
// fetch from the network normally so it doesn't break your WebSockets.
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});