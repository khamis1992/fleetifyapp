// Comprehensive analytics and monitoring system for responsive design
import { useEnhancedResponsive } from '@/hooks/useEnhancedResponsive'
import { useEffect, useCallback, useState } from 'react'

// Analytics event types
export interface ResponsiveEvent {
  type: 'device_change' | 'orientation_change' | 'performance' | 'interaction' | 'error' | 'user_behavior'
  timestamp: number
  sessionId: string
  userId?: string
  deviceInfo: {
    type: 'mobile' | 'tablet' | 'desktop'
    width: number
    height: number
    pixelRatio: number
    userAgent: string
    touchSupport: boolean
    orientation: 'portrait' | 'landscape'
  }
  performanceMetrics?: {
    loadTime: number
    renderTime: number
    memoryUsage: number
    bundleSize: number
    fps: number
  }
  interactionData?: {
    component: string
    action: string
    success: boolean
    duration: number
  }
  errorInfo?: {
    message: string
    stack?: string
    component?: string
  }
  userBehavior?: {
    scrollDepth: number
    timeOnPage: number
    clickCount: number
    formCompletionRate: number
  }
  metadata?: Record<string, any>
}

// Analytics configuration
interface AnalyticsConfig {
  enabled: boolean
  sampleRate: number // 0-1, percentage of events to collect
  bufferSize: number
  flushInterval: number // in milliseconds
  endpoints: {
    events: string
    performance: string
    errors: string
  }
  enableRealtime: boolean
  enableLocalStorage: boolean
  enableConsoleLogging: boolean
}

const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  sampleRate: 1.0, // Collect all events in development
  bufferSize: 50,
  flushInterval: 30000, // 30 seconds
  endpoints: {
    events: '/api/analytics/events',
    performance: '/api/analytics/performance',
    errors: '/api/analytics/errors'
  },
  enableRealtime: process.env.NODE_ENV === 'development',
  enableLocalStorage: true,
  enableConsoleLogging: process.env.NODE_ENV === 'development'
}

// Performance monitoring class
export class ResponsivePerformanceMonitor {
  private config: AnalyticsConfig
  private eventBuffer: ResponsiveEvent[] = []
  private sessionId: string
  private userId?: string
  private flushTimer?: NodeJS.Timeout
  private performanceObserver?: PerformanceObserver
  private currentPageMetrics: any = {}

  constructor(config: Partial<AnalyticsConfig> = {}, userId?: string) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.sessionId = this.generateSessionId()
    this.userId = userId

    if (this.config.enabled) {
      this.setupPerformanceObserver()
      this.setupEventListeners()
      this.startFlushTimer()
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            this.trackPerformanceMetric('page_load', {
              loadTime: entry.duration,
              domContentLoaded: (entry as PerformanceNavigationTiming).domContentLoadedEventEnd - entry.startTime,
              firstContentfulPaint: this.getFirstContentfulPaint()
            })
          }
          
          if (entry.entryType === 'paint') {
            this.trackPerformanceMetric(entry.name.replace('-', '_'), {
              time: entry.startTime
            })
          }

