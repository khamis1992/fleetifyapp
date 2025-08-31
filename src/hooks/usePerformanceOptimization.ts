import { useState, useEffect, useMemo, useCallback } from 'react'
import { useEnhancedResponsive } from './useEnhancedResponsive'

// Performance metrics interface
interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  bundleSize: number
  memoryUsage: number
  networkSpeed: 'slow' | 'medium' | 'fast'
  devicePerformance: 'low' | 'medium' | 'high'
}

// Performance optimization configuration
interface PerformanceConfig {
  enableLazyLoading: boolean
  enableImageOptimization: boolean
  enableCodeSplitting: boolean
  enableVirtualScrolling: boolean
  maxConcurrentRequests: number
  cachingStrategy: 'aggressive' | 'moderate' | 'minimal'
  animationQuality: 'high' | 'medium' | 'low' | 'disabled'
}

// Performance optimization hook
export function usePerformanceOptimization() {
  const { deviceType, shouldUseReducedAnimations, optimalImageQuality } = useEnhancedResponsive()
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    bundleSize: 0,
    memoryUsage: 0,
    networkSpeed: 'medium',
    devicePerformance: 'medium'
  })

  const [config, setConfig] = useState<PerformanceConfig>({
    enableLazyLoading: true,
    enableImageOptimization: true,
    enableCodeSplitting: true,
    enableVirtualScrolling: false,
    maxConcurrentRequests: 6,
    cachingStrategy: 'moderate',
    animationQuality: 'medium'
  })

  // Detect network speed
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      const updateNetworkInfo = () => {
        const effectiveType = connection.effectiveType
        let speed: 'slow' | 'medium' | 'fast' = 'medium'
        
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          speed = 'slow'
        } else if (effectiveType === '3g') {
          speed = 'medium'
        } else if (effectiveType === '4g') {
          speed = 'fast'
        }
        
        setMetrics(prev => ({ ...prev, networkSpeed: speed }))
      }

      updateNetworkInfo()
      connection.addEventListener('change', updateNetworkInfo)
      
      return () => {
        connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }, [])

  // Detect device performance
  useEffect(() => {
    const detectDevicePerformance = () => {
      let performance: 'low' | 'medium' | 'high' = 'medium'
      
      // Check hardware concurrency (CPU cores)
      const cores = navigator.hardwareConcurrency || 4
      
      // Check memory (if available)
      const memory = (navigator as any).deviceMemory || 4
      
      // Basic performance detection
      if (cores <= 2 || memory <= 2) {
        performance = 'low'
      } else if (cores >= 8 && memory >= 8) {
        performance = 'high'
      }
      
      setMetrics(prev => ({ ...prev, devicePerformance: performance }))
    }

    detectDevicePerformance()
  }, [])

  // Adaptive configuration based on device and network
  useEffect(() => {
    const optimizeForDevice = () => {
      let newConfig: PerformanceConfig = { ...config }

      // Mobile optimizations
      if (deviceType === 'mobile') {
        newConfig.enableLazyLoading = true
        newConfig.enableVirtualScrolling = true
        newConfig.maxConcurrentRequests = 3
        newConfig.animationQuality = shouldUseReducedAnimations ? 'disabled' : 'low'
        newConfig.cachingStrategy = 'aggressive'
      }

      // Low performance device optimizations
      if (metrics.devicePerformance === 'low') {
        newConfig.enableVirtualScrolling = true
        newConfig.animationQuality = 'disabled'
        newConfig.maxConcurrentRequests = 2
        newConfig.cachingStrategy = 'aggressive'
      }

      // Slow network optimizations
      if (metrics.networkSpeed === 'slow') {
        newConfig.enableImageOptimization = true
        newConfig.enableCodeSplitting = true
        newConfig.maxConcurrentRequests = 2
        newConfig.cachingStrategy = 'aggressive'
      }

      setConfig(newConfig)
    }

    optimizeForDevice()
  }, [deviceType, metrics.devicePerformance, metrics.networkSpeed, shouldUseReducedAnimations])

  // Performance monitoring
  const measureRenderTime = useCallback((componentName: string) => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`)
      }
      
      setMetrics(prev => ({ ...prev, renderTime }))
    }
  }, [])

  // Image optimization
  const getOptimizedImageSrc = useCallback((
    originalSrc: string,
    width?: number,
    height?: number
  ): string => {
    if (!config.enableImageOptimization || !originalSrc) {
      return originalSrc
    }

    // Auto-determine dimensions based on device
    const deviceWidth = width || (
      deviceType === 'mobile' ? 400 :
      deviceType === 'tablet' ? 800 : 1200
    )

    const quality = optimalImageQuality === 'low' ? 60 :
                   optimalImageQuality === 'medium' ? 75 : 90

    // For Cloudinary or similar services
    if (originalSrc.includes('cloudinary')) {
      return originalSrc.replace(
        '/upload/',
        `/upload/c_scale,w_${deviceWidth},q_${quality},f_auto/`
      )
    }

    // For other services, return optimized parameters
    const url = new URL(originalSrc)
    url.searchParams.set('w', deviceWidth.toString())
    url.searchParams.set('q', quality.toString())
    
    return url.toString()
  }, [config.enableImageOptimization, deviceType, optimalImageQuality])

  // Code splitting helper
  const loadComponentDynamically = useCallback(async <T>(
    importFunction: () => Promise<{ default: T }>,
    fallback?: T
  ): Promise<T> => {
    if (!config.enableCodeSplitting && fallback) {
      return fallback
    }

    try {
      const module = await importFunction()
      return module.default
    } catch (error) {
      console.error('Failed to load component dynamically:', error)
      return fallback || ({} as T)
    }
  }, [config.enableCodeSplitting])

  // Virtual scrolling configuration
  const getVirtualScrollConfig = useCallback((itemCount: number) => {
    if (!config.enableVirtualScrolling || itemCount < 50) {
      return null
    }

    const itemHeight = deviceType === 'mobile' ? 80 : 60
    const containerHeight = deviceType === 'mobile' ? 400 : 600
    const overscan = deviceType === 'mobile' ? 2 : 5

    return {
      itemHeight,
      containerHeight,
      overscan,
      enabled: true
    }
  }, [config.enableVirtualScrolling, deviceType])

  // Cache management
  const getCacheStrategy = useCallback(() => {
    const strategies = {
      aggressive: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        maxSize: 50 * 1024 * 1024,   // 50MB
        enablePrefetch: true
      },
      moderate: {
        maxAge: 6 * 60 * 60 * 1000,  // 6 hours
        maxSize: 25 * 1024 * 1024,   // 25MB
        enablePrefetch: false
      },
      minimal: {
        maxAge: 1 * 60 * 60 * 1000,  // 1 hour
        maxSize: 10 * 1024 * 1024,   // 10MB
        enablePrefetch: false
      }
    }

    return strategies[config.cachingStrategy]
  }, [config.cachingStrategy])

  // Animation configuration
  const getAnimationConfig = useCallback(() => {
    const configs = {
      high: {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        enableParallax: true,
        enableTransitions: true
      },
      medium: {
        duration: 200,
        easing: 'ease-out',
        enableParallax: false,
        enableTransitions: true
      },
      low: {
        duration: 150,
        easing: 'ease-out',
        enableParallax: false,
        enableTransitions: true
      },
      disabled: {
        duration: 0,
        easing: 'none',
        enableParallax: false,
        enableTransitions: false
      }
    }

    return configs[config.animationQuality]
  }, [config.animationQuality])

  // Bundle analysis helper
  const analyzeBundleSize = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      // Estimate bundle size (simplified)
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      let totalSize = 0

      scripts.forEach(script => {
        // This is a rough estimation
        const src = script.getAttribute('src')
        if (src && src.includes('chunk')) {
          totalSize += 200 * 1024 // Estimated 200KB per chunk
        }
      })

      setMetrics(prev => ({ ...prev, bundleSize: totalSize }))
    }
  }, [])

  // Memory usage monitoring
  const monitorMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize
      }))
    }
  }, [])

  // Cleanup and optimization suggestions
  const getOptimizationSuggestions = useMemo(() => {
    const suggestions: string[] = []

    if (metrics.renderTime > 16) {
      suggestions.push('Consider optimizing component renders or using React.memo')
    }

    if (metrics.bundleSize > 1024 * 1024) { // > 1MB
      suggestions.push('Bundle size is large, consider code splitting')
    }

    if (metrics.memoryUsage > 50 * 1024 * 1024) { // > 50MB
      suggestions.push('Memory usage is high, check for memory leaks')
    }

    if (metrics.networkSpeed === 'slow' && !config.enableImageOptimization) {
      suggestions.push('Enable image optimization for slow networks')
    }

    if (metrics.devicePerformance === 'low' && config.animationQuality !== 'disabled') {
      suggestions.push('Consider disabling animations on low-performance devices')
    }

    return suggestions
  }, [metrics, config])

  // Initialize performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      monitorMemoryUsage()
      analyzeBundleSize()
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [monitorMemoryUsage, analyzeBundleSize])

  return {
    metrics,
    config,
    measureRenderTime,
    getOptimizedImageSrc,
    loadComponentDynamically,
    getVirtualScrollConfig,
    getCacheStrategy,
    getAnimationConfig,
    getOptimizationSuggestions,
    updateConfig: setConfig
  }
}

// Performance monitoring HOC
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    const { measureRenderTime } = usePerformanceOptimization()
    
    useEffect(() => {
      const endMeasure = measureRenderTime(componentName)
      return endMeasure
    })

    return <Component {...props} />
  }
}

// Lazy loading hook
export function useLazyLoading(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false)
  const [ref, setRef] = useState<Element | null>(null)

  useEffect(() => {
    if (!ref) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    observer.observe(ref)

    return () => observer.disconnect()
  }, [ref, threshold])

  return { ref: setRef, isVisible }
}

// Image lazy loading component
interface LazyImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  placeholder?: string
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  className,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="100%25" height="100%25" fill="%23f0f0f0"/%3E%3C/svg%3E'
}: LazyImageProps) {
  const { getOptimizedImageSrc } = usePerformanceOptimization()
  const { ref, isVisible } = useLazyLoading()

  const optimizedSrc = getOptimizedImageSrc(src, width, height)

  return (
    <img
      ref={ref}
      src={isVisible ? optimizedSrc : placeholder}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
    />
  )
}