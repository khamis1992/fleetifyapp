// Performance optimization components and hooks
export { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
export { useLocalStorage } from '@/hooks/useLocalStorage';
export { LazyImage } from './LazyImage';
export { LazyComponent } from './LazyComponent';
export { MobileOptimizationProvider } from './MobileOptimizationProvider';
export { PerformanceMonitor } from './PerformanceMonitor';

// Re-export types
export type { PerformanceMetrics, PerformanceConfig } from '@/hooks/usePerformanceOptimization';