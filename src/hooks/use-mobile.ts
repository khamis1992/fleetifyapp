import { useState, useEffect } from 'react'

export interface ResponsiveBreakpoint {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLargeDesktop: boolean
  screenWidth: number
}

export function useResponsiveBreakpoint(): ResponsiveBreakpoint {
  const [breakpoint, setBreakpoint] = useState<ResponsiveBreakpoint>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLargeDesktop: true,
    screenWidth: 1920
  })

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      
      setBreakpoint({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isLargeDesktop: width >= 1440,
        screenWidth: width
      })
    }

    // Set initial breakpoint
    updateBreakpoint()

    // Listen for resize events
    window.addEventListener('resize', updateBreakpoint)
    
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  return breakpoint
}

// Legacy hook names for backwards compatibility
export const useMobile = useResponsiveBreakpoint
export const useIsMobile = () => useResponsiveBreakpoint().isMobile