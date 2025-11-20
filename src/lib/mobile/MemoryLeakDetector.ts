import { logger } from '@/lib/logger';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface MemoryLeak {
  component: string;
  timestamp: number;
  memoryBefore: number;
  memoryAfter: number;
  leakSize: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  stackTrace?: string;
}

interface MemoryThresholds {
  warning: number; // Percentage of heap limit
  critical: number; // Percentage of heap limit
  leakGrowthRate: number; // MB per minute
  maxComponentMemory: number; // MB per component
}

interface ComponentMemoryTracker {
  componentId: string;
  mountTime: number;
  initialMemory: number;
  currentMemory: number;
  peakMemory: number;
  cleanupCallbacks: Set<() => void>;
}

export class MemoryLeakDetector {
  private isMonitoring: boolean = false;
  private memorySnapshots: MemoryInfo[] = [];
  private memoryLeaks: MemoryLeak[] = [];
  private componentTrackers: Map<string, ComponentMemoryTracker> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private gcAvailable: boolean = false;

  private thresholds: MemoryThresholds = {
    warning: 70, // 70% of heap limit
    critical: 85, // 85% of heap limit
    leakGrowthRate: 10, // 10MB per minute
    maxComponentMemory: 50 // 50MB per component
  };

  constructor() {
    this.gcAvailable = this.checkGCAvailability();
  }

