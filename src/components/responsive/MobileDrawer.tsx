import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useResponsiveBreakpoint } from '@/hooks/use-mobile'
import { useDeviceDetection } from '@/hooks/responsive/useDeviceDetection'

export interface MobileDrawerProps {
  children: ReactNode
  
  // State control
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  
  // Positioning
  side?: 'right' | 'left' | 'top' | 'bottom'
  width?: string | number
  height?: string | number
  
  // Behavior
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  preventScroll?: boolean
  enableSwipeToClose?: boolean
  
  // Styling
  className?: string
  backdropClassName?: string
  overlayOpacity?: number
  
  // Animation
  animationDuration?: number
  animationType?: 'slide' | 'fade' | 'scale'
  
  // Accessibility
  title?: string
  description?: string
  
  // Events
  onOpen?: () => void
  onClose?: () => void
}

/**
 * MobileDrawer - مكون drawer متقدم للأجهزة المحمولة
 * يوفر تجربة تنقل سلسة مع دعم الإيماءات والوصولية
 */
export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  children,
  isOpen,
  onOpenChange,
  side = 'right',
  width = '320px',
  height = '100%',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  preventScroll = true,
  enableSwipeToClose = true,
  className,
  backdropClassName,
  overlayOpacity = 0.5,
  animationDuration = 300,
  animationType = 'slide',
  title,
  description,
  onOpen,
  onClose
}) => {
  const { isMobile, touchDevice } = useResponsiveBreakpoint()
  const { touchSupport } = useDeviceDetection()
  const drawerRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [startPosition, setStartPosition] = useState<{ x: number; y: number } | null>(null)
  const [currentPosition, setCurrentPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onOpenChange, onClose])

  // Handle body scroll prevention
  useEffect(() => {
    if (!preventScroll) return

    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = '0px' // Prevent layout shift
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [isOpen, preventScroll])

  // Handle open/close callbacks
  useEffect(() => {
    if (isOpen) {
      onOpen?.()
    } else {
      onClose?.()
    }
  }, [isOpen, onOpen, onClose])

  // Touch/swipe handling for closing
  useEffect(() => {
    if (!enableSwipeToClose || !touchSupport || !isOpen) return

    const drawer = drawerRef.current
    if (!drawer) return

    let isDragging = false
    let startX = 0
    let startY = 0
    let currentX = 0
    let currentY = 0

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      currentX = startX
      currentY = startY
      isDragging = true
      setStartPosition({ x: startX, y: startY })
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return

      const touch = e.touches[0]
      currentX = touch.clientX
      currentY = touch.clientY

      const deltaX = currentX - startX
      const deltaY = currentY - startY

      // Only handle swipes in the correct direction
      const shouldHandle = 
        (side === 'right' && deltaX > 0) ||
        (side === 'left' && deltaX < 0) ||
        (side === 'top' && deltaY < 0) ||
        (side === 'bottom' && deltaY > 0)

      if (shouldHandle) {
        e.preventDefault()
        setCurrentPosition({ x: deltaX, y: deltaY })
        
        // Apply transform based on swipe direction
        const transform = getSwipeTransform(deltaX, deltaY)
        drawer.style.transform = transform
      }
    }

    const handleTouchEnd = () => {
      if (!isDragging) return

      isDragging = false
      const deltaX = Math.abs(currentX - startX)
      const deltaY = Math.abs(currentY - startY)
      const threshold = 100 // Minimum swipe distance to close

      const shouldClose = 
        (side === 'right' && currentX - startX > threshold) ||
        (side === 'left' && startX - currentX > threshold) ||
        (side === 'top' && startY - currentY > threshold) ||
        (side === 'bottom' && currentY - startY > threshold)

      if (shouldClose) {
        onOpenChange(false)
      } else {
        // Reset position
        drawer.style.transform = ''
      }

      setStartPosition(null)
      setCurrentPosition({ x: 0, y: 0 })
    }

    const getSwipeTransform = (deltaX: number, deltaY: number): string => {
      switch (side) {
        case 'right':
          return `translateX(${Math.max(0, deltaX)}px)`
        case 'left':
          return `translateX(${Math.min(0, deltaX)}px)`
        case 'top':
          return `translateY(${Math.min(0, deltaY)}px)`
        case 'bottom':
          return `translateY(${Math.max(0, deltaY)}px)`
        default:
          return ''
      }
    }

    drawer.addEventListener('touchstart', handleTouchStart, { passive: false })
    drawer.addEventListener('touchmove', handleTouchMove, { passive: false })
    drawer.addEventListener('touchend', handleTouchEnd)

    return () => {
      drawer.removeEventListener('touchstart', handleTouchStart)
      drawer.removeEventListener('touchmove', handleTouchMove)
      drawer.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enableSwipeToClose, touchSupport, isOpen, side, onOpenChange])

  // Animation classes based on side and type
  const getAnimationClasses = () => {
    const baseClasses = `transition-all duration-${animationDuration} ease-in-out`
    
    if (animationType === 'fade') {
      return cn(baseClasses, isOpen ? 'opacity-100' : 'opacity-0')
    }
    
    if (animationType === 'scale') {
      return cn(baseClasses, isOpen ? 'scale-100' : 'scale-95 opacity-0')
    }
    
    // Default slide animation
    const slideClasses = {
      right: isOpen ? 'translate-x-0' : 'translate-x-full',
      left: isOpen ? 'translate-x-0' : '-translate-x-full',
      top: isOpen ? 'translate-y-0' : '-translate-y-full',
      bottom: isOpen ? 'translate-y-0' : 'translate-y-full'
    }
    
    return cn(baseClasses, slideClasses[side])
  }

  // Position classes based on side
  const getPositionClasses = () => {
    const baseClasses = 'fixed z-[60] bg-card border-border shadow-lg'
    
    const positionClasses = {
      right: 'top-0 right-0 h-full border-l',
      left: 'top-0 left-0 h-full border-r',
      top: 'top-0 left-0 w-full border-b',
      bottom: 'bottom-0 left-0 w-full border-t'
    }
    
    return cn(baseClasses, positionClasses[side])
  }

  // Size styles
  const getSizeStyles = () => {
    if (side === 'top' || side === 'bottom') {
      return { height: typeof height === 'number' ? `${height}px` : height }
    } else {
      return { width: typeof width === 'number' ? `${width}px` : width }
    }
  }

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onOpenChange(false)
    }
  }

  // Don't render on desktop unless specifically needed
  if (!isMobile && !touchDevice) {
    return null
  }

  const drawerContent = (
    <div
      className={cn(
        'fixed inset-0 z-[55]',
        `transition-opacity duration-${animationDuration}`,
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-describedby={description ? 'drawer-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black',
          backdropClassName
        )}
        style={{ opacity: isOpen ? overlayOpacity : 0 }}
        onClick={handleBackdropClick}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={cn(
          getPositionClasses(),
          getAnimationClasses(),
          'overflow-y-auto overscroll-contain',
          className
        )}
        style={getSizeStyles()}
      >
        {/* Accessibility info */}
        {description && (
          <div id="drawer-description" className="sr-only">
            {description}
          </div>
        )}

        {/* Swipe indicator */}
        {enableSwipeToClose && touchSupport && (
          <div className={cn(
            'flex justify-center py-2',
            side === 'top' ? 'order-last' : 'order-first'
          )}>
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )

  // Render in portal for better z-index management
  return typeof document !== 'undefined' 
    ? createPortal(drawerContent, document.body)
    : null
}

export default MobileDrawer
