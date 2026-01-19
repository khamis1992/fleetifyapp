/**
 * Mobile Spacing Utilities
 * 
 * Provides responsive spacing scales optimized for mobile devices.
 * Ensures proper visual hierarchy and comfortable interaction.
 * 
 * Spacing Scale (in pixels):
 * xs: 4px
 * sm: 8px
 * md: 12px
 * lg: 16px
 * xl: 20px
 * 2xl: 24px
 * 3xl: 32px
 * 4xl: 40px
 */

import { useSimpleBreakpoint } from '../hooks/use-mobile-simple';

export const MOBILE_SPACING = {
  // Padding scale
  px: {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '32px',
  },

  // Container padding (horizontal)
  container: {
    mobile: '16px', // 1rem
    tablet: '24px', // 1.5rem
    desktop: '32px', // 2rem
  },

  // Gap/spacing between elements
  gap: {
    none: '0px',
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
  },

  // Touch target spacing (minimum 8px between targets)
  touch: {
    min: '8px',
    recommended: '12px',
    comfortable: '16px',
  },

  // Section spacing
  section: {
    mobile: '16px', // Between major sections
    tablet: '24px',
    desktop: '32px',
  },

  // Card padding
  card: {
    mobile: '12px', // Compact on small screens
    default: '16px',
    comfortable: '20px',
  },

  // Input padding
  input: {
    height: '48px', // 12px + 16px + 16px + 4px border
    paddingX: '16px',
    paddingY: '12px',
  },

  // Button padding
  button: {
    sm: {
      paddingX: '12px',
      paddingY: '8px',
    },
    md: {
      paddingX: '16px',
      paddingY: '12px',
    },
    lg: {
      paddingX: '20px',
      paddingY: '16px',
    },
  },

  // Header/Footer height
  navbar: {
    height: '56px', // Mobile bottom nav
    heightCollapsed: '44px',
  },

  // Modal/Sheet insets
  modal: {
    margin: '16px',
    padding: '20px',
  },
} as const;

/**
 * Tailwind class mappings for spacing
 */
export const SPACING_CLASSES = {
  // Padding utilities
  'px-xs': 'px-1',
  'px-sm': 'px-1',
  'px-md': 'px-2',
  'px-lg': 'px-3',
  'px-xl': 'px-4',
  'px-2xl': 'px-5',
  'px-3xl': 'px-6',
  'px-4xl': 'px-8',

  // Container padding
  'container-mobile': 'px-4',
  'container-tablet': 'px-6',
  'container-desktop': 'px-8',

  // Gap utilities
  'gap-none': 'gap-0',
  'gap-xs': 'gap-1',
  'gap-sm': 'gap-2',
  'gap-md': 'gap-3',
  'gap-lg': 'gap-4',
  'gap-xl': 'gap-5',
  'gap-2xl': 'gap-6',
  'gap-3xl': 'gap-8',

  // Vertical spacing (mb = margin bottom)
  'mb-xs': 'mb-1',
  'mb-sm': 'mb-2',
  'mb-md': 'mb-3',
  'mb-lg': 'mb-4',
  'mb-xl': 'mb-5',
  'mb-2xl': 'mb-6',

  // Section spacing
  'section-mobile': 'my-4',
  'section-tablet': 'my-6',
  'section-desktop': 'my-8',

  // Card spacing
  'card-mobile': 'p-3',
  'card-default': 'p-4',
  'card-comfortable': 'p-5',

  // Touch spacing
  'touch-min': 'gap-2',
  'touch-recommended': 'gap-3',
  'touch-comfortable': 'gap-4',
} as const;

/**
 * Hook to get responsive spacing values
 */
export function useResponsiveSpacing() {
  const { isMobile, isTablet, isDesktop } = useSimpleBreakpoint();

  return {
    // Container padding
    containerPadding: isMobile 
      ? MOBILE_SPACING.container.mobile 
      : isTablet 
      ? MOBILE_SPACING.container.tablet 
      : MOBILE_SPACING.container.desktop,

    // Section spacing
    sectionSpacing: isMobile
      ? MOBILE_SPACING.section.mobile
      : isTablet
      ? MOBILE_SPACING.section.tablet
      : MOBILE_SPACING.section.desktop,

    // Card padding
    cardPadding: isMobile
      ? MOBILE_SPACING.card.mobile
      : MOBILE_SPACING.card.default,

    // Gap between elements
    elementGap: isMobile
      ? MOBILE_SPACING.gap.md
      : MOBILE_SPACING.gap.lg,

    // Touch spacing
    touchSpacing: isMobile
      ? MOBILE_SPACING.touch.recommended
      : MOBILE_SPACING.touch.comfortable,

    isMobile,
    isTablet,
    isDesktop,
  };
}

