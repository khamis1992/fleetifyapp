// @ts-nocheck
import { useCallback, useRef, useEffect, useState, useMemo } from 'react'
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
  memoryThreshold: 256, // 256MB - more realistic threshold for modern apps
  maxConcurrentImages: 8,
  prefetchCriticalResources: true
}

export function usePerformanceOptimization(config: Partial<PerformanceConfig> = {}) {
  const renderStartTime = useRef<number>(0)
  const componentCountRef = useRef<number>(0)
  const imageLoadQueue = useRef<Set<string>>(new Set())
  const lastMemoryWarning = useRef<number>(0)
  const [performanceConfig, setPerformanceConfig] = useLocalStorage('performanceConfig', DEFAULT_CONFIG)
  
  // استخدم useMemo لتجنب إعادة حساب التكوين في كل render
  const finalConfig = useMemo(() => ({ ...performanceConfig, ...config }), [performanceConfig, config])
  
  const renderMetrics = useRef<PerformanceMetrics>({
    renderTime: 0,
    componentCount: 0,
    memoryUsage: 0,
    loadTime: 0,
    imageOptimizationLevel: 'medium'
  })

  // Monitor memory usage مع تحسينات
  const [memoryUsage, setMemoryUsage] = useState<number>(0)
  
  // دالة تنظيف الذاكرة المتقدمة
  const cleanupMemory = useCallback(() => {
    try {
      // محاولة فرض تنظيف الذاكرة
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc()
      }
      
      // تنظيف cache الصور
      imageLoadQueue.current.clear()
      
      // إعادة تعيين metrics
      componentCountRef.current = 0
    } catch (error) {
      console.debug('Memory cleanup attempt failed:', error)
    }
  }, [])
  
  useEffect(() => {
    const checkMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usageInMB = memory.usedJSHeapSize / (1024 * 1024)
        const memoryLimit = memory.jsHeapSizeLimit / (1024 * 1024)
        const memoryPercentage = (usageInMB / memoryLimit) * 100
        
        setMemoryUsage(usageInMB)
        renderMetrics.current.memoryUsage = usageInMB
        
        const now = Date.now()
        
        // Only warn if percentage > 70% OR absolute value is very high (500MB+)
        // Avoid repeated warnings (every 60 seconds at most)
        const shouldWarn = (memoryPercentage > 70 || usageInMB > 500) && 
                          now - lastMemoryWarning.current > 60000
        
        if (shouldWarn) {
          console.warn(`⚠️ High memory usage: ${usageInMB.toFixed(2)}MB (${memoryPercentage.toFixed(1)}% of ${memoryLimit.toFixed(0)}MB limit)`)
          lastMemoryWarning.current = now
          
          // Auto-optimize settings only if > 80% memory
          if (memoryPercentage > 80) {
            setPerformanceConfig(prev => ({
              ...prev,
              imageOptimization: true,
              enableVirtualization: true,
              maxConcurrentImages: Math.max(3, Math.floor(prev.maxConcurrentImages * 0.7))
            }))
          }
        }
        
        // Auto cleanup at 90% memory
        if (memoryPercentage > 90) {
          cleanupMemory()
        }
      }
    }
    
    // Check every 30 seconds (less frequent than before)
    const interval = setInterval(checkMemoryUsage, 30000)
    checkMemoryUsage() // Initial check
    
    return () => clearInterval(interval)
  }, [finalConfig.memoryThreshold, cleanupMemory, setPerformanceConfig])

  const measureRenderTime = useCallback((componentName?: string) => {
    const startTime = performance.now()
    componentCountRef.current++
    
    return () => {
      const renderTime = performance.now() - startTime
      renderMetrics.current.renderTime = renderTime
      renderMetrics.current.componentCount = componentCountRef.current
      
      // حد ديناميكي بناءً على نوع الجهاز
      const slowRenderThreshold = memoryUsage > 100 ? 50 : 100
      
      if (renderTime > slowRenderThreshold) {
        console.warn(`⚠️ Slow render in ${componentName || 'component'}: ${renderTime.toFixed(2)}ms`)
      }
      
      // تسجيل محدود في التطوير
      if (import.meta.env.DEV && renderTime > 16) {
        console.debug(`🎯 ${componentName || 'component'}: ${renderTime.toFixed(2)}ms`)
      }
    }
  }, [memoryUsage])

  // Enhanced image optimization مع caching
  const imageCache = useRef<Map<string, string>>(new Map())
  
  const getOptimizedImageSrc = useCallback((src: string, options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'jpeg' | 'png'
    devicePixelRatio?: number
  } = {}) => {
    if (!finalConfig.imageOptimization) {
      return src
    }

    // Create cache key
    const cacheKey = `${src}-${JSON.stringify(options)}`
    if (imageCache.current.has(cacheKey)) {
      return imageCache.current.get(cacheKey)!
    }

    const {
      width,
      height,
      quality = memoryUsage > 200 ? 60 : memoryUsage > 150 ? 75 : 85,
      format = 'webp',
      devicePixelRatio = window.devicePixelRatio || 1
    } = options

    // Calculate optimal dimensions considering memory
    const pixelRatioMultiplier = memoryUsage > 200 ? Math.min(devicePixelRatio, 1.5) : devicePixelRatio
    const optimalWidth = width ? Math.ceil(width * pixelRatioMultiplier) : undefined
    const optimalHeight = height ? Math.ceil(height * pixelRatioMultiplier) : undefined

    const params = new URLSearchParams()
    if (optimalWidth) params.set('w', optimalWidth.toString())
    if (optimalHeight) params.set('h', optimalHeight.toString())
    params.set('q', quality.toString())
    params.set('f', format)
    
    const optimizedSrc = `${src}${src.includes('?') ? '&' : '?'}${params.toString()}`
    
    // Cache with limit to prevent memory bloat
    if (imageCache.current.size < 200) {
      imageCache.current.set(cacheKey, optimizedSrc)
    } else {
      // Clear old cache when limit reached
      const firstKey = imageCache.current.keys().next().value
      if (firstKey) imageCache.current.delete(firstKey)
      imageCache.current.set(cacheKey, optimizedSrc)
    }
    
    return optimizedSrc
  }, [finalConfig.imageOptimization, memoryUsage])

  // Virtual list implementation optimized
  const virtualizeList = useCallback((
    items: unknown[], 
    containerHeight: number, 
    itemHeight: number,
    scrollTop: number = 0,
    overscan: number = 5
  ) => {
    // Lower threshold based on memory usage
    const enableThreshold = memoryUsage > 150 ? 15 : 30
    
    if (!finalConfig.enableVirtualization || items.length < enableThreshold) {
      return {
        virtualItems: items,
        totalHeight: items.length * itemHeight,
        startIndex: 0,
        endIndex: items.length - 1
      }
    }

    // Optimize calculations
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const adjustedOverscan = memoryUsage > 200 ? Math.min(overscan, 2) : overscan
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - adjustedOverscan)
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount + adjustedOverscan * 2)
    
    const virtualItems = items.slice(startIndex, endIndex + 1)
    
    return {
      virtualItems,
      totalHeight: items.length * itemHeight,
      startIndex,
      endIndex,
      offsetY: startIndex * itemHeight
    }
  }, [finalConfig.enableVirtualization, memoryUsage])

  // Prefetch critical resources optimized
  const prefetchResource = useCallback((url: string, type: 'image' | 'script' | 'style' | 'font' = 'image') => {
    if (!finalConfig.prefetchCriticalResources || memoryUsage > 200) return

    // Avoid duplicate prefetching
    if (imageLoadQueue.current.has(url)) return
    imageLoadQueue.current.add(url)

    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.as = type
    link.href = url
    link.onload = () => imageLoadQueue.current.delete(url)
    link.onerror = () => imageLoadQueue.current.delete(url)
    
    document.head.appendChild(link)
  }, [finalConfig.prefetchCriticalResources, memoryUsage])

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

  // Debounced scroll handler محسن
  const createDebouncedScrollHandler = useCallback((handler: (scrollTop: number) => void, delay: number = 16) => {
    let timeoutId: ReturnType<typeof setTimeout>
    let lastExecution = 0
    
    // تعديل التأخير بناءً على استخدام الذاكرة
    const adaptiveDelay = memoryUsage > 100 ? Math.max(delay * 2, 32) : delay
    
    return (event: Event) => {
      const now = Date.now()
      const timeSinceLastExecution = now - lastExecution
      
      const execute = () => {
        lastExecution = now
        const target = event.target as HTMLElement
        if (target && typeof target.scrollTop === 'number') {
          handler(target.scrollTop)
        }
      }
      
      if (timeSinceLastExecution >= adaptiveDelay) {
        execute()
      } else {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(execute, adaptiveDelay - timeSinceLastExecution)
      }
    }
  }, [memoryUsage])

  // Image preloader utility محسن
  const preloadImages = useCallback((urls: string[], priority: 'high' | 'low' = 'low') => {
    // Reduce preloaded images based on memory usage
    const maxConcurrent = memoryUsage > 200 ? 2 : memoryUsage > 150 ? 4 : finalConfig.maxConcurrentImages
    const urlsToLoad = urls.slice(0, maxConcurrent)
    
    return Promise.all(
      urlsToLoad.map(url => {
        return new Promise<void>((resolve, reject) => {
          if (imageLoadQueue.current.has(url)) {
            resolve()
            return
          }
          
          imageLoadQueue.current.add(url)
          const img = new Image()
          
          img.onload = () => {
            imageLoadQueue.current.delete(url)
            resolve()
          }
          img.onerror = () => {
            imageLoadQueue.current.delete(url)
            reject()
          }
          
          img.src = getOptimizedImageSrc(url)
          
          // Set loading priority based on memory
          if (priority === 'high' && memoryUsage < 150) {
            img.loading = 'eager'
            if ('fetchPriority' in img) {
              (img as any).fetchPriority = 'high'
            }
          } else {
            img.loading = 'lazy'
          }
        })
      })
    )
  }, [getOptimizedImageSrc, memoryUsage, finalConfig.maxConcurrentImages])

  // دالة تحديث التكوين مع debouncing
  const updateConfigDebounced = useCallback((newConfig: Partial<PerformanceConfig>) => {
    setPerformanceConfig(prev => ({ ...prev, ...newConfig }))
  }, [setPerformanceConfig])

  return {
    // Core performance functions
    measureRenderTime,
    getOptimizedImageSrc,
    virtualizeList,
    prefetchResource,
    getPerformanceReport,
    createDebouncedScrollHandler,
    preloadImages,
    cleanupMemory,
    
    // State and config
    metrics: renderMetrics.current,
    memoryUsage,
    config: finalConfig,
    updateConfig: updateConfigDebounced
  }
}