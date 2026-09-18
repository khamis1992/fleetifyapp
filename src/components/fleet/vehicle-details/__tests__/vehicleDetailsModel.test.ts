import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchVehicleHistory, resolveVehicleTab, vehicleRentalDecision } from '../vehicleDetailsModel';

describe('vehicle file rental decision', () => {
  const current = { start_date: '2026-09-01', end_date: '2026-09-30', vehicle_returned: false };
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-06T12:00:00')); });
  afterEach(() => vi.useRealTimers());

  it.each(['active', 'suspended', 'under_legal_procedure'])('identifies %s as occupancy even when stored vehicle status says available', (status) => {
    const result = vehicleRentalDecision({ status: 'available' }, [{ ...current, status }], []);
    expect(result.canRent).toBe(false);
    expect(result.occupying).toHaveLength(1);
  });
  it.each(['completed', 'cancelled', 'pending', 'draft'])('does not count %s as occupancy', (status) => {
    expect(vehicleRentalDecision({ status: 'available' }, [{ ...current, status }], []).canRent).toBe(true);
  });
  it('honors recorded return even for legal contracts', () => {
    expect(vehicleRentalDecision({ status: 'available' }, [{ ...current, status: 'under_legal_procedure', vehicle_returned: true }], []).canRent).toBe(true);
  });
  it('does not count future or expired periods', () => {
    expect(vehicleRentalDecision({ status: 'available' }, [
      { ...current, status: 'active', start_date: '2026-10-01', end_date: '2026-10-30' },
      { ...current, status: 'active', end_date: '2026-09-05' },
    ], []).canRent).toBe(true);
  });
  it.each(['maintenance', 'rented', 'street_52', 'police_station', 'municipality', 'stolen', 'accident', 'reserved_employee', 'out_of_service', undefined])('preserves the stored %s state', (status) => {
    expect(vehicleRentalDecision({ status }, [], []).canRent).toBe(false);
  });
  it('blocks inactive vehicles, executing maintenance, and incomplete data', () => {
    expect(vehicleRentalDecision({ status: 'available', is_active: false }, [], []).canRent).toBe(false);
    expect(vehicleRentalDecision({ status: 'available' }, [], [{ status: 'in_progress' }]).canRent).toBe(false);
    expect(vehicleRentalDecision({ status: 'available' }, [], [], true).canRent).toBe(false);
  });
  it('does not treat cancelled maintenance as an active workshop job', () => {
    expect(vehicleRentalDecision({ status: 'available' }, [], [{ status: 'cancelled' }]).canRent).toBe(true);
  });
});

describe('complete vehicle histories', () => {
  it('includes older rows beyond a server page boundary', async () => {
    const all = Array.from({ length: 1001 }, (_, id) => ({ id }));
    const fetchPage = vi.fn(async (from: number, to: number) => ({ data: all.slice(from, to + 1), error: null }));
    expect(await fetchVehicleHistory(fetchPage)).toEqual(all);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenLastCalledWith(1000, 1499);
  });
  it('rejects partial history when a later page fails', async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({ data: Array(500).fill({ id: 1 }), error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('connection lost') });
    await expect(fetchVehicleHistory(fetchPage)).rejects.toThrow('connection lost');
  });
  it('handles empty history and unknown tab links', async () => {
    expect(await fetchVehicleHistory(async () => ({ data: [], error: null }))).toEqual([]);
    expect(resolveVehicleTab('contracts').value).toBe('contracts');
    expect(resolveVehicleTab('unknown').value).toBe('overview');
  });
});
