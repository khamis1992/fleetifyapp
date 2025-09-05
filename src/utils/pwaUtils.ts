/**
 * أدوات PWA (Progressive Web App)
 * إدارة Service Worker، التخزين المؤقت، والإشعارات
 */

interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: any;
}

/**
 * تسجيل Service Worker
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker غير مدعوم في هذا المتصفح');
    return null;
  }

  try {
    console.log('🔧 تسجيل Service Worker...');
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('✅ تم تسجيل Service Worker بنجاح:', registration.scope);

    // التحقق من التحديثات
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        console.log('🔄 تم العثور على تحديث Service Worker');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('📦 تحديث Service Worker جاهز');
            // يمكن إظهار رسالة للمستخدم لإعادة تحميل الصفحة
            showUpdateAvailableNotification();
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('❌ فشل في تسجيل Service Worker:', error);
    return null;
  }
};

/**
 * إلغاء تسجيل Service Worker
 */
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const result = await registration.unregister();
      console.log('🗑️ تم إلغاء تسجيل Service Worker:', result);
      return result;
    }
    return false;
  } catch (error) {
    console.error('❌ فشل في إلغاء تسجيل Service Worker:', error);
    return false;
  }
};

/**
 * إرسال رسالة إلى Service Worker
 */
export const sendMessageToSW = (message: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) {
      reject(new Error('لا يوجد Service Worker نشط'));
      return;
    }

    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
};

/**
 * فرض تحديث Service Worker
 */
export const forceServiceWorkerUpdate = async (): Promise<void> => {
  if (!navigator.serviceWorker.controller) {
    return;
  }

  try {
    await sendMessageToSW({ type: 'SKIP_WAITING' });
    window.location.reload();
  } catch (error) {
    console.error('❌ فشل في فرض تحديث Service Worker:', error);
  }
};

/**
 * إدارة تثبيت التطبيق (PWA)
 */
export class PWAInstallManager {
  private deferredPrompt: PWAInstallPrompt | null = null;
  private isInstalled = false;

  constructor() {
    this.init();
  }

  private init() {
    // التحقق من حالة التثبيت
    this.checkInstallStatus();

    // الاستماع لحدث beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as any;
      console.log('💾 PWA قابل للتثبيت');
    });

    // الاستماع لحدث appinstalled
    window.addEventListener('appinstalled', () => {
      console.log('✅ تم تثبيت PWA');
      this.isInstalled = true;
      this.deferredPrompt = null;
    });
  }

  private checkInstallStatus() {
    // التحقق من وضع standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
    }

    // التحقق من navigator.standalone (iOS)
    if ((navigator as any).standalone === true) {
      this.isInstalled = true;
    }
  }

  /**
   * التحقق من إمكانية التثبيت
   */
  canInstall(): boolean {
    return this.deferredPrompt !== null && !this.isInstalled;
  }

  /**
   * التحقق من حالة التثبيت
   */
  isAppInstalled(): boolean {
    return this.isInstalled;
  }

  /**
   * عرض مطالبة التثبيت
   */
  async showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.canInstall()) {
      return 'unavailable';
    }

    try {
      await this.deferredPrompt!.prompt();
      const { outcome } = await this.deferredPrompt!.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ المستخدم قبل تثبيت PWA');
      } else {
        console.log('❌ المستخدم رفض تثبيت PWA');
      }

      this.deferredPrompt = null;
      return outcome;
    } catch (error) {
      console.error('❌ فشل في عرض مطالبة التثبيت:', error);
      return 'unavailable';
    }
  }
}

/**
 * إدارة الإشعارات
 */
export class NotificationManager {
  /**
   * طلب إذن الإشعارات
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.log('الإشعارات غير مدعومة في هذا المتصفح');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    console.log('🔔 إذن الإشعارات:', permission);
    return permission;
  }

  /**
   * إرسال إشعار محلي
   */
  async showNotification(options: NotificationOptions): Promise<void> {
    const permission = await this.requestPermission();
    
    if (permission !== 'granted') {
      console.log('❌ لا يوجد إذن لإرسال الإشعارات');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration) {
        // إرسال عبر Service Worker
        await registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/icons/icon-192x192.png',
          badge: options.badge || '/icons/icon-72x72.png',
          tag: options.tag,
          requireInteraction: options.requireInteraction,
          data: options.data,
          dir: 'rtl',
          lang: 'ar'
        });
      } else {
        // إرسال مباشر
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/icons/icon-192x192.png',
          tag: options.tag,
          requireInteraction: options.requireInteraction,
          data: options.data,
          dir: 'rtl',
          lang: 'ar'
        });
      }
    } catch (error) {
      console.error('❌ فشل في إرسال الإشعار:', error);
    }
  }
}