          if (entry.entryType === 'largest-contentful-paint') {
            this.trackPerformanceMetric('largest_contentful_paint', {
              time: entry.startTime,
              size: (entry as any).size
            })
          }
        })
      })

      this.performanceObserver.observe({ 
        entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'layout-shift'] 
      })
    } catch (error) {
      console.warn('Performance observer setup failed:', error)
    }
  }

  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint')
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
    return fcp ? fcp.startTime : 0
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return

    // Memory usage monitoring
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        this.trackPerformanceMetric('memory_usage', {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        })
      }, 60000) // Every minute
    }

    // FPS monitoring
    this.monitorFPS()

    // User interaction tracking
    this.setupInteractionTracking()

    // Error tracking
    window.addEventListener('error', (event) => {
      this.trackError(event.error, event.filename)
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(event.reason, 'Promise rejection')
    })
  }

  private monitorFPS(): void {
    let frames = 0
    let lastTime = performance.now()
    
    const countFrame = () => {
      frames++
      const currentTime = performance.now()
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime))
        this.trackPerformanceMetric('fps', { value: fps })
        
        frames = 0
        lastTime = currentTime
      }
      
      requestAnimationFrame(countFrame)
    }
    
    requestAnimationFrame(countFrame)
  }

  private setupInteractionTracking(): void {
    // Track form interactions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement
      this.trackInteraction('form_submit', form.id || 'unnamed_form', true)
    })

    // Track button clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const button = target.tagName === 'BUTTON' ? target : target.closest('button')!
        this.trackInteraction('button_click', button.id || button.textContent?.substring(0, 20) || 'unnamed_button', true)
      }
    })

    // Track scroll depth
    let maxScrollDepth = 0
    window.addEventListener('scroll', () => {
      const scrollDepth = (window.scrollY + window.innerHeight) / document.body.scrollHeight
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth
        this.currentPageMetrics.scrollDepth = Math.round(scrollDepth * 100)
      }
    })
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushInterval)
  }

  public trackDeviceChange(deviceInfo: ResponsiveEvent['deviceInfo']): void {
    this.track({
      type: 'device_change',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo
    })
  }

  public trackOrientationChange(deviceInfo: ResponsiveEvent['deviceInfo']): void {
    this.track({
      type: 'orientation_change',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo
    })
  }

  public trackPerformanceMetric(metric: string, data: any): void {
    this.track({
      type: 'performance',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo: this.getCurrentDeviceInfo(),
      performanceMetrics: {
        [metric]: data,
        loadTime: 0,
        renderTime: 0,
        memoryUsage: 0,
        bundleSize: 0,
        fps: 0
      }
    })
  }

  public trackInteraction(component: string, action: string, success: boolean, duration?: number): void {
    this.track({
      type: 'interaction',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo: this.getCurrentDeviceInfo(),
      interactionData: {
        component,
        action,
        success,
        duration: duration || 0
      }
    })
  }

  public trackError(error: Error | any, component?: string): void {
    this.track({
      type: 'error',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo: this.getCurrentDeviceInfo(),
      errorInfo: {
        message: error.message || String(error),
        stack: error.stack,
        component
      }
    })
  }

  public trackUserBehavior(data: Partial<ResponsiveEvent['userBehavior']>): void {
    this.track({
      type: 'user_behavior',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo: this.getCurrentDeviceInfo(),
      userBehavior: {
        scrollDepth: 0,
        timeOnPage: 0,
        clickCount: 0,
        formCompletionRate: 0,
        ...data
      }
    })
  }

  private getCurrentDeviceInfo(): ResponsiveEvent['deviceInfo'] {
    return {
      type: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
      userAgent: navigator.userAgent,
      touchSupport: 'ontouchstart' in window,
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
    }
  }

  private track(event: ResponsiveEvent): void {
    if (!this.config.enabled) return

    // Apply sample rate
    if (Math.random() > this.config.sampleRate) return

    this.eventBuffer.push(event)

    if (this.config.enableConsoleLogging) {
      console.log('📊 Responsive Analytics:', event)
    }

    if (this.config.enableLocalStorage) {
      this.saveToLocalStorage(event)
    }

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.bufferSize) {
      this.flush()
    }

    // Send realtime if enabled
    if (this.config.enableRealtime && ['error', 'performance'].includes(event.type)) {
      this.sendRealtime(event)
    }
  }

  private saveToLocalStorage(event: ResponsiveEvent): void {
    try {
      const key = `responsive_analytics_${event.type}`
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      existing.push(event)
      
      // Keep only last 100 events per type
      if (existing.length > 100) {
        existing.splice(0, existing.length - 100)
      }
      
      localStorage.setItem(key, JSON.stringify(existing))
    } catch (error) {
      console.warn('Failed to save analytics to localStorage:', error)
    }
  }

  private async sendRealtime(event: ResponsiveEvent): Promise<void> {
    try {
      const endpoint = this.config.endpoints.events
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      })
    } catch (error) {
      console.warn('Failed to send realtime analytics:', error)
    }
  }

  public async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return

    const events = [...this.eventBuffer]
    this.eventBuffer = []

    try {
      const endpoint = this.config.endpoints.events
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events })
      })

      if (this.config.enableConsoleLogging) {
        console.log(`📤 Flushed ${events.length} analytics events`)
      }
    } catch (error) {
      console.warn('Failed to flush analytics events:', error)
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...events)
    }
  }

  public generateReport(): any {
    const localData = this.getLocalStorageData()
    
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      summary: this.generateSummary(localData),
      deviceBreakdown: this.generateDeviceBreakdown(localData),
      performanceMetrics: this.generatePerformanceReport(localData),
      errorAnalysis: this.generateErrorAnalysis(localData),
      userBehaviorInsights: this.generateUserBehaviorInsights(localData)
    }
  }

  private getLocalStorageData(): ResponsiveEvent[] {
    const allEvents: ResponsiveEvent[] = []
    
    const eventTypes = ['device_change', 'orientation_change', 'performance', 'interaction', 'error', 'user_behavior']
    eventTypes.forEach(type => {
      try {
        const key = `responsive_analytics_${type}`
        const events = JSON.parse(localStorage.getItem(key) || '[]')
        allEvents.push(...events)
      } catch (error) {
        console.warn(`Failed to load ${type} events from localStorage`)
      }
    })

    return allEvents.sort((a, b) => a.timestamp - b.timestamp)
  }

  private generateSummary(events: ResponsiveEvent[]): any {
    const deviceTypes = events.map(e => e.deviceInfo?.type).filter(Boolean)
    const deviceCounts = deviceTypes.reduce((acc: any, type) => {
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    return {
      totalEvents: events.length,
      sessionDuration: events.length > 0 ? events[events.length - 1].timestamp - events[0].timestamp : 0,
      deviceDistribution: deviceCounts,
      errorCount: events.filter(e => e.type === 'error').length,
      interactionCount: events.filter(e => e.type === 'interaction').length
    }
  }

  private generateDeviceBreakdown(events: ResponsiveEvent[]): any {
    const deviceEvents = events.filter(e => e.deviceInfo)
    
    return {
      mobile: {
        events: deviceEvents.filter(e => e.deviceInfo.type === 'mobile').length,
        avgWidth: this.average(deviceEvents.filter(e => e.deviceInfo.type === 'mobile').map(e => e.deviceInfo.width)),
        touchSupport: deviceEvents.filter(e => e.deviceInfo.type === 'mobile' && e.deviceInfo.touchSupport).length
      },
      tablet: {
        events: deviceEvents.filter(e => e.deviceInfo.type === 'tablet').length,
        avgWidth: this.average(deviceEvents.filter(e => e.deviceInfo.type === 'tablet').map(e => e.deviceInfo.width)),
        touchSupport: deviceEvents.filter(e => e.deviceInfo.type === 'tablet' && e.deviceInfo.touchSupport).length
      },
      desktop: {
        events: deviceEvents.filter(e => e.deviceInfo.type === 'desktop').length,
        avgWidth: this.average(deviceEvents.filter(e => e.deviceInfo.type === 'desktop').map(e => e.deviceInfo.width)),
        touchSupport: deviceEvents.filter(e => e.deviceInfo.type === 'desktop' && e.deviceInfo.touchSupport).length
      }
    }
  }

  private generatePerformanceReport(events: ResponsiveEvent[]): any {
    const perfEvents = events.filter(e => e.type === 'performance' && e.performanceMetrics)
    
    if (perfEvents.length === 0) return {}

    return {
      avgLoadTime: this.average(perfEvents.map(e => e.performanceMetrics?.loadTime || 0)),
      avgRenderTime: this.average(perfEvents.map(e => e.performanceMetrics?.renderTime || 0)),
      avgMemoryUsage: this.average(perfEvents.map(e => e.performanceMetrics?.memoryUsage || 0)),
      avgFPS: this.average(perfEvents.map(e => e.performanceMetrics?.fps || 0))
    }
  }

  private generateErrorAnalysis(events: ResponsiveEvent[]): any {
    const errorEvents = events.filter(e => e.type === 'error' && e.errorInfo)
    
    const errorsByType = errorEvents.reduce((acc: any, event) => {
      const message = event.errorInfo?.message || 'Unknown error'
      acc[message] = (acc[message] || 0) + 1
      return acc
    }, {})

    return {
      totalErrors: errorEvents.length,
      errorsByType,
      errorsByDevice: {
        mobile: errorEvents.filter(e => e.deviceInfo.type === 'mobile').length,
        tablet: errorEvents.filter(e => e.deviceInfo.type === 'tablet').length,
        desktop: errorEvents.filter(e => e.deviceInfo.type === 'desktop').length
      }
    }
  }

  private generateUserBehaviorInsights(events: ResponsiveEvent[]): any {
    const behaviorEvents = events.filter(e => e.type === 'user_behavior' && e.userBehavior)
    
    if (behaviorEvents.length === 0) return {}

    return {
      avgScrollDepth: this.average(behaviorEvents.map(e => e.userBehavior?.scrollDepth || 0)),
      avgTimeOnPage: this.average(behaviorEvents.map(e => e.userBehavior?.timeOnPage || 0)),
      avgClickCount: this.average(behaviorEvents.map(e => e.userBehavior?.clickCount || 0)),
      avgFormCompletionRate: this.average(behaviorEvents.map(e => e.userBehavior?.formCompletionRate || 0))
    }
  }

  private average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }
    
    // Final flush
    this.flush()
  }
}

