import { useEffect, useRef } from 'react';

/**
 * Performance Monitoring Hook
 * 
 * Tracks component render times and provides performance insights
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderStartRef = useRef<number | null>(null);

  useEffect(() => {
    // Track component mount/render time
    renderStartRef.current = performance.now();
    
    return () => {
      if (renderStartRef.current !== null) {
        const renderTime = performance.now() - renderStartRef.current;
        
        // Log performance metrics
        if (renderTime > 100) {
          console.warn(`⚠️ [PERFORMANCE] ${componentName} render took ${renderTime.toFixed(2)}ms`);
        } else if (renderTime > 50) {
          console.info(`ℹ️ [PERFORMANCE] ${componentName} render took ${renderTime.toFixed(2)}ms`);
        }
        
        // Send to performance monitoring if needed
        // performanceLogger?.logRender(componentName, renderTime);
      }
    };
  }, [componentName]);
};

/**
 * Network Request Performance Monitor
 */
export const monitorNetworkRequest = async <T>(
  request: () => Promise<T>,
  operationName: string
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const result = await request();
    const duration = performance.now() - startTime;
    
    if (duration > 1000) {
      console.warn(`⚠️ [NETWORK] ${operationName} took ${duration.toFixed(2)}ms`);
    } else {
      console.log(`ℹ️ [NETWORK] ${operationName} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`❌ [NETWORK] ${operationName} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
};

/**
 * Memory Usage Monitor
 */
export const useMemoryMonitor = (intervalMs: number = 30000) => {
  useEffect(() => {
    if ('memory' in performance) {
      const logMemoryUsage = () => {
        // @ts-ignore - memory property exists in some browsers
        const memory = performance.memory;
        if (memory) {
          const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
          const totalMB = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
          const usagePercent = (memory.usedJSHeapSize / memory.totalJSHeapSize * 100).toFixed(1);
          
          console.log(`📊 [MEMORY] Used: ${usedMB}MB / ${totalMB}MB (${usagePercent}%)`);
          
          // Alert if memory usage is critically high (>90% instead of >80%)
          if (memory.usedJSHeapSize / memory.totalJSHeapSize > 0.9) {
            console.warn(`⚠️ [MEMORY] High memory usage detected: ${usagePercent}%`);
          }
        }
      };
      
      logMemoryUsage();
      const interval = setInterval(logMemoryUsage, intervalMs);
      
      return () => clearInterval(interval);
    }
  }, [intervalMs]);
};

/**
 * Page Load Performance Monitor
 */
export const usePageLoadMonitor = () => {
  useEffect(() => {
    const measurePageLoad = () => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (perfData && perfData.loadEventEnd > 0) {
        const loadTime = perfData.loadEventEnd - perfData.fetchStart;
        
        // Only log if load time is positive and reasonable
        if (loadTime > 0 && loadTime < 60000) {
          console.log(`⏱️ [PAGE_LOAD] Page loaded in ${loadTime.toFixed(2)}ms`);
          
          // Log detailed timing only in development
          if (import.meta.env.DEV) {
            console.log('📋 [TIMING]', {
              dns: (perfData.domainLookupEnd - perfData.domainLookupStart).toFixed(2),
              tcp: (perfData.connectEnd - perfData.connectStart).toFixed(2),
              request: (perfData.responseStart - perfData.requestStart).toFixed(2),
              response: (perfData.responseEnd - perfData.responseStart).toFixed(2),
              dom: (perfData.domContentLoadedEventEnd - perfData.fetchStart).toFixed(2),
              load: (perfData.loadEventEnd - perfData.fetchStart).toFixed(2)
            });
          }
        }
      }
    };
    
    // Wait for page to fully load with a small delay to ensure metrics are ready
    const timeoutId = setTimeout(() => {
      if (document.readyState === 'complete') {
        measurePageLoad();
      } else {
        window.addEventListener('load', measurePageLoad, { once: true });
      }
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('load', measurePageLoad);
    };
  }, []);
};