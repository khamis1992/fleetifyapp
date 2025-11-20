import React, { useRef, useEffect, useCallback, useState } from 'react';
import { logger } from '@/lib/logger';

interface TouchConfig {
  enableHapticFeedback: boolean;
  enableRippleEffect: boolean;
  enableTouchOptimization: boolean;
  minTouchTargetSize: number; // pixels
  maxTapDelay: number; // milliseconds
  enableGestureRecognition: boolean;
  enableScrollOptimization: boolean;
  enableDoubleTapZoom: boolean;
  enablePinchZoom: boolean;
  enableSwipeNavigation: boolean;
  enableLongPress: boolean;
  longPressDelay: number; // milliseconds
  doubleTapDelay: number; // milliseconds
  swipeThreshold: number; // pixels
  pinchThreshold: number; // scale factor
}

interface TouchPoint {
  identifier: number;
  clientX: number;
  clientY: number;
  timestamp: number;
  force?: number;
}

interface GestureState {
  touches: TouchPoint[];
  startTime: number;
  startDistance: number;
  startScale: number;
  startAngle: number;
  lastMoveTime: number;
  lastTapTime: number;
  tapCount: number;
  isLongPress: boolean;
  isSwiping: boolean;
  isPinching: boolean;
  initialTouch: TouchPoint | null;
}

interface TouchEventHandlers {
  onTap?: (event: TouchEvent, point: TouchPoint) => void;
  onDoubleTap?: (event: TouchEvent, point: TouchPoint) => void;
  onLongPress?: (event: TouchEvent, point: TouchPoint) => void;
  onSwipe?: (event: TouchEvent, direction: 'up' | 'down' | 'left' | 'right', velocity: number) => void;
  onPinch?: (event: TouchEvent, scale: number, center: { x: number; y: number }) => void;
  onRotate?: (event: TouchEvent, angle: number) => void;
  onTouchStart?: (event: TouchEvent) => void;
  onTouchMove?: (event: TouchEvent) => void;
  onTouchEnd?: (event: TouchEvent) => void;
}

