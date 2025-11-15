// Lovable.dev compatibility fixes
// This file ensures optimal compatibility with the Lovable platform

// Force React to be available globally for Lovable's development environment
import React from 'react';

// Lovable platform compatibility checks
const isLovableEnvironment = () => {
  return typeof window !== 'undefined' && 
         (window.location.hostname.includes('lovable.dev') || 
          window.location.hostname.includes('sandbox'));
};

// Enhanced error handling for Lovable environment
const setupLovableErrorHandling = () => {
  if (!isLovableEnvironment()) return;

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🔧 Lovable: Unhandled promise rejection:', event.reason);
    
    // Don't prevent default for React-related errors in development
    if (event.reason?.message?.includes('useState') || 
        event.reason?.message?.includes('React')) {
      console.log('🔧 Lovable: React-related error detected, allowing default handling');
      return;
    }
    
    event.preventDefault();
  });

  // Enhanced error boundary for global errors
  window.addEventListener('error', (event) => {
    console.error('🔧 Lovable: Global error:', event.error);
    
    // Special handling for React errors
    if (event.error?.message?.includes('useState') || 
        event.error?.message?.includes('React')) {
      console.log('🔧 Lovable: React error detected, attempting recovery...');
      
      // Attempt to reload if React is completely broken
      // But only if not already reloading and only in production
      if (!window.React || typeof window.useState !== 'function') {
        const reloadKey = 'lovable_reload_attempted';
        const hasReloaded = sessionStorage.getItem(reloadKey);
        
        if (!hasReloaded && import.meta.env.PROD) {
          console.log('🔧 Lovable: React is broken, reloading...');
          sessionStorage.setItem(reloadKey, 'true');
          setTimeout(() => {
            sessionStorage.removeItem(reloadKey);
            window.location.reload();
          }, 1000);
        } else {
          console.warn('🔧 Lovable: React error detected but reload prevented (already reloaded or in dev mode)');
        }
      }
    }
  });
};

// Lovable-specific React setup
const setupLovableReact = () => {
  if (!isLovableEnvironment()) return;

  // Ensure React is globally available
  if (typeof window !== 'undefined') {
    (window as any).React = React;
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
  }

  // Log React status for Lovable debugging
  console.log('🔧 Lovable: React setup complete', {
    version: React.version,
    hooks: {
      useState: typeof useState !== 'undefined',
      useEffect: typeof useEffect !== 'undefined',
    },
    global: typeof (window as any).React !== 'undefined'
  });
};

// Performance optimizations for Lovable
const setupLovableOptimizations = () => {
  if (!isLovableEnvironment()) return;

  // Disable React DevTools in production-like Lovable environment
  if (import.meta.env.PROD) {
    if (typeof window !== 'undefined') {
      (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        isDisabled: true,
        supportsFiber: true,
        inject: () => {},
        onCommitFiberRoot: () => {},
        onCommitFiberUnmount: () => {},
      };
    }
  }
};

// Initialize Lovable compatibility
export const initializeLovableCompatibility = () => {
  console.log('🔧 Lovable: Initializing compatibility layer...');
  
  setupLovableReact();
  setupLovableErrorHandling();
  setupLovableOptimizations();
  
  console.log('🔧 Lovable: Compatibility layer initialized successfully');
};

// Auto-initialize if in Lovable environment
if (isLovableEnvironment()) {
  initializeLovableCompatibility();
}

export default {
  initializeLovableCompatibility,
  isLovableEnvironment,
  setupLovableReact,
  setupLovableErrorHandling,
  setupLovableOptimizations
};
