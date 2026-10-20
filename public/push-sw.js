// Imported into the generated service worker: shows reminder notifications.
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data && event.data.text() } }
  const scope = self.registration.scope
  event.waitUntil(self.registration.showNotification(data.title || 'THE SYSTEM', {
    body: data.body || '[Daily Quest has arrived.]',
    icon: scope + 'icon-192.png',
    badge: scope + 'icon-192.png',
    tag: data.tag || 'the-system',
    data: { url: data.url || scope },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
    for (const w of wins) if ('focus' in w) return w.focus()
    return self.clients.openWindow(url)
  }))
})
