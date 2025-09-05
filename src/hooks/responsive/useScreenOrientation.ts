import { useState, useEffect, useCallback } from 'react'

export type OrientationType = 'portrait' | 'landscape'
export type OrientationAngle = 0 | 90 | 180 | 270

export interface ScreenOrientationInfo {
  // Basic orientation
  orientation: OrientationType
  angle: OrientationAngle
  
  // Detailed orientation states
  isPortrait: boolean
  isLandscape: boolean
  
  // Specific orientations
  isPortraitPrimary: boolean
  isPortraitSecondary: boolean
  isLandscapePrimary: boolean
  isLandscapeSecondary: boolean
  
  // Dimensions
  width: number
  height: number
  
  // Orientation change detection
  hasChanged: boolean
  previousOrientation: OrientationType | null
  
  // Lock/unlock functions (if supported)
  lockOrientation?: (orientation: OrientationLockType) => Promise<void>
  unlockOrientation?: () => void
  
  // Support detection
  orientationLockSupported: boolean
}

export type OrientationLockType = 
  | 'any'
  | 'natural'
  | 'landscape'
  | 'portrait'
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'landscape-primary'
  | 'landscape-secondary'

/**
 * Enhanced screen orientation hook
 * Provides comprehensive orientation information and control
 */
export function useScreenOrientation(): ScreenOrientationInfo {
  const [orientationInfo, setOrientationInfo] = useState<ScreenOrientationInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        orientation: 'portrait',
        angle: 0,
        isPortrait: true,
        isLandscape: false,
        isPortraitPrimary: true,
        isPortraitSecondary: false,
        isLandscapePrimary: false,
        isLandscapeSecondary: false,
        width: 0,
        height: 0,
        hasChanged: false,
        previousOrientation: null,
        orientationLockSupported: false
      }
    }

    const width = window.innerWidth
    const height = window.innerHeight
    const orientation: OrientationType = height > width ? 'portrait' : 'landscape'
    
    return {
      orientation,
      angle: 0,
      isPortrait: orientation === 'portrait',
      isLandscape: orientation === 'landscape',
      isPortraitPrimary: orientation === 'portrait',
      isPortraitSecondary: false,
      isLandscapePrimary: orientation === 'landscape',
      isLandscapeSecondary: false,
      width,
      height,
      hasChanged: false,
      previousOrientation: null,
      orientationLockSupported: 'orientation' in screen && 'lock' in (screen as any).orientation
    }
  })

  // Get detailed orientation information
  const getOrientationDetails = useCallback(() => {
    if (typeof window === 'undefined') return orientationInfo

    const width = window.innerWidth
    const height = window.innerHeight
    const basicOrientation: OrientationType = height > width ? 'portrait' : 'landscape'
    
    let angle: OrientationAngle = 0
    let isPortraitPrimary = false
    let isPortraitSecondary = false
    let isLandscapePrimary = false
    let isLandscapeSecondary = false

    // Try to get detailed orientation from Screen Orientation API
    if ('orientation' in screen) {
      const screenOrientation = (screen as any).orientation
      const orientationType = screenOrientation.type || screenOrientation
      angle = screenOrientation.angle || 0

      switch (orientationType) {
        case 'portrait-primary':
          isPortraitPrimary = true
          break
        case 'portrait-secondary':
          isPortraitSecondary = true
          break
        case 'landscape-primary':
          isLandscapePrimary = true
          break
        case 'landscape-secondary':
          isLandscapeSecondary = true
          break
        default:
          // Fallback based on basic orientation
          if (basicOrientation === 'portrait') {
            isPortraitPrimary = true
          } else {
            isLandscapePrimary = true
          }
      }
    } else {
      // Fallback for browsers without Screen Orientation API
      if (basicOrientation === 'portrait') {
        isPortraitPrimary = true
      } else {
        isLandscapePrimary = true
      }
    }

    return {
      orientation: basicOrientation,
      angle,
      isPortrait: basicOrientation === 'portrait',
      isLandscape: basicOrientation === 'landscape',
      isPortraitPrimary,
      isPortraitSecondary,
      isLandscapePrimary,
      isLandscapeSecondary,
      width,
      height,
      orientationLockSupported: 'orientation' in screen && 'lock' in (screen as any).orientation
    }
  }, [orientationInfo])

  // Lock orientation function
  const lockOrientation = useCallback(async (lockType: OrientationLockType) => {
    if (typeof window === 'undefined' || !('orientation' in screen)) {
      throw new Error('Screen Orientation API not supported')
    }

    const screenOrientation = (screen as any).orientation
    if (!screenOrientation.lock) {
      throw new Error('Orientation lock not supported')
    }

    try {
      await screenOrientation.lock(lockType)
    } catch (error) {
      console.warn('Failed to lock orientation:', error)
      throw error
    }
  }, [])

  // Unlock orientation function
  const unlockOrientation = useCallback(() => {
    if (typeof window === 'undefined' || !('orientation' in screen)) {
      console.warn('Screen Orientation API not supported')
      return
    }

    const screenOrientation = (screen as any).orientation
    if (screenOrientation.unlock) {
      screenOrientation.unlock()
    }
  }, [])

  // Handle orientation changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOrientationChange = () => {
      const newInfo = getOrientationDetails()
      
      setOrientationInfo(prevInfo => ({
        ...newInfo,
        hasChanged: newInfo.orientation !== prevInfo.orientation,
        previousOrientation: prevInfo.orientation,
        lockOrientation: prevInfo.orientationLockSupported ? lockOrientation : undefined,
        unlockOrientation: prevInfo.orientationLockSupported ? unlockOrientation : undefined
      }))
    }

    // Listen for orientation change events
    const events = ['orientationchange', 'resize']
    events.forEach(event => {
      window.addEventListener(event, handleOrientationChange)
    })

    // Listen for Screen Orientation API events
    if ('orientation' in screen) {
      const screenOrientation = (screen as any).orientation
      if (screenOrientation.addEventListener) {
        screenOrientation.addEventListener('change', handleOrientationChange)
      }
    }

    // Initial setup
    handleOrientationChange()

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleOrientationChange)
      })

      if ('orientation' in screen) {
        const screenOrientation = (screen as any).orientation
        if (screenOrientation.removeEventListener) {
          screenOrientation.removeEventListener('change', handleOrientationChange)
        }
      }
    }
  }, [getOrientationDetails, lockOrientation, unlockOrientation])

  return {
    ...orientationInfo,
    lockOrientation: orientationInfo.orientationLockSupported ? lockOrientation : undefined,
    unlockOrientation: orientationInfo.orientationLockSupported ? unlockOrientation : undefined
  }
}

/**
 * Simple hook for basic orientation detection
 */
export function useOrientation(): OrientationType {
  const { orientation } = useScreenOrientation()
  return orientation
}

/**
 * Hook for portrait orientation detection
 */
export function useIsPortrait(): boolean {
  const { isPortrait } = useScreenOrientation()
  return isPortrait
}

/**
 * Hook for landscape orientation detection
 */
export function useIsLandscape(): boolean {
  const { isLandscape } = useScreenOrientation()
  return isLandscape
}
