import React, { ReactNode, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useResponsiveBreakpoint } from '@/hooks/use-mobile'
import { useDeviceDetection } from '@/hooks/responsive/useDeviceDetection'

export interface BottomNavItem {
  id: string
  label: string
  icon: ReactNode
  activeIcon?: ReactNode
  href?: string
  onClick?: () => void
  badge?: string | number
  disabled?: boolean
}

export interface BottomNavigationProps {
  items: BottomNavItem[]
  
  // State
  activeItem?: string
  onItemChange?: (itemId: string) => void
  
  // Behavior
  hideOnScroll?: boolean
  scrollThreshold?: number
  enableHapticFeedback?: boolean
  
  // Styling
  className?: string
  itemClassName?: string
  variant?: 'default' | 'floating' | 'minimal'
  
  // Animation
  showLabels?: boolean | 'active-only'
  animateOnChange?: boolean
  
  // Safe area
  respectSafeArea?: boolean
}

/**
 * BottomNavigation - شريط تنقل سفلي للأجهزة المحمولة
 * يوفر وصول سريع للوظائف الأساسية مع تجربة مستخدم محسنة
 */
export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  items,
  activeItem,
  onItemChange,
  hideOnScroll = true,
  scrollThreshold = 50,
  enableHapticFeedback = true,
  className,
  itemClassName,
  variant = 'default',
  showLabels = true,
  animateOnChange = true,
  respectSafeArea = true
}) => {
  const { isMobile } = useResponsiveBreakpoint()
  const { touchSupport } = useDeviceDetection()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  // Find active item index
  useEffect(() => {
    const index = items.findIndex(item => item.id === activeItem)
    if (index !== -1) {
      setActiveIndex(index)
    }
  }, [activeItem, items])

  // Handle scroll behavior
  useEffect(() => {
    if (!hideOnScroll) return

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollDifference = Math.abs(currentScrollY - lastScrollY)

      if (scrollDifference < scrollThreshold) return

      if (currentScrollY > lastScrollY && currentScrollY > scrollThreshold) {
        // Scrolling down - hide
        setIsVisible(false)
      } else {
        // Scrolling up - show
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hideOnScroll, lastScrollY, scrollThreshold])

  // Haptic feedback (if supported)
  const triggerHapticFeedback = () => {
    if (!enableHapticFeedback || !touchSupport) return
    
    // Use Vibration API if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10) // Short vibration
    }
  }

  const handleItemClick = (item: BottomNavItem, index: number) => {
    if (item.disabled) return

    triggerHapticFeedback()
    
    if (item.onClick) {
      item.onClick()
    }
    
    if (item.href) {
      window.location.href = item.href
    }
    
    onItemChange?.(item.id)
    setActiveIndex(index)
  }

  // Don't render on desktop
  if (!isMobile) {
    return null
  }

  // Variant-specific classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'floating':
        return 'mx-4 mb-4 rounded-2xl shadow-lg border'
      case 'minimal':
        return 'border-t-0 bg-transparent backdrop-blur-md'
      default:
        return 'border-t'
    }
  }

  // Container classes
  const containerClasses = cn(
    'fixed bottom-0 left-0 right-0 z-40',
    'bg-card/95 backdrop-blur-sm',
    'transition-all duration-300 ease-in-out',
    getVariantClasses(),
    {
      'translate-y-0': isVisible,
      'translate-y-full': !isVisible,
      'pb-safe': respectSafeArea,
    },
    className
  )

  // Navigation classes
  const navClasses = cn(
    'flex items-center justify-around',
    'px-2 py-1',
    variant === 'floating' ? 'px-4 py-2' : 'px-2 py-1'
  )

  return (
    <div className={containerClasses}>
      <nav className={navClasses} role="tablist">
        {items.map((item, index) => {
          const isActive = activeItem === item.id
          const shouldShowLabel = 
            showLabels === true || 
            (showLabels === 'active-only' && isActive)

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item, index)}
              disabled={item.disabled}
              className={cn(
                'flex flex-col items-center justify-center',
                'min-h-[48px] min-w-[48px] px-2 py-1',
                'rounded-lg transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary/20',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                {
                  // Active state
                  'text-primary bg-primary/10': isActive,
                  'text-muted-foreground hover:text-foreground': !isActive && !item.disabled,
                  
                  // Animation
                  'transform-gpu': animateOnChange,
                  'scale-110': animateOnChange && isActive,
                },
                itemClassName
              )}
              role="tab"
              aria-selected={isActive}
              aria-label={item.label}
              aria-disabled={item.disabled}
            >
              {/* Icon container */}
              <div className={cn(
                'relative flex items-center justify-center',
                'w-6 h-6 mb-1',
                'transition-transform duration-200',
                animateOnChange && isActive && 'scale-110'
              )}>
                {/* Icon */}
                {isActive && item.activeIcon ? item.activeIcon : item.icon}
                
                {/* Badge */}
                {item.badge && (
                  <span className={cn(
                    'absolute -top-1 -right-1',
                    'bg-destructive text-destructive-foreground',
                    'text-xs font-medium',
                    'min-w-[16px] h-4 px-1',
                    'rounded-full flex items-center justify-center',
                    'animate-pulse'
                  )}>
                    {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              {shouldShowLabel && (
                <span className={cn(
                  'text-xs font-medium leading-none',
                  'transition-all duration-200',
                  'max-w-[60px] truncate',
                  {
                    'opacity-100 translate-y-0': shouldShowLabel,
                    'opacity-0 translate-y-1': !shouldShowLabel,
                  }
                )}>
                  {item.label}
                </span>
              )}

              {/* Active indicator */}
              {variant === 'minimal' && isActive && (
                <div className={cn(
                  'absolute top-0 left-1/2 transform -translate-x-1/2',
                  'w-8 h-1 bg-primary rounded-full',
                  'transition-all duration-200'
                )} />
              )}
            </button>
          )
        })}
      </nav>

      {/* Active indicator line (for default variant) */}
      {variant === 'default' && (
        <div
          className={cn(
            'absolute top-0 h-0.5 bg-primary',
            'transition-all duration-300 ease-out',
            'rounded-full'
          )}
          style={{
            left: `${(activeIndex / items.length) * 100}%`,
            width: `${100 / items.length}%`,
            transform: 'translateX(25%) scaleX(0.5)'
          }}
        />
      )}
    </div>
  )
}

export default BottomNavigation
