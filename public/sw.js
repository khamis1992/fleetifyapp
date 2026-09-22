/**
 * Fleetify Service Worker
 *
 * Handles:
 * - Emergency cleanup of stale caches that pinned outdated JS builds
 * - Self-unregistration: the app no longer relies on a service worker.
 *   Old registrations served stale chunks (cache-first) and shipped
 *   broken queries to users; this version removes itself and its caches.
 * - Push notification stubs kept only so old clients don't error.
 */

const CACHE_NAME = 'fleetify-cleanup-v3';
const STALE_CACHE_PREFIXES = ['fleetify'];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing cleanup worker...');
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

// Activate: delete every legacy cache, claim clients, then unregister self.
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating cleanup, wiping legacy caches...');
  event.waitUntil(
    (async () => {
      if ('caches' in self) {
        const names = await caches.keys();
        await Promise.all(
          names.map((name) => {
            const legacy =
              STALE_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)) ||
              name !== CACHE_NAME;
            if (legacy) {
              console.log('[Service Worker] Deleting cache:', name);
              return caches.delete(name);
            }
            return undefined;
          })
        );
      }
      await self.clients.claim();
      // Remove this service worker so no future request is intercepted.
      try {
        await self.registration.unregister();
        console.log('[Service Worker] Unregistered itself.');
        const clientList = await self.clients.matchAll({ type: 'window' });
        clientList.forEach((client) => {
          client.postMessage({ type: 'SW_CLEANUP_DONE' });
        });
      } catch (error) {
        console.warn('[Service Worker] Unregister failed:', error);
      }
    })()
  );
});

// Fetch: pure pass-through. Never intercept; let the browser use its
// normal HTTP cache with proper revalidation headers from the origin.
self.addEventListener('fetch', (event) => {
  return;
});

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notification event (future enhancement)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'إشعار جديد',
    icon: '/uploads/7453c280-3175-4ccf-a73b-24921ec5990b.png',
    badge: '/uploads/7453c280-3175-4ccf-a73b-24921ec5990b.png',
    vibrate: [200, 100, 200],
    dir: 'rtl',
    lang: 'ar',
  };

  event.waitUntil(
    self.registration.showNotification('Fleetify', options)
  );
});

// Notification click event (future enhancement)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

console.log('🔧 Service Worker: cleanup build loaded');