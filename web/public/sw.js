// KILO PWA Service Worker
// Minimal service worker for PWA installability

const CACHE_NAME = 'kilo-v1';

// Install event - activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Fetch event - network-first strategy (minimal offline support)
self.addEventListener('fetch', (event) => {
  // Let the browser handle all requests normally
  // This minimal service worker enables PWA installability
  // without complex offline caching
  return;
});
