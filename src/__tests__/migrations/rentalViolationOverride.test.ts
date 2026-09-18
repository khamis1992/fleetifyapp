import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260831144530_allow_confirmed_contract_creation_with_unpaid_violations.sql';
const rollbackPath = 'supabase/rollbacks/20260831144530_allow_confirmed_contract_creation_with_unpaid_violations.rollback.sql';
const propagationMigrationPath = 'supabase/migrations/20260831212558_propagate_confirmed_violation_override_to_rental_guard.sql';
const propagationRollbackPath = 'supabase/rollbacks/20260831212558_propagate_confirmed_violation_override_to_rental_guard.rollback.sql';
const migration = readFileSync(migrationPath, 'utf8');
const rollback = readFileSync(rollbackPath, 'utf8');
const propagationMigration = readFileSync(propagationMigrationPath, 'utf8');
const propagationRollback = readFileSync(propagationRollbackPath, 'utf8');

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

  it('propagates an accepted override to exactly one matching atomic contract insert', () => {
    expect(propagationMigration).toContain("set_config('fleetify.confirmed_violation_override', 'on', true)");
    expect(propagationMigration).toContain("current_setting('fleetify.atomic_contract_creation', true)");
    expect(propagationMigration).toContain("current_setting('fleetify.confirmed_violation_override_company_id', true)");
    expect(propagationMigration).toContain("current_setting('fleetify.confirmed_violation_override_customer_id', true)");
    expect(propagationMigration).toContain("current_setting('fleetify.confirmed_violation_override_vehicle_id', true)");
    expect(propagationMigration).toContain("current_setting('fleetify.confirmed_violation_override_idempotency_key', true)");
    expect(propagationMigration).toContain("set_config('fleetify.confirmed_violation_override', 'off', true)");
  });

  it('keeps legally unavailable vehicle statuses as hard blocks', () => {
    const hardBlock = "v_vehicle_status IN ('street_52', 'police_station', 'stolen')";
    const overrideContext = "current_setting('fleetify.confirmed_violation_override', true)";
    expect(propagationMigration).toContain(hardBlock);
    expect(propagationMigration.indexOf(hardBlock)).toBeLessThan(
      propagationMigration.indexOf(overrideContext),
    );
  });

  it('restores both database functions in the propagation rollback', () => {
    expect(propagationRollback).toContain('CREATE OR REPLACE FUNCTION public.trg_enforce_rental_eligibility');
    expect(propagationRollback).toContain('CREATE OR REPLACE FUNCTION public.create_contract_with_violation_override_atomic');
    expect(propagationRollback).not.toContain('fleetify.confirmed_violation_override_company_id');
  });
});
