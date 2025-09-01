import { useEnhancedResponsive } from '@/hooks/useEnhancedResponsive'
import { useCallback, useMemo } from 'react'

// Content priority levels
export type ContentPriority = 'critical' | 'important' | 'secondary' | 'optional'

// Content adaptation strategies
export type ContentStrategy = 'hide' | 'collapse' | 'summarize' | 'paginate' | 'virtualize'

// Content item interface
export interface ContentItem {
  id: string
  content: React.ReactNode | string
  priority: ContentPriority
  strategy?: ContentStrategy
  minScreenWidth?: number
  maxScreenWidth?: number
  deviceTypes?: Array<'mobile' | 'tablet' | 'desktop'>
  loadPriority?: 'high' | 'medium' | 'low'
  metadata?: Record<string, any>
}

// Content adaptation configuration
interface ContentAdaptationConfig {
  mobile: {
    maxItems: number
    allowedPriorities: ContentPriority[]
    preferredStrategy: ContentStrategy
    enableInfiniteScroll: boolean
    enableSearch: boolean
  }
  tablet: {
    maxItems: number
    allowedPriorities: ContentPriority[]
    preferredStrategy: ContentStrategy
    enableInfiniteScroll: boolean
    enableSearch: boolean
  }
  desktop: {
    maxItems: number
    allowedPriorities: ContentPriority[]
    preferredStrategy: ContentStrategy
    enableInfiniteScroll: boolean
    enableSearch: boolean
  }
}

const defaultConfig: ContentAdaptationConfig = {
  mobile: {
    maxItems: 10,
    allowedPriorities: ['critical', 'important'],
    preferredStrategy: 'paginate',
    enableInfiniteScroll: true,
    enableSearch: true
  },
  tablet: {
    maxItems: 20,
    allowedPriorities: ['critical', 'important', 'secondary'],
    preferredStrategy: 'collapse',
    enableInfiniteScroll: true,
    enableSearch: true
  },
  desktop: {
    maxItems: 50,
    allowedPriorities: ['critical', 'important', 'secondary', 'optional'],
    preferredStrategy: 'virtualize',
    enableInfiniteScroll: false,
    enableSearch: true
  }
}

