/**
 * Floating Action Button (FAB)
 * A circular button positioned in the bottom-right corner
 * Features:
 * - Hides on scroll down, shows on scroll up
 * - Primary action on click
 * - Long-press (300ms) to show menu
 * - Haptic feedback on interactions
 * - Framer Motion animations
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronUp } from 'lucide-react';
import { useFAB } from '@/contexts/FABContext';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { FABMenu } from './FABMenu';

const LONG_PRESS_DURATION = 300; // milliseconds
const SCROLL_THRESHOLD = 10; // pixels
const SCROLL_THROTTLE = 100; // milliseconds

export function FloatingActionButton() {
  const { config } = useFAB();
  const { vibrate } = useHapticFeedback();

  const [isVisible, setIsVisible] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Handle scroll behavior - hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      // Clear previous timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Throttle scroll events
      scrollTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;

        const currentScrollY = window.scrollY;
        const scrollDifference = Math.abs(currentScrollY - lastScrollY);

        // Only update if scroll difference is significant
        if (scrollDifference < SCROLL_THRESHOLD) return;

        // Show FAB when scrolling up, hide when scrolling down
        // But always show when at the top of the page
        if (currentScrollY < 50) {
          setIsVisible(true);
        } else if (currentScrollY > lastScrollY) {
          // Scrolling down
          setIsVisible(false);
        } else {
          // Scrolling up
          setIsVisible(true);
        }

        setLastScrollY(currentScrollY);
      }, SCROLL_THROTTLE);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [lastScrollY]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Handle long-press start
  const handlePressStart = useCallback(() => {
    // Only start long-press if there are menu actions
    if (!config.menuActions || config.menuActions.length === 0) return;

    longPressTimerRef.current = setTimeout(() => {
      vibrate('medium');
      setIsMenuOpen(true);
    }, LONG_PRESS_DURATION);
  }, [config.menuActions, vibrate]);

  // Handle long-press end
  const handlePressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Handle click (not long-press)
  const handleClick = useCallback(() => {
    // If long-press was triggered, don't handle click
    if (isMenuOpen) return;

    // Clear the long-press timer
    handlePressEnd();

    // Trigger haptic feedback
    vibrate('light');

    // Execute primary action
    if (config.primaryAction) {
      config.primaryAction.onClick();
    }
  }, [config.primaryAction, vibrate, handlePressEnd, isMenuOpen]);

  // Close menu handler
  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  // Don't render if hidden by config
  if (config.hidden) return null;

  // Don't render on desktop (>= 768px)
  if (typeof window !== 'undefined' && window.innerWidth >= 768) return null;

  // Determine icon
  const Icon = config.primaryAction?.icon || Plus;

  // Animation variants
  const fabVariants = {
    visible: {
      scale: 1,
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
      },
    },
    hidden: {
      scale: 0.8,
      opacity: 0,
      y: 100,
      transition: {
        duration: 0.2,
      },
    },
  };

  const iconVariants = {
    normal: { rotate: 0 },
    pressed: { rotate: 45, scale: 0.9 },
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.button
            variants={fabVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onTouchCancel={handlePressEnd}
            onClick={handleClick}
            disabled={config.primaryAction?.disabled}
            className={cn(
              // Position
              'fixed z-50',
              config.position === 'bottom-left' && 'bottom-[calc(var(--mobile-bottom-nav-height)+var(--mobile-safe-bottom)+1rem)] left-4',
              config.position === 'bottom-center' && 'bottom-[calc(var(--mobile-bottom-nav-height)+var(--mobile-safe-bottom)+1rem)] left-1/2 -translate-x-1/2',
              config.position === 'bottom-right' && 'bottom-[calc(var(--mobile-bottom-nav-height)+var(--mobile-safe-bottom)+1rem)] right-4',
              !config.position && 'bottom-[calc(var(--mobile-bottom-nav-height)+var(--mobile-safe-bottom)+1rem)] right-4',

              // Size - 56x56px (WCAG compliant touch target)
              'h-14 w-14',

              // Shape
              'rounded-full',

              // Style - following button.tsx gradient-primary variant
              'bg-gradient-primary text-primary-foreground',
              'shadow-lg shadow-primary/25',

              // Interactions
              'active:scale-95',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200',

              // Focus
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',

              // Layout
              'flex items-center justify-center'
            )}
            aria-label={config.primaryAction?.label || 'Quick action'}
          >
            <motion.div
              variants={iconVariants}
              animate={isMenuOpen ? 'pressed' : 'normal'}
              transition={{ duration: 0.2 }}
            >
              <Icon className="h-6 w-6" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* FAB Menu */}
      <FABMenu
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        actions={config.menuActions || []}
      />
    </>
  );
}
