import { useMemo } from 'react'
import { useResponsiveBreakpoint } from './use-mobile'

export interface AdaptiveLayoutConfig {
  mobileViewMode?: 'stack' | 'tabs' | 'carousel'
  tabletColumns?: number
  desktopColumns?: number
  cardLayout?: boolean
  fullscreenModals?: boolean
  enableSwipeGestures?: boolean
  touchTargetSize?: 'small' | 'medium' | 'large'
}

export interface AdaptiveLayoutResult {
  containerPadding: string
  itemSpacing: string
  gridCols: string
  modalSize: 'sm' | 'md' | 'lg' | 'xl'
  isCardLayout: boolean
  enableSwipe: boolean
  animationStyle: string
}

export function useAdaptiveLayout(config: AdaptiveLayoutConfig = {}): AdaptiveLayoutResult {
  const { isMobile, isTablet, isDesktop } = useResponsiveBreakpoint()
  
  const {
    mobileViewMode = 'stack',
    tabletColumns = 2,
    desktopColumns = 3,
    cardLayout = true,
    fullscreenModals = true,
    enableSwipeGestures = true,
    touchTargetSize = 'medium'
  } = config

  return useMemo(() => {
    const result: AdaptiveLayoutResult = {
      containerPadding: isMobile ? 'p-4' : isTablet ? 'p-6' : 'p-8',
      itemSpacing: isMobile ? 'space-y-3' : 'space-y-4',
      gridCols: isMobile ? 'grid-cols-1' : isTablet ? `grid-cols-${tabletColumns}` : `grid-cols-${desktopColumns}`,
      modalSize: isMobile && fullscreenModals ? 'xl' : isTablet ? 'lg' : 'md',
      isCardLayout: cardLayout,
      enableSwipe: isMobile && enableSwipeGestures,
      animationStyle: isMobile ? 'transition-all duration-200' : 'transition-all duration-300'
    }

    return result
  }, [isMobile, isTablet, isDesktop, mobileViewMode, tabletColumns, desktopColumns, cardLayout, fullscreenModals, enableSwipeGestures, touchTargetSize])
}