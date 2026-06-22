import { useCallback, useEffect, useRef, useState } from 'react'
import { useSimpleBreakpoint } from './use-mobile-simple'

export interface TouchInteractionConfig {
  enableSwipeGestures: boolean
  enablePullToRefresh: boolean
  enableLongPress: boolean
  swipeThreshold: number
  longPressDelay: number
  hapticFeedback: boolean
}

export interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down' | null
  distance: number
  velocity: number
}

export interface TouchInteractionResult {
  isTouch: boolean
  swipeHandlers: {
    onTouchStart: (e: TouchEvent) => void
    onTouchMove: (e: TouchEvent) => void
    onTouchEnd: (e: TouchEvent) => void
  }
  pullToRefreshState: {
    isPulling: boolean
    pullDistance: number
    isRefreshing: boolean
  }
  longPressHandlers: {
    onTouchStart: (e: TouchEvent) => void
    onTouchEnd: (e: TouchEvent) => void
  }
}

const DEFAULT_CONFIG: TouchInteractionConfig = {
  enableSwipeGestures: true,
  enablePullToRefresh: true,
  enableLongPress: true,
  swipeThreshold: 50,
  longPressDelay: 500,
  hapticFeedback: true
}

export function useTouchInteraction(
  onSwipe?: (direction: SwipeDirection) => void,
  onPullToRefresh?: () => Promise<void>,
  onLongPress?: () => void,
  config: Partial<TouchInteractionConfig> = {}
): TouchInteractionResult {
  const { isMobile } = useSimpleBreakpoint()
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchMoveRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Haptic feedback helper
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (finalConfig.hapticFeedback && 'vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      }
      navigator.vibrate(patterns[type])
    }
  }, [finalConfig.hapticFeedback])

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!finalConfig.enableSwipeGestures) return
    
    const touch = e.touches[0]
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    })
    touchMoveRef.current = { x: touch.clientX, y: touch.clientY }
  }, [finalConfig.enableSwipeGestures])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart || !finalConfig.enableSwipeGestures) return
    
    const touch = e.touches[0]
    touchMoveRef.current = { x: touch.clientX, y: touch.clientY }
    
    // Pull to refresh logic
    if (finalConfig.enablePullToRefresh && !isRefreshing) {
      const deltaY = touch.clientY - touchStart.y
      if (deltaY > 0 && window.scrollY === 0) {
        setIsPulling(true)
        setPullDistance(Math.min(deltaY, 100))
        
        if (deltaY > 80) {
          triggerHaptic('medium')
        }
      }
    }
  }, [touchStart, finalConfig.enableSwipeGestures, finalConfig.enablePullToRefresh, isRefreshing, triggerHaptic])

  const handleTouchEnd = useCallback(async (e: TouchEvent) => {
    if (!touchStart) return
    
    const deltaX = touchMoveRef.current.x - touchStart.x
    const deltaY = touchMoveRef.current.y - touchStart.y
    const deltaTime = Date.now() - touchStart.time
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const velocity = distance / deltaTime
    
    // Handle swipe gestures
    if (finalConfig.enableSwipeGestures && distance > finalConfig.swipeThreshold) {
      let direction: SwipeDirection['direction'] = null
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left'
      } else {
        direction = deltaY > 0 ? 'down' : 'up'
      }
      
      if (direction && onSwipe) {
        triggerHaptic('light')
        onSwipe({ direction, distance, velocity })
      }
    }
    
    // Handle pull to refresh
    if (isPulling && pullDistance > 80 && onPullToRefresh && !isRefreshing) {
      setIsRefreshing(true)
      triggerHaptic('heavy')
      try {
        await onPullToRefresh()
      } finally {
        setIsRefreshing(false)
        setIsPulling(false)
        setPullDistance(0)
      }
    } else {
      setIsPulling(false)
      setPullDistance(0)
    }
    
    setTouchStart(null)
  }, [touchStart, finalConfig, pullDistance, isPulling, isRefreshing, onSwipe, onPullToRefresh, triggerHaptic])

  // Long press handlers
  const handleLongPressStart = useCallback((e: TouchEvent) => {
    if (!finalConfig.enableLongPress) return
    
    longPressTimer.current = setTimeout(() => {
      triggerHaptic('medium')
      onLongPress?.()
    }, finalConfig.longPressDelay)
  }, [finalConfig.enableLongPress, finalConfig.longPressDelay, onLongPress, triggerHaptic])

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  return {
    isTouch: isMobile,
    swipeHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    pullToRefreshState: {
      isPulling,
      pullDistance,
      isRefreshing
    },
    longPressHandlers: {
      onTouchStart: handleLongPressStart,
      onTouchEnd: handleLongPressEnd
    }
  }
}

// Hook for drawer/swipe navigation
export function useSwipeNavigation(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void
) {
  const handleSwipe = useCallback((swipe: SwipeDirection) => {
    if (swipe.direction === 'left' && onSwipeLeft) {
      onSwipeLeft()
    } else if (swipe.direction === 'right' && onSwipeRight) {
      onSwipeRight()
    }
  }, [onSwipeLeft, onSwipeRight])

  return useTouchInteraction(handleSwipe, undefined, undefined, {
    enablePullToRefresh: false,
    enableLongPress: false,
    swipeThreshold: 100
  })
}

// Hook for tab switching with swipe
export function useSwipeTabs(
  currentTab: number,
  totalTabs: number,
  onTabChange: (index: number) => void
) {
  const handleSwipe = useCallback((swipe: SwipeDirection) => {
    if (swipe.direction === 'left' && currentTab < totalTabs - 1) {
      onTabChange(currentTab + 1)
    } else if (swipe.direction === 'right' && currentTab > 0) {
      onTabChange(currentTab - 1)
    }
  }, [currentTab, totalTabs, onTabChange])

  return useTouchInteraction(handleSwipe, undefined, undefined, {
    enablePullToRefresh: false,
    enableLongPress: false,
    swipeThreshold: 75
  })
}

// Hook for pull-to-refresh functionality
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  return useTouchInteraction(undefined, onRefresh, undefined, {
    enableSwipeGestures: false,
    enableLongPress: false
  })
}