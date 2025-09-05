import { useMemo } from 'react'
import { useResponsiveBreakpoint } from './use-mobile'
import { useDeviceDetection } from './responsive/useDeviceDetection'
import { useScreenOrientation } from './responsive/useScreenOrientation'

export interface AdaptiveLayoutConfig {
  // Layout modes
  mobileViewMode: 'stack' | 'carousel' | 'grid' | 'list' | 'masonry'
  tabletColumns: 1 | 2 | 3 | 4
  desktopColumns: 2 | 3 | 4 | 5 | 6
  
  // Interaction
  enableSwipeGestures: boolean
  swipeDirection: 'horizontal' | 'vertical' | 'both'
  enablePullToRefresh: boolean
  
  // Navigation
  showMobileToolbar: boolean
  mobileNavigation: 'bottom' | 'drawer' | 'both' | 'none'
  sidebarBehavior: 'overlay' | 'push' | 'reveal' | 'auto'
  
  // Layout styles
  cardLayout: boolean
  fullscreenModals: boolean
  stickyHeaders: boolean
  
  // Touch and accessibility
  touchTargetSize: 'compact' | 'default' | 'large' | 'extra-large'
  enableHapticFeedback: boolean
  
  // Animations and performance
  animationStyle: 'none' | 'subtle' | 'default' | 'mobile-first' | 'desktop-first'
  reducedMotion: boolean
  
  // Content density
  contentDensity: 'compact' | 'comfortable' | 'spacious'
  
  // Orientation handling
  orientationLock: boolean
  landscapeLayout: 'auto' | 'force-desktop' | 'optimized'
}

export interface AdaptiveLayoutResult {
  // Device and view information
  viewMode: 'mobile' | 'tablet' | 'desktop'
  deviceType: 'mobile' | 'tablet' | 'desktop'
  orientation: 'portrait' | 'landscape'
  
  // Layout configuration
  columns: number
  isCardLayout: boolean
  contentDensity: 'compact' | 'comfortable' | 'spacious'
  
  // Navigation
  showBottomNav: boolean
  showDrawer: boolean
  showToolbar: boolean
  sidebarBehavior: 'overlay' | 'push' | 'reveal' | 'auto'
  
  // Interaction
  enableSwipe: boolean
  swipeDirection: 'horizontal' | 'vertical' | 'both'
  enablePullToRefresh: boolean
  touchOptimized: boolean
  
  // UI elements
  modalSize: 'mobile' | 'desktop' | 'fullscreen'
  stickyHeaders: boolean
  
  // Styling classes
  containerPadding: string
  itemSpacing: string
  gridCols: string
  touchTargetClass: string
  animationClass: string
  densityClass: string
  
  // Device capabilities
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  touchDevice: boolean
  canHover: boolean
  
  // Accessibility
  reducedMotion: boolean
  highContrast: boolean
}

const DEFAULT_CONFIG: AdaptiveLayoutConfig = {
  // Layout modes
  mobileViewMode: 'stack',
  tabletColumns: 2,
  desktopColumns: 3,
  
  // Interaction
  enableSwipeGestures: true,
  swipeDirection: 'horizontal',
  enablePullToRefresh: true,
  
  // Navigation
  showMobileToolbar: true,
  mobileNavigation: 'both',
  sidebarBehavior: 'auto',
  
  // Layout styles
  cardLayout: true,
  fullscreenModals: true,
  stickyHeaders: false,
  
  // Touch and accessibility
  touchTargetSize: 'default',
  enableHapticFeedback: false,
  
  // Animations and performance
  animationStyle: 'mobile-first',
  reducedMotion: false,
  
  // Content density
  contentDensity: 'comfortable',
  
  // Orientation handling
  orientationLock: false,
  landscapeLayout: 'auto'
}

