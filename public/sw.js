// Advanced Service Worker for Performance Optimization
const CACHE_NAME = 'fleetify-v1.0.0';
const STATIC_CACHE_NAME = 'fleetify-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'fleetify-dynamic-v1.0.0';
const IMAGE_CACHE_NAME = 'fleetify-images-v1.0.0';

// Define what to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Critical CSS and JS will be added during build
];

const CACHE_STRATEGIES = {
  static: 'CacheFirst',
  api: 'NetworkFirst', 
  images: 'CacheFirst',
  documents: 'StaleWhileRevalidate'
};

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('🔧 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🔧 Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== IMAGE_CACHE_NAME) {
              console.log('🔧 Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip POST requests and non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Static assets - Cache First
    if (isStaticAsset(url)) {
      return await cacheFirst(request, STATIC_CACHE_NAME);
    }
    
    // Images - Cache First with fallback
    if (isImage(url)) {
      return await cacheFirstWithFallback(request, IMAGE_CACHE_NAME);
    }
    
    // API calls - Network First
    if (isApiCall(url)) {
      return await networkFirst(request, DYNAMIC_CACHE_NAME);
    }
    
    // Documents - Stale While Revalidate
    if (isDocument(request)) {
      return await staleWhileRevalidate(request, DYNAMIC_CACHE_NAME);
    }
    
    // Default to network
    return await fetch(request);
    
  } catch (error) {
    console.error('🔧 Service Worker: Fetch error:', error);
    
    // Return cached version if available
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return await caches.match('/index.html');
    }
    
    throw error;
  }
}

// Cache First strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    // Update cache in background
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    }).catch(() => {});
    
    return cached;
  }
  
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

// Cache First with offline fallback
async function cacheFirstWithFallback(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Only cache successful image responses
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return a placeholder image for failed image loads
    return new Response(
      '<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" fill="#9ca3af">صورة غير متاحة</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

// Network First strategy
async function networkFirst(request, cacheName, timeout = 3000) {
  const cache = await caches.open(cacheName);
  
  try {
    // Try network with timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      )
    ]);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
    
  } catch (error) {
    console.log('🔧 Service Worker: Network failed, trying cache:', error.message);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Stale While Revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Always try to update in background
  const networkUpdate = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {});
  
  // Return cached version immediately if available
  if (cached) {
    return cached;
  }
  
  // Wait for network if no cache
  return await networkUpdate;
}

// Helper functions
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|woff2|woff|ttf|eot)$/);
}

function isImage(url) {
  return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/);
}

function isApiCall(url) {
  return url.pathname.startsWith('/api/') || 
         url.hostname.includes('supabase') ||
         url.pathname.includes('rest/v1/');
}

function isDocument(request) {
  return request.mode === 'navigate' || 
         request.headers.get('accept')?.includes('text/html');
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('🔧 Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(processOfflineActions());
  }
});

async function processOfflineActions() {
  // Process any queued offline actions
  try {
    const offlineActions = await getOfflineActions();
    for (const action of offlineActions) {
      await processAction(action);
    }
    await clearOfflineActions();
  } catch (error) {
    console.error('🔧 Service Worker: Error processing offline actions:', error);
  }
}

async function getOfflineActions() {
  // Retrieve offline actions from IndexedDB
  return [];
}

async function processAction(action) {
  // Process individual offline action
  console.log('🔧 Service Worker: Processing offline action:', action);
}

async function clearOfflineActions() {
  // Clear processed offline actions
  console.log('🔧 Service Worker: Cleared offline actions');
}

// Push notification handling
self.addEventListener('push', event => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: data.data,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const data = event.notification.data;
  if (data && data.url) {
    event.waitUntil(
      clients.openWindow(data.url)
    );
  }
});

// Periodic background sync
self.addEventListener('periodicsync', event => {
  if (event.tag === 'content-sync') {
    event.waitUntil(syncContent());
  }
});

async function syncContent() {
  console.log('🔧 Service Worker: Periodic sync triggered');
  // Sync critical data in background
}

console.log('🔧 Service Worker: Loaded successfully');