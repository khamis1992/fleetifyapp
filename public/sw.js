/**
 * Service Worker - Caching Strategy for Static Assets
 * Implements intelligent caching for improved performance
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `fleetify-cache-${CACHE_VERSION}`;

// Cache duration in milliseconds
const CACHE_DURATION = {
  STATIC: 7 * 24 * 60 * 60 * 1000,  // 7 days
  API: 5 * 60 * 1000,                // 5 minutes
  IMAGE: 30 * 24 * 60 * 60 * 1000,   // 30 days
};

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only',
};

/**
 * Determine cache strategy based on request
 */
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  // API requests - Network first
  if (url.pathname.includes('/api/')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // JavaScript and CSS - Stale while revalidate
  if (request.destination === 'script' || request.destination === 'style') {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  // Images - Cache first
  if (request.destination === 'image') {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }
  
  // Fonts - Cache first
  if (request.destination === 'font') {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }
  
  // HTML - Network first
  if (request.destination === 'document') {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // Default - Stale while revalidate
  return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
}

/**
 * Install event - Cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service worker installed');
        return self.skipWaiting();
      })
  );
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - Implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome extensions
  if (request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  const strategy = getCacheStrategy(request);
  
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      event.respondWith(cacheFirst(request));
      break;
      
    case CACHE_STRATEGIES.NETWORK_FIRST:
      event.respondWith(networkFirst(request));
      break;
      
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      event.respondWith(staleWhileRevalidate(request));
      break;
      
    case CACHE_STRATEGIES.NETWORK_ONLY:
      event.respondWith(fetch(request));
      break;
      
    case CACHE_STRATEGIES.CACHE_ONLY:
      event.respondWith(caches.match(request));
      break;
      
    default:
      event.respondWith(staleWhileRevalidate(request));
  }
});

/**
 * Cache First Strategy
 * Good for: Images, fonts, static assets that don't change often
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    // Check if cache is still fresh
    const cacheTime = await getCacheTime(request.url);
    const now = Date.now();
    const maxAge = request.destination === 'image' ? CACHE_DURATION.IMAGE : CACHE_DURATION.STATIC;
    
    if (now - cacheTime < maxAge) {
      return cached;
    }
  }
  
  try {
    const response = await fetch(request);
    
    if (response && response.status === 200) {
      cache.put(request, response.clone());
      await setCacheTime(request.url);
    }
    
    return response;
  } catch (error) {
    // If network fails and we have cache, return it
    if (cached) {
      return cached;
    }
    
    // Return offline page or fallback
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network First Strategy
 * Good for: HTML pages, API calls
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch(request);
    
    if (response && response.status === 200) {
      cache.put(request, response.clone());
      await setCacheTime(request.url);
    }
    
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Stale While Revalidate Strategy
 * Good for: JavaScript, CSS, frequently updated assets
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  // Fetch in background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
        setCacheTime(request.url);
      }
      return response;
    })
    .catch(() => null);
  
  // Return cached immediately, update in background
  return cached || fetchPromise;
}

/**
 * Cache time tracking using IndexedDB
 */
async function setCacheTime(url) {
  try {
    const db = await openDB();
    const tx = db.transaction(['cache-times'], 'readwrite');
    const store = tx.objectStore('cache-times');
    await store.put({ url, timestamp: Date.now() });
  } catch (error) {
    console.error('[SW] Failed to set cache time:', error);
  }
}

async function getCacheTime(url) {
  try {
    const db = await openDB();
    const tx = db.transaction(['cache-times'], 'readonly');
    const store = tx.objectStore('cache-times');
    const record = await store.get(url);
    return record ? record.timestamp : 0;
  } catch (error) {
    console.error('[SW] Failed to get cache time:', error);
    return 0;
  }
}

/**
 * Open IndexedDB for cache time tracking
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fleetify-sw-cache', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('cache-times')) {
        db.createObjectStore('cache-times', { keyPath: 'url' });
      }
    };
  });
}

/**
 * Message event - Handle commands from main thread
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME)
      .then(() => {
        console.log('[SW] Cache cleared');
        event.ports[0].postMessage({ success: true });
      });
  }
  
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    getCacheSize()
      .then((size) => {
        event.ports[0].postMessage({ size });
      });
  }
});

/**
 * Get total cache size
 */
async function getCacheSize() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  let totalSize = 0;
  
  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const blob = await response.blob();
      totalSize += blob.size;
    }
  }
  
  return totalSize;
}

console.log('[SW] Service worker loaded');
