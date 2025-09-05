import { useMemo } from 'react'
import { useResponsiveBreakpoint } from './use-mobile'

export interface AdaptiveContentConfig {
  enableLazyLoading: boolean
  imageOptimization: boolean
  textTruncation: boolean
  iconSizes: 'responsive' | 'fixed'
  fontSizes: 'responsive' | 'fixed'
  chartSimplification: boolean
}

export interface AdaptiveContentResult {
  textSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
    '2xl': string
  }
  iconSize: {
    xs: number
    sm: number
    base: number
    lg: number
    xl: number
  }
  imageConfig: {
    loading: 'lazy' | 'eager'
    quality: number
    sizes: string
    placeholder: boolean
  }
  chartConfig: {
    simplified: boolean
    showLegend: boolean
    showTooltips: boolean
    animationDuration: number
  }
  contentDensity: 'compact' | 'comfortable' | 'spacious'
  truncateLength: number
  showFullContent: boolean
}

const DEFAULT_CONFIG: AdaptiveContentConfig = {
  enableLazyLoading: true,
  imageOptimization: true,
  textTruncation: true,
  iconSizes: 'responsive',
  fontSizes: 'responsive',
  chartSimplification: true
}

export function useAdaptiveContent(config: Partial<AdaptiveContentConfig> = {}): AdaptiveContentResult {
  const breakpoint = useResponsiveBreakpoint()
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  return useMemo(() => {
    const { isMobile, isTablet, isDesktop } = breakpoint

    // Responsive text sizes
    const textSize = finalConfig.fontSizes === 'responsive' 
      ? isMobile 
        ? {
            xs: 'text-xs',
            sm: 'text-sm',
            base: 'text-base',
            lg: 'text-lg',
            xl: 'text-xl',
            '2xl': 'text-2xl'
          }
        : isTablet
        ? {
            xs: 'text-sm',
            sm: 'text-base',
            base: 'text-lg',
            lg: 'text-xl',
            xl: 'text-2xl',
            '2xl': 'text-3xl'
          }
        : {
            xs: 'text-sm',
            sm: 'text-base',
            base: 'text-lg',
            lg: 'text-xl',
            xl: 'text-2xl',
            '2xl': 'text-4xl'
          }
      : {
          xs: 'text-xs',
          sm: 'text-sm',
          base: 'text-base',
          lg: 'text-lg',
          xl: 'text-xl',
          '2xl': 'text-2xl'
        }

    // Responsive icon sizes (in pixels)
    const iconSize = finalConfig.iconSizes === 'responsive'
      ? isMobile
        ? { xs: 12, sm: 14, base: 16, lg: 20, xl: 24 }
        : isTablet
        ? { xs: 14, sm: 16, base: 18, lg: 22, xl: 26 }
        : { xs: 16, sm: 18, base: 20, lg: 24, xl: 28 }
      : { xs: 12, sm: 14, base: 16, lg: 20, xl: 24 }

    // Image configuration
    const imageConfig = {
      loading: (finalConfig.enableLazyLoading ? 'lazy' : 'eager') as 'lazy' | 'eager',
      quality: finalConfig.imageOptimization 
        ? isMobile ? 75 : isTablet ? 85 : 95
        : 95,
      sizes: isMobile 
        ? '(max-width: 768px) 100vw, 50vw'
        : isTablet 
        ? '(max-width: 1024px) 50vw, 33vw'
        : '(max-width: 1280px) 33vw, 25vw',
      placeholder: isMobile && finalConfig.imageOptimization
    }

    // Chart configuration
    const chartConfig = {
      simplified: finalConfig.chartSimplification && isMobile,
      showLegend: !isMobile,
      showTooltips: true,
      animationDuration: isMobile ? 300 : isTablet ? 500 : 750
    }

    // Content density
    const contentDensity: 'compact' | 'comfortable' | 'spacious' = 
      isMobile ? 'compact' : isTablet ? 'comfortable' : 'spacious'

    // Text truncation
    const truncateLength = isMobile ? 100 : isTablet ? 150 : 200
    const showFullContent = isDesktop

    return {
      textSize,
      iconSize,
      imageConfig,
      chartConfig,
      contentDensity,
      truncateLength,
      showFullContent
    }
  }, [breakpoint, finalConfig])
}

// Specialized content hooks
export function useAdaptiveText() {
  const { isMobile, isTablet } = useResponsiveBreakpoint()
  
  return {
    headingClass: isMobile 
      ? 'text-lg font-semibold'
      : isTablet 
      ? 'text-xl font-semibold'
      : 'text-2xl font-bold',
    subheadingClass: isMobile
      ? 'text-base font-medium'
      : isTablet
      ? 'text-lg font-medium'
      : 'text-xl font-semibold',
    bodyClass: isMobile
      ? 'text-sm'
      : 'text-base',
    captionClass: isMobile
      ? 'text-xs text-muted-foreground'
      : 'text-sm text-muted-foreground',
    lineClamp: isMobile ? 'line-clamp-2' : isTablet ? 'line-clamp-3' : 'line-clamp-4'
  }
}

export function useAdaptiveImages() {
  const { isMobile, isTablet, screenWidth } = useResponsiveBreakpoint()
  
  return {
    thumbnailSize: isMobile ? 'w-16 h-16' : isTablet ? 'w-20 h-20' : 'w-24 h-24',
    cardImageSize: isMobile ? 'h-48' : isTablet ? 'h-56' : 'h-64',
    heroImageSize: isMobile ? 'h-64' : isTablet ? 'h-80' : 'h-96',
    quality: isMobile ? 75 : isTablet ? 85 : 95,
    loading: 'lazy' as const,
    sizes: `(max-width: ${screenWidth}px) 100vw, 50vw`
  }
}

export function useAdaptiveCharts() {
  const { isMobile, isTablet } = useResponsiveBreakpoint()
  
  return {
    height: isMobile ? 200 : isTablet ? 300 : 400,
    showLegend: !isMobile,
    showGrid: !isMobile,
    showTooltips: true,
    animationDuration: isMobile ? 300 : 750,
    fontSize: isMobile ? 12 : 14,
    margin: isMobile 
      ? { top: 10, right: 10, bottom: 30, left: 30 }
      : { top: 20, right: 30, bottom: 40, left: 40 },
    simplifyData: isMobile,
    maxDataPoints: isMobile ? 10 : isTablet ? 20 : 50
  }
}

export function useAdaptiveButtons() {
  const { isMobile, isTablet } = useResponsiveBreakpoint()
  
  return {
    size: isMobile ? 'lg' : 'default' as const,
    variant: 'default' as const,
    minHeight: isMobile ? 'min-h-touch' : 'min-h-8',
    padding: isMobile ? 'px-6 py-3' : 'px-4 py-2',
    fontSize: isMobile ? 'text-base' : 'text-sm',
    iconSize: isMobile ? 20 : 16,
    fullWidth: isMobile
  }
}