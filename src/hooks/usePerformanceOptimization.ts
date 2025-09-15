import { useCallback, useRef, useEffect, useState } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'

export interface PerformanceMetrics {
  renderTime: number
  componentCount: number
  memoryUsage: number
  loadTime: number
  imageOptimizationLevel: 'low' | 'medium' | 'high'
}

export interface PerformanceConfig {
  enableLazyLoading: boolean
  imageOptimization: boolean
  enableVirtualization: boolean
  memoryThreshold: number // MB
  maxConcurrentImages: number
  prefetchCriticalResources: boolean
}

const DEFAULT_CONFIG: PerformanceConfig = {
  enableLazyLoading: true,
  imageOptimization: true,
  enableVirtualization: true,
  memoryThreshold: 100, // 100MB
  maxConcurrentImages: 5,
  prefetchCriticalResources: true
}

export function usePerformanceOptimization(config: Partial<PerformanceConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const renderStartTime = useRef<number>(0)
  const componentCountRef = useRef<number>(0)
  const imageLoadQueue = useRef<Set<string>>(new Set())
  const [performanceConfig, setPerformanceConfig] = useLocalStorage('performanceConfig', finalConfig)
  
  const renderMetrics = useRef<PerformanceMetrics>({
    renderTime: 0,
    componentCount: 0,
    memoryUsage: 0,
    loadTime: 0,
    imageOptimizationLevel: 'medium'
  })

  // Monitor memory usage
  const [memoryUsage, setMemoryUsage] = useState<number>(0)
  
  useEffect(() => {
    const checkMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usageInMB = memory.usedJSHeapSize / (1024 * 1024)
        setMemoryUsage(usageInMB)
        renderMetrics.current.memoryUsage = usageInMB
        
        // Auto-adjust performance settings based on memory usage
        if (usageInMB > finalConfig.memoryThreshold) {
          console.warn(`High memory usage detected: ${usageInMB.toFixed(2)}MB`)
          // Reduce image quality and enable more aggressive optimizations
          setPerformanceConfig(prev => ({
            ...prev,
            imageOptimization: true,
            maxConcurrentImages: Math.max(2, prev.maxConcurrentImages - 1)
          }))
        }
      }
    }
    
    const interval = setInterval(checkMemoryUsage, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [finalConfig.memoryThreshold])

  const measureRenderTime = useCallback((componentName?: string) => {
    renderStartTime.current = performance.now()
    componentCountRef.current++
    
    return () => {
      const renderTime = performance.now() - renderStartTime.current
      renderMetrics.current.renderTime = renderTime
      renderMetrics.current.componentCount = componentCountRef.current
      
      if (renderTime > 100) { // Log slow renders
        console.warn(`Slow render detected in ${componentName || 'component'}: ${renderTime.toFixed(2)}ms`)
      }
      
      // Performance logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 Render ${componentName || 'component'}: ${renderTime.toFixed(2)}ms`)
      }
    }
  }, [])

  // Enhanced image optimization
  const getOptimizedImageSrc = useCallback((src: string, options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'jpeg' | 'png'
    devicePixelRatio?: number
  } = {}) => {
    if (!performanceConfig.imageOptimization) {
      return src
    }

    const {
      width,
      height,
      quality = memoryUsage > 80 ? 60 : memoryUsage > 50 ? 75 : 85,
      format = 'webp',
      devicePixelRatio = window.devicePixelRatio || 1
    } = options

    // Calculate optimal dimensions based on device
    const optimalWidth = width ? Math.ceil(width * devicePixelRatio) : undefined
    const optimalHeight = height ? Math.ceil(height * devicePixelRatio) : undefined

    // For now, return original src with query parameters for future optimization service
    const params = new URLSearchParams()
    if (optimalWidth) params.set('w', optimalWidth.toString())
    if (optimalHeight) params.set('h', optimalHeight.toString())
    params.set('q', quality.toString())
    params.set('f', format)
    
    return `${src}${src.includes('?') ? '&' : '?'}${params.toString()}`
  }, [performanceConfig.imageOptimization, memoryUsage])

  // Virtual list implementation
  const virtualizeList = useCallback((
    items: any[], 
    containerHeight: number, 
    itemHeight: number,
    scrollTop: number = 0,
    overscan: number = 5
  ) => {
    if (!performanceConfig.enableVirtualization || items.length < 20) {
      return {
        virtualItems: items,
        totalHeight: items.length * itemHeight,
        startIndex: 0,
        endIndex: items.length - 1
      }
    }

    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2)
    
    const virtualItems = items.slice(startIndex, endIndex + 1)
    const totalHeight = items.length * itemHeight
    
    return {
      virtualItems,
      totalHeight,
      startIndex,
      endIndex,
      offsetY: startIndex * itemHeight
    }
  }, [performanceConfig.enableVirtualization])

  // Prefetch critical resources
  const prefetchResource = useCallback((url: string, type: 'image' | 'script' | 'style' | 'font' = 'image') => {
    if (!performanceConfig.prefetchCriticalResources) return

    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.as = type
    link.href = url
    document.head.appendChild(link)
  }, [performanceConfig.prefetchCriticalResources])

  // Performance monitoring
  const getPerformanceReport = useCallback(() => {
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paintEntries = performance.getEntriesByType('paint')
    
    return {
      metrics: renderMetrics.current,
      memoryUsage: memoryUsage,
      navigationTiming: navigationTiming ? {
        domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart,
        loadComplete: navigationTiming.loadEventEnd - navigationTiming.loadEventStart,
        firstByte: navigationTiming.responseStart - navigationTiming.requestStart
      } : null,
      paintMetrics: paintEntries.reduce((acc, entry) => {
        acc[entry.name] = entry.startTime
        return acc
      }, {} as Record<string, number>),
      config: performanceConfig
    }
  }, [memoryUsage, performanceConfig])

  // Debounced scroll handler for performance
  const createDebouncedScrollHandler = useCallback((handler: (scrollTop: number) => void, delay: number = 16) => {
    let timeoutId: NodeJS.Timeout
    let lastExecution = 0
    
    return (event: Event) => {
      const now = Date.now()
      const timeSinceLastExecution = now - lastExecution
      
      const execute = () => {
        lastExecution = now
        const target = event.target as HTMLElement
        handler(target.scrollTop)
      }
      
      if (timeSinceLastExecution >= delay) {
        execute()
      } else {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(execute, delay - timeSinceLastExecution)
      }
    }
  }, [])

  // Image preloader utility
  const preloadImages = useCallback((urls: string[], priority: 'high' | 'low' = 'low') => {
    return Promise.all(
      urls.map(url => {
        return new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = reject
          img.src = getOptimizedImageSrc(url)
          
          // Set loading priority
          if (priority === 'high') {
            img.loading = 'eager'
            if ('fetchPriority' in img) {
              (img as any).fetchPriority = 'high'
            }
          }
        })
      })
    )
  }, [getOptimizedImageSrc])

  return {
    // Core performance functions
    measureRenderTime,
    getOptimizedImageSrc,
    virtualizeList,
    prefetchResource,
    getPerformanceReport,
    createDebouncedScrollHandler,
    preloadImages,
    
    // State and config
    metrics: renderMetrics.current,
    memoryUsage,
    config: performanceConfig,
    updateConfig: setPerformanceConfig
  }
}