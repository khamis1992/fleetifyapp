/**
 * Performance Monitoring System
 * Tracks bundle loading, module performance, and user experience metrics
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: number;
  context?: string;
}

interface ModuleLoadMetric extends PerformanceMetric {
  moduleName: string;
  loadTime: number;
  bundleSize?: number;
  cacheHit?: boolean;
}

interface UserExperienceMetric extends PerformanceMetric {
  metric: 'FCP' | 'LCP' | 'FID' | 'CLS' | 'TTFB';
  rating: 'good' | 'needs-improvement' | 'poor';
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private startTime = Date.now();
  private bundleLoadTimes = new Map<string, number>();

  constructor() {
    this.initializeObservers();
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    // Navigation timing
    try {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric({
              name: 'page_load',
              value: navEntry.loadEventEnd - navEntry.loadEventStart,
              unit: 'ms',
              timestamp: Date.now()
            });

            this.recordMetric({
              name: 'dom_content_loaded',
              value: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              unit: 'ms',
              timestamp: Date.now()
            });

            this.recordMetric({
              name: 'ttfb',
              value: navEntry.responseStart - navEntry.requestStart,
              unit: 'ms',
              timestamp: Date.now()
            });
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);
    } catch (error) {
      console.warn('Navigation observer not supported:', error);
    }

    // Resource timing
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;

            // Track JavaScript bundle loading
            if (resource.name.includes('.js') && resource.name.includes('chunk')) {
              this.recordModuleLoad({
                name: 'module_load',
                value: resource.duration,
                unit: 'ms',
                timestamp: Date.now(),
                moduleName: this.extractModuleName(resource.name),
                loadTime: resource.duration,
                bundleSize: resource.transferSize || 0,
                cacheHit: (resource.transferSize || 0) < (resource.encodedBodySize || 0)
              });
            }

            // Track CSS loading
            if (resource.name.includes('.css')) {
              this.recordMetric({
                name: 'css_load',
                value: resource.duration,
                unit: 'ms',
                timestamp: Date.now(),
                context: resource.name
              });
            }
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource observer not supported:', error);
    }

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordUserExperience({
          name: 'lcp',
          value: lastEntry.startTime,
          unit: 'ms',
          timestamp: Date.now(),
          metric: 'LCP',
          rating: this.getLCPRating(lastEntry.startTime)
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (error) {
      console.warn('LCP observer not supported:', error);
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            const fidEntry = entry as PerformanceEventTiming;
            this.recordUserExperience({
              name: 'fid',
              value: fidEntry.processingStart - fidEntry.startTime,
              unit: 'ms',
              timestamp: Date.now(),
              metric: 'FID',
              rating: this.getFIDRating(fidEntry.processingStart - fidEntry.startTime)
            });
          }
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (error) {
      console.warn('FID observer not supported:', error);
    }

    // Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }

        this.recordUserExperience({
          name: 'cls',
          value: clsValue,
          unit: 'ms',
          timestamp: Date.now(),
          metric: 'CLS',
          rating: this.getCLSRating(clsValue)
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('CLS observer not supported:', error);
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Record module load metric
   */
  recordModuleLoad(metric: ModuleLoadMetric): void {
    this.recordMetric(metric);
    this.bundleLoadTimes.set(metric.moduleName, metric.loadTime);
  }

  /**
   * Record user experience metric
   */
  recordUserExperience(metric: UserExperienceMetric): void {
    this.recordMetric(metric);
  }

  /**
   * Track lazy loaded module performance
   */
  trackModuleLoad(moduleName: string, loadStartTime: number): void {
    const loadTime = Date.now() - loadStartTime;
    this.recordModuleLoad({
      name: 'lazy_module_load',
      value: loadTime,
      unit: 'ms',
      timestamp: Date.now(),
      moduleName,
      loadTime,
      bundleSize: this.estimateModuleSize(moduleName),
      cacheHit: this.isFromCache(moduleName)
    });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const now = Date.now();
    const sessionDuration = now - this.startTime;

    // Calculate averages
    const moduleLoads = this.metrics.filter(m => m.name.includes('module_load'));
    const avgModuleLoadTime = moduleLoads.length > 0
      ? moduleLoads.reduce((sum, m) => sum + m.value, 0) / moduleLoads.length
      : 0;

    // Get latest UX metrics
    const lcp = this.metrics.findLast(m => m.metric === 'LCP');
    const fid = this.metrics.findLast(m => m.metric === 'FID');
    const cls = this.metrics.findLast(m => m.metric === 'CLS');

    return {
      sessionDuration,
      totalMetrics: this.metrics.length,
      averageModuleLoadTime: Math.round(avgModuleLoadTime),
      coreWebVitals: {
        lcp: lcp ? Math.round(lcp.value) : null,
        fid: fid ? Math.round(fid.value) : null,
        cls: cls ? Math.round(cls.value * 1000) / 1000 : null
      },
      bundlePerformance: {
        totalModulesLoaded: moduleLoads.length,
        slowestModule: this.getSlowestModule(),
        cacheHitRate: this.getCacheHitRate()
      }
    };
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      summary: this.getPerformanceSummary(),
      metrics: this.metrics,
      bundleLoadTimes: Object.fromEntries(this.bundleLoadTimes)
    };
  }

  /**
   * Send metrics to analytics service
   */
  async sendMetrics(endpoint: string): Promise<void> {
    try {
      const metrics = this.exportMetrics();
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metrics)
      });
    } catch (error) {
      console.warn('Failed to send metrics:', error);
    }
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
    this.bundleLoadTimes.clear();
  }

  // Private helper methods
  private extractModuleName(url: string): string {
    const match = url.match(/\/([^/]+)-[a-f0-9]+\.js$/);
    return match ? match[1] : 'unknown';
  }

  private estimateModuleSize(moduleName: string): number {
    // Rough estimation based on module type
    const sizeMap: Record<string, number> = {
      'react-core': 50000,
      'charts': 200000,
      'pdf': 150000,
      'excel': 180000,
      'maps': 120000,
      '3d': 300000,
      'vendor': 80000
    };

    for (const [key, size] of Object.entries(sizeMap)) {
      if (moduleName.includes(key)) return size;
    }
    return 50000; // Default 50KB
  }

  private isFromCache(moduleName: string): boolean {
    // Simple heuristic - if load time is very low, likely from cache
    const loadTime = this.bundleLoadTimes.get(moduleName);
    return loadTime ? loadTime < 50 : false;
  }

  private getSlowestModule() {
    const moduleLoads = this.metrics.filter(m => m.name.includes('module_load'));
    if (moduleLoads.length === 0) return null;

    return moduleLoads.reduce((slowest, current) =>
      current.value > slowest.value ? current : slowest
    );
  }

  private getCacheHitRate(): number {
    const moduleLoads = this.metrics.filter(m =>
      m.name.includes('module_load') && m.cacheHit !== undefined
    );

    if (moduleLoads.length === 0) return 0;

    const cacheHits = moduleLoads.filter(m => m.cacheHit).length;
    return Math.round((cacheHits / moduleLoads.length) * 100);
  }

  private getLCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private getFIDRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  private getCLSRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-send metrics periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    const metrics = performanceMonitor.getPerformanceSummary();

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('Performance Metrics:', metrics);
    }

    // Send to analytics service in production
    if (import.meta.env.PROD) {
      // performanceMonitor.sendMetrics('/api/analytics/performance');
    }
  }, 30000); // Every 30 seconds
}

export default performanceMonitor;