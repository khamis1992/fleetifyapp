import { useMemo } from 'react'
import { useResponsiveBreakpoint } from './use-mobile'

export interface AdaptiveLayoutConfig {
  mobileViewMode: 'stack' | 'carousel' | 'grid' | 'list'
  tabletColumns: 1 | 2 | 3
  desktopColumns: 2 | 3 | 4 | 5
  enableSwipeGestures: boolean
  swipeDirection: 'horizontal' | 'vertical' | 'both'
  showMobileToolbar: boolean
  mobileNavigation: 'bottom' | 'drawer' | 'both' | 'none'
  cardLayout: boolean
  fullscreenModals: boolean
  touchTargetSize: 'default' | 'large' | 'extra-large'
  animationStyle: 'default' | 'mobile-first' | 'desktop-first'
}

export interface AdaptiveLayoutResult {
  viewMode: 'mobile' | 'tablet' | 'desktop'
  columns: number
  isCardLayout: boolean
  showBottomNav: boolean
  showDrawer: boolean
  showToolbar: boolean
  enableSwipe: boolean
  swipeDirection: 'horizontal' | 'vertical' | 'both'
  modalSize: 'mobile' | 'desktop'
  containerPadding: string
  itemSpacing: string
  gridCols: string
  touchTargetClass: string
  animationStyle: string
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

const DEFAULT_CONFIG: AdaptiveLayoutConfig = {
  mobileViewMode: 'stack',
  tabletColumns: 2,
  desktopColumns: 3,
  enableSwipeGestures: true,
  swipeDirection: 'horizontal',
  showMobileToolbar: true,
  mobileNavigation: 'both',
  cardLayout: true,
  fullscreenModals: true,
  touchTargetSize: 'default',
  animationStyle: 'mobile-first'
}

export function useAdaptiveLayout(config: Partial<AdaptiveLayoutConfig> = {}): AdaptiveLayoutResult {
  const breakpoint = useResponsiveBreakpoint()
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  return useMemo(() => {
    const { isMobile, isTablet, isDesktop } = breakpoint

    // Determine view mode
    let viewMode: 'mobile' | 'tablet' | 'desktop'
    if (isMobile) viewMode = 'mobile'
    else if (isTablet) viewMode = 'tablet'
    else viewMode = 'desktop'

    // Calculate columns based on view mode
    let columns: number
    if (isMobile) {
      columns = finalConfig.mobileViewMode === 'grid' 
        ? (finalConfig.tabletColumns > 2 ? 2 : 1) 
        : 1
    } else if (isTablet) {
      columns = finalConfig.tabletColumns
    } else {
      columns = finalConfig.desktopColumns
    }

    // Layout configurations
    const isCardLayout = finalConfig.cardLayout && (isMobile || isTablet)
    const showBottomNav = isMobile && ['bottom', 'both'].includes(finalConfig.mobileNavigation)
    const showDrawer = isMobile && ['drawer', 'both'].includes(finalConfig.mobileNavigation)
    const showToolbar = isMobile && finalConfig.showMobileToolbar
    const enableSwipe = isMobile && finalConfig.enableSwipeGestures
    const swipeDirection = enableSwipe ? finalConfig.swipeDirection : 'horizontal'
    const modalSize = isMobile && finalConfig.fullscreenModals ? 'mobile' : 'desktop'

    // Responsive spacing and styling
    const containerPadding = isMobile 
      ? 'p-2 md:p-4' 
      : isTablet 
        ? 'p-4 md:p-6' 
        : 'p-6 md:p-8'
    
    const itemSpacing = isMobile 
      ? 'gap-3 md:gap-4' 
      : isTablet 
        ? 'gap-4 md:gap-6' 
        : 'gap-6 md:gap-8'
    
    // Touch target sizing
    const touchTargetMap = {
      default: 'touch-44px',
      large: 'touch-48px',
      'extra-large': 'touch-56px'
    }
    
    const touchTargetClass = touchTargetMap[finalConfig.touchTargetSize]

    // Grid column classes for Tailwind
    const gridColsMap = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
      5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
    }
    
    const gridCols = gridColsMap[columns as keyof typeof gridColsMap] || 'grid-cols-1'

    // Animation style
    const animationMap = {
      default: 'fade-in',
      'mobile-first': isMobile ? 'slide-in-bottom' : 'fade-in',
      'desktop-first': isDesktop ? 'scale-in' : 'fade-in'
    }
    
    const animationStyle = animationMap[finalConfig.animationStyle]

    return {
      viewMode,
      columns,
      isCardLayout,
      showBottomNav,
      showDrawer,
      showToolbar,
      enableSwipe,
      swipeDirection,
      modalSize,
      containerPadding,
      itemSpacing,
      gridCols,
      touchTargetClass,
      animationStyle,
      isMobile,
      isTablet,
      isDesktop
    }
  }, [breakpoint, finalConfig])
}

// Specialized hooks for common use cases
export function useMobileFirst() {
  const { isMobile, isTablet } = useResponsiveBreakpoint()
  
  return {
    isMobile,
    isTablet,
    containerClass: isMobile 
      ? 'container mx-auto px-2 py-1 md:px-4 md:py-2' 
      : isTablet 
        ? 'container mx-auto px-3 py-2 md:px-6 md:py-4'
        : 'container mx-auto px-4 py-3 md:px-8 md:py-6',
    cardClass: isMobile
      ? 'rounded-md shadow-sm border md:rounded-lg md:shadow'
      : 'rounded-lg shadow-md border',
    buttonSize: isMobile ? 'sm md:lg' : 'default',
    inputSize: isMobile ? 'sm md:lg' : 'default',
    textSize: isMobile ? 'text-sm md:text-base' : 'text-base',
    spacing: isMobile ? 'gap-2 md:gap-4' : 'gap-4 md:gap-6'
  }
}

export function useDataDisplay() {
  const { isMobile, isTablet } = useResponsiveBreakpoint()
  
  return {
    displayMode: isMobile 
      ? 'cards' 
      : isTablet 
        ? 'grid' 
        : 'table' as const,
    itemsPerPage: isMobile 
      ? 5 
      : isTablet 
        ? 10 
        : 50,
    compactMode: isMobile,
    showFilters: !isMobile,
    showPagination: true,
    sortingEnabled: !isMobile,
    cardLayout: isMobile || isTablet,
    rowHeight: isMobile ? 'h-16' : 'h-20',
    animation: isMobile ? 'slide-in-bottom' : 'fade-in'
  }
}

export function useFormLayout() {
  const { isMobile, isTablet } = useResponsiveBreakpoint()
  
  return {
    columns: isMobile 
      ? 1 
      : isTablet 
        ? 2 
        : 3,
    fieldSpacing: isMobile 
      ? 'space-y-3 md:space-y-4' 
      : 'space-y-4 md:space-y-6',
    buttonLayout: isMobile 
      ? 'stacked' 
      : 'inline' as const,
    labelPosition: isMobile 
      ? 'top' 
      : 'side' as const,
    showStepIndicator: isMobile,
    enableValidationSummary: isMobile,
    fieldSize: isMobile 
      ? 'sm md:lg' 
      : 'default',
    helpTextPosition: isMobile 
      ? 'bottom' 
      : 'side' as const,
    animation: isMobile 
      ? 'slide-in-bottom' 
      : 'fade-in'
  }
}