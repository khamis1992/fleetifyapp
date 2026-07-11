import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initSentry } from './lib/sentry';
import { initializeI18n } from './lib/i18n/config';

// Initialize Sentry for error tracking
initSentry();

// Add loading class to body to disable blur during initial load
document.body.classList.add('loading');

// Remove loading class after app mounts to enable blur effects
// Use requestAnimationFrame to ensure DOM is ready
const removeLoadingClass = () => {
  // Wait for React to finish initial render
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.remove('loading');
      document.body.classList.add('loaded');
      console.log('✅ [MAIN] Loading class removed, blur effects enabled');
    });
  });
};

// Remove loading after short delay to ensure content is rendered
setTimeout(removeLoadingClass, 500);

const isBrowserExtensionAsyncResponseError = (message: string) =>
  message.includes('A listener indicated an asynchronous response by returning true') &&
  message.includes('message channel closed before a response was received');

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }
  return '';
};

const prepareDevelopmentRuntime = async () => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;

  const resetKey = 'fleetify_dev_cache_reset_v2';
  if (sessionStorage.getItem(resetKey)) {
    sessionStorage.removeItem(resetKey);
    return false;
  }

  let changed = false;

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    changed = changed || registrations.length > 0;
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    changed = changed || keys.length > 0;
  }

  if (changed) {
    sessionStorage.setItem(resetKey, 'true');
    window.location.reload();
    return true;
  }

  return false;
};

// CRITICAL FIX: Prevent page hanging on refresh
// Add visibility change listener to detect tab switches
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    console.log('✅ [MAIN] Tab became visible');
  } else {
    console.log('✅ [MAIN] Tab became hidden');
  }
});

// CRITICAL FIX: Add page show/hide listeners to detect bfcache
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    console.log('✅ [MAIN] Page restored from bfcache - forcing reload');
    // Force reload if page was restored from back/forward cache
    window.location.reload();
  }
});

window.addEventListener('pagehide', () => {
  console.log('✅ [MAIN] Page hidden');
});