/**
 * إدارة التخزين المؤقت
 */
export class CacheManager {
  /**
   * تخزين URLs محددة
   */
  async cacheUrls(urls: string[]): Promise<void> {
    try {
      await sendMessageToSW({
        type: 'CACHE_URLS',
        payload: { urls }
      });
      console.log('📦 تم تخزين URLs بنجاح');
    } catch (error) {
      console.error('❌ فشل في تخزين URLs:', error);
    }
  }

  /**
   * مسح التخزين المؤقت
   */
  async clearCache(cacheName?: string): Promise<void> {
    try {
      await sendMessageToSW({
        type: 'CLEAR_CACHE',
        payload: { cacheName }
      });
      console.log('🗑️ تم مسح التخزين المؤقت');
    } catch (error) {
      console.error('❌ فشل في مسح التخزين المؤقت:', error);
    }
  }

  /**
   * الحصول على حجم التخزين المؤقت
   */
  async getCacheSize(): Promise<number> {
    try {
      const result = await sendMessageToSW({ type: 'GET_CACHE_SIZE' });
      return result.size || 0;
    } catch (error) {
      console.error('❌ فشل في الحصول على حجم التخزين المؤقت:', error);
      return 0;
    }
  }

  /**
   * تحويل الحجم إلى نص قابل للقراءة
   */
  formatCacheSize(bytes: number): string {
    if (bytes === 0) return '0 بايت';
    
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * كشف حالة الاتصال
 */
export class ConnectionManager {
  private listeners: Array<(online: boolean) => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    window.addEventListener('online', () => {
      console.log('🌐 عاد الاتصال بالإنترنت');
      this.notifyListeners(true);
    });

    window.addEventListener('offline', () => {
      console.log('📴 انقطع الاتصال بالإنترنت');
      this.notifyListeners(false);
    });
  }

  private notifyListeners(online: boolean) {
    this.listeners.forEach(listener => listener(online));
  }

  /**
   * التحقق من حالة الاتصال
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * إضافة مستمع لتغيير حالة الاتصال
   */
  addListener(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback);
    
    // إرجاع دالة لإزالة المستمع
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * اختبار سرعة الاتصال
   */
  async testConnectionSpeed(): Promise<{
    speed: number; // Mbps
    latency: number; // ms
    quality: 'slow' | 'medium' | 'fast';
  }> {
    const startTime = performance.now();
    
    try {
      // تحميل ملف صغير لاختبار السرعة
      const response = await fetch('/icons/icon-192x192.png?t=' + Date.now(), {
        cache: 'no-cache'
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      const blob = await response.blob();
      const sizeInBits = blob.size * 8;
      const timeInSeconds = latency / 1000;
      const speedMbps = (sizeInBits / timeInSeconds) / (1024 * 1024);
      
      let quality: 'slow' | 'medium' | 'fast';
      if (speedMbps < 1) quality = 'slow';
      else if (speedMbps < 5) quality = 'medium';
      else quality = 'fast';
      
      return { speed: speedMbps, latency, quality };
    } catch (error) {
      console.error('❌ فشل في اختبار سرعة الاتصال:', error);
      return { speed: 0, latency: Infinity, quality: 'slow' };
    }
  }
}

/**
 * إظهار إشعار التحديث المتاح
 */
function showUpdateAvailableNotification() {
  // يمكن استخدام toast أو modal لإعلام المستخدم
  if (window.confirm('يتوفر تحديث جديد للتطبيق. هل تريد إعادة التحميل؟')) {
    forceServiceWorkerUpdate();
  }
}

// إنشاء instances عامة
export const pwaInstallManager = new PWAInstallManager();
export const notificationManager = new NotificationManager();
export const cacheManager = new CacheManager();
export const connectionManager = new ConnectionManager();

// تسجيل Service Worker تلقائياً
if (typeof window !== 'undefined') {
  registerServiceWorker();
}

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  sendMessageToSW,
  forceServiceWorkerUpdate,
  PWAInstallManager,
  NotificationManager,
  CacheManager,
  ConnectionManager,
  pwaInstallManager,
  notificationManager,
  cacheManager,
  connectionManager
};