export function useAdaptiveLayout(config: Partial<AdaptiveLayoutConfig> = {}): AdaptiveLayoutResult {
  const breakpoint = useResponsiveBreakpoint()
  const deviceInfo = useDeviceDetection()
  const orientation = useScreenOrientation()
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  return useMemo(() => {
    const { isMobile, isTablet, isDesktop, touchDevice, canHover } = breakpoint

    // Determine view mode with orientation consideration
    let viewMode: 'mobile' | 'tablet' | 'desktop'
    if (isMobile) {
      viewMode = 'mobile'
    } else if (isTablet) {
      // In landscape mode, tablets might behave more like desktop
      viewMode = orientation.isLandscape && finalConfig.landscapeLayout === 'force-desktop' 
        ? 'desktop' 
        : 'tablet'
    } else {
      viewMode = 'desktop'
    }

    // Calculate columns based on view mode and orientation
    let columns: number
    if (isMobile) {
      if (orientation.isLandscape && finalConfig.mobileViewMode === 'grid') {
        columns = 2
      } else {
        columns = finalConfig.mobileViewMode === 'grid' 
          ? (finalConfig.tabletColumns > 2 ? 2 : 1) 
          : 1
      }
    } else if (isTablet) {
      columns = orientation.isLandscape 
        ? Math.min(finalConfig.tabletColumns + 1, finalConfig.desktopColumns)
        : finalConfig.tabletColumns
    } else {
      columns = finalConfig.desktopColumns
    }

    // Enhanced layout configurations
    const isCardLayout = finalConfig.cardLayout && (isMobile || isTablet)
    const showBottomNav = isMobile && ['bottom', 'both'].includes(finalConfig.mobileNavigation)
    const showDrawer = (isMobile || (isTablet && orientation.isPortrait)) && ['drawer', 'both'].includes(finalConfig.mobileNavigation)
    const showToolbar = isMobile && finalConfig.showMobileToolbar
    const enableSwipe = (isMobile || touchDevice) && finalConfig.enableSwipeGestures
    const swipeDirection = enableSwipe ? finalConfig.swipeDirection : 'horizontal'
    const enablePullToRefresh = (isMobile || touchDevice) && finalConfig.enablePullToRefresh
    
    // Enhanced modal sizing
    let modalSize: 'mobile' | 'desktop' | 'fullscreen'
    if (isMobile && finalConfig.fullscreenModals) {
      modalSize = 'fullscreen'
    } else if (isMobile) {
      modalSize = 'mobile'
    } else {
      modalSize = 'desktop'
    }

    // Sidebar behavior
    const sidebarBehavior = finalConfig.sidebarBehavior === 'auto'
      ? (isMobile ? 'overlay' : isTablet ? 'push' : 'reveal')
      : finalConfig.sidebarBehavior

    // Enhanced responsive spacing based on content density
    const densitySpacing = {
      compact: { container: 'p-1 md:p-2', item: 'gap-1 md:gap-2' },
      comfortable: { container: 'p-2 md:p-4', item: 'gap-3 md:gap-4' },
      spacious: { container: 'p-4 md:p-6', item: 'gap-6 md:gap-8' }
    }

    const currentDensity = densitySpacing[finalConfig.contentDensity]
    
    const containerPadding = isMobile 
      ? currentDensity.container
      : isTablet 
        ? `${currentDensity.container} lg:p-6` 
        : `${currentDensity.container} lg:p-8`
    
    const itemSpacing = isMobile 
      ? currentDensity.item
      : isTablet 
        ? `${currentDensity.item} lg:gap-6` 
        : `${currentDensity.item} lg:gap-8`
    
    // Enhanced touch target sizing
    const touchTargetMap = {
      compact: 'min-h-[40px] min-w-[40px]',
      default: 'min-h-[44px] min-w-[44px]',
      large: 'min-h-[48px] min-w-[48px]',
      'extra-large': 'min-h-[56px] min-w-[56px]'
    }
    
    const touchTargetClass = touchTargetMap[finalConfig.touchTargetSize]

    // Enhanced grid column classes
    const gridColsMap = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
      5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
      6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
    }
    
    const gridCols = gridColsMap[columns as keyof typeof gridColsMap] || 'grid-cols-1'

    // Enhanced animation handling
    const shouldReduceMotion = finalConfig.reducedMotion || deviceInfo.prefersReducedMotion
    
    const animationMap = {
      none: '',
      subtle: shouldReduceMotion ? '' : 'transition-opacity duration-200',
      default: shouldReduceMotion ? '' : 'transition-all duration-300 ease-in-out',
      'mobile-first': shouldReduceMotion ? '' : (isMobile ? 'animate-slide-in-bottom' : 'animate-fade-in'),
      'desktop-first': shouldReduceMotion ? '' : (isDesktop ? 'animate-scale-in' : 'animate-fade-in')
    }
    
    const animationClass = animationMap[finalConfig.animationStyle]

    // Content density class
    const densityClass = `density-${finalConfig.contentDensity}`

    // Accessibility features
    const highContrast = deviceInfo.prefersColorScheme === 'dark'

    return {
      // Device and view information
      viewMode,
      deviceType: deviceInfo.deviceType,
      orientation: orientation.orientation,
      
      // Layout configuration
      columns,
      isCardLayout,
      contentDensity: finalConfig.contentDensity,
      
      // Navigation
      showBottomNav,
      showDrawer,
      showToolbar,
      sidebarBehavior,
      
      // Interaction
      enableSwipe,
      swipeDirection,
      enablePullToRefresh,
      touchOptimized: touchDevice,
      
      // UI elements
      modalSize,
      stickyHeaders: finalConfig.stickyHeaders,
      
      // Styling classes
      containerPadding,
      itemSpacing,
      gridCols,
      touchTargetClass,
      animationClass,
      densityClass,
      
      // Device capabilities
      isMobile,
      isTablet,
      isDesktop,
      touchDevice,
      canHover,
      
      // Accessibility
      reducedMotion: shouldReduceMotion,
      highContrast
    }
  }, [breakpoint, deviceInfo, orientation, finalConfig])
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