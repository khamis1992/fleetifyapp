import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260903173744_atomic_traffic_violation_cancellation.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260903173744_atomic_traffic_violation_cancellation.rollback.sql',
), 'utf8');

describe('atomic traffic violation cancellation', () => {
  it('locks the violation and prevents cancelling one with active payments', () => {
    expect(migration).toContain('FROM public.traffic_violations violation');
    expect(migration).toContain('FOR UPDATE');
    expect(migration).toContain('FROM public.traffic_violation_payments payment');
    expect(migration).toContain('TRAFFIC_VIOLATION_HAS_ACTIVE_PAYMENTS');
  });

  it('is retry-safe and tenant-qualified', () => {
    expect(migration).toContain("'idempotent_replay', true");
    expect(migration).toContain('public.get_user_company_id() IS DISTINCT FROM v_violation.company_id');
    expect(migration).toContain('violation.company_id = v_violation.company_id');
  });

  it('records a contract audit operation when the violation belongs to a contract', () => {
    expect(migration).toContain('INSERT INTO public.contract_operations_log');
    expect(migration).toContain("'traffic_violation_cancelled'");
    expect(migration).toContain('IF v_violation.contract_id IS NOT NULL THEN');
  });

  it('uses locked-down definer privileges and has a rollback', () => {
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain('FROM PUBLIC, anon');
    expect(migration).toContain('TO authenticated, service_role');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.cancel_traffic_violation_atomic_v1');
  });
});