// React hook for responsive analytics
export function useResponsiveAnalytics(userId?: string, config?: Partial<AnalyticsConfig>) {
  const { deviceType, width, height, orientation, hasChanged } = useEnhancedResponsive()
  const [monitor] = useState(() => new ResponsivePerformanceMonitor(config, userId))

  // Track device changes
  useEffect(() => {
    if (hasChanged) {
      monitor.trackDeviceChange({
        type: deviceType,
        width,
        height,
        pixelRatio: window.devicePixelRatio,
        userAgent: navigator.userAgent,
        touchSupport: 'ontouchstart' in window,
        orientation
      })
    }
  }, [monitor, deviceType, width, height, orientation, hasChanged])

  // Track orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      monitor.trackOrientationChange({
        type: deviceType,
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio,
        userAgent: navigator.userAgent,
        touchSupport: 'ontouchstart' in window,
        orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      })
    }

    window.addEventListener('orientationchange', handleOrientationChange)
    return () => window.removeEventListener('orientationchange', handleOrientationChange)
  }, [monitor, deviceType])

  // Cleanup on unmount
  useEffect(() => {
    return () => monitor.destroy()
  }, [monitor])

  const trackInteraction = useCallback((component: string, action: string, success: boolean = true, duration?: number) => {
    monitor.trackInteraction(component, action, success, duration)
  }, [monitor])

  const trackError = useCallback((error: Error | any, component?: string) => {
    monitor.trackError(error, component)
  }, [monitor])

  const trackUserBehavior = useCallback((data: Partial<ResponsiveEvent['userBehavior']>) => {
    monitor.trackUserBehavior(data)
  }, [monitor])

  const generateReport = useCallback(() => {
    return monitor.generateReport()
  }, [monitor])

  return {
    trackInteraction,
    trackError,
    trackUserBehavior,
    generateReport,
    monitor
  }
}