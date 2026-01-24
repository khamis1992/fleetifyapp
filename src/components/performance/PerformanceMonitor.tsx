import React, { useEffect } from 'react';
import { usePerformanceMonitor, usePageLoadMonitor, useMemoryMonitor } from '@/hooks/usePerformanceMonitor';

interface PerformanceMonitorProps {
  children: React.ReactNode;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ children }) => {
  // Monitor page load performance
  usePageLoadMonitor();
  
  // Monitor memory usage every 30 seconds
  useMemoryMonitor(30000);
  
  // Monitor overall app performance
  usePerformanceMonitor('AppRoot');

  useEffect(() => {
    // Log initial performance metrics
    console.log('🚀 [PERFORMANCE] Performance monitoring initialized');
    
    // Add performance observer for long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) {
            console.warn(`⚠️ [LONG_TASK] Task took ${entry.duration.toFixed(2)}ms`, {
              name: entry.name,
              entryType: entry.entryType,
              startTime: entry.startTime
            });
          }
        });
      });
      
      observer.observe({ entryTypes: ['longtask'] });
      
      return () => {
        observer.disconnect();
      };
    }
  }, []);

  return <>{children}</>;
};

export default PerformanceMonitor;