import React, { useEffect, useState, useCallback } from 'react';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';

interface MobileOptimizationProviderProps {
  children: React.ReactNode;
}

export const MobileOptimizationProvider: React.FC<MobileOptimizationProviderProps> = ({ children }) => {
  const { isMobile } = useSimpleBreakpoint();
  const { config, updateConfig, memoryUsage } = usePerformanceOptimization();
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'slow' | 'fast' | 'unknown'>('unknown');

  // Detect device capabilities
  useEffect(() => {
    if (!isMobile) return;

    const detectDeviceCapabilities = () => {
      // Detect low power mode (approximate)
      const isLowEnd = navigator.hardwareConcurrency <= 2 || 
                       (navigator as any).deviceMemory <= 2;
      setIsLowPowerMode(isLowEnd);

      // Detect connection quality
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        setConnectionQuality(
          effectiveType === 'slow-2g' || effectiveType === '2g' ? 'slow' : 'fast'
        );

        connection.addEventListener('change', () => {
          const newType = connection.effectiveType;
          setConnectionQuality(
            newType === 'slow-2g' || newType === '2g' ? 'slow' : 'fast'
          );
        });
      }
    };

    detectDeviceCapabilities();
  }, [isMobile]);

  // Auto-adjust performance settings based on device
  useEffect(() => {
    if (!isMobile) return;

    const optimizedConfig = {
      ...config,
      enableLazyLoading: true,
      imageOptimization: true,
      enableVirtualization: true,
      maxConcurrentImages: isLowPowerMode ? 2 : memoryUsage > 80 ? 3 : 5,
      memoryThreshold: isLowPowerMode ? 50 : 100
    };

    updateConfig(optimizedConfig);
  }, [isMobile, isLowPowerMode, memoryUsage]);

  // Reduce animations on low-end devices
  useEffect(() => {
    if (!isMobile || !isLowPowerMode) return;

    const style = document.createElement('style');
    style.id = 'mobile-performance-optimizations';
    style.textContent = `
      /* Disable expensive animations on low-end devices */
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
      
      /* Optimize transforms */
      .transform {
        will-change: auto !important;
      }
      
      /* Reduce shadow complexity */
      .shadow-lg, .shadow-xl, .shadow-2xl {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
      }
      
      /* Disable blur effects */
      .backdrop-blur {
        backdrop-filter: none !important;
      }
    `;
    
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById('mobile-performance-optimizations');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [isMobile, isLowPowerMode]);

  // Handle memory pressure
  const handleMemoryPressure = useCallback(() => {
    if (memoryUsage > 90) {
      // Force garbage collection if available
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc();
      }

      // Clear some caches
      if ('caches' in window) {
        caches.open('dynamic-cache').then(cache => {
          cache.keys().then(keys => {
            // Remove half of the cached items
            const itemsToRemove = keys.slice(0, Math.floor(keys.length / 2));
            itemsToRemove.forEach(key => cache.delete(key));
          });
        });
      }

      // Update performance config to be more aggressive
      updateConfig({
        ...config,
        maxConcurrentImages: 1,
        enableVirtualization: true,
        imageOptimization: true
      });
    }
  }, [memoryUsage, config]);

  useEffect(() => {
    if (memoryUsage > 80) {
      const timer = setTimeout(handleMemoryPressure, 1000);
      return () => clearTimeout(timer);
    }
  }, [memoryUsage, handleMemoryPressure]);

  // Register service worker for PWA features
  useEffect(() => {
    if (!isMobile || !('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });

        console.log('🔧 Service Worker registered successfully');

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔧 New Service Worker available');
                // Optionally show update notification
              }
            });
          }
        });

      } catch (error) {
        console.error('🔧 Service Worker registration failed:', error);
      }
    };

    registerSW();
  }, [isMobile]);

  // Preload critical resources
  useEffect(() => {
    if (!isMobile) return;

    const preloadCriticalResources = () => {
      // Preload critical fonts
      const fontPreloads = [
        '/fonts/inter-var.woff2',
        '/fonts/cairo-var.woff2'
      ];

      fontPreloads.forEach(fontUrl => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'font';
        link.type = 'font/woff2';
        link.crossOrigin = 'anonymous';
        link.href = fontUrl;
        document.head.appendChild(link);
      });

      // Preconnect to external domains
      const preconnectDomains = [
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com'
      ];

      preconnectDomains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      });
    };

    preloadCriticalResources();
  }, [isMobile]);

  // Optimize viewport and meta tags for mobile
  useEffect(() => {
    if (!isMobile) return;

    // Set optimal viewport
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }
    
    viewportMeta.setAttribute('content', 
      'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'
    );

    // Add mobile-specific meta tags
    const mobileMetaTags = [
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'format-detection', content: 'telephone=no' },
      { name: 'msapplication-tap-highlight', content: 'no' }
    ];

    mobileMetaTags.forEach(({ name, content }) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    });

    // Add CSS for mobile optimizations
    const mobileCSS = document.createElement('style');
    mobileCSS.id = 'mobile-optimizations';
    mobileCSS.textContent = `
      /* Improve touch targets */
      button, a, [role="button"] {
        min-height: 44px;
        min-width: 44px;
      }
      
      /* Optimize scrolling */
      * {
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
      }
      
      /* Reduce repaints */
      .transform-gpu {
        transform: translateZ(0);
        will-change: transform;
      }
      
      /* Safe area handling */
      .safe-top {
        padding-top: env(safe-area-inset-top);
      }
      
      .safe-bottom {
        padding-bottom: env(safe-area-inset-bottom);
      }
      
      /* Prevent zoom on inputs */
      input, select, textarea {
        font-size: 16px !important;
      }
      
      /* Optimize for mobile performance */
      img {
        image-rendering: auto;
        image-rendering: crisp-edges;
        image-rendering: -webkit-optimize-contrast;
      }
    `;
    
    document.head.appendChild(mobileCSS);

    return () => {
      const style = document.getElementById('mobile-optimizations');
      if (style) {
        style.remove();
      }
    };
  }, [isMobile]);

  return (
    <>
      {children}
      {isMobile && (
        <div id="mobile-performance-indicator" style={{ display: 'none' }}>
          {/* Hidden div for performance monitoring */}
          <span data-memory-usage={memoryUsage} />
          <span data-connection-quality={connectionQuality} />
          <span data-low-power-mode={isLowPowerMode} />
        </div>
      )}
    </>
  );
};

export default MobileOptimizationProvider;