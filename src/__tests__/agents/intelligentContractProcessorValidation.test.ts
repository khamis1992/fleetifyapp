import { describe, expect, it } from 'vitest';

import {
  validateAndFixAmount,
  validateAndFixDate,
  validateAndFixPhone,
} from '../../../supabase/functions/intelligent-contract-processor/validation';

describe('intelligent contract processor validation', () => {
  it('normalizes only unambiguous Qatar phone numbers', () => {
    expect(validateAndFixPhone('66707063')).toEqual({
      isValid: true,
      needsFix: true,
      cleanPhone: '+97466707063',
    });
    expect(validateAndFixPhone('+97431151919').isValid).toBe(true);
    expect(validateAndFixPhone('1234567').isValid).toBe(false);
    expect(validateAndFixPhone('551234567').isValid).toBe(false);
    expect(validateAndFixPhone('+966551234567').isValid).toBe(false);
  });

  it('rejects ambiguous dates instead of guessing day and month', () => {
    expect(validateAndFixDate('08/09/2026')).toMatchObject({
      isValid: false,
      reason: 'التاريخ ملتبس بين DD/MM وMM/DD',
    });
    expect(validateAndFixDate('17/08/2026')).toMatchObject({
      isValid: true,
      fixedDate: '2026-08-17',
    });
    expect(validateAndFixDate('2026/8/17')).toMatchObject({
      isValid: true,
      fixedDate: '2026-08-17',
    });
    expect(validateAndFixDate('31/02/2026').isValid).toBe(false);
  });

  it('accepts explicit currency formatting but rejects partial or negative amounts', () => {
    expect(validateAndFixAmount('QAR 1,500.50')).toEqual({
      isValid: true,
      needsFix: true,
      fixedAmount: 1500.5,
    });
    expect(validateAndFixAmount('1-2').isValid).toBe(false);
    expect(validateAndFixAmount('-100').isValid).toBe(false);
    expect(validateAndFixAmount(Number.POSITIVE_INFINITY).isValid).toBe(false);
  });
});
