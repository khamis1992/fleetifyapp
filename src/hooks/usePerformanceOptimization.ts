import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useResponsiveBreakpoint } from './use-mobile';
import { useAdaptiveLayout } from './useAdaptiveLayout';

/**
 * خطاف تحسين الأداء للمكونات المتجاوبة
 * يوفر تحسينات متقدمة للأداء والذاكرة
 */

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  componentSize: number;
  interactionDelay: number;
}

interface OptimizationConfig {
  enableVirtualization?: boolean;
  enableMemoization?: boolean;
  enableLazyLoading?: boolean;
  enableImageOptimization?: boolean;
  debounceDelay?: number;
  throttleDelay?: number;
}

export const usePerformanceOptimization = (config: OptimizationConfig = {}) => {
  const {
    enableVirtualization = true,
    enableMemoization = true,
    enableLazyLoading = true,
    enableImageOptimization = true,
    debounceDelay = 300,
    throttleDelay = 100
  } = config;

  const { isMobile, isTablet, deviceType } = useResponsiveBreakpoint();
  const { contentDensity } = useAdaptiveLayout();
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    componentSize: 0,
    interactionDelay: 0
  });

  const renderStartTime = useRef<number>(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // تحسين الصور حسب نوع الجهاز
  const getOptimizedImageSrc = useCallback((
    originalSrc: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'avif' | 'jpg' | 'png';
    } = {}
  ) => {
    if (!enableImageOptimization) return originalSrc;

    const {
      width = isMobile ? 400 : isTablet ? 800 : 1200,
      height,
      quality = isMobile ? 75 : 85,
      format = 'webp'
    } = options;

    // في بيئة الإنتاج، يمكن استخدام خدمة تحسين الصور
    const params = new URLSearchParams({
      w: width.toString(),
      q: quality.toString(),
      f: format
    });

    if (height) params.append('h', height.toString());

    return `${originalSrc}?${params.toString()}`;
  }, [isMobile, isTablet, enableImageOptimization]);

  // تحسين حجم البيانات المحملة
  const getOptimalDataSize = useCallback(() => {
    if (isMobile) return { pageSize: 10, maxItems: 50 };
    if (isTablet) return { pageSize: 20, maxItems: 100 };
    return { pageSize: 50, maxItems: 200 };
  }, [isMobile, isTablet]);

  // تحسين التحديثات المتكررة
  const debounce = useCallback((func: Function, delay: number = debounceDelay) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, [debounceDelay]);

  const throttle = useCallback((func: Function, delay: number = throttleDelay) => {
    let lastCall = 0;
    return (...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return func.apply(null, args);
      }
    };
  }, [throttleDelay]);

  // قياس أداء الرندر
  const measureRenderPerformance = useCallback(() => {
    renderStartTime.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      setMetrics(prev => ({ ...prev, renderTime }));
    };
  }, []);

  // تحسين التمرير
  const getVirtualizationProps = useCallback((itemCount: number, itemHeight: number = 50) => {
    if (!enableVirtualization || !isMobile) return null;

    const containerHeight = window.innerHeight * 0.6; // 60% من ارتفاع الشاشة
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    
    return {
      height: containerHeight,
      itemCount,
      itemSize: itemHeight,
      overscanCount: Math.min(5, Math.ceil(visibleItems * 0.5))
    };
  }, [enableVirtualization, isMobile]);

  // تحسين الذاكرة
  const memoizeComponent = useCallback(<T extends any[]>(
    component: (...args: T) => JSX.Element,
    deps: React.DependencyList
  ) => {
    if (!enableMemoization) return component;
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => component, deps);
  }, [enableMemoization]);

  // مراقبة الرؤية للتحميل الكسول
  const createIntersectionObserver = useCallback((
    callback: (isVisible: boolean) => void,
    options: IntersectionObserverInit = {}
  ) => {
    if (!enableLazyLoading) return null;

    const defaultOptions = {
      rootMargin: isMobile ? '50px' : '100px',
      threshold: 0.1,
      ...options
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        callback(entry.isIntersecting);
      });
    }, defaultOptions);

    return observerRef.current;
  }, [enableLazyLoading, isMobile]);

  // تنظيف الموارد
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // تحسين CSS حسب الجهاز
  const getOptimizedStyles = useCallback((baseStyles: string) => {
    const optimizations = [];
    
    if (isMobile) {
      optimizations.push('transform-gpu'); // تفعيل تسريع GPU
      optimizations.push('will-change-transform'); // تحسين الانتقالات
    }
    
    if (contentDensity === 'compact') {
      optimizations.push('space-y-1', 'p-2');
    } else if (contentDensity === 'spacious') {
      optimizations.push('space-y-4', 'p-6');
    }

    return `${baseStyles} ${optimizations.join(' ')}`;
  }, [isMobile, contentDensity]);

  // تحسين الأحداث
  const optimizeEventHandlers = useCallback((handlers: Record<string, Function>) => {
    const optimizedHandlers: Record<string, Function> = {};

    Object.entries(handlers).forEach(([event, handler]) => {
      if (event.includes('scroll') || event.includes('resize')) {
        optimizedHandlers[event] = throttle(handler);
      } else if (event.includes('input') || event.includes('search')) {
        optimizedHandlers[event] = debounce(handler);
      } else {
        optimizedHandlers[event] = handler;
      }
    });

    return optimizedHandlers;
  }, [debounce, throttle]);

  // تقرير الأداء
  const getPerformanceReport = useCallback(() => {
    const memoryInfo = (performance as any).memory;
    
    return {
      ...metrics,
      deviceType,
      memoryUsage: memoryInfo ? memoryInfo.usedJSHeapSize / 1024 / 1024 : 0, // MB
      recommendations: {
        shouldUseVirtualization: isMobile && metrics.renderTime > 100,
        shouldOptimizeImages: metrics.componentSize > 1024 * 1024, // 1MB
        shouldReduceAnimations: isMobile && metrics.interactionDelay > 16, // 60fps
        shouldLazyLoad: metrics.renderTime > 200
      }
    };
  }, [metrics, deviceType, isMobile]);

  return {
    // تحسين الصور
    getOptimizedImageSrc,
    
    // تحسين البيانات
    getOptimalDataSize,
    
    // تحسين الأحداث
    debounce,
    throttle,
    optimizeEventHandlers,
    
    // قياس الأداء
    measureRenderPerformance,
    getPerformanceReport,
    
    // تحسين العرض
    getVirtualizationProps,
    memoizeComponent,
    getOptimizedStyles,
    
    // التحميل الكسول
    createIntersectionObserver,
    
    // المقاييس
    metrics,
    
    // التكوين
    config: {
      enableVirtualization,
      enableMemoization,
      enableLazyLoading,
      enableImageOptimization
    }
  };
};

export default usePerformanceOptimization;