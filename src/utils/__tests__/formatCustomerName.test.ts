import { describe, expect, it } from 'vitest';

import { formatCustomerName } from '@/utils/formatCustomerName';

describe('formatCustomerName', () => {
  it('prefers the Arabic name for an individual when requested', () => {
    expect(formatCustomerName({
      customer_type: 'individual',
      first_name: 'Ahmed',
      last_name: 'Ali',
      first_name_ar: 'أحمد',
      last_name_ar: 'علي',
    }, { preferArabic: true })).toBe('أحمد علي');
  });

  it('prefers the Arabic company name', () => {
    expect(formatCustomerName({
      customer_type: 'corporate',
      company_name: 'Al Araf Trading',
      company_name_ar: 'العراف للتجارة',
    }, { preferArabic: true })).toBe('العراف للتجارة');
  });

  it('uses the stored legal name before the English name when Arabic is missing', () => {
    expect(formatCustomerName({
      customer_type: 'individual',
      first_name: 'Ahmed',
      last_name: 'Ali',
    }, {
      preferArabic: true,
      fallbackName: 'أحمد علي',
    })).toBe('أحمد علي');
  });

  it('keeps the existing English-first behavior by default', () => {
    expect(formatCustomerName({
      customer_type: 'individual',
      first_name: 'Ahmed',
      last_name: 'Ali',
      first_name_ar: 'أحمد',
      last_name_ar: 'علي',
    })).toBe('Ahmed Ali');
  });
});
