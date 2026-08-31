import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260831144530_allow_confirmed_contract_creation_with_unpaid_violations.sql';
const rollbackPath = 'supabase/rollbacks/20260831144530_allow_confirmed_contract_creation_with_unpaid_violations.rollback.sql';
const migration = readFileSync(migrationPath, 'utf8');
const rollback = readFileSync(rollbackPath, 'utf8');

describe('confirmed contract creation with unpaid violations migration', () => {
  it('recalculates both vehicle and customer violations before accepting an override', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.create_contract_with_violation_override_atomic');
    expect(migration).toContain('p_accept_unpaid_violations boolean DEFAULT false');
    expect(migration).toContain('penalty.vehicle_id = p_vehicle_id');
    expect(migration).toContain('penalty.customer_id = p_customer_id');
    expect(migration).toContain("NOT IN ('paid', 'completed')");
    expect(migration).toContain('IF NOT COALESCE(p_accept_unpaid_violations, false)');
  });

  it('limits acceptance to active system employees and preserves the canonical atomic writer', () => {
    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain('FROM public.employees employee');
    expect(migration).toContain('COALESCE(employee.is_active, false) = true');
    expect(migration).toContain('COALESCE(employee.has_system_access, false) = true');
    expect(migration).toContain("COALESCE(employee.account_status, '') = 'active'");
    expect(migration).toContain('public.create_contract_with_billing_graph_atomic(');
  });

  it('audits the accepted override and closes the direct authenticated bypass', () => {
    expect(migration).toContain("'contract_unpaid_violations_override'");
    expect(migration).toContain("'idempotency_key', p_idempotency_key");
    expect(migration).toContain('REVOKE EXECUTE ON FUNCTION public.create_contract_with_billing_graph_atomic');
    expect(migration).toContain('FROM authenticated;');
    expect(migration).toContain('TO authenticated, service_role;');
  });

  it('has a rollback that drops the wrapper and restores the prior RPC grant', () => {
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.create_contract_with_violation_override_atomic');
    expect(rollback).toContain('GRANT EXECUTE ON FUNCTION public.create_contract_with_billing_graph_atomic');
    expect(rollback).toContain('TO authenticated;');
  });
});
