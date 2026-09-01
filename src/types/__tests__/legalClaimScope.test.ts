import { describe, expect, it } from 'vitest';
import {
  isTrafficViolationsOnlyScope,
  normalizeLegalClaimScope,
} from '../legalClaimScope';

describe('legal claim scope', () => {
  it('fails closed to the full-outstanding legacy scope', () => {
    expect(normalizeLegalClaimScope(undefined)).toBe('full_outstanding');
    expect(normalizeLegalClaimScope('unexpected')).toBe('full_outstanding');
  });

  it('recognizes the traffic-violations-only scope', () => {
    expect(normalizeLegalClaimScope('traffic_violations_only')).toBe('traffic_violations_only');
    expect(isTrafficViolationsOnlyScope('traffic_violations_only')).toBe(true);
    expect(isTrafficViolationsOnlyScope('full_outstanding')).toBe(false);
  });
});
