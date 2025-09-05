import { useState, useEffect, useMemo } from 'react'

export interface DeviceInfo {
  // Device type detection
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  deviceType: 'mobile' | 'tablet' | 'desktop'
  
  // Operating system detection
  isIOS: boolean
  isAndroid: boolean
  isWindows: boolean
  isMacOS: boolean
  isLinux: boolean
  
  // Browser detection
  isChrome: boolean
  isFirefox: boolean
  isSafari: boolean
  isEdge: boolean
  
  // Device capabilities
  touchSupport: boolean
  hoverSupport: boolean
  pointerSupport: boolean
  
  // Screen information
  pixelRatio: number
  colorDepth: number
  
  // Performance indicators
  hardwareConcurrency: number
  deviceMemory?: number
  
  // Network information
  connectionType?: string
  effectiveType?: string
  
  // Accessibility features
  prefersReducedMotion: boolean
  prefersColorScheme: 'light' | 'dark' | 'no-preference'
}

/**
 * Enhanced device detection hook
 * Provides comprehensive information about the user's device, browser, and capabilities
 */
export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<Partial<DeviceInfo>>({})

  // Detect user agent information
  const userAgentInfo = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        isIOS: false,
        isAndroid: false,
        isWindows: false,
        isMacOS: false,
        isLinux: false,
        isChrome: false,
        isFirefox: false,
        isSafari: false,
        isEdge: false
      }
    }

    const userAgent = navigator.userAgent.toLowerCase()
    
    return {
      // Operating Systems
      isIOS: /iphone|ipad|ipod/.test(userAgent),
      isAndroid: /android/.test(userAgent),
      isWindows: /windows/.test(userAgent),
      isMacOS: /macintosh|mac os x/.test(userAgent),
      isLinux: /linux/.test(userAgent) && !/android/.test(userAgent),
      
      // Browsers
      isChrome: /chrome/.test(userAgent) && !/edg/.test(userAgent),
      isFirefox: /firefox/.test(userAgent),
      isSafari: /safari/.test(userAgent) && !/chrome/.test(userAgent),
      isEdge: /edg/.test(userAgent)
    }
  }, [])

  // Detect device capabilities
  useEffect(() => {
    if (typeof window === 'undefined') return

    const detectCapabilities = () => {
      // Touch support
      const touchSupport = 'ontouchstart' in window || 
                          navigator.maxTouchPoints > 0 || 
                          (navigator as any).msMaxTouchPoints > 0

      // Hover support
      const hoverSupport = window.matchMedia('(hover: hover)').matches

      // Pointer support
      const pointerSupport = window.matchMedia('(pointer: fine)').matches

      // Screen information
      const pixelRatio = window.devicePixelRatio || 1
      const colorDepth = screen.colorDepth || 24

      // Performance information
      const hardwareConcurrency = navigator.hardwareConcurrency || 4
      const deviceMemory = (navigator as any).deviceMemory

      // Network information
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      const connectionType = connection?.type
      const effectiveType = connection?.effectiveType

      // Accessibility preferences
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const prefersColorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : window.matchMedia('(prefers-color-scheme: light)').matches 
          ? 'light' 
          : 'no-preference'

      // Device type detection based on screen size and touch
      const screenWidth = window.innerWidth
      const isMobile = screenWidth < 768 || (touchSupport && screenWidth < 1024)
      const isTablet = screenWidth >= 768 && screenWidth < 1024 && touchSupport
      const isDesktop = screenWidth >= 1024 && !touchSupport

      const deviceType: 'mobile' | 'tablet' | 'desktop' = 
        isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        deviceType,
        touchSupport,
        hoverSupport,
        pointerSupport,
        pixelRatio,
        colorDepth,
        hardwareConcurrency,
        deviceMemory,
        connectionType,
        effectiveType,
        prefersReducedMotion,
        prefersColorScheme: prefersColorScheme as 'light' | 'dark' | 'no-preference'
      })
    }

    detectCapabilities()

    // Listen for changes in media queries
    const mediaQueries = [
      window.matchMedia('(hover: hover)'),
      window.matchMedia('(pointer: fine)'),
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-color-scheme: dark)'),
      window.matchMedia('(prefers-color-scheme: light)')
    ]

    const handleMediaQueryChange = () => detectCapabilities()

    mediaQueries.forEach(mq => {
      if (mq.addEventListener) {
        mq.addEventListener('change', handleMediaQueryChange)
      } else {
        mq.addListener(handleMediaQueryChange)
      }
    })

    // Listen for resize events
    window.addEventListener('resize', detectCapabilities)

    return () => {
      mediaQueries.forEach(mq => {
        if (mq.removeEventListener) {
          mq.removeEventListener('change', handleMediaQueryChange)
        } else {
          mq.removeListener(handleMediaQueryChange)
        }
      })
      window.removeEventListener('resize', detectCapabilities)
    }
  }, [])

  return {
    // Default values
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    deviceType: 'desktop',
    touchSupport: false,
    hoverSupport: true,
    pointerSupport: true,
    pixelRatio: 1,
    colorDepth: 24,
    hardwareConcurrency: 4,
    prefersReducedMotion: false,
    prefersColorScheme: 'no-preference',
    
    // Merge with detected info
    ...userAgentInfo,
    ...deviceInfo
  } as DeviceInfo
}

/**
 * Simplified hook for basic device type detection
 */
export function useDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const { deviceType } = useDeviceDetection()
  return deviceType
}

/**
 * Hook for touch device detection
 */
export function useTouchDevice(): boolean {
  const { touchSupport } = useDeviceDetection()
  return touchSupport
}

/**
 * Hook for hover capability detection
 */
export function useHoverCapability(): boolean {
  const { hoverSupport } = useDeviceDetection()
  return hoverSupport
}
