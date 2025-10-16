/**
 * PWA Configuration
 * 
 * Manages Progressive Web App features including:
 * - Service Worker registration
 * - Install prompts
 * - Update notifications
 * - Offline support
 */

import { logger } from '@/lib/logger';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Initialize PWA features
 */
export const initializePWA = (): void => {
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e as BeforeInstallPromptEvent;
    logger.log('✅ PWA: Install prompt ready');
  });

  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    logger.log('✅ PWA: App installed successfully');
    deferredPrompt = null;
  });

  // Register service worker if supported
  if ('serviceWorker' in navigator) {
    registerServiceWorker();
  }

  // Check if running as installed PWA
  if (window.matchMedia('(display-mode: standalone)').matches) {
    logger.log('✅ PWA: Running as installed app');
  }
};

/**
 * Register service worker
 */
const registerServiceWorker = async (): Promise<void> => {
  try {
    // Check if service worker file exists
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    logger.log('✅ Service Worker registered:', registration.scope);

    // Check for updates on page load
    registration.update();

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            logger.log('🔄 New version available! Please refresh.');
            // Dispatch custom event for update notification
            window.dispatchEvent(new CustomEvent('pwa-update-available'));
          }
        });
      }
    });
  } catch (error) {
    logger.warn('⚠️ Service Worker registration failed:', error);
  }
};

/**
 * Show install prompt
 */
export const showInstallPrompt = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    logger.log('⚠️ Install prompt not available');
    return false;
  }

  try {
    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    logger.log(`User response to install prompt: ${outcome}`);

    // Clear the deferred prompt
    deferredPrompt = null;

    return outcome === 'accepted';
  } catch (error) {
    logger.error('Error showing install prompt:', error);
    return false;
  }
};

/**
 * Check if install prompt is available
 */
export const isInstallPromptAvailable = (): boolean => {
  return deferredPrompt !== null;
};

/**
 * Check if app is installed
 */
export const isAppInstalled = (): boolean => {
  // Check if running as standalone app
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check if running in iOS standalone mode
  if ((window.navigator as any).standalone === true) {
    return true;
  }

  return false;
};

/**
 * Update service worker
 */
export const updateServiceWorker = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      logger.log('✅ Service Worker updated');
    }
  } catch (error) {
    logger.error('Error updating service worker:', error);
  }
};

/**
 * Skip waiting and activate new service worker
 */
export const skipWaitingAndActivate = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      logger.log('✅ Activating new service worker...');
      
      // Reload page after activation
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  } catch (error) {
    logger.error('Error activating service worker:', error);
  }
};

/**
 * Get PWA installation status
 */
export const getPWAStatus = () => {
  return {
    isInstalled: isAppInstalled(),
    isInstallPromptAvailable: isInstallPromptAvailable(),
    isServiceWorkerSupported: 'serviceWorker' in navigator,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
  };
};

/**
 * Share content using Web Share API
 */
export const shareContent = async (data: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> => {
  if (!navigator.share) {
    logger.log('⚠️ Web Share API not supported');
    return false;
  }

  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Error sharing:', error);
    }
    return false;
  }
};

// Initialize PWA on module load
if (typeof window !== 'undefined') {
  initializePWA();
}
