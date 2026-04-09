// Minimal push-only service worker — no caching, no PWA interference
self.addEventListener('push', (event) => {
  let data = { title: 'Reminder', body: 'You have a reminder', url: '/' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    // fallback to defaults
  }

  const options = {
    body: data.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || 'reminder',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
