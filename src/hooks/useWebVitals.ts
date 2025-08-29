import { useEffect, useRef } from 'react';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType: string;
}

interface WebVitals {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
}

export const useWebVitals = (onMetric?: (metric: WebVitalMetric) => void) => {
  const vitals = useRef<WebVitals>({});
  const observer = useRef<PerformanceObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    const handleMetric = (metric: WebVitalMetric) => {
      vitals.current[metric.name.toLowerCase() as keyof WebVitals] = metric.value;
      onMetric?.(metric);
    };

    // Observe paint timing (FCP)
    if (PerformanceObserver.supportedEntryTypes?.includes('paint')) {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            handleMetric({
              name: 'FCP',
              value: entry.startTime,
              rating: entry.startTime < 1800 ? 'good' : entry.startTime < 3000 ? 'needs-improvement' : 'poor',
              navigationType: 'paint'
            });
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
    }

    // Observe largest contentful paint
    if (PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        
        handleMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          rating: lastEntry.startTime < 2500 ? 'good' : lastEntry.startTime < 4000 ? 'needs-improvement' : 'poor',
          navigationType: 'largest-contentful-paint'
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      observer.current = lcpObserver;
    }

    // Observe first input delay
    if (PerformanceObserver.supportedEntryTypes?.includes('first-input')) {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as any;
          handleMetric({
            name: 'FID',
            value: fidEntry.processingStart - fidEntry.startTime,
            rating: fidEntry.processingStart - fidEntry.startTime < 100 ? 'good' : 
                   fidEntry.processingStart - fidEntry.startTime < 300 ? 'needs-improvement' : 'poor',
            navigationType: 'first-input'
          });
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    }

    // Observe layout shift
    if (PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) {
      let clsValue = 0;
      let clsEntries: any[] = [];

      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as any;
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
            clsEntries.push(layoutShiftEntry);
          }
        }

        handleMetric({
          name: 'CLS',
          value: clsValue,
          rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
          navigationType: 'layout-shift'
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }

    // Measure navigation timing (TTFB)
    const measureTTFB = () => {
      const navEntry = performance.getEntriesByType('navigation')[0] as any;
      if (navEntry) {
        const ttfb = navEntry.responseStart - navEntry.requestStart;
        handleMetric({
          name: 'TTFB',
          value: ttfb,
          rating: ttfb < 800 ? 'good' : ttfb < 1800 ? 'needs-improvement' : 'poor',
          navigationType: 'navigation'
        });
      }
    };

    if (document.readyState === 'complete') {
      measureTTFB();
    } else {
      window.addEventListener('load', measureTTFB);
    }

    return () => {
      observer.current?.disconnect();
      window.removeEventListener('load', measureTTFB);
    };
  }, [onMetric]);

  return vitals.current;
};

// Service Worker registration with performance benefits
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      // Update available
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, show update prompt
              console.log('New app version available');
            }
          });
        }
      });

      // Service Worker is controlling the page
      if (navigator.serviceWorker.controller) {
        console.log('Service Worker is controlling this page');
      }

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// Performance monitoring utilities
export const measurePerformance = () => {
  const navigation = performance.getEntriesByType('navigation')[0] as any;
  
  return {
    // Page load metrics
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
    
    // Network metrics
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp: navigation.connectEnd - navigation.connectStart,
    request: navigation.responseStart - navigation.requestStart,
    response: navigation.responseEnd - navigation.responseStart,
    
    // Cache performance
    transferSize: navigation.transferSize,
    encodedBodySize: navigation.encodedBodySize,
    decodedBodySize: navigation.decodedBodySize,
    
    // Overall timing
    totalTime: navigation.loadEventEnd - navigation.fetchStart
  };
};