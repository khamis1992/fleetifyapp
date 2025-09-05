import * as React from "react"

// Enhanced breakpoint system matching Tailwind config
const BREAKPOINTS = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  // Mobile-specific breakpoints
  'mobile-sm': 375,
  'mobile-md': 414,
  'mobile-lg': 428,
  'tablet-sm': 768,
  'tablet-md': 834,
  'tablet-lg': 1024
} as const

type BreakpointKey = keyof typeof BREAKPOINTS

export interface ResponsiveBreakpoint {
  // Existing breakpoint states
  xs: boolean
  sm: boolean
  md: boolean
  lg: boolean
  xl: boolean
  '2xl': boolean
  'mobile-sm': boolean
  'mobile-md': boolean
  'mobile-lg': boolean
  'tablet-sm': boolean
  'tablet-md': boolean
  'tablet-lg': boolean
  
  // Device categories
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  
  // Enhanced device detection
  deviceType: 'mobile' | 'tablet' | 'desktop'
  touchDevice: boolean
  screenSize: BreakpointKey | null
  
  // Dimensions and orientation
  width: number
  height: number
  orientation: 'portrait' | 'landscape'
  
  // Enhanced orientation helpers
  isPortraitMobile: boolean
  isLandscapeTablet: boolean
  
  // Interaction capabilities
  canHover: boolean
  
  // Current and previous states
  currentBreakpoint: BreakpointKey | null
  wasMobile: boolean
  wasTablet: boolean
  wasDesktop: boolean
}

export function useResponsiveBreakpoint(): ResponsiveBreakpoint {
  const [dimensions, setDimensions] = React.useState<{width: number, height: number}>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  })

  const [previousBreakpoint, setPreviousBreakpoint] = React.useState<{
    isMobile: boolean,
    isTablet: boolean,
    isDesktop: boolean
  }>({
    isMobile: false,
    isTablet: false,
    isDesktop: false
  })

  // Enhanced device detection
  const [touchDevice, setTouchDevice] = React.useState<boolean>(false)
  const [canHover, setCanHover] = React.useState<boolean>(true)

  // Detect touch device and hover capability
  React.useEffect(() => {
    const detectTouch = () => {
      const hasTouch = 'ontouchstart' in window || 
                      navigator.maxTouchPoints > 0 || 
                      (navigator as any).msMaxTouchPoints > 0
      setTouchDevice(hasTouch)
      
      // Detect hover capability (desktop with mouse)
      const hasHover = window.matchMedia('(hover: hover)').matches
      setCanHover(hasHover)
    }

    detectTouch()
    
    // Listen for changes in hover capability
    const hoverQuery = window.matchMedia('(hover: hover)')
    const handleHoverChange = (e: MediaQueryListEvent) => setCanHover(e.matches)
    
    if (hoverQuery.addEventListener) {
      hoverQuery.addEventListener('change', handleHoverChange)
      return () => hoverQuery.removeEventListener('change', handleHoverChange)
    } else {
      // Fallback for older browsers
      hoverQuery.addListener(handleHoverChange)
      return () => hoverQuery.removeListener(handleHoverChange)
    }
  }, [])

  React.useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const { width, height } = dimensions

  // Calculate breakpoint states
  const breakpointStates = React.useMemo(() => {
    const states: Record<BreakpointKey, boolean> = {} as any
    
    Object.entries(BREAKPOINTS).forEach(([key, value]) => {
      states[key as BreakpointKey] = width >= value
    })

    return states
  }, [width])

  // Determine current breakpoint
  const currentBreakpoint = React.useMemo(() => {
    const sortedBreakpoints = Object.entries(BREAKPOINTS)
      .sort(([, a], [, b]) => b - a)
    
    for (const [key, value] of sortedBreakpoints) {
      if (width >= value) {
        return key as BreakpointKey
      }
    }
    return null
  }, [width])

  // Device category detection
  const isMobile = width < BREAKPOINTS.md
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg
  const isDesktop = width >= BREAKPOINTS.lg

  // Enhanced device type determination
  const deviceType: 'mobile' | 'tablet' | 'desktop' = React.useMemo(() => {
    if (isMobile) return 'mobile'
    if (isTablet) return 'tablet'
    return 'desktop'
  }, [isMobile, isTablet])

  // Track previous states
  React.useEffect(() => {
    setPreviousBreakpoint({
      isMobile,
      isTablet,
      isDesktop
    })
  }, [isMobile, isTablet, isDesktop])

  // Determine orientation
  const orientation = height > width ? 'portrait' : 'landscape'

  // Enhanced orientation helpers
  const isPortraitMobile = isMobile && orientation === 'portrait'
  const isLandscapeTablet = isTablet && orientation === 'landscape'

  return {
    ...breakpointStates,
    isMobile,
    isTablet,
    isDesktop,
    deviceType,
    touchDevice,
    screenSize: currentBreakpoint,
    currentBreakpoint,
    width,
    height,
    orientation,
    isPortraitMobile,
    isLandscapeTablet,
    canHover,
    wasMobile: previousBreakpoint.isMobile,
    wasTablet: previousBreakpoint.isTablet,
    wasDesktop: previousBreakpoint.isDesktop
  }
}

// Legacy hook for backward compatibility
export function useIsMobile() {
  const { isMobile } = useResponsiveBreakpoint()
  return isMobile
}