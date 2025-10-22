/**
 * Fleetify Service Worker
 * 
 * Handles:
 * - Offline caching strategy
 * - Background sync
 * - Push notifications (future)
 */

const CACHE_NAME = 'fleetify-v1';
const RUNTIME_CACHE = 'fleetify-runtime';

// Cache TTL for API responses (5 minutes in milliseconds)
const API_CACHE_TTL = 5 * 60 * 1000;

// Critical assets to cache on install
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Helper function to check if cached response is expired
function isCacheExpired(cachedResponse) {
  if (!cachedResponse) return true;

  const cachedTime = cachedResponse.headers.get('sw-cache-time');
  if (!cachedTime) return true;

  const age = Date.now() - parseInt(cachedTime, 10);
  return age > API_CACHE_TTL;
}

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching critical assets');
      return cache.addAll(CRITICAL_ASSETS);
    })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - network first, falling back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Network-first strategy for API calls with cache expiration
  if (request.url.includes('/api/') || request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache failed responses
          if (!response || response.status !== 200) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Add cache timestamp header and cache successful API responses
          caches.open(RUNTIME_CACHE).then((cache) => {
            // Create new response with cache timestamp
            responseToCache.blob().then((body) => {
              const headers = new Headers(responseToCache.headers);
              headers.set('sw-cache-time', Date.now().toString());

              const cachedResponse = new Response(body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
              });

              cache.put(request, cachedResponse);
            });
          });

          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails, but only if not expired
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse && !isCacheExpired(cachedResponse)) {
              return cachedResponse;
            }
            // If cache is expired or doesn't exist, return error
            return new Response('Network error and no valid cache available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        })
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Don't cache failed responses
        if (!response || response.status !== 200) {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Cache the fetched resource
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync event (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Push notification event (future enhancement)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'إشعار جديد',
    icon: '/lovable-uploads/7453c280-3175-4ccf-a73b-24921ec5990b.png',
    badge: '/lovable-uploads/7453c280-3175-4ccf-a73b-24921ec5990b.png',
    vibrate: [200, 100, 200],
    dir: 'rtl',
    lang: 'ar',
  };

  event.waitUntil(
    self.registration.showNotification('Fleetify', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Helper function for background sync
async function syncData() {
  // This will be implemented when IndexedDB offline storage is added
  console.log('[Service Worker] Background sync triggered');
}

console.log('🔧 Service Worker: Loaded successfully');