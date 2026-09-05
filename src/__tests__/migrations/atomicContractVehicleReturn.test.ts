import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260903170924_atomic_contract_vehicle_return.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260903170924_atomic_contract_vehicle_return.rollback.sql',
), 'utf8');

describe('atomic contract vehicle return', () => {
  it('serializes the contract and vehicle state before writing the report', () => {
    expect(migration).toContain('FROM public.contracts contract');
    expect(migration).toContain('FROM public.vehicles vehicle');
    expect(migration.match(/FOR UPDATE/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration).toContain('INSERT INTO public.vehicle_condition_reports');
    expect(migration).toContain('UPDATE public.contracts contract');
    expect(migration).toContain('UPDATE public.vehicles vehicle');
    expect(migration).not.toContain('EXCEPTION WHEN OTHERS');
  });

  it('is retry-safe and reuses an existing checkout report', () => {
    expect(migration).toContain("report.inspection_type = 'check_out'");
    expect(migration).toContain('ELSIF v_report_id IS NULL THEN');
    expect(migration).toContain('UPDATE public.vehicle_condition_reports report');
    expect(migration).toContain('v_contract.vehicle_returned IS TRUE AND v_report_id IS NOT NULL');
    expect(migration).toContain("'idempotent_replay', v_idempotent_replay");
  });

  it('rejects invalid odometer, fuel and future timestamps', () => {
    expect(migration).toContain('MILEAGE_BELOW_CURRENT');
    expect(migration).toContain('INVALID_FUEL_LEVEL');
    expect(migration).toContain("p_inspection_date > now() + interval '15 minutes'");
  });

  it('derives vehicle status centrally and propagates the applied status to the contract', () => {
    expect(migration).toContain('public.refresh_vehicle_operational_status_v1(');
    expect(migration).toContain("v_operational_state ->> 'applied_status'");
    expect(migration).toContain('SET vehicle_status = v_applied_status');
    expect(migration).not.toContain("SET status = 'available'");
  });

  it('records one auditable contract operation but skips it on idempotent replay', () => {
    expect(migration).toContain('INSERT INTO public.contract_operations_log');
    expect(migration).toContain("'vehicle_return_recorded'");
    expect(migration).toMatch(
      /IF NOT v_idempotent_replay THEN[\s\S]*INSERT INTO public\.contract_operations_log/,
    );
  });

  it('uses an explicit tenant guard and locked-down definer privileges', () => {
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain('public.get_user_company_id() IS DISTINCT FROM v_contract.company_id');
    expect(migration).toContain('FROM PUBLIC, anon');
    expect(migration).toContain('TO authenticated, service_role');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.record_contract_vehicle_return_v1');
  });
});
