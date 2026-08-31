import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260831135152_correct_vehicle_7039_available_without_contract.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260831135152_correct_vehicle_7039_available_without_contract.rollback.sql',
), 'utf8');

describe('vehicle 7039 availability correction', () => {
  it('requires the exact active vehicle and rejects every current occupancy source', () => {
    expect(migration).toContain("v_vehicle_id constant uuid := 'b9b3d58a-d12a-4bc6-8148-1022b8be0915'");
    expect(migration).toContain("public.normalize_vehicle_plate(vehicle.plate_number) = '7039'");
    expect(migration).toContain('vehicle_maintenance');
    expect(migration).toContain('vehicle_reservations');
    expect(migration).toContain('driver_assignments');
    expect(migration).toContain("contract.status = 'active'");
    expect(migration).toContain("contract.status = 'under_legal_procedure'");
  });

  it('supersedes the unsupported August assignment with an audited available state', () => {
    expect(migration).toContain("source_row, source_plate");
    expect(migration).toMatch(/v_vehicle_id,\s*2,\s*'7039'/);
    expect(migration).toContain("assignment.source_classification = 'no_live_contract'");
    expect(migration).toContain("assignment.supporting_contract_id IS NULL");
    expect(migration).toContain("target_status = 'available'");
    expect(migration).toContain("status = 'available'::public.vehicle_status");
    expect(migration).toContain('VEHICLE_STATUS_CORRECTED_TO_AVAILABLE_NO_OCCUPANT');
    expect(migration).not.toContain('UPDATE public.contracts');
    expect(migration).not.toContain('UPDATE public.invoices');
    expect(migration).not.toContain('UPDATE public.payments');
    expect(migration).not.toContain('UPDATE public.legal_cases');
  });

  it('has a guarded rollback that does not overwrite a later fleet decision', () => {
    expect(rollback).toContain('Rollback refused: vehicle 7039 changed after this correction');
    expect(rollback).toContain("assignment.closed_reason = 'superseded_by_batch:' || v_batch_id::text");
    expect(rollback).toContain("status = (assignment.before_state ->> 'status')::public.vehicle_status");
  });
});
