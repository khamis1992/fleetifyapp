/**
 * Performance Debug Utilities
 * 
 * Collection of utilities to help debug performance issues
 */

/**
 * Measure function execution time
 */
export const measureTime = async <T>(
  fn: () => Promise<T> | T,
  label: string
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const end = performance.now();
    console.log(`⏱️ [MEASURE] ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  } catch (error) {
    const end = performance.now();
    console.error(`⏱️ [MEASURE] ${label} failed after ${(end - start).toFixed(2)}ms`, error);
    throw error;
  }
};

/**
 * Debounce function with performance tracking
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  label: string = 'debounced-function'
): T => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>): void {
    const later = () => {
      clearTimeout(timeout);
      const start = performance.now();
      func.apply(this, args);
      const end = performance.now();
      if (end - start > 16.67) { // More than one frame at 60fps
        console.warn(`⚠️ [DEBOUNCE] ${label} took ${(end - start).toFixed(2)}ms`);
      }
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  } as T;
};

/**
 * Throttle function with performance tracking
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number,
  label: string = 'throttled-function'
): T => {
  let inThrottle: boolean;
  return function executedFunction(...args: Parameters<T>): void {
    const start = performance.now();
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        const end = performance.now();
        if (end - start > 16.67) {
          console.warn(`⚠️ [THROTTLE] ${label} took ${(end - start).toFixed(2)}ms`);
        }
      }, limit);
    }
  } as T;
};

/**
 * Log memory usage if available
 */
export const logMemoryUsage = () => {
  if ('memory' in performance) {
    // @ts-ignore - memory property exists in some browsers
    const memory = performance.memory;
    if (memory) {
      console.log(`📊 [MEMORY] Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB, Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
    }
  }
};

/**
 * Force garbage collection if available (for debugging)
 */
export const forceGarbageCollection = () => {
  if ('gc' in window) {
    // @ts-ignore - gc function exists in some environments for debugging
    window.gc();
    console.log('🧹 [GC] Garbage collection forced');
  } else {
    console.log('🧹 [GC] Garbage collection not available in this environment');
  }
};

/**
 * Performance mark utility
 */
export class PerfMark {
  private marks: Map<string, number> = new Map();

  mark(name: string) {
    this.marks.set(name, performance.now());
  }

  measure(start: string, end: string, label: string) {
    const startTime = this.marks.get(start);
    const endTime = this.marks.get(end);
    
    if (startTime && endTime) {
      const duration = endTime - startTime;
      console.log(`⏱️ [MARK] ${label}: ${duration.toFixed(2)}ms`);
      return duration;
    }
    
    console.error(`❌ [MARK] Could not measure ${label}: missing marks for "${start}" or "${end}"`);
    return 0;
  }

  clear() {
    this.marks.clear();
  }
}

export const perfMark = new PerfMark();

/**
 * Performance debugging hook for components
 */
export const useDebugValue = (value: any, label: string) => {
  const start = performance.now();
  console.log(`🔍 [DEBUG_VALUE] ${label}:`, value, `(logged in ${performance.now() - start}ms)`);
};