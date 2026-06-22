/**
 * Configuration for enhanced sidebar behavior
 */

export const SIDEBAR_CONFIG = {
  // Auto-hide behavior
  AUTO_HIDE_DELAY: 2000, // ms to wait before auto-hiding
  AUTO_HIDE_THRESHOLD: 100, // px scrolled to trigger auto-hide
  
  // Animation duration
  ANIMATION_DURATION: 300, // ms for collapse/expand animations
  
  // Breakpoints
  MOBILE_BREAKPOINT: 768, // px
  COLLAPSE_BREAKPOINT: 1024, // px
  
  // Scroll behavior
  SCROLL_SENSITIVITY: 10, // minimum scroll change to detect direction
  
  // States
  STATES: {
    EXPANDED: 'expanded',
    COLLAPSED: 'collapsed',
    AUTO_HIDDEN: 'auto-hidden'
  } as const,
  
  // Storage
  STORAGE_KEY: 'sidebar-state',
  
  // Default state
  DEFAULT_STATE: {
    desktop: 'expanded' as const,
    mobile: 'collapsed' as const
  } as const,
};

export default SIDEBAR_CONFIG;
