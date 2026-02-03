import React, { useEffect } from 'react';
import { usePerformanceMonitor, usePageLoadMonitor, useMemoryMonitor } from '@/hooks/usePerformanceMonitor';

interface PerformanceMonitorProps {
  children: React.ReactNode;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ children }) => {
  // Only enable performance monitoring in development
  const isDevMode = import.meta.env.DEV;
  
  // Monitor page load performance
  usePageLoadMonitor();
  
  // Monitor memory usage every 60 seconds (only in dev)
  if (isDevMode) {
    useMemoryMonitor(60000);
  }
  
  // Monitor overall app performance (only in dev)
  if (isDevMode) {
    usePerformanceMonitor('AppRoot');
  }

  useEffect(() => {
    // Only run in development mode
    if (!isDevMode) return;
    
    // Log initial performance metrics
    console.log('🚀 [PERFORMANCE] Performance monitoring initialized');
    
    // Add performance observer for long tasks (only in dev)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            // Only log tasks longer than 100ms to reduce noise
            if (entry.duration > 100) {
              console.warn(`⚠️ [LONG_TASK] Task took ${entry.duration.toFixed(2)}ms`, {
                name: entry.name,
                entryType: entry.entryType,
                startTime: entry.startTime.toFixed(2)
              });
            }
          });
        });
        
        // Note: 'longtask' might not be supported in all browsers
        observer.observe({ entryTypes: ['longtask'] });
        
        return () => {
          observer.disconnect();
        };
      } catch (error) {
        // Silently fail if longtask observation is not supported
        console.log('ℹ️ [PERFORMANCE] Long task monitoring not supported');
      }
    }
  }, [isDevMode]);

  return <>{children}</>;
};

export default PerformanceMonitor;