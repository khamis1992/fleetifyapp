import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260903172440_unify_cancellation_vehicle_return.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260903172440_unify_cancellation_vehicle_return.rollback.sql',
), 'utf8');

describe('unified cancellation vehicle return', () => {
  it('runs cancellation and the canonical checkout report in one function call', () => {
    const cancellation = migration.indexOf('public.cancel_contract_with_company_traffic_penalties_v1(');
    const vehicleReturn = migration.indexOf('public.record_contract_vehicle_return_v1(');

    expect(cancellation).toBeGreaterThan(-1);
    expect(vehicleReturn).toBeGreaterThan(cancellation);
    expect(migration).not.toContain('INSERT INTO public.contract_vehicle_returns');
    expect(migration).not.toContain('EXCEPTION WHEN OTHERS');
  });

  it('normalizes the cancellation form condition and carries its evidence', () => {
    expect(migration).toContain("IF v_condition = 'excellent' THEN");
    expect(migration).toContain("'source', 'contract_cancellation'");
    expect(migration).toContain("p_return_payload -> 'damages'");
    expect(migration).toContain("p_return_payload ->> 'odometer_reading'");
  });

  it('keeps privileges explicit and offers a rollback', () => {
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain('FROM PUBLIC, anon');
    expect(migration).toContain('TO authenticated, service_role');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.cancel_contract_with_return_and_penalties_v2');
  });
});
