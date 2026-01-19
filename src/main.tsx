import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initSentry } from './lib/sentry';

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

// Global error handler for dynamic import failures
// IMPORTANT: Only enable in production to avoid conflicts with HMR in development
if (!import.meta.env.DEV) {
  window.addEventListener('error', (event) => {
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
    const errorMessage = error?.message || '';
    
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
    const errorMessage = error?.message || '';
    
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

console.log('✅ [MAIN] App render called');// Cache bust: Mon, Nov 24, 2025  4:45:06 AM
