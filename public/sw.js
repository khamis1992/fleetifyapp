/**
 * Service Worker للتطبيق المتجاوب
 * يوفر التخزين المؤقت، العمل دون اتصال، والإشعارات
 */

const CACHE_NAME = 'fleetify-v1.0.0';
const STATIC_CACHE_NAME = 'fleetify-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'fleetify-dynamic-v1.0.0';

// الملفات الأساسية للتخزين المؤقت
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // إضافة الملفات الأساسية الأخرى
];

// الصفحات المهمة للتخزين المؤقت
const IMPORTANT_PAGES = [
  '/dashboard',
  '/customers',
  '/fleet',
  '/contracts',
  '/finance',
  '/reports'
];

// API endpoints للتخزين المؤقت
const API_CACHE_PATTERNS = [
  /\/api\/customers/,
  /\/api\/vehicles/,
  /\/api\/contracts/,
  /\/api\/dashboard/
];

// استراتيجيات التخزين المؤقت
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

/**
 * تثبيت Service Worker
 */
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // تخزين الملفات الثابتة
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // تخزين الصفحات المهمة
      caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
        console.log('📦 Service Worker: Pre-caching important pages');
        return cache.addAll(IMPORTANT_PAGES);
      })
    ]).then(() => {
      console.log('✅ Service Worker: Installation complete');
      // فرض التفعيل الفوري
      return self.skipWaiting();
    })
  );
});

/**
 * تفعيل Service Worker
 */
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // تنظيف الكاشات القديمة
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // السيطرة على جميع العملاء
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker: Activation complete');
    })
  );
});

/**
 * اعتراض الطلبات
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // تجاهل الطلبات غير HTTP/HTTPS
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // تحديد استراتيجية التخزين المؤقت
  const strategy = getCacheStrategy(request);
  
  event.respondWith(
    handleRequest(request, strategy)
  );
});

/**
 * تحديد استراتيجية التخزين المؤقت
 */
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  // الملفات الثابتة - Cache First
  if (request.destination === 'image' || 
      request.destination === 'style' || 
      request.destination === 'script' ||
      url.pathname.includes('/icons/') ||
      url.pathname.includes('/assets/')) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }
  
  // صفحات HTML - Stale While Revalidate
  if (request.destination === 'document' || 
      request.headers.get('accept')?.includes('text/html')) {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  // API calls - Network First مع fallback
  if (url.pathname.startsWith('/api/') || 
      API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // الافتراضي - Network First
  return CACHE_STRATEGIES.NETWORK_FIRST;
}

/**
 * معالجة الطلبات حسب الاستراتيجية
 */
async function handleRequest(request, strategy) {
  const cacheName = getCacheName(request);
  
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, cacheName);
      
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, cacheName);
      
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, cacheName);
      
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);
      
    case CACHE_STRATEGIES.CACHE_ONLY:
      return caches.match(request);
      
    default:
      return networkFirst(request, cacheName);
  }
}

/**
 * تحديد اسم الكاش
 */
function getCacheName(request) {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/api/')) {
    return DYNAMIC_CACHE_NAME;
  }
  
  if (request.destination === 'document') {
    return DYNAMIC_CACHE_NAME;
  }
  
  return STATIC_CACHE_NAME;
}

/**
 * استراتيجية Cache First
 */
async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache First error:', error);
    return getOfflineFallback(request);
  }
}

/**
 * استراتيجية Network First
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return getOfflineFallback(request);
  }
}

/**
 * استراتيجية Stale While Revalidate
 */
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const networkResponsePromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const cache = caches.open(cacheName);
      cache.then(c => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(() => null);
  
  return cachedResponse || networkResponsePromise || getOfflineFallback(request);
}

/**
 * صفحة الاحتياطية للوضع دون اتصال
 */
function getOfflineFallback(request) {
  const url = new URL(request.url);
  
  if (request.destination === 'document') {
    return new Response(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fleetify - غير متصل</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            text-align: center;
            direction: rtl;
          }
          .container {
            max-width: 400px;
            margin: 50px auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            line-height: 1.5;
          }
          .retry-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            margin-top: 20px;
          }
          .retry-btn:hover {
            background: #2563eb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">📱</div>
          <h1>غير متصل بالإنترنت</h1>
          <p>يبدو أنك غير متصل بالإنترنت. بعض الميزات قد لا تعمل بشكل صحيح.</p>
          <p>يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.</p>
          <button class="retry-btn" onclick="window.location.reload()">
            إعادة المحاولة
          </button>
        </div>
      </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  if (url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({
      error: 'غير متصل بالإنترنت',
      message: 'لا يمكن الوصول للبيانات في الوضع دون اتصال',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('غير متوفر دون اتصال', { status: 503 });
}

/**
 * معالجة الرسائل من التطبيق الرئيسي
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      cacheUrls(payload.urls);
      break;
      
    case 'CLEAR_CACHE':
      clearCache(payload.cacheName);
      break;
      
    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      });
      break;
  }
});

/**
 * تخزين URLs محددة
 */
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  return cache.addAll(urls);
}

/**
 * مسح كاش محدد
 */
async function clearCache(cacheName) {
  return caches.delete(cacheName || DYNAMIC_CACHE_NAME);
}

/**
 * حساب حجم الكاش
 */
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

/**
 * معالجة الإشعارات Push
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    dir: 'rtl',
    lang: 'ar',
    tag: data.tag || 'fleetify-notification',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * معالجة النقر على الإشعارات
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const { action, data } = event;
  let url = '/';
  
  if (action) {
    url = data?.actionUrls?.[action] || '/';
  } else if (data?.url) {
    url = data.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // البحث عن نافذة مفتوحة
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // فتح نافذة جديدة
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

/**
 * معالجة المزامنة في الخلفية
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // تنفيذ المزامنة
      performBackgroundSync()
    );
  }
});

/**
 * تنفيذ المزامنة في الخلفية
 */
async function performBackgroundSync() {
  try {
    // مزامنة البيانات المحلية مع الخادم
    console.log('🔄 Performing background sync...');
    
    // هنا يمكن إضافة منطق المزامنة
    // مثل رفع البيانات المحفوظة محلياً
    
    console.log('✅ Background sync completed');
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

console.log('🚀 Service Worker loaded successfully');
