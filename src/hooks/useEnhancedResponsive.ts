import { useState, useEffect, useMemo, useCallback } from 'react'

// Enhanced breakpoint system with device-specific classifications
const BREAKPOINTS = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  'mobile-sm': 375,
  'mobile-md': 414,
  'mobile-lg': 428,
  'tablet-sm': 768,
  'tablet-md': 834,
  'tablet-lg': 1024,
  'desktop-sm': 1280,
  'desktop-md': 1440,
  'desktop-lg': 1920
} as const

type BreakpointKey = keyof typeof BREAKPOINTS
type DeviceType = 'mobile' | 'tablet' | 'desktop'
type Orientation = 'portrait' | 'landscape'

export interface EnhancedResponsiveState {
  // Basic responsive data
  width: number
  height: number
  orientation: Orientation
  
  // Device type detection
  deviceType: DeviceType
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  
  // Breakpoint detection
  currentBreakpoint: BreakpointKey | null
  breakpoints: Record<BreakpointKey, boolean>
  
  // Device capabilities
  touchDevice: boolean
  hasNotch: boolean
  reducedMotion: boolean
  
  // Layout helpers
  viewportHeight: number
  availableHeight: number
  safeAreaSupport: boolean
  
  // Performance helpers
  shouldUseReducedAnimations: boolean
  shouldLoadHighRes: boolean
  optimalImageQuality: 'low' | 'medium' | 'high'
  
  // State tracking
  wasMobile: boolean
  wasTablet: boolean
  wasDesktop: boolean
  hasChanged: boolean
  
  // Utility functions
  isBreakpoint: (breakpoint: BreakpointKey) => boolean
  isAtLeast: (breakpoint: BreakpointKey) => boolean
  isBelow: (breakpoint: BreakpointKey) => boolean
  getOptimalColumns: () => number
  getOptimalSpacing: () => string
}

export function useEnhancedResponsive(): EnhancedResponsiveState {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  })

  const [previousState, setPreviousState] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false
  })

  const [hasChanged, setHasChanged] = useState(false)

  // Device capability detection
  const [capabilities, setCapabilities] = useState({
    touchDevice: false,
    hasNotch: false,
    reducedMotion: false,
    safeAreaSupport: false
  })

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    const updateCapabilities = () => {
      setCapabilities({
        touchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        hasNotch: window.screen?.height > window.innerHeight + 50,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        safeAreaSupport: CSS.supports('padding: env(safe-area-inset-top)')
      })
    }

    window.addEventListener('resize', updateDimensions)
    window.addEventListener('orientationchange', updateDimensions)
    
    updateCapabilities()

    // Listen for reduced motion changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setCapabilities(prev => ({ ...prev, reducedMotion: e.matches }))
    }
    mediaQuery.addEventListener('change', handleMotionChange)

    return () => {
      window.removeEventListener('resize', updateDimensions)
      window.removeEventListener('orientationchange', updateDimensions)
      mediaQuery.removeEventListener('change', handleMotionChange)
    }
  }, [])

  // Calculate responsive state
  const responsiveState = useMemo(() => {
    const { width, height } = dimensions

    // Breakpoint calculations
    const breakpoints: Record<BreakpointKey, boolean> = {} as any
    Object.entries(BREAKPOINTS).forEach(([key, value]) => {
      breakpoints[key as BreakpointKey] = width >= value
    })

    // Current breakpoint detection
    const currentBreakpoint = Object.entries(BREAKPOINTS)
      .sort(([, a], [, b]) => b - a)
      .find(([, value]) => width >= value)?.[0] as BreakpointKey || null

    // Device type detection
    const isMobile = width < BREAKPOINTS.md
    const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg
    const isDesktop = width >= BREAKPOINTS.lg

    const deviceType: DeviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'

    // Orientation
    const orientation: Orientation = height > width ? 'portrait' : 'landscape'

    // Performance optimizations
    const shouldUseReducedAnimations = capabilities.reducedMotion || isMobile
    const shouldLoadHighRes = isDesktop && !capabilities.reducedMotion
    const optimalImageQuality: 'low' | 'medium' | 'high' = 
      isMobile ? 'low' : isTablet ? 'medium' : 'high'

    // Layout calculations
    const viewportHeight = height
    const availableHeight = capabilities.hasNotch ? height - 100 : height

    // Check for changes
    const currentMobileState = { isMobile, isTablet, isDesktop }
    if (JSON.stringify(currentMobileState) !== JSON.stringify(previousState)) {
      setHasChanged(true)
      setPreviousState(currentMobileState)
    } else {
      setHasChanged(false)
    }

    return {
      width,
      height,
      orientation,
      deviceType,
      isMobile,
      isTablet,
      isDesktop,
      currentBreakpoint,
      breakpoints,
      touchDevice: capabilities.touchDevice,
      hasNotch: capabilities.hasNotch,
      reducedMotion: capabilities.reducedMotion,
      viewportHeight,
      availableHeight,
      safeAreaSupport: capabilities.safeAreaSupport,
      shouldUseReducedAnimations,
      shouldLoadHighRes,
      optimalImageQuality,
      wasMobile: previousState.isMobile,
      wasTablet: previousState.isTablet,
      wasDesktop: previousState.isDesktop,
      hasChanged
    }
  }, [dimensions, capabilities, previousState])

  // Utility functions
  const isBreakpoint = useCallback((breakpoint: BreakpointKey) => {
    return responsiveState.currentBreakpoint === breakpoint
  }, [responsiveState.currentBreakpoint])

  const isAtLeast = useCallback((breakpoint: BreakpointKey) => {
    return responsiveState.width >= BREAKPOINTS[breakpoint]
  }, [responsiveState.width])

  const isBelow = useCallback((breakpoint: BreakpointKey) => {
    return responsiveState.width < BREAKPOINTS[breakpoint]
  }, [responsiveState.width])

  const getOptimalColumns = useCallback(() => {
    if (responsiveState.isMobile) return 1
    if (responsiveState.isTablet) return 2
    if (responsiveState.width < BREAKPOINTS.xl) return 3
    return 4
  }, [responsiveState.isMobile, responsiveState.isTablet, responsiveState.width])

  const getOptimalSpacing = useCallback(() => {
    if (responsiveState.isMobile) return 'p-2 gap-2'
    if (responsiveState.isTablet) return 'p-4 gap-4'
    return 'p-6 gap-6'
  }, [responsiveState.isMobile, responsiveState.isTablet])

  return {
    ...responsiveState,
    isBreakpoint,
    isAtLeast,
    isBelow,
    getOptimalColumns,
    getOptimalSpacing
  }
}

// Device-specific hooks
export function useDeviceType() {
  const { deviceType } = useEnhancedResponsive()
  return deviceType
}

export function useTouchDevice() {
  const { touchDevice } = useEnhancedResponsive()
  return touchDevice
}

export function useOptimalLayout() {
  const { getOptimalColumns, getOptimalSpacing, deviceType } = useEnhancedResponsive()
  
  return {
    columns: getOptimalColumns(),
    spacing: getOptimalSpacing(),
    deviceType,
    gridCols: `grid-cols-${getOptimalColumns()}`
  }
}

// Performance-aware hooks
export function usePerformanceSettings() {
  const { 
    shouldUseReducedAnimations, 
    shouldLoadHighRes, 
    optimalImageQuality,
    reducedMotion 
  } = useEnhancedResponsive()
  
  return {
    animations: shouldUseReducedAnimations ? 'none' : 'all',
    imageQuality: optimalImageQuality,
    loadHighRes: shouldLoadHighRes,
    reducedMotion
  }
}