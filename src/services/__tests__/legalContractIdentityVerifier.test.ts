import { describe, expect, it } from 'vitest';
import {
  normalizeLegalIdentityMatchStatus,
} from '@/services/legalContractIdentityVerifier';

describe('legal identity status normalization', () => {
  it.each(['pending', 'matched', 'mismatch', 'unverified', 'failed'] as const)(
    'preserves the supported %s status',
    (status) => {
      expect(normalizeLegalIdentityMatchStatus(status)).toBe(status);
    },
  );

  it.each([null, undefined, '', 'approved', 'MATCHED', 1, {}])(
    'fails closed for an unknown database value %#',
    (value) => {
      expect(normalizeLegalIdentityMatchStatus(value)).toBe('unverified');
    },
  );
});
