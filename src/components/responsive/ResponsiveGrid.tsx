import React, { ReactNode, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout'
import { useResponsiveBreakpoint } from '@/hooks/use-mobile'

export interface ResponsiveGridProps {
  children: ReactNode
  
  // Grid configuration
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  
  // Spacing
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  
  // Layout behavior
  autoFit?: boolean
  minItemWidth?: string
  maxItemWidth?: string
  aspectRatio?: string
  
  // Responsive behavior
  stackOnMobile?: boolean
  centerItems?: boolean
  equalHeight?: boolean
  
  // Content density
  density?: 'compact' | 'comfortable' | 'spacious'
  
  // Animation
  animateItems?: boolean
  staggerAnimation?: boolean
  
  // Custom classes
  className?: string
  itemClassName?: string
  
  // Grid type
  variant?: 'grid' | 'masonry' | 'flex' | 'auto'
}

/**
 * ResponsiveGrid - شبكة متجاوبة متقدمة
 * توفر تخطيط شبكي مرن يتكيف مع جميع أحجام الشاشات
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = {
    mobile: 1,
    tablet: 2,
    desktop: 3
  },
  gap = 'md',
  padding = 'md',
  autoFit = false,
  minItemWidth = '250px',
  maxItemWidth = '1fr',
  aspectRatio,
  stackOnMobile = true,
  centerItems = false,
  equalHeight = false,
  density = 'comfortable',
  animateItems = true,
  staggerAnimation = false,
  className,
  itemClassName,
  variant = 'grid'
}) => {
  const { isMobile, isTablet, isDesktop, deviceType } = useResponsiveBreakpoint()
  const { gridCols, itemSpacing, containerPadding, densityClass } = useAdaptiveLayout({
    contentDensity: density
  })

  // Calculate current columns based on device
  const currentColumns = useMemo(() => {
    if (isMobile) return columns.mobile || 1
    if (isTablet) return columns.tablet || 2
    return columns.desktop || 3
  }, [isMobile, isTablet, columns])

  // Gap classes mapping
  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  }

  // Padding classes mapping
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  }

  // Generate grid template based on variant and settings
  const getGridStyles = () => {
    const styles: React.CSSProperties = {}

    switch (variant) {
      case 'auto':
        if (autoFit) {
          styles.gridTemplateColumns = `repeat(auto-fit, minmax(${minItemWidth}, ${maxItemWidth}))`
        } else {
          styles.gridTemplateColumns = `repeat(auto-fill, minmax(${minItemWidth}, 1fr))`
        }
        break
        
      case 'masonry':
        styles.columns = currentColumns
        styles.columnGap = gap === 'none' ? '0' : `var(--grid-gap-${gap})`
        break
        
      case 'flex':
        // Will use flexbox classes instead
        break
        
      default: // grid
        if (stackOnMobile && isMobile) {
          styles.gridTemplateColumns = '1fr'
        } else {
          styles.gridTemplateColumns = `repeat(${currentColumns}, 1fr)`
        }
    }

    if (aspectRatio && variant !== 'masonry') {
      styles.gridAutoRows = `minmax(0, 1fr)`
    }

    return styles
  }

  // Container classes based on variant
  const getContainerClasses = () => {
    const baseClasses = cn(
      'w-full',
      paddingClasses[padding],
      densityClass,
      className
    )

    switch (variant) {
      case 'masonry':
        return cn(
          baseClasses,
          'columns-1 sm:columns-2 lg:columns-3',
          gapClasses[gap]
        )
        
      case 'flex':
        return cn(
          baseClasses,
          'flex flex-wrap',
          gapClasses[gap],
          centerItems && 'justify-center',
          equalHeight && 'items-stretch'
        )
        
      default: // grid or auto
        return cn(
          baseClasses,
          'grid',
          gapClasses[gap],
          centerItems && 'place-items-center',
          equalHeight && 'grid-rows-[repeat(auto-fit,1fr)]'
        )
    }
  }

  // Item classes
  const getItemClasses = (index: number) => {
    const baseItemClasses = cn(
      'w-full',
      itemClassName,
      {
        // Animation classes
        'transition-all duration-300 ease-in-out': animateItems,
        'hover:scale-105 hover:z-10': animateItems && !isMobile,
        
        // Masonry specific
        'break-inside-avoid mb-4': variant === 'masonry',
        
        // Flex specific
        'flex-1 min-w-0': variant === 'flex',
        
        // Aspect ratio
        'aspect-square': aspectRatio === '1:1',
        'aspect-video': aspectRatio === '16:9',
        'aspect-[4/3]': aspectRatio === '4:3',
        'aspect-[3/2]': aspectRatio === '3:2',
      }
    )

    // Stagger animation delay
    if (staggerAnimation && animateItems) {
      const delay = (index % 12) * 50 // Stagger by 50ms, reset every 12 items
      return cn(
        baseItemClasses,
        'animate-fade-in-up'
      )
    }

    return baseItemClasses
  }

  // Convert children to array for processing
  const childrenArray = React.Children.toArray(children)

  return (
    <div
      className={getContainerClasses()}
      style={getGridStyles()}
      data-grid-variant={variant}
      data-device-type={deviceType}
    >
      {childrenArray.map((child, index) => {
        // For masonry and flex, render children directly with classes
        if (variant === 'masonry' || variant === 'flex') {
          return (
            <div
              key={index}
              className={getItemClasses(index)}
              style={staggerAnimation ? { animationDelay: `${(index % 12) * 50}ms` } : undefined}
            >
              {child}
            </div>
          )
        }

        // For grid variants, wrap in grid item
        return (
          <div
            key={index}
            className={getItemClasses(index)}
            style={{
              ...(aspectRatio && { aspectRatio }),
              ...(staggerAnimation && { animationDelay: `${(index % 12) * 50}ms` })
            }}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}

// Specialized grid components for common use cases

/**
 * ProductGrid - شبكة منتجات محسنة
 */
export const ProductGrid: React.FC<Omit<ResponsiveGridProps, 'variant' | 'aspectRatio'>> = (props) => (
  <ResponsiveGrid
    {...props}
    variant="auto"
    aspectRatio="1:1"
    minItemWidth="200px"
    animateItems={true}
  />
)

/**
 * CardGrid - شبكة كروت متجاوبة
 */
export const CardGrid: React.FC<Omit<ResponsiveGridProps, 'variant' | 'equalHeight'>> = (props) => (
  <ResponsiveGrid
    {...props}
    variant="grid"
    equalHeight={true}
    animateItems={true}
  />
)

/**
 * MasonryGrid - شبكة masonry للمحتوى متغير الارتفاع
 */
export const MasonryGrid: React.FC<Omit<ResponsiveGridProps, 'variant' | 'aspectRatio'>> = (props) => (
  <ResponsiveGrid
    {...props}
    variant="masonry"
    animateItems={true}
    staggerAnimation={true}
  />
)

/**
 * FlexGrid - شبكة مرنة باستخدام flexbox
 */
export const FlexGrid: React.FC<Omit<ResponsiveGridProps, 'variant'>> = (props) => (
  <ResponsiveGrid
    {...props}
    variant="flex"
    centerItems={true}
  />
)

export default ResponsiveGrid
