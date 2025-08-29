// Service Worker for Fleetify - Enhanced Performance Caching
const CACHE_NAME = 'fleetify-v1.2.0';
const STATIC_CACHE = 'fleetify-static-v1.2.0';
const DYNAMIC_CACHE = 'fleetify-dynamic-v1.2.0';

// Critical resources to cache immediately
const CRITICAL_ASSETS = [
  '/',
  '/manifest.json',
  '/assets/index.css',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;600;700&display=swap'
];

// Assets to cache on demand
const CACHE_PATTERNS = [
  /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
  /^https:\/\/.*\.supabase\.co/,
  /\.(?:js|css|woff2?|ttf|eot)$/,
  /\/assets\//
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => 
        cache.addAll(CRITICAL_ASSETS.filter(asset => !asset.includes('index.css')))
      ),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then(cacheNames => 
        Promise.all(
          cacheNames
            .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map(name => caches.delete(name))
        )
      ),
      // Claim all clients immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - cache strategy based on request type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;

  // Skip Supabase realtime connections
  if (url.hostname.includes('supabase') && url.pathname.includes('realtime')) return;

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Strategy 1: Cache First for static assets
    if (isStaticAsset(url)) {
      return await cacheFirst(request, STATIC_CACHE);
    }

    // Strategy 2: Network First for API calls
    if (isApiCall(url)) {
      return await networkFirst(request, DYNAMIC_CACHE);
    }

    // Strategy 3: Stale While Revalidate for pages
    if (isPageRequest(url)) {
      return await staleWhileRevalidate(request, DYNAMIC_CACHE);
    }

    // Default: Network only
    return await fetch(request);

  } catch (error) {
    console.warn('SW: Fetch failed for', request.url, error);
    
    // Fallback to cache if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Ultimate fallback for navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/');
      if (fallback) return fallback;
    }

    throw error;
  }
}

// Cache First Strategy - for static assets
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  const response = await fetch(request);
  
  if (response.ok) {
    cache.put(request, response.clone());
  }
  
  return response;
}

// Network First Strategy - for API calls
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful responses for short time
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Stale While Revalidate - for pages and dynamic content
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  
  return cached || fetchPromise;
}

// Helper functions
function isStaticAsset(url) {
  return CACHE_PATTERNS.some(pattern => pattern.test(url.href)) ||
         url.pathname.includes('/assets/') ||
         url.hostname.includes('fonts.g');
}

function isApiCall(url) {
  return url.pathname.includes('/api/') ||
         url.hostname.includes('supabase.co') ||
         url.pathname.includes('/rest/') ||
         url.pathname.includes('/functions/');
}

function isPageRequest(url) {
  return url.pathname === '/' ||
         url.pathname.includes('/dashboard') ||
         url.pathname.includes('/auth') ||
         !url.pathname.includes('.');
}

// Background sync for critical actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // Handle queued actions when connection is restored
  console.log('SW: Background sync triggered');
}

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    getCacheSize().then(size => {
      event.ports[0].postMessage({ cacheSize: size });
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearOldCaches().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const size = parseInt(response.headers.get('content-length') || '0');
        totalSize += size;
      }
    }
  }
  
  return totalSize;
}

async function clearOldCaches() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    !name.includes('v1.2.0')
  );
  
  return Promise.all(oldCaches.map(name => caches.delete(name)));
}