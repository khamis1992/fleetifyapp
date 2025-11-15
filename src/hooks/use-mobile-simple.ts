import React from 'react'
import { logger } from '@/lib/logger'

export interface SimpleBreakpoint {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export function useSimpleBreakpoint(): SimpleBreakpoint {
  // Default breakpoint (SSR-safe)
  const [breakpoint, setBreakpoint] = React.useState<SimpleBreakpoint>({
    isMobile: true,
    isTablet: false,
    isDesktop: false
  })

  const lastCategoryRef = React.useRef<'mobile' | 'tablet' | 'desktop' | null>(null)

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const compute = (): SimpleBreakpoint => {
      const width = window.innerWidth
      return {
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024
      }
    }

    const update = () => {
      const next = compute()
      setBreakpoint(prev => {
        const category = next.isMobile ? 'mobile' : next.isTablet ? 'tablet' : 'desktop'
        if (lastCategoryRef.current !== category) {
          lastCategoryRef.current = category
          logger.debug('[breakpoint] changed', { category, width: window.innerWidth })
        }
        // Avoid unnecessary state updates
        if (
          prev.isMobile === next.isMobile &&
          prev.isTablet === next.isTablet &&
          prev.isDesktop === next.isDesktop
        ) {
          return prev
        }
        return next
      })
    }

    logger.debugOnce('useSimpleBreakpoint:init', 'useSimpleBreakpoint initialized')
    update()

    // rAF throttle for resize events
    let ticking = false
    const onResize = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(() => {
          update()
          ticking = false
        })
      }
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return breakpoint
}
