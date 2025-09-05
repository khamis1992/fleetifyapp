import React, { ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'
import { useResponsiveBreakpoint } from '@/hooks/use-mobile'
import { useDeviceDetection } from '@/hooks/responsive/useDeviceDetection'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export interface AdaptiveCardProps {
  children?: ReactNode
  
  // Content sections
  title?: string | ReactNode
  description?: string | ReactNode
  header?: ReactNode
  footer?: ReactNode
  
  // Layout variants
  variant?: 'default' | 'compact' | 'expanded' | 'minimal'
  orientation?: 'vertical' | 'horizontal' | 'auto'
  
  // Interactive features
  clickable?: boolean
  hoverable?: boolean
  selectable?: boolean
  selected?: boolean
  
  // Mobile optimizations
  touchOptimized?: boolean
  swipeActions?: Array<{
    id: string
    label: string
    icon?: ReactNode
    action: () => void
    color?: 'primary' | 'secondary' | 'destructive' | 'success'
  }>
  
  // Visual enhancements
  image?: {
    src: string
    alt: string
    position?: 'top' | 'left' | 'right' | 'background'
    aspectRatio?: string
  }
  
  // Responsive behavior
  stackOnMobile?: boolean
  hideOnMobile?: string[] // Array of section names to hide on mobile
  
  // Animation
  animateOnHover?: boolean
  animateOnSelect?: boolean
  
  // Custom styling
  className?: string
  headerClassName?: string
  contentClassName?: string
  footerClassName?: string
  
  // Events
  onClick?: () => void
  onSelect?: (selected: boolean) => void
  onSwipe?: (direction: 'left' | 'right', actionId?: string) => void
}

/**
 * AdaptiveCard - كرت متكيف ومحسن للأجهزة المختلفة
 * يوفر تجربة مستخدم محسنة مع دعم الإيماءات والتفاعلات اللمسية
 */
export const AdaptiveCard: React.FC<AdaptiveCardProps> = ({
  children,
  title,
  description,
  header,
  footer,
  variant = 'default',
  orientation = 'auto',
  clickable = false,
  hoverable = true,
  selectable = false,
  selected = false,
  touchOptimized = true,
  swipeActions = [],
  image,
  stackOnMobile = true,
  hideOnMobile = [],
  animateOnHover = true,
  animateOnSelect = true,
  className,
  headerClassName,
  contentClassName,
  footerClassName,
  onClick,
  onSelect,
  onSwipe
}) => {
  const { isMobile, isTablet, touchDevice } = useResponsiveBreakpoint()
  const { touchSupport } = useDeviceDetection()
  const [isPressed, setIsPressed] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)

  // Determine actual orientation based on device and settings
  const actualOrientation = orientation === 'auto' 
    ? (isMobile && stackOnMobile ? 'vertical' : 'horizontal')
    : orientation

  // Handle click/tap
  const handleClick = () => {
    if (clickable && onClick) {
      onClick()
    }
    
    if (selectable && onSelect) {
      onSelect(!selected)
    }
  }

  // Handle touch interactions
  const handleTouchStart = () => {
    if (touchOptimized) {
      setIsPressed(true)
    }
  }

  const handleTouchEnd = () => {
    if (touchOptimized) {
      setIsPressed(false)
    }
  }

  // Swipe gesture handling
  const handleSwipeGesture = (direction: 'left' | 'right') => {
    if (swipeActions.length > 0 && onSwipe) {
      onSwipe(direction)
    }
  }

  // Get variant-specific classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'p-3 space-y-2'
      case 'expanded':
        return 'p-6 space-y-4'
      case 'minimal':
        return 'p-2 space-y-1 border-0 shadow-none'
      default:
        return 'p-4 space-y-3'
    }
  }

  // Get responsive classes
  const getResponsiveClasses = () => {
    return cn(
      // Base responsive classes
      'transition-all duration-200 ease-in-out',
      
      // Touch optimizations
      touchOptimized && touchSupport && [
        'min-h-[48px]', // Minimum touch target
        'active:scale-[0.98]',
        'select-none'
      ],
      
      // Hover effects (disabled on touch devices)
      hoverable && !touchDevice && [
        'hover:shadow-md',
        animateOnHover && 'hover:scale-[1.02]'
      ],
      
      // Click/tap effects
      clickable && [
        'cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-primary/20',
        isPressed && 'scale-[0.98] shadow-sm'
      ],
      
      // Selection state
      selectable && [
        selected && 'ring-2 ring-primary bg-primary/5',
        animateOnSelect && selected && 'scale-[1.01]'
      ],
      
      // Mobile-specific adjustments
      isMobile && [
        'rounded-lg', // Slightly more rounded on mobile
        variant !== 'minimal' && 'shadow-sm' // Lighter shadow on mobile
      ]
    )
  }

  // Get layout classes based on orientation
  const getLayoutClasses = () => {
    if (actualOrientation === 'horizontal' && !isMobile) {
      return 'flex flex-row items-start space-x-4 space-y-0'
    }
    return 'flex flex-col space-y-3'
  }

  // Check if section should be hidden on mobile
  const shouldHideOnMobile = (sectionName: string) => {
    return isMobile && hideOnMobile.includes(sectionName)
  }

  // Render image based on position
  const renderImage = () => {
    if (!image) return null

    const imageElement = (
      <img
        src={image.src}
        alt={image.alt}
        className={cn(
          'object-cover',
          image.aspectRatio === '1:1' && 'aspect-square',
          image.aspectRatio === '16:9' && 'aspect-video',
          image.aspectRatio === '4:3' && 'aspect-[4/3]',
          image.position === 'left' && 'w-24 h-24 rounded-md flex-shrink-0',
          image.position === 'right' && 'w-24 h-24 rounded-md flex-shrink-0',
          image.position === 'top' && 'w-full h-48 rounded-t-lg',
          !image.position && 'w-full h-48 rounded-t-lg'
        )}
      />
    )

    if (image.position === 'background') {
      return (
        <div
          className="absolute inset-0 bg-cover bg-center rounded-lg opacity-10"
          style={{ backgroundImage: `url(${image.src})` }}
        />
      )
    }

    return imageElement
  }

  // Swipe actions overlay
  const renderSwipeActions = () => {
    if (!swipeActions.length || !touchSupport) return null

    return (
      <div className={cn(
        'absolute inset-y-0 right-0 flex items-center',
        'bg-muted/90 backdrop-blur-sm',
        'transform transition-transform duration-200',
        swipeOffset > 50 ? 'translate-x-0' : 'translate-x-full'
      )}>
        {swipeActions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className={cn(
              'px-4 py-2 text-sm font-medium',
              'transition-colors duration-200',
              {
                'bg-primary text-primary-foreground': action.color === 'primary',
                'bg-secondary text-secondary-foreground': action.color === 'secondary',
                'bg-destructive text-destructive-foreground': action.color === 'destructive',
                'bg-green-600 text-white': action.color === 'success',
              }
            )}
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <Card
      className={cn(
        getVariantClasses(),
        getResponsiveClasses(),
        'relative overflow-hidden',
        className
      )}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role={clickable || selectable ? 'button' : undefined}
      tabIndex={clickable || selectable ? 0 : undefined}
    >
      {/* Background image */}
      {image?.position === 'background' && renderImage()}

      <div className={getLayoutClasses()}>
        {/* Left/Top image */}
        {image && ['left', 'top'].includes(image.position || 'top') && renderImage()}

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          {(header || title || description) && !shouldHideOnMobile('header') && (
            <CardHeader className={cn('p-0 space-y-1.5', headerClassName)}>
              {header}
              {title && (
                <CardTitle className={cn(
                  'text-base font-semibold leading-tight',
                  isMobile && 'text-sm',
                  variant === 'compact' && 'text-sm'
                )}>
                  {title}
                </CardTitle>
              )}
              {description && (
                <CardDescription className={cn(
                  'text-sm text-muted-foreground',
                  isMobile && 'text-xs',
                  variant === 'compact' && 'text-xs'
                )}>
                  {description}
                </CardDescription>
              )}
            </CardHeader>
          )}

          {/* Content */}
          {children && !shouldHideOnMobile('content') && (
            <CardContent className={cn('p-0', contentClassName)}>
              {children}
            </CardContent>
          )}

          {/* Footer */}
          {footer && !shouldHideOnMobile('footer') && (
            <CardFooter className={cn('p-0 pt-2', footerClassName)}>
              {footer}
            </CardFooter>
          )}
        </div>

        {/* Right image */}
        {image?.position === 'right' && renderImage()}
      </div>

      {/* Swipe actions */}
      {renderSwipeActions()}

      {/* Selection indicator */}
      {selectable && selected && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </Card>
  )
}

export default AdaptiveCard
