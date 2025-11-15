/**
 * Navigation Optimization Utilities
 * 
 * Provides utilities to prevent hard refresh issues during navigation
 * by managing component state and preventing unnecessary re-renders.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Track navigation history to prevent duplicate renders
const navigationHistory = new Map<string, number>();

/**
 * Hook to prevent component from unmounting/remounting unnecessarily
 * Helps maintain component state during navigation
 */
export const useStableNavigation = () => {
  const location = useLocation();
  const previousLocation = useRef(location.pathname);
  const isNavigating = useRef(false);

  useEffect(() => {
    // Track navigation
    if (previousLocation.current !== location.pathname) {
      isNavigating.current = true;
      
      // Update navigation history
      const visitCount = (navigationHistory.get(location.pathname) || 0) + 1;
      navigationHistory.set(location.pathname, visitCount);
      
      // Reset flag after navigation is complete
      const timeout = setTimeout(() => {
        isNavigating.current = false;
        previousLocation.current = location.pathname;
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [location.pathname]);

  return {
    isNavigating: isNavigating.current,
    currentPath: location.pathname,
    previousPath: previousLocation.current,
    visitCount: navigationHistory.get(location.pathname) || 0
  };
};

/**
 * Hook to preserve scroll position during navigation
 */
export const useScrollRestoration = (enabled = true) => {
  const location = useLocation();
  const scrollPositions = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!enabled) return;

    // Save scroll position before navigation
    const saveScrollPosition = () => {
      scrollPositions.current.set(location.pathname, window.scrollY);
    };

    // Restore scroll position after navigation
    const savedPosition = scrollPositions.current.get(location.pathname);
    if (savedPosition !== undefined) {
      window.scrollTo(0, savedPosition);
    } else {
      window.scrollTo(0, 0);
    }

    // Listen for scroll changes
    window.addEventListener('beforeunload', saveScrollPosition);
    
    return () => {
      window.removeEventListener('beforeunload', saveScrollPosition);
    };
  }, [location.pathname, enabled]);
};

/**
 * Hook to prevent flash of loading states during navigation
 */
export const useNavigationTransition = () => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Start transition
    setIsTransitioning(true);

    // Clear previous timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    // End transition after a short delay
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 150);

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [location.pathname]);

  return { isTransitioning };
};

/**
 * Clear navigation history (useful for testing)
 */
export const clearNavigationHistory = () => {
  navigationHistory.clear();
};

/**
 * Get navigation statistics (useful for debugging)
 */
export const getNavigationStats = () => {
  return {
    totalPaths: navigationHistory.size,
    paths: Array.from(navigationHistory.entries()).map(([path, count]) => ({
      path,
      visitCount: count
    }))
  };
};

// Fix for React import
import React from 'react';