// Global error handler for dynamic import failures
// IMPORTANT: Only enable in production to avoid conflicts with HMR in development
if (!import.meta.env.DEV) {
  window.addEventListener('error', (event) => {
    if (isBrowserExtensionAsyncResponseError(event.message || event.error?.message || '')) {
      event.preventDefault();
      return;
    }

    const isChunkLoadError = 
      event.message.includes('Failed to fetch dynamically imported module') ||
      event.message.includes('Importing a module script failed') ||
      event.message.includes('error loading dynamically imported module');
    
    if (isChunkLoadError) {
      console.warn('🔄 [CHUNK_LOAD_ERROR] Detected stale chunk, reloading page...');
      // Prevent infinite reload loop
      const hasReloaded = sessionStorage.getItem('chunk_reload_attempted');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload_attempted', 'true');
        window.location.reload();
      } else {
        console.error('🔄 [CHUNK_LOAD_ERROR] Reload attempted but failed, clearing session and trying again');
        sessionStorage.removeItem('chunk_reload_attempted');
        window.location.reload();
      }
    }
  });

  // Clear reload flag on successful load
  window.addEventListener('load', () => {
    sessionStorage.removeItem('chunk_reload_attempted');
  });

  // Handle unhandled promise rejections (for dynamic imports)
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const errorMessage = getErrorMessage(error);

    if (isBrowserExtensionAsyncResponseError(errorMessage)) {
      event.preventDefault();
      return;
    }
    
    const isChunkLoadError = 
      errorMessage.includes('Failed to fetch dynamically imported module') ||
      errorMessage.includes('Importing a module script failed') ||
      errorMessage.includes('error loading dynamically imported module') ||
      (error instanceof TypeError && errorMessage.includes('fetch'));
    
    // Ignore Service Worker and CacheStorage errors (common in multi-tab scenarios)
    const isServiceWorkerError = 
      errorMessage.includes('ServiceWorker') ||
      errorMessage.includes('CacheStorage') ||
      errorMessage.includes('The object is in an invalid state');
    
    if (isServiceWorkerError) {
      // Silently ignore SW/Cache errors - they're harmless in multi-tab scenarios
      event.preventDefault();
      return;
    }
    
    if (isChunkLoadError) {
      console.warn('🔄 [CHUNK_LOAD_ERROR] Detected stale chunk in promise, reloading page...');
      event.preventDefault();
      const hasReloaded = sessionStorage.getItem('chunk_reload_attempted');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload_attempted', 'true');
        window.location.reload();
      }
    }
  });
} else {
  // In development mode, just log chunk errors without reloading
  // HMR will handle module updates automatically
  window.addEventListener('error', (event) => {
    if (isBrowserExtensionAsyncResponseError(event.message || event.error?.message || '')) {
      event.preventDefault();
      return;
    }

    const isChunkLoadError = 
      event.message.includes('Failed to fetch dynamically imported module') ||
      event.message.includes('Importing a module script failed') ||
      event.message.includes('error loading dynamically imported module');
    
    if (isChunkLoadError) {
      console.warn('🔄 [DEV] Chunk load error detected (HMR will handle this):', event.message);
      // Don't reload in development - let HMR handle it
      return;
    }
    
    // Log other errors but don't prevent default behavior
    if (event.error && !event.error.message?.includes('ResizeObserver')) {
      console.error('🔄 [DEV] Global error:', event.error);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const errorMessage = getErrorMessage(error);

    if (isBrowserExtensionAsyncResponseError(errorMessage)) {
      event.preventDefault();
      return;
    }
    
    const isChunkLoadError = 
      errorMessage.includes('Failed to fetch dynamically imported module') ||
      errorMessage.includes('Importing a module script failed') ||
      errorMessage.includes('error loading dynamically imported module') ||
      (error instanceof TypeError && errorMessage.includes('fetch'));
    
    // Ignore Service Worker and CacheStorage errors (common in multi-tab scenarios)
    const isServiceWorkerError = 
      errorMessage.includes('ServiceWorker') ||
      errorMessage.includes('CacheStorage') ||
      errorMessage.includes('The object is in an invalid state');
    
    if (isChunkLoadError) {
      console.warn('🔄 [DEV] Chunk load error in promise (HMR will handle this):', errorMessage);
      return;
    }
    
    if (isServiceWorkerError) {
      // Silently ignore SW/Cache errors - they're harmless in multi-tab scenarios
      event.preventDefault();
      return;
    }
    
    // Log other promise rejections but don't prevent default
    if (error && !errorMessage.includes('ResizeObserver')) {
      console.error('🔄 [DEV] Unhandled promise rejection:', error);
    }
  });
}

// Initialize i18n before rendering — registers initReactI18next synchronously
// so useTranslation() has an i18n instance available on first render.
const bootstrap = async () => {
  if (await prepareDevelopmentRuntime()) return;

  initializeI18n();
  const { default: App } = await import('./App.tsx');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ [MAIN] Root element not found!');
  throw new Error('Root element not found');
}

console.log('✅ [MAIN] Root element found, creating React root');

const root = createRoot(rootElement);

console.log('✅ [MAIN] React root created, rendering app...');

// NOTE: StrictMode disabled in development to prevent HMR conflicts
// StrictMode causes double renders which can trigger infinite reload loops with HMR
if (import.meta.env.DEV) {
  console.log('✅ [MAIN] Rendering in development mode (StrictMode disabled for HMR compatibility)');
  root.render(<App />);
} else {
  console.log('✅ [MAIN] Rendering in production mode');
  root.render(<App />);
}

console.log('✅ [MAIN] App render called');// Cache bust: Tue, Jan 27, 2026  12:00:00 PM - Service Worker v2 Update
};

void bootstrap();
