/**
 * Mobile Input Props Utility
 *
 * Provides optimized input attributes for mobile devices to trigger
 * appropriate keyboards and improve user experience.
 *
 * Usage:
 * ```tsx
 * <Input {...mobileInputProps.tel} placeholder="رقم الهاتف" />
 * <Input {...mobileInputProps.email} placeholder="البريد الإلكتروني" />
 * <Input {...mobileInputProps.numeric} placeholder="الكمية" />
 * ```
 */

export const mobileInputProps = {
  /**
   * For phone number inputs
   * Triggers numeric keypad with tel layout
   */
  tel: {
    type: 'tel' as const,
    inputMode: 'tel' as const,
    pattern: '[0-9]*',
    autoComplete: 'tel'
  },

  /**
   * For email address inputs
   * Triggers keyboard with @ and .com keys
   */
  email: {
    type: 'email' as const,
    inputMode: 'email' as const,
    autoComplete: 'email'
  },

  /**
   * For whole number inputs (quantity, count, etc.)
   * Triggers numeric keypad without decimal
   */
  numeric: {
    type: 'text' as const,
    inputMode: 'numeric' as const,
    pattern: '[0-9]*'
  },

  /**
   * For decimal number inputs (price, amount, etc.)
   * Triggers numeric keypad with decimal point
   */
  decimal: {
    type: 'text' as const,
    inputMode: 'decimal' as const
  },

  /**
   * For URL inputs
   * Triggers keyboard with .com and / keys
   */
  url: {
    type: 'url' as const,
    inputMode: 'url' as const,
    autoComplete: 'url'
  },

  /**
   * For search inputs
   * Triggers keyboard with search action button
   */
  search: {
    type: 'search' as const,
    inputMode: 'search' as const,
    autoComplete: 'off'
  },

  /**
   * For date inputs
   * Triggers native date picker on mobile
   */
  date: {
    type: 'date' as const,
    // No inputMode needed for date type
  },

  /**
   * For time inputs
   * Triggers native time picker on mobile
   */
  time: {
    type: 'time' as const,
    // No inputMode needed for time type
  }
} as const;

/**
 * Type definitions for better TypeScript support
 */
export type MobileInputType = keyof typeof mobileInputProps;

/**
 * Helper function to get mobile input props by type
 */
export function getMobileInputProps(type: MobileInputType) {
  return mobileInputProps[type];
}

/**
 * Custom hook for mobile input optimization (optional)
 */
export function useMobileInput(type: MobileInputType) {
  return {
    props: mobileInputProps[type],
    isMobile: typeof window !== 'undefined' && window.innerWidth < 768
  };
}
