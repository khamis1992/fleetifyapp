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
          console.log(`📊 [MEMORY] Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB, Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
          
          // Alert if memory usage is high
          if (memory.usedJSHeapSize / memory.totalJSHeapSize > 0.8) {
            console.warn('⚠️ [MEMORY] High memory usage detected');
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
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData) {
        const loadTime = perfData.loadEventEnd - perfData.fetchStart;
        console.log(`⏱️ [PAGE_LOAD] Page loaded in ${loadTime}ms`);
        
        // Log detailed timing
        console.log('📋 [TIMING]', {
          dns: perfData.domainLookupEnd - perfData.domainLookupStart,
          tcp: perfData.connectEnd - perfData.connectStart,
          request: perfData.responseStart - perfData.requestStart,
          response: perfData.responseEnd - perfData.responseStart,
          dom: perfData.domContentLoadedEventEnd - perfData.fetchStart,
          load: perfData.loadEventEnd - perfData.fetchStart
        });
      }
    };
    
    // Wait for page to fully load
    if (document.readyState === 'complete') {
      measurePageLoad();
    } else {
      window.addEventListener('load', measurePageLoad);
      return () => window.removeEventListener('load', measurePageLoad);
    }
  }, []);
};