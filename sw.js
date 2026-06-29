self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request).catch(() => {
    if (event.request.mode === 'navigate') {
      return new Response('<!doctype html><meta charset="utf-8"><title>Offline</title><body><h1>Offline Mode</h1><p>The app is offline but still usable.</p></body>', {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    return new Response('Offline - resource unavailable', { status: 503, statusText: 'Offline' });
  }));
});
