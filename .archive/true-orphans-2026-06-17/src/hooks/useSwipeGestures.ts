import { useState, useRef, useEffect, useCallback } from 'react'
import { useSimpleBreakpoint } from './use-mobile-simple'

export interface SwipeGestureConfig {
  threshold: number
  velocity: number
  directional: boolean
  preventDefault: boolean
}

export interface SwipeGestureResult {
  direction: 'left' | 'right' | 'up' | 'down' | null
  distance: number
  velocity: number
  isActive: boolean
}

const DEFAULT_CONFIG: SwipeGestureConfig = {
  threshold: 50,
  velocity: 0.3,
  directional: true,
  preventDefault: true
}

export function useSwipeGesture(
  onSwipe?: (result: SwipeGestureResult) => void,
  config: Partial<SwipeGestureConfig> = {}
) {
  const { isMobile } = useSimpleBreakpoint()
  const elementRef = useRef<HTMLElement>(null)
  const [isActive, setIsActive] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number; time: number } | null>(null)
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  const calculateSwipe = useCallback((endX: number, endY: number, endTime: number) => {
    if (!startPoint) return null

    const deltaX = endX - startPoint.x
    const deltaY = endY - startPoint.y
    const deltaTime = endTime - startPoint.time
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const velocity = distance / deltaTime

    if (distance < finalConfig.threshold || velocity < finalConfig.velocity) {
      return null
    }

    const angle = Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * (180 / Math.PI)
    let direction: 'left' | 'right' | 'up' | 'down'

    if (finalConfig.directional) {
      if (angle < 45) {
        direction = deltaX > 0 ? 'right' : 'left'
      } else {
        direction = deltaY > 0 ? 'down' : 'up'
      }
    } else {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left'
      } else {
        direction = deltaY > 0 ? 'down' : 'up'
      }
    }

    return {
      direction,
      distance,
      velocity,
      isActive: false
    }
  }, [startPoint, finalConfig])

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!isMobile) return
    
    setStartPoint({
      x: clientX,
      y: clientY,
      time: Date.now()
    })
    setIsActive(true)
  }, [isMobile])

  const handleEnd = useCallback((clientX: number, clientY: number) => {
    if (!isMobile || !startPoint) return

    const swipeResult = calculateSwipe(clientX, clientY, Date.now())
    
    if (swipeResult && onSwipe) {
      onSwipe(swipeResult)
    }

    setStartPoint(null)
    setIsActive(false)
  }, [isMobile, startPoint, calculateSwipe, onSwipe])

  useEffect(() => {
    const element = elementRef.current
    if (!element || !isMobile) return

    const handleTouchStart = (e: TouchEvent) => {
      if (finalConfig.preventDefault) {
        e.preventDefault()
      }
      const touch = e.touches[0]
      handleStart(touch.clientX, touch.clientY)
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (finalConfig.preventDefault) {
        e.preventDefault()
      }
      const touch = e.changedTouches[0]
      handleEnd(touch.clientX, touch.clientY)
    }

    const handleMouseDown = (e: MouseEvent) => {
      handleStart(e.clientX, e.clientY)
    }

    const handleMouseUp = (e: MouseEvent) => {
      handleEnd(e.clientX, e.clientY)
    }

    // Touch events for mobile
    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })
    
    // Mouse events for desktop testing
    element.addEventListener('mousedown', handleMouseDown)
    element.addEventListener('mouseup', handleMouseUp)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('mousedown', handleMouseDown)
      element.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isMobile, finalConfig.preventDefault, handleStart, handleEnd])

  return {
    ref: elementRef,
    isActive,
    isSupported: isMobile
  }
}

// Hook for pull-to-refresh functionality
export function usePullToRefresh(
  onRefresh: () => void | Promise<void>,
  threshold: number = 100
) {
  const { isMobile } = useSimpleBreakpoint()
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { ref } = useSwipeGesture(
    async (result) => {
      if (result.direction === 'down' && result.distance > threshold) {
        setIsRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
          setPullDistance(0)
          setIsPulling(false)
        }
      }
    },
    {
      threshold,
      directional: true,
      preventDefault: false
    }
  )

  return {
    ref,
    isPulling,
    pullDistance,
    isRefreshing,
    isSupported: isMobile
  }
}

// Hook for swipe-to-action (like delete)
export function useSwipeActions(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold: number = 80
) {
  const { isMobile } = useSimpleBreakpoint()
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)

  const { ref } = useSwipeGesture(
    (result) => {
      if (result.distance > threshold) {
        setSwipeDirection(result.direction as 'left' | 'right')
        setIsRevealed(true)

        if (result.direction === 'left' && onSwipeLeft) {
          setTimeout(() => onSwipeLeft(), 200)
        } else if (result.direction === 'right' && onSwipeRight) {
          setTimeout(() => onSwipeRight(), 200)
        }
      }
    },
    {
      threshold,
      directional: false,
      preventDefault: true
    }
  )

  const resetSwipe = useCallback(() => {
    setSwipeDirection(null)
    setIsRevealed(false)
  }, [])

  return {
    ref,
    swipeDirection,
    isRevealed,
    resetSwipe,
    isSupported: isMobile
  }
}