interface TouchOptimizationProps {
  children: React.ReactNode;
  config?: Partial<TouchConfig>;
  handlers?: TouchEventHandlers;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export const TouchOptimization: React.FC<TouchOptimizationProps> = ({
  children,
  config = {},
  handlers = {},
  className = '',
  style = {},
  disabled = false
}) => {
  const elementRef = useRef<HTMLElement>(null);
  const gestureStateRef = useRef<GestureState>({
    touches: [],
    startTime: 0,
    startDistance: 0,
    startScale: 1,
    startAngle: 0,
    lastMoveTime: 0,
    lastTapTime: 0,
    tapCount: 0,
    isLongPress: false,
    isSwiping: false,
    isPinching: false,
    initialTouch: null
  });

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const doubleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  const touchConfig: TouchConfig = {
    enableHapticFeedback: true,
    enableRippleEffect: true,
    enableTouchOptimization: true,
    minTouchTargetSize: 44,
    maxTapDelay: 150,
    enableGestureRecognition: true,
    enableScrollOptimization: true,
    enableDoubleTapZoom: true,
    enablePinchZoom: true,
    enableSwipeNavigation: true,
    enableLongPress: true,
    longPressDelay: 500,
    doubleTapDelay: 300,
    swipeThreshold: 50,
    pinchThreshold: 0.1,
    ...config
  };

  // Haptic feedback
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
    if (!touchConfig.enableHapticFeedback || disabled) return;

    try {
      if ('vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [40],
          success: [10, 50, 10],
          warning: [20, 30, 20],
          error: [50, 30, 50, 30, 50]
        };
        navigator.vibrate(patterns[type]);
      }

      // Use device-specific haptic APIs if available
      if ((window as any).Haptics) {
        (window as any).Haptics.impact({
          style: type === 'light' ? 'light' : type === 'medium' ? 'medium' : 'heavy'
        });
      }
    } catch (error) {
      // Haptics not available, silently fail
    }
  }, [touchConfig.enableHapticFeedback, disabled]);

  // Ripple effect
  const createRipple = useCallback((event: TouchEvent, element: HTMLElement) => {
    if (!touchConfig.enableRippleEffect || disabled) return;

    const touch = event.touches[0];
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('div');
    const size = Math.max(rect.width, rect.height);
    const x = touch.clientX - rect.left - size / 2;
    const y = touch.clientY - rect.top - size / 2;

    ripple.className = 'touch-ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    // Add styles if not already present
    if (!document.querySelector('#touch-ripple-styles')) {
      const style = document.createElement('style');
      style.id = 'touch-ripple-styles';
      style.textContent = `
        .touch-ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.6);
          transform: scale(0);
          animation: ripple-animation 0.6s ease-out;
          pointer-events: none;
        }
        @keyframes ripple-animation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        .touch-optimized {
          position: relative;
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
      `;
      document.head.appendChild(style);
    }

    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, [touchConfig.enableRippleEffect, disabled]);

  // Calculate distance between two points
  const calculateDistance = (touch1: TouchPoint, touch2: TouchPoint): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate angle between two points
  const calculateAngle = (touch1: TouchPoint, touch2: TouchPoint): number => {
    return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX);
  };

  // Determine swipe direction
  const getSwipeDirection = (startX: number, startY: number, endX: number, endY: number): 'up' | 'down' | 'left' | 'right' => {
    const dx = endX - startX;
    const dy = endY - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  };

  // Touch event handlers
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (disabled) return;

    const gestureState = gestureStateRef.current;
    const currentTime = Date.now();

    // Update touch points
    gestureState.touches = Array.from(event.touches).map(touch => ({
      identifier: touch.identifier,
      clientX: touch.clientX,
      clientY: touch.clientY,
      timestamp: currentTime,
      force: touch.force
    }));

    gestureState.startTime = currentTime;

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      gestureState.initialTouch = {
        identifier: touch.identifier,
        clientX: touch.clientX,
        clientY: touch.clientY,
        timestamp: currentTime
      };

      // Start long press timer
      if (touchConfig.enableLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          gestureState.isLongPress = true;
          if (handlers.onLongPress) {
            handlers.onLongPress(event, gestureState.initialTouch!);
          }
          triggerHapticFeedback('medium');
        }, touchConfig.longPressDelay);
      }

      // Handle double tap
      if (touchConfig.enableDoubleTapZoom) {
        const timeSinceLastTap = currentTime - gestureState.lastTapTime;
        if (timeSinceLastTap < touchConfig.doubleTapDelay) {
          gestureState.tapCount++;
          if (gestureState.tapCount === 2) {
            // Double tap detected
            if (handlers.onDoubleTap) {
              handlers.onDoubleTap(event, gestureState.initialTouch!);
            }
            triggerHapticFeedback('success');
            gestureState.tapCount = 0;
          }
        } else {
          gestureState.tapCount = 1;
        }
        gestureState.lastTapTime = currentTime;
      }
    } else if (event.touches.length === 2) {
      // Initialize pinch/rotate gesture
      const touch1 = gestureState.touches[0];
      const touch2 = gestureState.touches[1];
      gestureState.startDistance = calculateDistance(touch1, touch2);
      gestureState.startAngle = calculateAngle(touch1, touch2);
      gestureState.isPinching = true;
    }

    setIsPressed(true);
    createRipple(event, elementRef.current!);

    if (handlers.onTouchStart) {
      handlers.onTouchStart(event);
    }
  }, [disabled, handlers, touchConfig, triggerHapticFeedback, createRipple]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (disabled) return;

    const gestureState = gestureStateRef.current;
    const currentTime = Date.now();

    // Update touch points
    gestureState.touches = Array.from(event.touches).map(touch => ({
      identifier: touch.identifier,
      clientX: touch.clientX,
      clientY: touch.clientY,
      timestamp: currentTime,
      force: touch.force
    }));

    // Cancel long press if moved
    if (gestureState.isLongPress || longPressTimerRef.current) {
      const initialTouch = gestureState.initialTouch;
      if (initialTouch && event.touches.length === 1) {
        const currentTouch = event.touches[0];
        const distance = calculateDistance(initialTouch, {
          identifier: currentTouch.identifier,
          clientX: currentTouch.clientX,
          clientY: currentTouch.clientY,
          timestamp: currentTime
        });

        if (distance > 10) { // Moved too far, cancel long press
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
          gestureState.isLongPress = false;
        }
      }
    }

    // Handle pinch/zoom gesture
    if (event.touches.length === 2 && gestureState.isPinching && touchConfig.enablePinchZoom) {
      const touch1 = gestureState.touches[0];
      const touch2 = gestureState.touches[1];
      const currentDistance = calculateDistance(touch1, touch2);
      const scale = currentDistance / gestureState.startDistance;
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };

      if (Math.abs(scale - 1) > touchConfig.pinchThreshold) {
        if (handlers.onPinch) {
          handlers.onPinch(event, scale, center);
        }
      }

      // Handle rotation
      const currentAngle = calculateAngle(touch1, touch2);
      const angleChange = currentAngle - gestureState.startAngle;
      if (Math.abs(angleChange) > 0.1 && handlers.onRotate) {
        handlers.onRotate(event, angleChange);
      }
    }

    // Handle swipe gesture
    if (event.touches.length === 1 && !gestureState.isSwiping && touchConfig.enableSwipeNavigation) {
      const initialTouch = gestureState.initialTouch;
      const currentTouch = event.touches[0];

      if (initialTouch) {
        const distance = calculateDistance(initialTouch, {
          identifier: currentTouch.identifier,
          clientX: currentTouch.clientX,
          clientY: currentTouch.clientY,
          timestamp: currentTime
        });

        if (distance > 20) { // Minimum distance before considering it a swipe
          gestureState.isSwiping = true;
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      }
    }

    if (handlers.onTouchMove) {
      handlers.onTouchMove(event);
    }
  }, [disabled, handlers, touchConfig]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (disabled) return;

    const gestureState = gestureStateRef.current;
    const currentTime = Date.now();

    // Clear timers
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Handle tap
    if (event.touches.length === 0 && !gestureState.isLongPress && !gestureState.isSwiping) {
      const initialTouch = gestureState.initialTouch;
      if (initialTouch && handlers.onTap) {
        handlers.onTap(event, initialTouch);
        triggerHapticFeedback('light');
      }
    }

    // Handle swipe
    if (event.touches.length === 0 && gestureState.isSwiping && gestureState.initialTouch) {
      const endTime = Date.now();
      const duration = endTime - gestureState.startTime;
      const initialTouch = gestureState.initialTouch;

      // Get last known position (use changedTouches)
      if (event.changedTouches.length > 0) {
        const lastTouch = event.changedTouches[0];
        const distance = calculateDistance(initialTouch, {
          identifier: lastTouch.identifier,
          clientX: lastTouch.clientX,
          clientY: lastTouch.clientY,
          timestamp: currentTime
        });

        if (distance > touchConfig.swipeThreshold && duration < 500) {
          const direction = getSwipeDirection(
            initialTouch.clientX,
            initialTouch.clientY,
            lastTouch.clientX,
            lastTouch.clientY
          );
          const velocity = distance / duration;

          if (handlers.onSwipe) {
            handlers.onSwipe(event, direction, velocity);
          }
          triggerHapticFeedback('medium');
        }
      }
    }

    // Reset gesture state
    gestureState.touches = [];
    gestureState.isLongPress = false;
    gestureState.isSwiping = false;
    gestureState.isPinching = false;
    gestureState.initialTouch = null;

    setIsPressed(false);

    if (handlers.onTouchEnd) {
      handlers.onTouchEnd(event);
    }
  }, [disabled, handlers, touchConfig, triggerHapticFeedback]);

  // Optimize touch targets
  const optimizeTouchTargets = useCallback(() => {
    if (!touchConfig.enableTouchOptimization) return;

    const element = elementRef.current;
    if (!element) return;

    // Check minimum touch target size
    const rect = element.getBoundingClientRect();
    const minSize = touchConfig.minTouchTargetSize;

    if (rect.width < minSize || rect.height < minSize) {
      logger.warn(`Touch target too small: ${rect.width}x${rect.height}px (minimum: ${minSize}px)`);
    }

    // Add touch optimization classes
    element.classList.add('touch-optimized');
  }, [touchConfig]);

  // Setup event listeners and optimizations
  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) return;

    // Add touch event listeners with passive listeners for better performance
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Optimize touch targets
    optimizeTouchTargets();

    // Prevent default touch behaviors if configured
    if (touchConfig.enableScrollOptimization) {
      element.addEventListener('touchmove', (e) => {
        if (gestureStateRef.current.isPinching) {
          e.preventDefault();
        }
      }, { passive: false });
    }

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (doubleTapTimerRef.current) {
        clearTimeout(doubleTapTimerRef.current);
      }
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd, optimizeTouchTargets, touchConfig]);

  return (
    <div
      ref={elementRef}
      className={`touch-optimization-container ${isPressed ? 'touch-pressed' : ''} ${className}`}
      style={{
        touchAction: 'manipulation',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        ...style
      }}
    >
      {children}
    </div>
  );
};

