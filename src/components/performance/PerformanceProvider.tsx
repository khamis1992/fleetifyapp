import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWebVitals, registerServiceWorker, measurePerformance } from '@/hooks/useWebVitals';

interface PerformanceContextType {
  webVitals: Record<string, number>;
  performanceMetrics: Record<string, number>;
  cacheSize: number;
  isServiceWorkerActive: boolean;
  clearCache: () => Promise<void>;
  refreshPerformanceData: () => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export const usePerformanceContext = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformanceContext must be used within PerformanceProvider');
  }
  return context;
};

interface PerformanceProviderProps {
  children: React.ReactNode;
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({ children }) => {
  const [webVitals, setWebVitals] = useState<Record<string, number>>({});
  const [performanceMetrics, setPerformanceMetrics] = useState<Record<string, number>>({});
  const [cacheSize, setCacheSize] = useState(0);
  const [isServiceWorkerActive, setIsServiceWorkerActive] = useState(false);

  // Track Web Vitals
  useWebVitals((metric) => {
    setWebVitals(prev => ({
      ...prev,
      [metric.name]: metric.value
    }));

    // Send to analytics if needed
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', metric.name, {
        custom_metric_value: Math.round(metric.value),
        custom_metric_rating: metric.rating
      });
    }
  });

  // Initialize Service Worker
  useEffect(() => {
    const initServiceWorker = async () => {
      try {
        const registration = await registerServiceWorker();
        if (registration) {
          setIsServiceWorkerActive(true);
          
          // Get cache size
          const messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = (event) => {
            if (event.data.cacheSize) {
              setCacheSize(event.data.cacheSize);
            }
          };
          
          navigator.serviceWorker.controller?.postMessage(
            { type: 'GET_CACHE_SIZE' },
            [messageChannel.port2]
          );
        }
      } catch (error) {
        console.error('Failed to initialize Service Worker:', error);
      }
    };

    initServiceWorker();
  }, []);

  // Measure performance metrics
  useEffect(() => {
    const updateMetrics = () => {
      try {
        const metrics = measurePerformance();
        setPerformanceMetrics(metrics);
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    };

    if (document.readyState === 'complete') {
      updateMetrics();
    } else {
      window.addEventListener('load', updateMetrics);
      return () => window.removeEventListener('load', updateMetrics);
    }
  }, []);

  const clearCache = async () => {
    if (navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          setCacheSize(0);
        }
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    }
  };

  const refreshPerformanceData = () => {
    const metrics = measurePerformance();
    setPerformanceMetrics(metrics);
  };

  // Monitor memory usage
  useEffect(() => {
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setPerformanceMetrics(prev => ({
          ...prev,
          usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1048576), // MB
          totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1048576), // MB
          jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
        }));
      }
    };

    const interval = setInterval(monitorMemory, 30000); // Every 30 seconds
    monitorMemory(); // Initial measurement

    return () => clearInterval(interval);
  }, []);

  const contextValue: PerformanceContextType = {
    webVitals,
    performanceMetrics,
    cacheSize,
    isServiceWorkerActive,
    clearCache,
    refreshPerformanceData
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
};