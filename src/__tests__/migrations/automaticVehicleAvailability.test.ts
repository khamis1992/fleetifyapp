import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260831141035_enforce_automatic_vehicle_availability_without_occupancy.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260831141035_enforce_automatic_vehicle_availability_without_occupancy.rollback.sql',
), 'utf8');

describe('automatic vehicle availability policy', () => {
  it('requires live occupancy before deriving rented', () => {
    expect(migration).toContain("IN ('active', 'suspended')");
    expect(migration).toContain("= 'under_legal_procedure'");
    expect(migration).toContain('COALESCE(contract.vehicle_returned, false) = false');
    expect(migration).toContain("WHEN v_has_occupying_contract THEN 'rented'");
    expect(migration).not.toContain('WHEN v_override_status IS NOT NULL THEN v_override_status');
    expect(migration).toContain("ELSE 'available'");
  });

  it('preserves physical and legal custody states and respects maintenance and reservations', () => {
    for (const status of ['accident', 'stolen', 'police_station', 'out_of_service', 'reserved_employee', 'municipality']) {
      expect(migration).toContain(`'${status}'`);
    }
    expect(migration).toContain("WHEN v_has_open_maintenance THEN 'maintenance'");
    expect(migration).toContain("WHEN v_has_active_reservation THEN 'street_52'");
    expect(migration).toContain("v_override_status, '')) = 'street_52'");
  });

  it('refreshes from contracts, maintenance, and reservations and locks privileged functions', () => {
    expect(migration).toContain('refresh_vehicle_operational_status_v1');
    expect(migration).toContain('trigger_update_vehicle_status_on_maintenance');
    expect(migration).toContain('trg_refresh_vehicle_status_on_reservation_change_v1');
    expect(migration).toContain('AFTER INSERT OR DELETE OR UPDATE OF vehicle_id, company_id, status');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
  });

  it('backfills stale rented vehicles without touching contracts or financial records', () => {
    expect(migration).toContain('vehicle_availability_backfill');
    expect(migration).toContain('VEHICLE_AUTOMATICALLY_RELEASED_WITHOUT_OCCUPANCY');
    expect(migration).toContain('rented vehicles without live occupancy remain');
    expect(migration).not.toContain('UPDATE public.contracts');
    expect(migration).not.toContain('UPDATE public.invoices');
    expect(migration).not.toContain('UPDATE public.payments');
  });

  it('includes a guarded rollback with assignment restoration', () => {
    expect(rollback).toContain("vehicle.status::text = v_audit.new_values ->> 'status'");
    expect(rollback).toContain("metadata -> 'previous_assignment_ids'");
    expect(rollback).toContain('DROP TRIGGER IF EXISTS trg_refresh_vehicle_status_on_reservation_change_v1');
    expect(rollback).toContain('CREATE OR REPLACE FUNCTION public.system_agent_vehicle_derived_state');
  });
});
