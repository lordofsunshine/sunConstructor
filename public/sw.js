const cache = 'sunconstructor-v5'
const files = ['/', '/manifest.webmanifest', '/favicon.svg?v=solar-c']
const devPattern = /^\/(@vite\/|@react-refresh|@fs\/|@id\/|src\/|node_modules\/)/
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cache).then((store) => store.addAll(files)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== cache).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request))
    return
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/')))
    return
  }
  if (devPattern.test(url.pathname)) {
    // dev modules change on every keystroke, caching them only serves stale code
    event.respondWith(fetch(event.request))
    return
  }
  event.respondWith(fetch(event.request).then((res) => {
    const copy = res.clone()
    caches.open(cache).then((c) => c.put(event.request, copy))
    return res
  }).catch(() => caches.match(event.request)))
})
