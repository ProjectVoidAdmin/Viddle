// Viddle AI — offline shell cache
// Caches the HTML page itself (and the WebLLM library it imports) so the
// app can open even with no network connection, the same way the model
// weights are already cached by the browser's Cache Storage.

const CACHE_NAME = 'viddle-shell-v1';
const SHELL_URLS = [
  './Viddle.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Network-first for the page shell and its script imports: if you're
// online, you always get the latest version and the cache quietly updates.
// If you're offline, it falls back to whatever was last cached.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests for the page itself and JS module imports
  // (e.g. the WebLLM library). Model weight fetches are left alone —
  // those are already handled by WebLLM's own Cache Storage usage.
  const isShellRequest =
    req.method === 'GET' &&
    (req.destination === 'document' || req.destination === 'script' || req.destination === '');

  if (!isShellRequest) return;

  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((networkResponse) => {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return networkResponse;
      })
      .catch(() => caches.match(req))
  );
});
