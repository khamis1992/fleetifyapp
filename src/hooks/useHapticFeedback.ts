/**
 * Haptic Feedback Hook
 * Provides vibration feedback for mobile interactions
 */

import { useCallback, useEffect, useState } from 'react';
import type { HapticPattern, HapticConfig } from '@/types/mobile';

const DEFAULT_PATTERNS: HapticConfig['patterns'] = {
  light: [10],
  medium: [20],
  heavy: [30],
  success: [10, 50, 10],
  error: [50, 100, 50],
  warning: [20, 50, 20],
};

export function useHapticFeedback() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    // Check if Vibration API is supported
    const supported = 'vibrate' in navigator;
    setIsSupported(supported);

    // Load user preference from localStorage
    const stored = localStorage.getItem('haptic_feedback_enabled');
    if (stored !== null) {
      setIsEnabled(stored === 'true');
    }
  }, []);

  const vibrate = useCallback((pattern: HapticPattern) => {
    if (!isSupported || !isEnabled) return;

    const vibrationPattern = DEFAULT_PATTERNS[pattern];
    if (vibrationPattern) {
      try {
        navigator.vibrate(vibrationPattern);
      } catch (error) {
        console.error('Haptic feedback error:', error);
      }
    }
  }, [isSupported, isEnabled]);

  const toggle = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    localStorage.setItem('haptic_feedback_enabled', enabled.toString());
  }, []);

  return {
    /** Is haptic feedback supported on this device */
    isSupported,
    /** Is haptic feedback enabled by user */
    isEnabled,
    /** Trigger haptic feedback with pattern */
    vibrate,
    /** Toggle haptic feedback on/off */
    toggle,
  };
}
