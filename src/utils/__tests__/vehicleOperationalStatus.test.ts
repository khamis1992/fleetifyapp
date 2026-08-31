import { describe, expect, it } from 'vitest';
import {
  isContractInCurrentPeriod,
  isContractOccupyingVehicle,
  localDateKey,
} from '../vehicleOperationalStatus';

describe('vehicle operational contract rules', () => {
  const today = '2026-08-31';

  it('formats a local calendar date without UTC boundary drift', () => {
    expect(localDateKey(new Date(2026, 7, 31, 0, 15))).toBe('2026-08-31');
  });

  it('recognizes inclusive contract periods', () => {
    expect(isContractInCurrentPeriod({ start_date: today, end_date: today }, today)).toBe(true);
    expect(isContractInCurrentPeriod({ start_date: '2026-09-01', end_date: '2027-01-01' }, today)).toBe(false);
    expect(isContractInCurrentPeriod({ start_date: '2025-01-01', end_date: '2026-08-30' }, today)).toBe(false);
  });

  it('treats active and suspended current contracts as occupying', () => {
    const period = { start_date: '2026-01-01', end_date: '2026-12-31' };
    expect(isContractOccupyingVehicle({ ...period, status: 'active' }, today)).toBe(true);
    expect(isContractOccupyingVehicle({ ...period, status: 'suspended' }, today)).toBe(true);
    expect(isContractOccupyingVehicle({ ...period, status: 'active', vehicle_returned: true }, today)).toBe(false);
  });

  it('keeps an unreturned legal vehicle occupied and releases a returned one', () => {
    const period = { start_date: '2026-01-01', end_date: '2026-12-31', status: 'under_legal_procedure' };
    expect(isContractOccupyingVehicle({ ...period, vehicle_returned: false }, today)).toBe(true);
    expect(isContractOccupyingVehicle({ ...period, vehicle_returned: true }, today)).toBe(false);
  });

  it('never presents cancelled, expired, future, or ended contracts as current occupants', () => {
    expect(isContractOccupyingVehicle({ status: 'cancelled', start_date: '2026-01-01', end_date: '2026-12-31' }, today)).toBe(false);
    expect(isContractOccupyingVehicle({ status: 'expired', start_date: '2026-01-01', end_date: '2026-12-31' }, today)).toBe(false);
    expect(isContractOccupyingVehicle({ status: 'active', start_date: '2026-09-01', end_date: '2027-01-01' }, today)).toBe(false);
    expect(isContractOccupyingVehicle({ status: 'active', start_date: '2025-01-01', end_date: '2026-08-30' }, today)).toBe(false);
  });
});
