import { logger } from './logger';

export class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  private buildTime: number = 0;
  private bundleSize: number = 0;

  startTiming(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.metrics.set(operation, duration);
      
      if (duration > 100) {
        logger.warn(`Performance warning: ${operation} took ${duration.toFixed(2)}ms`);
      } else {
        logger.debug(`Performance: ${operation} completed in ${duration.toFixed(2)}ms`);
      }
    };
  }

  measureRender<T>(component: string, fn: () => T): T {
    const endTiming = this.startTiming(`Render: ${component}`);
    try {
      const result = fn();
      endTiming();
      return result;
    } catch (error) {
      endTiming();
      throw error;
    }
  }

  setBuildMetrics(buildTime: number, bundleSize: number) {
    this.buildTime = buildTime;
    this.bundleSize = bundleSize;
    
    logger.info(`Build completed in ${buildTime}ms, bundle size: ${(bundleSize / 1024 / 1024).toFixed(2)}MB`);
  }

  getMetrics() {
    return {
      renderTimes: Object.fromEntries(this.metrics),
      buildTime: this.buildTime,
      bundleSize: this.bundleSize,
      averageRenderTime: this.getAverageRenderTime()
    };
  }

  private getAverageRenderTime(): number {
    if (this.metrics.size === 0) return 0;
    
    const total = Array.from(this.metrics.values()).reduce((sum, time) => sum + time, 0);
    return total / this.metrics.size;
  }

  logReport() {
    const metrics = this.getMetrics();
    logger.info('Performance Report:', metrics);
    
    if (metrics.averageRenderTime > 50) {
      logger.warn('Performance concern: Average render time is high');
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();