/**
 * Mobile Form Helpers
 * Utilities for optimizing forms on mobile devices
 */

import type { MobileInputConfig } from '@/types/mobile';

/**
 * Get optimal input configuration for different field types
 */
export function getInputConfig(fieldType: string): MobileInputConfig {
  const configs: Record<string, MobileInputConfig> = {
    // Name fields
    name: {
      type: 'text',
      autoCapitalize: 'words',
      autoComplete: 'name',
      inputMode: 'text',
    },
    firstName: {
      type: 'text',
      autoCapitalize: 'words',
      autoComplete: 'given-name',
      inputMode: 'text',
    },
    lastName: {
      type: 'text',
      autoCapitalize: 'words',
      autoComplete: 'family-name',
      inputMode: 'text',
    },

    // Contact fields
    email: {
      type: 'email',
      autoCapitalize: 'none',
      autoComplete: 'email',
      inputMode: 'email',
    },
    tel: {
      type: 'tel',
      autoCapitalize: 'none',
      autoComplete: 'tel',
      inputMode: 'tel',
      pattern: '[0-9]*',
    },
    mobile: {
      type: 'tel',
      autoCapitalize: 'none',
      autoComplete: 'tel',
      inputMode: 'tel',
      pattern: '[0-9]*',
    },

    // Address fields
    address: {
      type: 'text',
      autoCapitalize: 'words',
      autoComplete: 'street-address',
      inputMode: 'text',
    },
    city: {
      type: 'text',
      autoCapitalize: 'words',
      autoComplete: 'address-level2',
      inputMode: 'text',
    },
    postalCode: {
      type: 'text',
      autoCapitalize: 'none',
      autoComplete: 'postal-code',
      inputMode: 'numeric',
      pattern: '[0-9]*',
    },

    // Numeric fields
    number: {
      type: 'numeric',
      autoCapitalize: 'none',
      inputMode: 'numeric',
      pattern: '[0-9]*',
    },
    amount: {
      type: 'decimal',
      autoCapitalize: 'none',
      inputMode: 'decimal',
    },
    price: {
      type: 'decimal',
      autoCapitalize: 'none',
      inputMode: 'decimal',
    },
    quantity: {
      type: 'numeric',
      autoCapitalize: 'none',
      inputMode: 'numeric',
      pattern: '[0-9]*',
    },

    // Date/Time fields
    date: {
      type: 'date',
      autoCapitalize: 'none',
    },
    time: {
      type: 'time',
      autoCapitalize: 'none',
    },

    // Search fields
    search: {
      type: 'search',
      autoCapitalize: 'none',
      autoComplete: 'off',
      inputMode: 'search',
    },

    // URL fields
    url: {
      type: 'url',
      autoCapitalize: 'none',
      autoComplete: 'url',
      inputMode: 'url',
    },
    website: {
      type: 'url',
      autoCapitalize: 'none',
      autoComplete: 'url',
      inputMode: 'url',
    },

    // ID fields (plate numbers, IDs, etc.)
    plateNumber: {
      type: 'text',
      autoCapitalize: 'characters',
      inputMode: 'text',
    },
    nationalId: {
      type: 'numeric',
      autoCapitalize: 'none',
      inputMode: 'numeric',
      pattern: '[0-9]*',
    },
    iqamaId: {
      type: 'numeric',
      autoCapitalize: 'none',
      inputMode: 'numeric',
      pattern: '[0-9]*',
    },

    // Default
    text: {
      type: 'text',
      autoCapitalize: 'sentences',
      inputMode: 'text',
    },
  };

  return configs[fieldType] || configs.text;
}

/**
 * Convert form to single-page layout for mobile
 */
export function shouldUseSinglePageLayout(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768; // md breakpoint
}

/**
 * Get optimal field height for mobile (WCAG AAA)
 */
export function getMobileFieldHeight(variant: 'default' | 'large' = 'default'): string {
  return variant === 'large' ? '52px' : '48px'; // 48px minimum for touch targets
}

/**
 * Check if native date picker should be used
 */
export function shouldUseNativeDatePicker(): boolean {
  if (typeof window === 'undefined') return false;

  // Use native picker on mobile devices
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isSmallScreen = window.innerWidth < 768;

  return isMobile || isSmallScreen;
}

/**
 * Format field value for display (handles RTL)
 */
export function formatFieldValue(value: string, type: string): string {
  if (!value) return '';

  switch (type) {
    case 'tel':
    case 'mobile':
      // Format phone numbers: 0501234567 → 050 123 4567
      return value.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');

    case 'nationalId':
    case 'iqamaId':
      // Format ID: 1234567890 → 1 234 567 890
      return value.replace(/(\d{1})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');

    case 'amount':
    case 'price':
      // Format currency
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'SAR',
      }).format(parseFloat(value));

    default:
      return value;
  }
}

/**
 * Validate field based on type
 */
export function validateField(value: string, type: string): { valid: boolean; error?: string } {
  if (!value) {
    return { valid: true }; // Empty is valid (use required attribute for required fields)
  }

  switch (type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value)
        ? { valid: true }
        : { valid: false, error: 'البريد الإلكتروني غير صحيح' };

    case 'tel':
    case 'mobile':
      const phoneRegex = /^(05|5)\d{8}$/;
      return phoneRegex.test(value.replace(/\s/g, ''))
        ? { valid: true }
        : { valid: false, error: 'رقم الجوال غير صحيح (يجب أن يبدأ بـ 05)' };

    case 'nationalId':
      return value.length === 10
        ? { valid: true }
        : { valid: false, error: 'رقم الهوية يجب أن يكون 10 أرقام' };

    case 'iqamaId':
      return value.length === 10 && value.startsWith('2')
        ? { valid: true }
        : { valid: false, error: 'رقم الإقامة يجب أن يبدأ بـ 2 ويكون 10 أرقام' };

    case 'amount':
    case 'price':
      const amount = parseFloat(value);
      return !isNaN(amount) && amount > 0
        ? { valid: true }
        : { valid: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };

    default:
      return { valid: true };
  }
}

/**
 * Auto-save form data to localStorage
 */
export function autoSaveForm(formId: string, data: Record<string, any>): void {
  try {
    const key = `form_draft_${formId}`;
    const draft = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (error) {
    console.error('Auto-save failed:', error);
  }
}

/**
 * Restore form data from localStorage
 */
export function restoreFormDraft(formId: string): Record<string, any> | null {
  try {
    const key = `form_draft_${formId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const draft = JSON.parse(stored);

    // Check if draft is not too old (24 hours)
    const age = Date.now() - draft.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }

    return draft.data;
  } catch (error) {
    console.error('Restore draft failed:', error);
    return null;
  }
}

/**
 * Clear form draft from localStorage
 */
export function clearFormDraft(formId: string): void {
  try {
    const key = `form_draft_${formId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Clear draft failed:', error);
  }
}