/**
 * Get spacing value as string or number
 */
export function getSpacingValue(
  scale: keyof typeof MOBILE_SPACING,
  size: string,
  unit: 'px' | 'rem' = 'px'
): string {
  const spacing = MOBILE_SPACING[scale as keyof typeof MOBILE_SPACING] as any;
  const value = spacing?.[size];

  if (!value) {
    console.warn(`Unknown spacing scale: ${scale}.${size}`);
    return '0';
  }

  return value;
}

/**
 * Generate responsive spacing CSS
 */
export function getResponsiveSpacingCSS(device: 'mobile' | 'tablet' | 'desktop') {
  const config = {
    mobile: {
      padding: MOBILE_SPACING.container.mobile,
      gap: MOBILE_SPACING.gap.md,
      section: MOBILE_SPACING.section.mobile,
    },
    tablet: {
      padding: MOBILE_SPACING.container.tablet,
      gap: MOBILE_SPACING.gap.lg,
      section: MOBILE_SPACING.section.tablet,
    },
    desktop: {
      padding: MOBILE_SPACING.container.desktop,
      gap: MOBILE_SPACING.gap.lg,
      section: MOBILE_SPACING.section.desktop,
    },
  };

  return config[device];
}

/**
 * Common spacing patterns as presets
 */
export const SPACING_PRESETS = {
  // Full-width container with safe padding
  fullWidthContainer: {
    mobile: 'px-4 py-4',
    tablet: 'px-6 py-6',
    desktop: 'px-8 py-8',
  },

  // Centered container with max-width
  centeredContainer: {
    mobile: 'max-w-full px-4 mx-auto',
    tablet: 'max-w-2xl px-6 mx-auto',
    desktop: 'max-w-6xl px-8 mx-auto',
  },

  // Horizontal list spacing
  horizontalList: {
    mobile: 'flex gap-2',
    tablet: 'flex gap-3',
    desktop: 'flex gap-4',
  },

  // Vertical list spacing
  verticalList: {
    mobile: 'space-y-2',
    tablet: 'space-y-3',
    desktop: 'space-y-4',
  },

  // Form field spacing
  formField: {
    mobile: 'mb-3',
    tablet: 'mb-4',
    desktop: 'mb-5',
  },

  // Card grid spacing
  cardGrid: {
    mobile: 'grid gap-3',
    tablet: 'grid gap-4',
    desktop: 'grid gap-6',
  },

  // Modal/Sheet padding
  modal: {
    mobile: 'p-4',
    tablet: 'p-6',
    desktop: 'p-8',
  },

  // Section divider spacing
  sectionDivider: {
    mobile: 'my-4',
    tablet: 'my-6',
    desktop: 'my-8',
  },

  // Hero section padding
  heroSection: {
    mobile: 'py-12 px-4',
    tablet: 'py-16 px-6',
    desktop: 'py-24 px-8',
  },
} as const;

/**
 * Helper to validate spacing is sufficient
 */
export function validateSpacing(
  element: HTMLElement,
  minSpacing: number = 8
): {
  valid: boolean;
  message: string;
  adjacent: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
} {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const margin = {
    top: parseFloat(style.marginTop),
    right: parseFloat(style.marginRight),
    bottom: parseFloat(style.marginBottom),
    left: parseFloat(style.marginLeft),
  };

  const valid =
    margin.top >= minSpacing &&
    margin.right >= minSpacing &&
    margin.bottom >= minSpacing &&
    margin.left >= minSpacing;

  return {
    valid,
    message: valid
      ? `✓ Spacing valid: ${minSpacing}px minimum`
      : `✗ Spacing too tight: minimum ${minSpacing}px`,
    adjacent: margin,
  };
}
