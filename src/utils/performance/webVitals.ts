/**
 * Web Vitals Performance Monitoring
 * Tracks Core Web Vitals and reports to analytics
 */

import { onCLS, onFID, onFCP, onLCP, onTTFB, Metric } from 'web-vitals';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  navigationType: string;
}

interface MetricThresholds {
  good: number;
  needsImprovement: number;
}

// Web Vitals thresholds based on Google recommendations
const THRESHOLDS: Record<string, MetricThresholds> = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FID: { good: 100, needsImprovement: 300 },
  FCP: { good: 1800, needsImprovement: 3000 },
  LCP: { good: 2500, needsImprovement: 4000 },
  TTFB: { good: 800, needsImprovement: 1800 },
};

/**
 * Determine metric rating based on thresholds
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Format metric for reporting
 */
function formatMetric(metric: Metric): PerformanceMetric {
  return {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    timestamp: Date.now(),
    navigationType: metric.navigationType,
  };
}

/**
 * Send metric to analytics or logging service
 */
function sendToAnalytics(metric: PerformanceMetric) {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Performance] ${metric.name}:`, {
      value: `${metric.value.toFixed(2)}ms`,
      rating: metric.rating,
      threshold: THRESHOLDS[metric.name],
    });
  }

  // Store in localStorage for dashboard
  try {
    const storageKey = 'performance_metrics';
    const stored = localStorage.getItem(storageKey);
    const metrics: PerformanceMetric[] = stored ? JSON.parse(stored) : [];
    
    // Keep last 100 metrics
    metrics.push(metric);
    if (metrics.length > 100) {
      metrics.shift();
    }
    
    localStorage.setItem(storageKey, JSON.stringify(metrics));
  } catch (error) {
    console.error('[Performance] Failed to store metric:', error);
  }

  // Send to analytics service (implement based on your analytics provider)
  // Example: Google Analytics 4
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.value),
      metric_rating: metric.rating,
      metric_delta: metric.value,
      event_category: 'Web Vitals',
    });
  }

  // Send to custom analytics endpoint
  if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
    fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
      keepalive: true,
    }).catch((error) => {
      console.error('[Performance] Failed to send metric:', error);
    });
  }
}

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitals() {
  try {
    onCLS((metric) => sendToAnalytics(formatMetric(metric)));
    onFID((metric) => sendToAnalytics(formatMetric(metric)));
    onFCP((metric) => sendToAnalytics(formatMetric(metric)));
    onLCP((metric) => sendToAnalytics(formatMetric(metric)));
    onTTFB((metric) => sendToAnalytics(formatMetric(metric)));
  } catch (error) {
    console.error('[Performance] Failed to initialize Web Vitals:', error);
  }
}

/**
 * Get stored performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetric[] {
  try {
    const stored = localStorage.getItem('performance_metrics');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Performance] Failed to retrieve metrics:', error);
    return [];
  }
}

/**
 * Get average metrics by name
 */
export function getAverageMetrics(): Record<string, { average: number; rating: string }> {
  const metrics = getPerformanceMetrics();
  const grouped: Record<string, number[]> = {};

  metrics.forEach((metric) => {
    if (!grouped[metric.name]) {
      grouped[metric.name] = [];
    }
    grouped[metric.name].push(metric.value);
  });

  const averages: Record<string, { average: number; rating: string }> = {};
  
  Object.entries(grouped).forEach(([name, values]) => {
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    averages[name] = {
      average,
      rating: getRating(name, average),
    };
  });

  return averages;
}

/**
 * Clear stored performance metrics
 */
export function clearPerformanceMetrics() {
  try {
    localStorage.removeItem('performance_metrics');
  } catch (error) {
    console.error('[Performance] Failed to clear metrics:', error);
  }
}

/**
 * Custom performance mark
 */
export function markPerformance(name: string) {
  if (typeof window !== 'undefined' && window.performance) {
    performance.mark(name);
  }
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(name: string, startMark: string, endMark: string): number | null {
  if (typeof window !== 'undefined' && window.performance) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      return measure ? measure.duration : null;
    } catch (error) {
      console.error('[Performance] Failed to measure:', error);
      return null;
    }
  }
  return null;
}

/**
 * Track component render performance
 */
export function trackComponentRender(componentName: string) {
  const startMark = `${componentName}-render-start`;
  const endMark = `${componentName}-render-end`;
  
  markPerformance(startMark);
  
  return () => {
    markPerformance(endMark);
    const duration = measurePerformance(`${componentName}-render`, startMark, endMark);
    
    if (duration !== null && import.meta.env.DEV) {
      console.log(`[Performance] ${componentName} render: ${duration.toFixed(2)}ms`);
    }
  };
}

/**
 * Monitor long tasks (>50ms)
 */
export function monitorLongTasks(callback?: (tasks: PerformanceEntry[]) => void) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      if (import.meta.env.DEV) {
        entries.forEach((entry) => {
          console.warn(`[Performance] Long task detected: ${entry.duration.toFixed(2)}ms`);
        });
      }
      
      if (callback) {
        callback(entries);
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
    
    return () => observer.disconnect();
  } catch (error) {
    console.error('[Performance] Failed to monitor long tasks:', error);
  }
}

/**
 * Get navigation timing information
 */
export function getNavigationTiming() {
  if (typeof window === 'undefined' || !window.performance) {
    return null;
  }

  const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  if (!timing) {
    return null;
  }

  return {
    dns: timing.domainLookupEnd - timing.domainLookupStart,
    tcp: timing.connectEnd - timing.connectStart,
    request: timing.responseStart - timing.requestStart,
    response: timing.responseEnd - timing.responseStart,
    domParsing: timing.domInteractive - timing.responseEnd,
    domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
    onLoad: timing.loadEventEnd - timing.loadEventStart,
    total: timing.loadEventEnd - timing.fetchStart,
  };
}

/**
 * Monitor resource loading performance
 */
export function getResourceTiming() {
  if (typeof window === 'undefined' || !window.performance) {
    return [];
  }

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  return resources.map((resource) => ({
    name: resource.name,
    type: resource.initiatorType,
    duration: resource.duration,
    size: resource.transferSize,
    cached: resource.transferSize === 0,
  }));
}

/**
 * Export performance report
 */
export function exportPerformanceReport() {
  const metrics = getPerformanceMetrics();
  const averages = getAverageMetrics();
  const navigation = getNavigationTiming();
  const resources = getResourceTiming();

  const report = {
    timestamp: new Date().toISOString(),
    metrics,
    averages,
    navigation,
    resources: {
      total: resources.length,
      cached: resources.filter((r) => r.cached).length,
      totalSize: resources.reduce((sum, r) => sum + (r.size || 0), 0),
      byType: resources.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
  };

  return report;
}
