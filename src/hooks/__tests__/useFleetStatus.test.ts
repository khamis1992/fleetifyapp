import { describe, expect, it } from 'vitest';

import { summarizeFleetStatus } from '@/hooks/useFleetStatus';

describe('summarizeFleetStatus', () => {
  it('uses the operational vehicle status as the single KPI definition', () => {
    expect(summarizeFleetStatus([
      { status: 'rented' },
      { status: 'rented' },
      { status: 'available' },
      { status: 'maintenance' },
      { status: 'police_station' },
      { status: 'reserved_employee' },
      { status: null },
    ])).toEqual({
      available: 2,
      rented: 2,
      maintenance: 1,
      outOfService: 0,
      reserved: 0,
      reservedEmployee: 1,
      accident: 0,
      stolen: 0,
      policeStation: 1,
      total: 7,
    });
  });

  it('does not turn protected legal statuses into rented vehicles', () => {
    const result = summarizeFleetStatus([
      { status: 'municipality' },
      { status: 'street_52' },
      { status: 'police_station' },
    ]);

    expect(result.rented).toBe(0);
    expect(result.available).toBe(0);
    expect(result.total).toBe(3);
  });
});
