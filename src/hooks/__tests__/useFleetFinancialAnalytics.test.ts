import { describe, expect, it } from 'vitest';
import { normalizeVehicleOperatingCost } from '../useFleetFinancialAnalytics';

describe('normalizeVehicleOperatingCost', () => {
  it('does not add maintenance twice when operating cost already includes it', () => {
    expect(normalizeVehicleOperatingCost(1500, 1000, 500)).toBe(1500);
  });

  it('uses component costs when a stored operating total is stale', () => {
    expect(normalizeVehicleOperatingCost(0, 1000, 500)).toBe(1500);
  });

  it('preserves additional operating costs beyond maintenance and insurance', () => {
    expect(normalizeVehicleOperatingCost(2200, 1000, 500)).toBe(2200);
  });
});