  private checkGCAvailability(): boolean {
    return 'gc' in window && typeof (window as any).gc === 'function';
  }

  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      logger.warn('Memory leak detection is already active');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.captureMemorySnapshot();
      this.analyzeMemoryTrends();
      this.checkForLeaks();
    }, intervalMs);

    logger.info('Memory leak detection started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('Memory leak detection stopped');
  }

  private captureMemorySnapshot(): MemoryInfo | null {
    try {
      const memory = (performance as any).memory;
      if (!memory) {
        logger.warn('Memory API not available');
        return null;
      }

      const snapshot: MemoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };

      this.memorySnapshots.push(snapshot);

      // Keep only last 60 snapshots (5 minutes at 5s intervals)
      if (this.memorySnapshots.length > 60) {
        this.memorySnapshots.shift();
      }

      return snapshot;
    } catch (error) {
      logger.error('Error capturing memory snapshot:', error);
      return null;
    }
  }

  private analyzeMemoryTrends(): void {
    if (this.memorySnapshots.length < 10) return;

    const recent = this.memorySnapshots.slice(-10);
    const oldest = recent[0];
    const latest = recent[recent.length - 1];

    const memoryGrowth = latest.usedJSHeapSize - oldest.usedJSHeapSize;
    const timeSpan = 9 * 5000; // 9 intervals (10 snapshots - 1)
    const growthRateMBPerMin = (memoryGrowth / (1024 * 1024)) / (timeSpan / 60000);

    if (growthRateMBPerMin > this.thresholds.leakGrowthRate) {
      logger.warn(`High memory growth rate detected: ${growthRateMBPerMin.toFixed(2)}MB/min`);

      // Try to force garbage collection if available
      if (this.gcAvailable) {
        (window as any).gc();
      }
    }
  }

  private checkForLeaks(): void {
    const currentMemory = this.getCurrentMemoryInfo();
    if (!currentMemory) return;

    const memoryUsagePercentage = (currentMemory.usedJSHeapSize / currentMemory.jsHeapSizeLimit) * 100;

    if (memoryUsagePercentage > this.thresholds.critical) {
      logger.error(`Critical memory usage: ${memoryUsagePercentage.toFixed(1)}%`);
      this.triggerEmergencyCleanup();
    } else if (memoryUsagePercentage > this.thresholds.warning) {
      logger.warn(`High memory usage: ${memoryUsagePercentage.toFixed(1)}%`);
    }

    // Check component memory usage
    this.checkComponentMemoryLeaks();
  }

  private triggerEmergencyCleanup(): void {
    logger.warn('Triggering emergency memory cleanup');

    // Clear component trackers that haven't been cleaned up
    for (const [componentId, tracker] of this.componentTrackers.entries()) {
      const timeSinceMount = Date.now() - tracker.mountTime;
      if (timeSinceMount > 300000) { // 5 minutes
        logger.warn(`Component ${componentId} may have memory leak - active for ${timeSinceMount}ms`);
        this.forceCleanupComponent(componentId);
      }
    }

    // Clear some caches
    this.clearCaches();

    // Force garbage collection if available
    if (this.gcAvailable) {
      (window as any).gc();
    }
  }

  private clearCaches(): void {
    try {
      // Clear image cache
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        });
      }

      // Clear any other caches your app might use
      if (localStorage.length > 100) {
        const keysToRemove = [];
        for (let i = 0; i < 50; i++) {
          keysToRemove.push(localStorage.key(i));
        }
        keysToRemove.forEach(key => {
          if (key) localStorage.removeItem(key);
        });
      }
    } catch (error) {
      logger.error('Error clearing caches:', error);
    }
  }

  private checkComponentMemoryLeaks(): void {
    for (const [componentId, tracker] of this.componentTrackers.entries()) {
      const currentMemory = this.getCurrentMemoryInfo();
      if (!currentMemory) continue;

      const componentMemoryMB = (tracker.currentMemory - tracker.initialMemory) / (1024 * 1024);

      if (componentMemoryMB > this.thresholds.maxComponentMemory) {
        logger.warn(`Component ${componentId} using excessive memory: ${componentMemoryMB.toFixed(2)}MB`);

        const leak: MemoryLeak = {
          component: componentId,
          timestamp: Date.now(),
          memoryBefore: tracker.initialMemory,
          memoryAfter: tracker.currentMemory,
          leakSize: componentMemoryMB,
          severity: this.calculateSeverity(componentMemoryMB),
          stackTrace: this.getComponentStackTrace()
        };

        this.memoryLeaks.push(leak);
        this.reportMemoryLeak(leak);
      }
    }
  }

  private calculateSeverity(memoryMB: number): 'low' | 'medium' | 'high' | 'critical' {
    if (memoryMB > 100) return 'critical';
    if (memoryMB > 50) return 'high';
    if (memoryMB > 25) return 'medium';
    return 'low';
  }

  private getComponentStackTrace(): string {
    try {
      const stack = new Error().stack;
      return stack || 'No stack trace available';
    } catch (error) {
      return 'Could not capture stack trace';
    }
  }

  private reportMemoryLeak(leak: MemoryLeak): void {
    logger.error('Memory leak detected:', {
      component: leak.component,
      severity: leak.severity,
      leakSize: `${leak.leakSize.toFixed(2)}MB`,
      timestamp: new Date(leak.timestamp).toISOString()
    });

    // In development, you might want to show this to the developer
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Memory Leak: ${leak.component}`);
      console.error('Leak Size:', `${leak.leakSize.toFixed(2)}MB`);
      console.error('Severity:', leak.severity);
      if (leak.stackTrace) {
        console.error('Stack Trace:', leak.stackTrace);
      }
      console.groupEnd();
    }
  }

  // Component tracking methods
  trackComponent(componentId: string): () => void {
    const initialMemory = this.getCurrentMemoryInfo()?.usedJSHeapSize || 0;

    const tracker: ComponentMemoryTracker = {
      componentId,
      mountTime: Date.now(),
      initialMemory,
      currentMemory: initialMemory,
      peakMemory: initialMemory,
      cleanupCallbacks: new Set()
    };

    this.componentTrackers.set(componentId, tracker);

    // Return cleanup function
    return () => {
      this.untrackComponent(componentId);
    };
  }

  private untrackComponent(componentId: string): void {
    const tracker = this.componentTrackers.get(componentId);
    if (!tracker) return;

    // Run all cleanup callbacks
    tracker.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        logger.error(`Error in cleanup callback for ${componentId}:`, error);
      }
    });

    this.componentTrackers.delete(componentId);
    logger.debug(`Component ${componentId} untracked`);
  }

  private forceCleanupComponent(componentId: string): void {
    const tracker = this.componentTrackers.get(componentId);
    if (!tracker) return;

    logger.warn(`Force cleaning up component ${componentId}`);
    this.untrackComponent(componentId);
  }

  addCleanupCallback(componentId: string, callback: () => void): void {
    const tracker = this.componentTrackers.get(componentId);
    if (tracker) {
      tracker.cleanupCallbacks.add(callback);
    }
  }

  updateComponentMemory(componentId: string): void {
    const tracker = this.componentTrackers.get(componentId);
    if (!tracker) return;

    const currentMemory = this.getCurrentMemoryInfo();
    if (currentMemory) {
      tracker.currentMemory = currentMemory.usedJSHeapSize;
      tracker.peakMemory = Math.max(tracker.peakMemory, currentMemory.usedJSHeapSize);
    }
  }

  // Utility methods
  getCurrentMemoryInfo(): MemoryInfo | null {
    try {
      const memory = (performance as any).memory;
      if (!memory) return null;

      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    } catch (error) {
      return null;
    }
  }

  getMemoryUsageMB(): number {
    const memory = this.getCurrentMemoryInfo();
    if (!memory) return 0;
    return memory.usedJSHeapSize / (1024 * 1024);
  }

  getMemoryUsagePercentage(): number {
    const memory = this.getCurrentMemoryInfo();
    if (!memory) return 0;
    return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
  }

  getMemoryLeaks(): MemoryLeak[] {
    return [...this.memoryLeaks];
  }

  getComponentCount(): number {
    return this.componentTrackers.size;
  }

  getActiveComponents(): string[] {
    return Array.from(this.componentTrackers.keys());
  }

  setThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  getThresholds(): MemoryThresholds {
    return { ...this.thresholds };
  }

  // Manual garbage collection trigger
  forceGarbageCollection(): boolean {
    if (this.gcAvailable) {
      (window as any).gc();
      logger.info('Manual garbage collection triggered');
      return true;
    } else {
      logger.warn('Garbage collection not available');
      return false;
    }
  }

  // Generate memory report
  generateMemoryReport(): object {
    const currentMemory = this.getCurrentMemoryInfo();
    const memoryUsageMB = currentMemory ? currentMemory.usedJSHeapSize / (1024 * 1024) : 0;
    const memoryUsagePercentage = currentMemory ? (currentMemory.usedJSHeapSize / currentMemory.jsHeapSizeLimit) * 100 : 0;

    return {
      timestamp: Date.now(),
      memoryUsage: {
        mb: memoryUsageMB.toFixed(2),
        percentage: memoryUsagePercentage.toFixed(1),
        status: this.getMemoryStatus(memoryUsagePercentage)
      },
      activeComponents: this.componentTrackers.size,
      memoryLeaks: this.memoryLeaks.length,
      criticalLeaks: this.memoryLeaks.filter(leak => leak.severity === 'critical').length,
      gcAvailable: this.gcAvailable,
      isMonitoring: this.isMonitoring
    };
  }

  private getMemoryStatus(percentage: number): 'healthy' | 'warning' | 'critical' {
    if (percentage > this.thresholds.critical) return 'critical';
    if (percentage > this.thresholds.warning) return 'warning';
    return 'healthy';
  }

  cleanup(): void {
    this.stopMonitoring();
    this.componentTrackers.clear();
    this.memoryLeaks = [];
    this.memorySnapshots = [];
  }
}

// Singleton instance
export const memoryLeakDetector = new MemoryLeakDetector();

// React hook for component memory tracking
export const useMemoryLeakDetection = (componentId: string) => {
  React.useEffect(() => {
    const untrack = memoryLeakDetector.trackComponent(componentId);

    return () => {
      untrack();
    };
  }, [componentId]);

  const updateMemory = React.useCallback(() => {
    memoryLeakDetector.updateComponentMemory(componentId);
  }, [componentId]);

  const addCleanupCallback = React.useCallback((callback: () => void) => {
    memoryLeakDetector.addCleanupCallback(componentId, callback);
  }, [componentId]);

  return {
    updateMemory,
    addCleanupCallback,
    forceGC: () => memoryLeakDetector.forceGarbageCollection(),
    getMemoryUsage: () => memoryLeakDetector.getCurrentMemoryInfo()
  };
};