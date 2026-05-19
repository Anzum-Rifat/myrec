const CACHE_NAME = 'recovery-app-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/icon.png'
];

// ফাইলগুলো অফলাইনের জন্য সেভ করা হচ্ছে
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

// ইন্টারনেট না থাকলে সেভ করা ফাইলগুলো দেখাবে
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});