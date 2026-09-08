import { describe, expect, it } from 'vitest';
import { decidePageOrientation, validateAutomaticEvidence } from '../policy';

const read = (rotation: number | null, confidence: number | null = 25) => ({ rotation, confidence });
describe('unattended PDF orientation policy', () => {
  it('requires dual agreement and upright verification before correcting a page', () => {
    expect(decidePageOrientation(1, read(180), read(180)).rotation).toBe(0);
    expect(decidePageOrientation(1, read(180), read(180), read(0))).toMatchObject({ rotation: 180, needsReview: false });
    expect(decidePageOrientation(1, read(90), read(90), read(90))).toMatchObject({ rotation: 0, needsReview: true });
  });
  it('leaves contradictory, blank and low-confidence pages untouched', () => {
    for (const [first, second] of [[read(180), read(90)], [read(null, null), read(null, null)],
      [read(180, 19.99), read(180)], [read(180, NaN), read(180)], [read(45), read(45)]]) {
      expect(decidePageOrientation(1, first, second, read(0))).toMatchObject({ rotation: 0, needsReview: true });
    }
  });
  it('accepts upright consensus without a redundant transformed PDF', () => {
    expect(decidePageOrientation(1, read(0), read(0))).toMatchObject({ rotation: 0, needsReview: false });
  });
  it('allows partial correction without rotating uncertain pages', () => {
    const evidence = [decidePageOrientation(1, read(270), read(270), read(0)),
      decidePageOrientation(2, read(180, 5), read(180, 5))];
    expect(() => validateAutomaticEvidence([270, 0], evidence)).not.toThrow();
    expect(() => validateAutomaticEvidence([270, 180], evidence)).toThrow();
    expect(() => validateAutomaticEvidence([270], evidence)).toThrow();
    expect(() => validateAutomaticEvidence([270, 0], [...evidence].reverse())).toThrow();
  });
});
