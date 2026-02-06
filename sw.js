const CACHE_NAME = 'contentdeck-v4.0.0';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './ai.js',
  './stats.js',
  './icon.svg',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Always go to network for Supabase API calls and OpenRouter
  if (e.request.url.includes('supabase') || e.request.url.includes('openrouter.ai')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first for app assets
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
