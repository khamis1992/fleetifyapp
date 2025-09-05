import React from "react"

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
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  currentBreakpoint: BreakpointKey | null
  width: number
  height: number
  orientation: 'portrait' | 'landscape'
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

  return {
    ...breakpointStates,
    isMobile,
    isTablet,
    isDesktop,
    currentBreakpoint,
    width,
    height,
    orientation,
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