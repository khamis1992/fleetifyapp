import React from 'react'
import { cn } from '@/lib/utils'
import { useResponsiveBreakpoint } from '@/hooks/use-mobile'
import { useSwipeGesture, usePullToRefresh, useSwipeActions } from '@/hooks/useSwipeGestures'
import { RefreshCw, Trash2, Edit, Archive } from 'lucide-react'
import { Button } from './button'

interface SwipeableCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onRefresh?: () => void
  leftActionIcon?: React.ReactNode
  rightActionIcon?: React.ReactNode
  leftActionLabel?: string
  rightActionLabel?: string
  leftActionColor?: string
  rightActionColor?: string
  enablePullToRefresh?: boolean
  threshold?: number
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onRefresh,
  leftActionIcon = <Edit className="h-4 w-4" />,
  rightActionIcon = <Trash2 className="h-4 w-4" />,
  leftActionLabel = "تعديل",
  rightActionLabel = "حذف",
  leftActionColor = "bg-blue-500",
  rightActionColor = "bg-red-500",
  enablePullToRefresh = false,
  threshold = 80,
  className,
  ...props
}) => {
  const { isMobile } = useResponsiveBreakpoint()

  const {
    ref: swipeRef,
    swipeDirection,
    isRevealed,
    resetSwipe
  } = useSwipeActions(onSwipeLeft, onSwipeRight, threshold)

  const {
    ref: pullRef,
    isPulling,
    isRefreshing
  } = usePullToRefresh(onRefresh || (() => {}), 100)

  // Combine refs
  const combinedRef = React.useCallback((node: HTMLDivElement) => {
    if (swipeRef.current !== node) {
      ;(swipeRef as any).current = node
    }
    if (enablePullToRefresh && pullRef.current !== node) {
      ;(pullRef as any).current = node
    }
  }, [swipeRef, pullRef, enablePullToRefresh])

  if (!isMobile) {
    return (
      <div className={cn("relative", className)} {...props}>
        {children}
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden" ref={combinedRef}>
      {/* Pull to refresh indicator */}
      {enablePullToRefresh && (isPulling || isRefreshing) && (
        <div className="absolute top-0 left-0 right-0 flex items-center justify-center py-2 bg-primary/10 z-10">
          <RefreshCw className={cn("h-4 w-4 text-primary", isRefreshing && "animate-spin")} />
          <span className="mr-2 text-sm text-primary">
            {isRefreshing ? "جاري التحديث..." : "اسحب للتحديث"}
          </span>
        </div>
      )}

      {/* Swipe actions background */}
      {isRevealed && (
        <div className="absolute inset-0 flex">
          {swipeDirection === 'right' && onSwipeLeft && (
            <div className={cn("flex items-center justify-start pl-4 flex-1", leftActionColor)}>
              <div className="flex items-center text-white">
                {leftActionIcon}
                <span className="mr-2 text-sm font-medium">{leftActionLabel}</span>
              </div>
            </div>
          )}
          
          {swipeDirection === 'left' && onSwipeRight && (
            <div className={cn("flex items-center justify-end pr-4 flex-1", rightActionColor)}>
              <div className="flex items-center text-white">
                <span className="ml-2 text-sm font-medium">{rightActionLabel}</span>
                {rightActionIcon}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div
        className={cn(
          "relative bg-background transition-transform duration-200 ease-out",
          className,
          isRevealed && swipeDirection === 'left' && "transform -translate-x-20",
          isRevealed && swipeDirection === 'right' && "transform translate-x-20"
        )}
        onClick={isRevealed ? resetSwipe : undefined}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

// Pull to refresh component for lists
interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => void | Promise<void>
  isRefreshing?: boolean
  threshold?: number
  className?: string
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  isRefreshing = false,
  threshold = 100,
  className
}) => {
  const { isMobile } = useResponsiveBreakpoint()
  const {
    ref,
    isPulling,
    pullDistance,
    isRefreshing: internalRefreshing
  } = usePullToRefresh(onRefresh, threshold)

  const showRefreshing = isRefreshing || internalRefreshing

  if (!isMobile) {
    return <div className={className}>{children}</div>
  }

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={cn("relative", className)}>
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-10",
          "bg-gradient-to-b from-background to-background/90 border-b",
          isPulling || showRefreshing ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}
        style={{
          height: Math.min(pullDistance, threshold),
          transform: `translateY(${isPulling ? Math.min(pullDistance - threshold, 0) : showRefreshing ? 0 : -threshold}px)`
        }}
      >
        <RefreshCw className={cn("h-5 w-5 text-primary mr-2", showRefreshing && "animate-spin")} />
        <span className="text-sm text-primary font-medium">
          {showRefreshing ? "جاري التحديث..." : isPulling ? "اتركه للتحديث" : "اسحب للتحديث"}
        </span>
      </div>

      {/* Content */}
      <div className={cn(showRefreshing && "pt-12")}>
        {children}
      </div>
    </div>
  )
}

// Touch feedback button
interface TouchFeedbackButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  hapticFeedback?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export const TouchFeedbackButton: React.FC<TouchFeedbackButtonProps> = ({
  children,
  hapticFeedback = true,
  className,
  onClick,
  ...props
}) => {
  const { isMobile } = useResponsiveBreakpoint()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Haptic feedback for mobile
    if (isMobile && hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10) // Short vibration
    }

    // Visual feedback
    const target = e.currentTarget
    target.style.transform = 'scale(0.95)'
    setTimeout(() => {
      target.style.transform = 'scale(1)'
    }, 100)

    onClick?.(e)
  }

  return (
    <Button
      className={cn(
        "transition-all duration-100 ease-out",
        isMobile && "min-h-touch active:scale-95 active:bg-accent/20",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Button>
  )
}