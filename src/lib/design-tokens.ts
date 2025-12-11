/**
 * Design Tokens for FleetifyApp
 * Centralized design system values for consistent UI
 * Based on Tailwind CSS with custom extensions
 */

// ========== Color Tokens ==========
export const colors = {
  // Primary - Coral
  primary: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#e85a4f', // Main coral
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Neutral
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    150: '#f0f0f0', // Custom
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Semantic Colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Status Colors (for contracts, vehicles, etc.)
  status: {
    active: '#22c55e',
    pending: '#f59e0b',
    expired: '#ef4444',
    cancelled: '#6b7280',
    available: '#22c55e',
    rented: '#e85a4f',
    maintenance: '#f59e0b',
    reserved: '#3b82f6',
  },
} as const;

// ========== Spacing Tokens ==========
export const spacing = {
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
} as const;

// ========== Typography Tokens ==========
export const typography = {
  fontFamily: {
    sans: ['Inter', 'Noto Sans Arabic', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

// ========== Border Radius Tokens ==========
export const borderRadius = {
  none: '0',
  sm: '0.25rem',     // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.5rem',      // 8px
  lg: '0.75rem',     // 12px
  xl: '1rem',        // 16px
  '2xl': '1.25rem',  // 20px
  '3xl': '1.5rem',   // 24px
  full: '9999px',
} as const;

// ========== Shadow Tokens ==========
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

// ========== Animation Tokens ==========
export const animations = {
  duration: {
    fast: '150ms',
    DEFAULT: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  
  easing: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// ========== Component-Specific Tokens ==========
export const components = {
  // Card
  card: {
    padding: spacing[4],
    paddingLg: spacing[6],
    borderRadius: borderRadius.xl,
    shadow: shadows.sm,
    shadowHover: shadows.md,
    background: 'white',
    border: '1px solid',
    borderColor: colors.neutral[200],
  },
  
  // Button
  button: {
    height: {
      sm: '2rem',      // 32px
      DEFAULT: '2.5rem', // 40px
      lg: '2.75rem',   // 44px - touch target
    },
    paddingX: {
      sm: spacing[3],
      DEFAULT: spacing[4],
      lg: spacing[6],
    },
    borderRadius: borderRadius.lg,
    fontWeight: typography.fontWeight.medium,
  },
  
  // Input
  input: {
    height: '2.5rem', // 40px
    paddingX: spacing[3],
    borderRadius: borderRadius.md,
    borderColor: colors.neutral[300],
    focusRing: `0 0 0 2px ${colors.primary[500]}20`,
  },
  
  // Sidebar
  sidebar: {
    width: '16rem',      // 256px
    widthCollapsed: '4rem', // 64px
    itemHeight: '2.5rem', // 40px
    itemPadding: spacing[3],
  },
  
  // Modal/Dialog
  modal: {
    padding: spacing[6],
    borderRadius: borderRadius['2xl'],
    maxWidth: {
      sm: '24rem',
      DEFAULT: '32rem',
      lg: '42rem',
      xl: '56rem',
    },
  },
  
  // Table
  table: {
    headerHeight: '3rem',
    rowHeight: '3.5rem',
    cellPadding: spacing[4],
  },
  
  // Badge
  badge: {
    paddingX: spacing[2],
    paddingY: spacing[0.5],
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.xs[0],
  },
} as const;

// ========== Breakpoints ==========
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ========== Z-Index Scale ==========
export const zIndex = {
  dropdown: 50,
  sticky: 100,
  fixed: 200,
  modalBackdrop: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
} as const;

// ========== Utility Functions ==========

/**
 * Get status color based on status string
 */
export const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    active: colors.status.active,
    pending: colors.status.pending,
    expired: colors.status.expired,
    cancelled: colors.status.cancelled,
    available: colors.status.available,
    rented: colors.status.rented,
    maintenance: colors.status.maintenance,
    reserved: colors.status.reserved,
  };
  return statusMap[status.toLowerCase()] || colors.neutral[500];
};

/**
 * Get status badge classes
 */
export const getStatusBadgeClasses = (status: string): string => {
  const statusClasses: Record<string, string> = {
    active: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    expired: 'bg-red-100 text-red-800 border-red-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    available: 'bg-green-100 text-green-800 border-green-200',
    rented: 'bg-coral-100 text-coral-800 border-coral-200',
    maintenance: 'bg-amber-100 text-amber-800 border-amber-200',
    reserved: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return statusClasses[status.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
};

/**
 * Arabic status labels
 */
export const statusLabels: Record<string, string> = {
  active: 'نشط',
  pending: 'معلق',
  expired: 'منتهي',
  cancelled: 'ملغي',
  available: 'متاح',
  rented: 'مؤجر',
  maintenance: 'صيانة',
  reserved: 'محجوز',
  reserved_employee: 'محجوزة لموظف',
  completed: 'مكتمل',
  draft: 'مسودة',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

export default {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  animations,
  components,
  breakpoints,
  zIndex,
  getStatusColor,
  getStatusBadgeClasses,
  statusLabels,
};