// Adaptive content hook
export function useAdaptiveContent(config: Partial<ContentAdaptationConfig> = {}) {
  const { deviceType, width, height, shouldUseReducedAnimations } = useEnhancedResponsive()
  
  const finalConfig = useMemo(() => ({
    ...defaultConfig,
    ...config,
    [deviceType]: {
      ...defaultConfig[deviceType],
      ...config[deviceType]
    }
  }), [config, deviceType])

  const currentConfig = finalConfig[deviceType]

  // Filter content based on device and priority
  const filterContent = useCallback((items: ContentItem[]): ContentItem[] => {
    return items.filter(item => {
      // Check priority
      if (!currentConfig.allowedPriorities.includes(item.priority)) {
        return false
      }

      // Check device type
      if (item.deviceTypes && !item.deviceTypes.includes(deviceType)) {
        return false
      }

      // Check screen width constraints
      if (item.minScreenWidth && width < item.minScreenWidth) {
        return false
      }

      if (item.maxScreenWidth && width > item.maxScreenWidth) {
        return false
      }

      return true
    })
  }, [currentConfig.allowedPriorities, deviceType, width])

  // Prioritize content loading
  const prioritizeContent = useCallback((items: ContentItem[]): ContentItem[] => {
    const priorityOrder: ContentPriority[] = ['critical', 'important', 'secondary', 'optional']
    
    return items.sort((a, b) => {
      const aPriorityIndex = priorityOrder.indexOf(a.priority)
      const bPriorityIndex = priorityOrder.indexOf(b.priority)
      
      if (aPriorityIndex !== bPriorityIndex) {
        return aPriorityIndex - bPriorityIndex
      }

      // Secondary sort by load priority
      const loadPriorityOrder = ['high', 'medium', 'low']
      const aLoadIndex = loadPriorityOrder.indexOf(a.loadPriority || 'medium')
      const bLoadIndex = loadPriorityOrder.indexOf(b.loadPriority || 'medium')
      
      return aLoadIndex - bLoadIndex
    })
  }, [])

  // Paginate content
  const paginateContent = useCallback((
    items: ContentItem[],
    page: number = 1,
    itemsPerPage?: number
  ) => {
    const perPage = itemsPerPage || currentConfig.maxItems
    const startIndex = (page - 1) * perPage
    const endIndex = startIndex + perPage

    return {
      items: items.slice(startIndex, endIndex),
      totalPages: Math.ceil(items.length / perPage),
      currentPage: page,
      hasMore: endIndex < items.length,
      totalItems: items.length
    }
  }, [currentConfig.maxItems])

  // Virtualize content for large lists
  const virtualizeContent = useCallback((
    items: ContentItem[],
    containerHeight: number,
    itemHeight: number
  ) => {
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const bufferSize = Math.ceil(visibleCount * 0.5)

    return {
      visibleCount,
      bufferSize,
      totalHeight: items.length * itemHeight,
      getVisibleItems: (scrollTop: number) => {
        const startIndex = Math.floor(scrollTop / itemHeight)
        const endIndex = Math.min(
          startIndex + visibleCount + bufferSize * 2,
          items.length
        )
        
        return {
          startIndex: Math.max(0, startIndex - bufferSize),
          endIndex,
          items: items.slice(
            Math.max(0, startIndex - bufferSize),
            endIndex
          )
        }
      }
    }
  }, [])

  // Summarize content for mobile
  const summarizeContent = useCallback((content: string, maxLength: number = 150): string => {
    if (content.length <= maxLength) {
      return content
    }

    const truncated = content.substring(0, maxLength).trim()
    const lastSpaceIndex = truncated.lastIndexOf(' ')
    
    if (lastSpaceIndex > maxLength * 0.7) {
      return truncated.substring(0, lastSpaceIndex) + '...'
    }
    
    return truncated + '...'
  }, [])

  // Get adaptive layout properties
  const getLayoutProperties = useCallback(() => {
    return {
      columns: deviceType === 'mobile' ? 1 : deviceType === 'tablet' ? 2 : 3,
      gap: deviceType === 'mobile' ? 'gap-2' : deviceType === 'tablet' ? 'gap-4' : 'gap-6',
      padding: deviceType === 'mobile' ? 'p-2' : deviceType === 'tablet' ? 'p-4' : 'p-6',
      fontSize: deviceType === 'mobile' ? 'text-sm' : 'text-base',
      enableHover: deviceType !== 'mobile',
      enableAnimations: !shouldUseReducedAnimations,
      preferredStrategy: currentConfig.preferredStrategy
    }
  }, [deviceType, shouldUseReducedAnimations, currentConfig.preferredStrategy])

  // Content loading strategy
  const getLoadingStrategy = useCallback((items: ContentItem[]) => {
    const criticalItems = items.filter(item => item.priority === 'critical')
    const importantItems = items.filter(item => item.priority === 'important')
    const secondaryItems = items.filter(item => item.priority === 'secondary')
    const optionalItems = items.filter(item => item.priority === 'optional')

    return {
      immediate: criticalItems,
      nextTick: importantItems,
      idle: secondaryItems,
      lazy: optionalItems,
      loadOrder: [
        ...criticalItems,
        ...importantItems,
        ...secondaryItems,
        ...optionalItems
      ]
    }
  }, [])

  // Progressive content loading
  const loadContentProgressively = useCallback(async (
    items: ContentItem[],
    onBatch: (batch: ContentItem[]) => void
  ) => {
    const strategy = getLoadingStrategy(items)
    
    // Load critical content immediately
    if (strategy.immediate.length > 0) {
      onBatch(strategy.immediate)
    }

    // Load important content on next tick
    if (strategy.nextTick.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 0))
      onBatch(strategy.nextTick)
    }

    // Load secondary content when idle
    if (strategy.idle.length > 0) {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          onBatch(strategy.idle)
        })
      } else {
        setTimeout(() => onBatch(strategy.idle), 100)
      }
    }

    // Load optional content with delay
    if (strategy.lazy.length > 0) {
      setTimeout(() => {
        onBatch(strategy.lazy)
      }, 500)
    }
  }, [getLoadingStrategy])

  // Adaptive image sizing
  const getAdaptiveImageSize = useCallback((
    originalWidth: number,
    originalHeight: number
  ) => {
    const maxWidth = deviceType === 'mobile' ? 300 : deviceType === 'tablet' ? 500 : 800
    const maxHeight = deviceType === 'mobile' ? 200 : deviceType === 'tablet' ? 350 : 500

    const aspectRatio = originalWidth / originalHeight
    let width = Math.min(originalWidth, maxWidth)
    let height = width / aspectRatio

    if (height > maxHeight) {
      height = maxHeight
      width = height * aspectRatio
    }

    return { width: Math.round(width), height: Math.round(height) }
  }, [deviceType])

  // Content organization strategy
  const organizeContent = useCallback((items: ContentItem[]) => {
    const filtered = filterContent(items)
    const prioritized = prioritizeContent(filtered)
    const layout = getLayoutProperties()

    return {
      items: prioritized,
      layout,
      totalItems: filtered.length,
      displayStrategy: currentConfig.preferredStrategy,
      config: currentConfig
    }
  }, [filterContent, prioritizeContent, getLayoutProperties, currentConfig])

  return {
    filterContent,
    prioritizeContent,
    paginateContent,
    virtualizeContent,
    summarizeContent,
    getLayoutProperties,
    getLoadingStrategy,
    loadContentProgressively,
    getAdaptiveImageSize,
    organizeContent,
    config: currentConfig,
    deviceType
  }
}

