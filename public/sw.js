const CACHE = 'rsms-reimagined-v4-1-20260924'
const APP_SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/') || url.port === '5001') return

  // Network-first prevents an older installed/local PWA cache from hiding new UI builds.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone()
          caches.open(CACHE).then(cache => cache.put(request.mode === 'navigate' ? '/' : request, copy))
        }
        return response
      })
      .catch(async () => {
        if (request.mode === 'navigate') return (await caches.match('/')) || Response.error()
        return (await caches.match(request)) || Response.error()
      })
  )
})