// Hook for easy integration
export const useTouchOptimization = (config?: Partial<TouchConfig>) => {
  const [touchState, setTouchState] = useState({
    isPressed: false,
    isLongPressing: false,
    isSwiping: false,
    isPinching: false
  });

  const optimizedConfig = {
    enableHapticFeedback: true,
    enableRippleEffect: true,
    enableTouchOptimization: true,
    minTouchTargetSize: 44,
    maxTapDelay: 150,
    enableGestureRecognition: true,
    enableScrollOptimization: true,
    enableDoubleTapZoom: true,
    enablePinchZoom: true,
    enableSwipeNavigation: true,
    enableLongPress: true,
    longPressDelay: 500,
    doubleTapDelay: 300,
    swipeThreshold: 50,
    pinchThreshold: 0.1,
    ...config
  };

  return {
    touchState,
    config: optimizedConfig,
    triggerHapticFeedback: (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
      try {
        if ('vibrate' in navigator) {
          const patterns = {
            light: [10],
            medium: [20],
            heavy: [40],
            success: [10, 50, 10],
            warning: [20, 30, 20],
            error: [50, 30, 50, 30, 50]
          };
          navigator.vibrate(patterns[type]);
        }
      } catch (error) {
        // Haptics not available
      }
    }
  };
};

// Predefined gesture configurations
export const GESTURE_CONFIGS = {
  button: {
    enableHapticFeedback: true,
    enableRippleEffect: true,
    enableTouchOptimization: true,
    minTouchTargetSize: 44,
    enableGestureRecognition: false,
    enableLongPress: false
  },
  list: {
    enableHapticFeedback: true,
    enableRippleEffect: true,
    enableTouchOptimization: true,
    minTouchTargetSize: 44,
    enableSwipeNavigation: true,
    enableLongPress: true
  },
  map: {
    enableHapticFeedback: false,
    enableRippleEffect: false,
    enableTouchOptimization: true,
    enablePinchZoom: true,
    enableDoubleTapZoom: true,
    enableSwipeNavigation: true
  },
  carousel: {
    enableHapticFeedback: true,
    enableRippleEffect: false,
    enableTouchOptimization: true,
    enableSwipeNavigation: true,
    swipeThreshold: 30
  }
};