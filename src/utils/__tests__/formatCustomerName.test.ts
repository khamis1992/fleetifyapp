import { describe, expect, it } from 'vitest';

import { formatCustomerName, getCustomerDataIssues } from '@/utils/formatCustomerName';

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

describe('getCustomerDataIssues', () => {
  it('does not flag a complete individual customer', () => {
    expect(getCustomerDataIssues({
      customer_type: 'individual',
      first_name_ar: 'أحمد',
      last_name_ar: 'علي',
      nationality: 'قطر',
    })).toEqual([]);
  });

  it('does not flag a complete company customer', () => {
    expect(getCustomerDataIssues({
      customer_type: 'company',
      company_name_ar: 'شركة النور للتجارة',
      nationality: 'قطر',
    })).toEqual([]);
  });

  it('requires an Arabic legal name', () => {
    expect(getCustomerDataIssues({
      customer_type: 'individual',
      first_name_ar: 'Ahmed',
      last_name_ar: 'Ali',
      nationality: 'قطر',
    })).toContain('الاسم العربي');
  });

  it('requires Arabic nationality', () => {
    expect(getCustomerDataIssues({
      customer_type: 'company',
      company_name_ar: 'شركة النور للتجارة',
      nationality: '',
    })).toContain('الجنسية العربية');
  });

  it('flags non-Arabic nationality', () => {
    expect(getCustomerDataIssues({
      customer_type: 'individual',
      first_name_ar: 'أحمد',
      last_name_ar: 'علي',
      nationality: 'Qatar',
    })).toContain('الجنسية العربية');
  });
});
