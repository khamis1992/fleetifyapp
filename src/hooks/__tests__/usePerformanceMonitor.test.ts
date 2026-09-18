import { describe, expect, it } from 'vitest';

import { calculateMemoryUsage } from '../usePerformanceMonitor';

describe('calculateMemoryUsage', () => {
  it('uses the browser heap limit instead of the currently allocated heap', () => {
    const result = calculateMemoryUsage({
      usedJSHeapSize: 1_600,
      totalJSHeapSize: 1_620,
      jsHeapSizeLimit: 4_200,
    });

    expect(result.capacity).toBe(4_200);
    expect(result.percentage).toBeCloseTo(38.095, 3);
  });

  it('falls back to allocated heap when the browser does not expose a limit', () => {
    const result = calculateMemoryUsage({
      usedJSHeapSize: 900,
      totalJSHeapSize: 1_000,
    });

    expect(result.capacity).toBe(1_000);
    expect(result.ratio).toBe(0.9);
  });
});
