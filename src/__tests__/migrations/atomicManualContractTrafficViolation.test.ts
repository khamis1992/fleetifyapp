import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260903180758_atomic_idempotent_manual_contract_violation.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260903180758_atomic_idempotent_manual_contract_violation.rollback.sql',
), 'utf8');
const detailsPage = readFileSync(resolve(
  process.cwd(),
  'src/components/contracts/ContractDetailsPageRedesigned.tsx',
), 'utf8');
const violationsTab = readFileSync(resolve(
  process.cwd(),
  'src/components/contracts/ContractViolationsTabRedesigned.tsx',
), 'utf8');

describe('atomic manual contract traffic violation creation', () => {
  it('uses a company-scoped unique request key and a transaction lock', () => {
    expect(migration).toContain('manual_request_id uuid');
    expect(migration).toContain('ON public.traffic_violations(company_id, manual_request_id)');
    expect(migration).toContain("':manual-contract-violation:'");
    expect(migration).toContain('pg_catalog.pg_advisory_xact_lock');
  });

  it('validates the tenant, contract vehicle, date, and amount before insertion', () => {
    expect(migration).toContain('profile.company_id = p_company_id');
    expect(migration).toContain('v_contract.vehicle_id IS DISTINCT FROM p_vehicle_id');
    expect(migration).toContain('p_violation_date < v_contract.start_date');
    expect(migration).toContain('p_violation_date > v_contract.end_date');
    expect(migration).toContain('v_amount <= 0');
  });

  it('returns existing rows on retries and records a creation audit', () => {
    expect(migration).toContain("'duplicate_reason', 'idempotency_key'");
    expect(migration).toContain("'duplicate_reason', 'vehicle_number_date'");
    expect(migration).toContain('INSERT INTO public.audit_logs');
    expect(migration).toContain("'create_manual_contract_traffic_violation_v1'");
  });

  it('locks down the definer function and provides a rollback', () => {
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain('FROM PUBLIC, anon');
    expect(migration).toContain('TO authenticated, service_role');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.create_manual_contract_traffic_violation_v1');
    expect(rollback).toContain('DROP COLUMN IF EXISTS manual_request_id');
  });

  it('routes the page through the RPC and reuses one request UUID across retries', () => {
    expect(detailsPage).toContain(".rpc('create_manual_contract_traffic_violation_v1'");
    expect(detailsPage).not.toContain(".from('traffic_violations').insert");
    expect(detailsPage).toContain('customerPhone && result.created');
    expect(violationsTab).toContain('const requestIdRef = useRef(crypto.randomUUID())');
    expect(violationsTab).toContain('manual_request_id: requestIdRef.current');
  });
});
