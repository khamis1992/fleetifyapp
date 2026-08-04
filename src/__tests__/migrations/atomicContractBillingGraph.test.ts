import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260803172500_create_contract_with_billing_graph_atomic.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260803172500_create_contract_with_billing_graph_atomic.rollback.sql',
), 'utf8');

describe('atomic contract billing graph migration', () => {
  it('creates the contract and canonical billing graph in one database function', () => {
    const insertContract = migration.indexOf('INSERT INTO public.contracts');
    const generateBilling = migration.indexOf(
      'public.generate_invoices_from_payment_schedule(v_contract_id)',
    );
    const postcondition = migration.indexOf(
      'Contract billing graph postcondition failed',
    );

    expect(insertContract).toBeGreaterThan(-1);
    expect(generateBilling).toBeGreaterThan(insertContract);
    expect(postcondition).toBeGreaterThan(generateBilling);
    expect(migration).not.toContain('EXCEPTION WHEN OTHERS');
  });

  it('recognizes receivables and revenue only through invoice journals', () => {
    const contractInsert = migration.slice(
      migration.indexOf('INSERT INTO public.contracts'),
      migration.indexOf('RETURNING id INTO v_contract_id'),
    );

    expect(contractInsert).toContain('journal_entry_id');
    expect(contractInsert).toContain('NULL,');
    expect(migration).toContain('contract_journal_created');
    expect(migration).toContain(
      'public.system_invoice_has_single_balanced_posted_journal(',
    );
    expect(migration).not.toContain('INSERT INTO public.journal_entries');
    expect(migration).not.toContain('INSERT INTO public.journal_entry_lines');
  });

  it('enforces tenant, role, identity and active related-row checks', () => {
    expect(migration).toContain('public.get_user_company_id() IS DISTINCT FROM p_company_id');
    expect(migration).toContain('Actor identity mismatch');
    expect(migration).toContain('public.is_finance_action_authorized(');
    expect(migration).toContain('Assigned employee profile is inactive or belongs to another company');
    expect(migration).toContain('Cost center is inactive or belongs to another company');
    expect(migration).toContain('center.company_id = p_company_id');
    expect(migration).toContain('Vehicle already has an overlapping active contract');
    expect(migration).toContain("lower(COALESCE(vehicle.status::text, '')) = 'available'");
    expect(migration).toContain('profile.user_id = v_actor');
    expect(migration).toContain('p_assigned_to_profile_id IS NOT NULL');
  });

  it('preserves explicit financial terms and uses canonical billing months', () => {
    expect(migration).toContain('COALESCE(NEW.contract_amount, 0) <= 0');
    expect(migration).toContain('NEW.contract_amount := round(');
    expect(migration).toContain('v_available_billing_months := GREATEST(');
    expect(migration).toContain('v_required_installments := CASE');
    expect(migration).toContain('CEIL(');
    expect(migration).toContain('GREATEST(round(p_contract_amount::numeric, 2) - 0.01, 0)');
    expect(migration).toContain('A contract trigger unexpectedly changed the explicit financial terms');
    expect(migration).not.toContain('v_duration_days := NEW.end_date - NEW.start_date');
  });

  it('blocks active contract writers that bypass the atomic command', () => {
    expect(migration).toContain('CREATE TRIGGER trg_require_atomic_contract_billing_graph');
    expect(migration).toContain("current_setting('fleetify.atomic_contract_creation', true)");
    expect(migration).toContain("'Active contracts must be created or activated through the atomic billing command'");
    expect(migration).toContain('v_financial_terms_changed boolean');
    expect(migration).toContain("'Billable contract financial terms require an audited atomic amendment command'");
    expect(migration).toContain('OR NEW.monthly_amount IS DISTINCT FROM OLD.monthly_amount');
    expect(migration).toContain('OR NEW.customer_id IS DISTINCT FROM OLD.customer_id');
    expect(migration).toContain('OR NEW.cost_center_id IS DISTINCT FROM OLD.cost_center_id');
    expect(migration).toContain('IF (v_new_is_billable OR v_old_was_billable)');
    expect(migration).toContain("pg_catalog.set_config(");
    expect(rollback).toContain('DROP TRIGGER IF EXISTS trg_require_atomic_contract_billing_graph');
  });

  it('provides an atomic path for activating an existing draft', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.activate_contract_with_billing_graph_atomic(');
    expect(migration).toContain("'draft', 'pending', 'pending_completion', 'suspended', 'active'");
    expect(migration).toContain('PERFORM public.generate_invoices_from_payment_schedule(v_contract.id)');
    expect(migration).toContain('Activated contract billing graph postcondition failed');
    expect(migration).toContain('Every activated-contract invoice must have one balanced posted journal');
    expect(migration).toContain('v_contract.contract_date > v_contract.end_date');
    expect(migration).toContain('profile.company_id = v_contract.company_id');
    expect(migration).toContain('center.company_id = v_contract.company_id');
    expect(migration).toContain("'idempotent_replay', v_was_active");
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.activate_contract_with_billing_graph_atomic(uuid)');
  });

  it('routes the idempotent quick-customer RPC through the atomic contract command', () => {
    const quickCustomer = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION public.create_customer_with_contract_idempotent('),
      migration.indexOf('-- Fail closed for old clients'),
    );
    expect(quickCustomer).toContain('public.create_contract_with_billing_graph_atomic(');
    expect(quickCustomer).toContain('p_idempotency_key => v_idempotency_key');
    expect(quickCustomer).toContain('pg_advisory_xact_lock');
    expect(quickCustomer).toContain("CURRENT_DATE + interval '1 year'");
    expect(quickCustomer).not.toContain("interval '1 year' - interval '1 day'");
    expect(quickCustomer).toContain('v_start_date := v_existing_contract.start_date');
    expect(quickCustomer).toContain('v_end_date := v_existing_contract.end_date');
    expect(quickCustomer).not.toContain(
      'v_existing_contract.start_date IS DISTINCT FROM v_start_date',
    );
    expect(quickCustomer).toContain("'billing_graph_created', true");
    expect(quickCustomer).not.toContain('INSERT INTO public.contracts');
    expect(migration).toContain('Idempotency key is required; use create_customer_with_contract_idempotent');
    expect(rollback).toContain('CREATE OR REPLACE FUNCTION public.create_customer_with_contract(');
  });

  it('makes every contract creation replay-safe per tenant', () => {
    const atomicCommand = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION public.create_contract_with_billing_graph_atomic('),
      migration.indexOf('CREATE OR REPLACE FUNCTION public.activate_contract_with_billing_graph_atomic('),
    );
    const replayGuard = atomicCommand.slice(
      atomicCommand.indexOf('IF FOUND THEN'),
      atomicCommand.indexOf('SELECT count(*)::integer'),
    );

    expect(migration).toContain('uuid, uuid, uuid, text, date, date, numeric, numeric, text, text, uuid, uuid, uuid, date, boolean, text\n);');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS creation_idempotency_key text');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uq_contracts_company_creation_idempotency');
    expect(migration).toContain('p_idempotency_key text DEFAULT NULL');
    expect(migration).toContain("'contract-create:' || p_company_id::text || ':' || v_idempotency_key");
    expect(migration).toContain('contract.creation_idempotency_key = v_idempotency_key');
    expect(migration).toContain("'idempotent_replay', true");
    expect(migration).toContain('Idempotency key is already bound to a different contract request');
    for (const requestField of [
      'description',
      'terms',
      'cost_center_id',
      'assigned_to_profile_id',
      'auto_renew_enabled',
      'created_via',
    ]) {
      expect(replayGuard).toContain(`v_existing_contract.${requestField}`);
    }
    expect(replayGuard).toContain(
      'round(COALESCE(v_existing_contract.contract_amount, 0)::numeric, 2) IS DISTINCT FROM',
    );
    expect(replayGuard).toContain(
      'round(COALESCE(v_existing_contract.monthly_amount, 0)::numeric, 2) IS DISTINCT FROM',
    );
    expect(replayGuard).toContain(
      'round(COALESCE(p_monthly_amount, 0)::numeric, 2)',
    );
    expect(replayGuard).not.toContain('> 0.01');
    expect(rollback).toContain('DROP INDEX IF EXISTS public.uq_contracts_company_creation_idempotency');
    expect(rollback).toContain('DROP COLUMN IF EXISTS creation_idempotency_key');
  });

  it('renews contracts and creates the successor graph in one transaction', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.renew_contract_with_billing_graph_atomic(');
    expect(migration).toContain("SET status = 'renewed', updated_at = now()");
    expect(migration).toContain('v_result := public.create_contract_with_billing_graph_atomic(');
    expect(migration).toContain("'renewed', true");
    expect(migration).toContain("creation_idempotency_key = v_renewal_key");
    expect(migration).toContain("lower(COALESCE(v_original.status::text, '')) = 'renewed'");
    expect(migration).toContain('Renewal replay conflicts with the existing successor');
    expect(rollback).toContain(
      'DROP FUNCTION IF EXISTS public.renew_contract_with_billing_graph_atomic(uuid, date, numeric, text)',
    );
  });

  it('keeps the legal contract date separate and supports non-monthly pricing', () => {
    expect(migration).toContain('p_contract_date date DEFAULT CURRENT_DATE');
    expect(migration).toContain('p_contract_date > p_end_date');
    expect(migration).toContain('COALESCE(p_monthly_amount, 0) < 0');
    expect(migration).toContain('ELSE v_available_billing_months');
  });

  it('persists trusted source and auto-renew metadata inside the atomic insert', () => {
    expect(migration).toContain('p_auto_renew_enabled boolean DEFAULT false');
    expect(migration).toContain("p_created_via text DEFAULT 'atomic_billing_graph'");
    expect(migration).toContain("'mobile', 'sales_quote'");
    expect(migration).toContain('COALESCE(p_auto_renew_enabled, false)');
    expect(migration).toContain('v_vehicle.plate_number');
    expect(migration).toContain("p_created_via => 'renewal'");
  });

  it('has a matching rollback', () => {
    expect(rollback).toContain(
      'DROP FUNCTION IF EXISTS public.create_contract_with_billing_graph_atomic(',
    );
    expect(rollback).toContain('CREATE OR REPLACE FUNCTION public.trigger_calculate_contract_amount()');
    expect(rollback).toContain('v_duration_days := NEW.end_date - NEW.start_date');
  });
});