// Content adaptation utilities
export class ContentAdapter {
  static createResponsiveContent(
    content: string | React.ReactNode,
    priority: ContentPriority,
    options?: Partial<ContentItem>
  ): ContentItem {
    return {
      id: options?.id || Math.random().toString(36).substr(2, 9),
      content,
      priority,
      strategy: options?.strategy || 'hide',
      loadPriority: options?.loadPriority || 'medium',
      ...options
    }
  }

  static createContentGrid(
    items: ContentItem[],
    columns: number,
    gap?: string
  ): ContentItem[][] {
    const grid: ContentItem[][] = Array.from({ length: columns }, () => [])
    
    items.forEach((item, index) => {
      const columnIndex = index % columns
      grid[columnIndex].push(item)
    })

    return grid
  }

  static mergeContentStrategies(
    strategies: Array<Partial<ContentAdaptationConfig>>
  ): ContentAdaptationConfig {
    return strategies.reduce(
      (merged, strategy) => ({
        mobile: { ...merged.mobile, ...strategy.mobile },
        tablet: { ...merged.tablet, ...strategy.tablet },
        desktop: { ...merged.desktop, ...strategy.desktop }
      }),
      defaultConfig
    )
  }

  static calculateOptimalBatchSize(deviceType: 'mobile' | 'tablet' | 'desktop'): number {
    const batchSizes = {
      mobile: 5,
      tablet: 10,
      desktop: 20
    }
    return batchSizes[deviceType]
  }

  static shouldLazyLoad(
    item: ContentItem,
    deviceType: 'mobile' | 'tablet' | 'desktop'
  ): boolean {
    if (item.priority === 'critical') return false
    if (deviceType === 'mobile' && item.priority === 'important') return false
    return true
  }
}

// Performance monitoring for content adaptation
export function useContentPerformance() {
  const startTime = performance.now()
  
  return {
    measureAdaptationTime: () => {
      const endTime = performance.now()
      const adaptationTime = endTime - startTime
      
      if (process.env.NODE_ENV === 'development' && adaptationTime > 50) {
        console.warn(`Slow content adaptation: ${adaptationTime.toFixed(2)}ms`)
      }
      
      return adaptationTime
    },
    
    measureRenderBatch: (batchSize: number) => {
      const batchStartTime = performance.now()
      
      return () => {
        const batchEndTime = performance.now()
        const batchTime = batchEndTime - batchStartTime
        const timePerItem = batchTime / batchSize
        
        if (process.env.NODE_ENV === 'development' && timePerItem > 10) {
          console.warn(`Slow batch render: ${timePerItem.toFixed(2)}ms per item`)
        }
        
        return { batchTime, timePerItem }
      }
    }
  }
}