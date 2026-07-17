import { describe, expect, it } from 'vitest';
import { formatViolationDate, normalizeViolationDate, parseViolationDate } from '../violationDate';

describe('violationDate', () => {
  it.each([
    ['2026-06-05', '2026-06-05'],
    ['05/06/2026', '2026-06-05'],
    ['٥/٦/٢٠٢٦', '2026-06-05'],
    ['2026/6/5 16:43', '2026-06-05'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeViolationDate(input)).toBe(expected);
  });

  it('rejects impossible and empty dates', () => {
    expect(parseViolationDate('31/02/2026')).toBeNull();
    expect(parseViolationDate('')).toBeNull();
    expect(formatViolationDate('not-a-date')).toBe('تاريخ غير صالح');
  });
});
