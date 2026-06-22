import { useState, useEffect } from 'react';

/**
 * Hook for listening to media queries
 * 
 * @param query - The media query to listen to
 * @returns - Boolean indicating if the media query matches
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
 * const isDesktop = useMediaQuery('(min-width: 1025px)');
 */
export const useMediaQuery = (query: string): boolean => {
  // Prevent server-side rendering errors
  if (typeof window === 'undefined') {
    return false;
  }

  const [matches, setMatches] = useState<boolean>(() => {
    // Initialize with current state
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    // Create media query list
    const mediaQueryList = window.matchMedia(query);
    
    // Set initial state
    setMatches(mediaQueryList.matches);
    
    // Create event listener function
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Add event listener
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQueryList.addListener(handleChange);
    }
    
    // Clean up
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, [query]);
  
  return matches;
};

/**
 * Hook for determining if the current device is mobile
 * 
 * @returns - Boolean indicating if the current device is mobile
 * 
 * @example
 * const isMobile = useIsMobile();
 */
export const useIsMobile = (): boolean => {
  return useMediaQuery('(max-width: 768px)');
};

/**
 * Hook for determining if the current device is tablet
 * 
 * @returns - Boolean indicating if the current device is tablet
 * 
 * @example
 * const isTablet = useIsTablet();
 */
export const useIsTablet = (): boolean => {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
};

/**
 * Hook for determining if the current device is desktop
 * 
 * @returns - Boolean indicating if the current device is desktop
 * 
 * @example
 * const isDesktop = useIsDesktop();
 */
export const useIsDesktop = (): boolean => {
  return useMediaQuery('(min-width: 1025px)');
};

/**
 * Hook for getting the current breakpoint
 * 
 * @returns - String indicating the current breakpoint
 * 
 * @example
 * const breakpoint = useBreakpoint();
 * // returns 'mobile', 'tablet', or 'desktop'
 */
export const useBreakpoint = (): 'mobile' | 'tablet' | 'desktop' => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
};

export default useMediaQuery;
