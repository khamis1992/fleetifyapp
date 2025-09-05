import React, { createContext, useContext, useEffect, useState } from 'react'
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple'

export interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  contrast: 'normal' | 'high' | 'extra-high'
  reduceMotion: boolean
  screenReader: boolean
  colorBlindness: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
  touchTargetSize: 'normal' | 'large' | 'extra-large'
  focusIndicator: 'normal' | 'enhanced'
  soundEnabled: boolean
  hapticFeedback: boolean
  keyboardNavigation: boolean
}

interface AccessibilityContextType {
  settings: AccessibilitySettings
  updateSettings: (settings: Partial<AccessibilitySettings>) => void
  isHighContrast: boolean
  isLargeText: boolean
  isTouchOptimized: boolean
  isMotionReduced: boolean
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 'medium',
  contrast: 'normal',
  reduceMotion: false,
  screenReader: false,
  colorBlindness: 'none',
  touchTargetSize: 'normal',
  focusIndicator: 'normal',
  soundEnabled: true,
  hapticFeedback: true,
  keyboardNavigation: true
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const { isMobile } = useSimpleBreakpoint()
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS
    
    const saved = localStorage.getItem('accessibility-settings')
    const parsed = saved ? JSON.parse(saved) : {}
    
    // Auto-detect system preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
    const prefersLargeText = window.matchMedia('(prefers-font-size: large)').matches
    
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      reduceMotion: parsed.reduceMotion ?? prefersReducedMotion,
      contrast: parsed.contrast ?? (prefersHighContrast ? 'high' : 'normal'),
      fontSize: parsed.fontSize ?? (prefersLargeText ? 'large' : 'medium'),
      touchTargetSize: parsed.touchTargetSize ?? (isMobile ? 'large' : 'normal')
    }
  })

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      localStorage.setItem('accessibility-settings', JSON.stringify(updated))
      return updated
    })
  }

  // Apply CSS classes based on settings
  useEffect(() => {
    const root = document.documentElement
    
    // Font size
    root.classList.remove('text-small', 'text-medium', 'text-large', 'text-extra-large')
    root.classList.add(`text-${settings.fontSize}`)
    
    // Contrast
    root.classList.remove('contrast-normal', 'contrast-high', 'contrast-extra-high')
    root.classList.add(`contrast-${settings.contrast}`)
    
    // Motion
    if (settings.reduceMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }
    
    // Touch targets
    root.classList.remove('touch-normal', 'touch-large', 'touch-extra-large')
    root.classList.add(`touch-${settings.touchTargetSize}`)
    
    // Focus indicator
    root.classList.remove('focus-normal', 'focus-enhanced')
    root.classList.add(`focus-${settings.focusIndicator}`)
    
    // Color blindness filters
    root.classList.remove('cb-protanopia', 'cb-deuteranopia', 'cb-tritanopia')
    if (settings.colorBlindness !== 'none') {
      root.classList.add(`cb-${settings.colorBlindness}`)
    }
    
    // Screen reader optimization
    if (settings.screenReader) {
      root.classList.add('screen-reader-optimized')
    } else {
      root.classList.remove('screen-reader-optimized')
    }
    
  }, [settings])

  const value: AccessibilityContextType = {
    settings,
    updateSettings,
    isHighContrast: settings.contrast !== 'normal',
    isLargeText: ['large', 'extra-large'].includes(settings.fontSize),
    isTouchOptimized: settings.touchTargetSize !== 'normal',
    isMotionReduced: settings.reduceMotion
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider')
  }
  return context
}

// Keyboard navigation hook
export function useKeyboardNavigation(
  onEnter?: () => void,
  onEscape?: () => void,
  onArrowUp?: () => void,
  onArrowDown?: () => void,
  onArrowLeft?: () => void,
  onArrowRight?: () => void
) {
  const { settings } = useAccessibility()
  
  useEffect(() => {
    if (!settings.keyboardNavigation) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          onEnter?.()
          break
        case 'Escape':
          onEscape?.()
          break
        case 'ArrowUp':
          e.preventDefault()
          onArrowUp?.()
          break
        case 'ArrowDown':
          e.preventDefault()
          onArrowDown?.()
          break
        case 'ArrowLeft':
          onArrowLeft?.()
          break
        case 'ArrowRight':
          onArrowRight?.()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [settings.keyboardNavigation, onEnter, onEscape, onArrowUp, onArrowDown, onArrowLeft, onArrowRight])
}

// Screen reader announcements
export function useScreenReader() {
  const { settings } = useAccessibility()
  
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!settings.screenReader) return
    
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  return { announce }
}

// Focus management
export function useFocusManagement() {
  const { settings } = useAccessibility()
  
  const setFocus = (element: HTMLElement | null) => {
    if (!element || !settings.keyboardNavigation) return
    
    element.focus()
    
    // Enhanced focus indicator
    if (settings.focusIndicator === 'enhanced') {
      element.classList.add('focus-enhanced-active')
      setTimeout(() => {
        element.classList.remove('focus-enhanced-active')
      }, 2000)
    }
  }

  const trapFocus = (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }

  return { setFocus, trapFocus }
}

// Sound and haptic feedback
export function useAccessibilityFeedback() {
  const { settings } = useAccessibility()
  const { isMobile } = useSimpleBreakpoint()

  const playSound = (type: 'success' | 'error' | 'warning' | 'info') => {
    if (!settings.soundEnabled) return

    // Use Web Audio API or simple audio elements
    const frequencies = {
      success: 800,
      error: 400,
      warning: 600,
      info: 700
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = frequencies[type]
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (e) {
      console.warn('Web Audio API not supported')
    }
  }

  const vibrate = (pattern: number | number[] = 50) => {
    if (!settings.hapticFeedback || !isMobile || !navigator.vibrate) return
    
    navigator.vibrate(pattern)
  }

  const provideFeedback = (type: 'success' | 'error' | 'warning' | 'info') => {
    playSound(type)
    
    const vibrationPatterns = {
      success: [50],
      error: [100, 50, 100],
      warning: [50, 50, 50],
      info: [30]
    }
    
    vibrate(vibrationPatterns[type])
  }

  return {
    playSound,
    vibrate,
    provideFeedback
  }
}