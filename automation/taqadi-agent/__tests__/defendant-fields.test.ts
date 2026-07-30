import { describe, expect, it } from 'vitest';
import {
  defendantFieldValueMatches,
  normalizeTaqadiPhone,
} from '../taqadi-page';

describe('normalizeTaqadiPhone', () => {
  it('keeps a local 8-digit number as-is', () => {
    expect(normalizeTaqadiPhone('71987654')).toBe('71987654');
  });

  it('strips the Kendo 974 prefix from an 11-digit value', () => {
    expect(normalizeTaqadiPhone('97471987654')).toBe('71987654');
  });

  it('strips the 00974 international prefix', () => {
    expect(normalizeTaqadiPhone('0097471987654')).toBe('71987654');
  });

  it('normalizes Arabic-Indic digits and separators', () => {
    expect(normalizeTaqadiPhone('٩٧٤٧١٩٨٧٦٥٤')).toBe('71987654');
    expect(normalizeTaqadiPhone('+974 7198 7654')).toBe('71987654');
  });

  it('returns empty for null and non-numeric input', () => {
    expect(normalizeTaqadiPhone(null)).toBe('');
    expect(normalizeTaqadiPhone(undefined)).toBe('');
    expect(normalizeTaqadiPhone('---')).toBe('');
  });
});

describe('defendantFieldValueMatches', () => {
  // The production failure: agent fills 97471987654 via phoneForTaqadi,
  // Taqadi keeps it, but the payload expectation is the local 8-digit number.
  it('accepts phone equality across the 974 prefix boundary', () => {
    expect(
      defendantFieldValueMatches('phone', '97471987654', '71987654'),
    ).toBe(true);
    expect(
      defendantFieldValueMatches('phone', '71987654', '97471987654'),
    ).toBe(true);
  });

  it('rejects a genuinely different phone number', () => {
    expect(
      defendantFieldValueMatches('phone', '97470000000', '71987654'),
    ).toBe(false);
  });

  it('rejects an empty retained phone even when expected exists', () => {
    expect(defendantFieldValueMatches('phone', '', '71987654')).toBe(false);
    expect(defendantFieldValueMatches('phone', null, '71987654')).toBe(false);
  });

  it('compares non-phone fields verbatim after whitespace normalization', () => {
    expect(
      defendantFieldValueMatches('firstName', '  أحمد ', 'أحمد'),
    ).toBe(true);
    expect(
      defendantFieldValueMatches('lastName', 'محمد', 'أحمد'),
    ).toBe(false);
  });
});
