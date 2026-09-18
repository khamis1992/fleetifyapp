import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260901060657_add_cancelled_contract_reactivation.sql',
  'utf8',
);
const rollback = readFileSync(
  'supabase/rollbacks/20260901060657_add_cancelled_contract_reactivation.rollback.sql',
  'utf8',
);

describe('cancelled contract reactivation migration', () => {
  it('adds a dedicated tenant-authorized atomic reactivation command', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.reactivate_cancelled_contract_atomic_v1');
    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain("SET search_path TO ''");
    expect(migration).toContain('public.get_user_company_id() IS DISTINCT FROM v_contract.company_id');
    expect(migration).toContain('FROM public.employees employee');
    expect(migration).toContain('COALESCE(employee.has_system_access, false) = true');
    expect(migration).toContain("NOT IN ('cancelled', 'canceled')");
  });

  it('blocks legal and vehicle conflicts before activation', () => {
    expect(migration).toContain('FROM public.legal_cases legal_case');
    expect(migration).toContain("'open', 'active', 'pending', 'on_hold', 'under_review'");
    expect(migration).toContain('FROM public.contracts other_contract');
    expect(migration).toContain("'active', 'under_legal_procedure', 'pending', 'confirmed'");
    expect(migration).toContain("USING ERRCODE = '23P01'");
  });

  it('requires and consumes a row-scoped violation acknowledgement', () => {
    expect(migration).toContain('p_accept_unpaid_violations boolean DEFAULT false');
    expect(migration).toContain("set_config('fleetify.confirmed_contract_reactivation', 'on', true)");
    expect(migration).toContain("current_setting('fleetify.confirmed_contract_reactivation_contract_id', true)");
    expect(migration).toContain("set_config('fleetify.confirmed_contract_reactivation', 'off', true)");
    expect(migration).toContain('cancelled_contract_reactivation_violation_override');
  });

  it('preserves the existing financial graph and records the transition', () => {
    expect(migration).toContain('v_invoice_count_before');
    expect(migration).toContain('v_schedule_count_before');
    expect(migration).toContain('v_payment_count_before');
    expect(migration).toContain('IS DISTINCT FROM');
    expect(migration).toContain("'cancelled_contract_reactivated'");
    expect(migration).not.toContain('generate_invoices_from_payment_schedule');
  });

  it('exposes only the command and restores the previous trigger on rollback', () => {
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.reactivate_cancelled_contract_atomic_v1');
    expect(migration).toContain('TO authenticated, service_role');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.reactivate_cancelled_contract_atomic_v1');
    expect(rollback).not.toContain('confirmed_contract_reactivation');
    expect(rollback).toContain('CREATE OR REPLACE FUNCTION public.trg_enforce_rental_eligibility');
  });
});
