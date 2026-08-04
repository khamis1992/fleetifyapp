import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260803162000_repair_zero_amount_invoice_month_blockers.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260803162000_repair_zero_amount_invoice_month_blockers.rollback.sql',
), 'utf8');

describe('zero-amount canonical invoice blocker repair migration', () => {
  it('preserves the hardened generator behind the wrapper and its ACL boundary', () => {
    expect(migration).toContain('RENAME TO generate_invoice_for_contract_month_before_zero_repair');
    expect(migration).toContain('v_result := public.system_generate_invoice_for_contract_month_core(');
    expect(migration).toContain('public.is_finance_action_authorized(');
    expect(migration).toContain('v_employee_workspace_allowed :=');
    expect(migration).toContain("v_jwt_role = 'authenticated'");
    expect(migration).toContain("lower(COALESCE(v_contract.status, '')) = 'active'");
    expect(migration).toContain('profile.id = v_contract.assigned_to_profile_id');
    expect(migration).toContain('COALESCE(profile.is_active, false) = true');
    expect(migration).toContain("session_user IN ('postgres', 'supabase_admin')");
    expect(migration).toContain('v_contract.end_date IS NULL');
    expect(migration).toContain('v_expected_last_month');
    expect(migration).toContain('round(v_contract.contract_amount::numeric, 2) - 0.01');
    expect(migration).toContain('round(v_contract.monthly_amount::numeric, 2)');
    expect(migration).toContain('generate_payment_schedules_for_contract(');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.generate_invoice_for_contract_month_before_zero_repair');
    expect(migration).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.generate_invoice_for_contract_month_before_zero_repair/);
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.system_generate_invoice_for_contract_month_core');
    expect(migration).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.system_generate_invoice_for_contract_month_core/);
  });

  it('preflights the complete zero-placeholder set before writing anything', () => {
    const firstPass = migration.indexOf('-- Pass one locks and validates every active zero placeholder');
    const secondPass = migration.indexOf('-- Pass two retires each validated placeholder');
    const firstInvoiceWrite = migration.indexOf('UPDATE public.invoices invoice', secondPass);

    expect(firstPass).toBeGreaterThan(-1);
    expect(secondPass).toBeGreaterThan(firstPass);
    expect(firstInvoiceWrite).toBeGreaterThan(secondPass);
    expect(migration.indexOf('zero_amount_invoice_requires_manual_review')).toBeLessThan(firstInvoiceWrite);
    expect(migration.indexOf('zero_amount_invoice_has_nonempty_items')).toBeLessThan(firstInvoiceWrite);
    expect(migration.indexOf('zero_amount_invoice_schedule_graph_requires_manual_review')).toBeLessThan(firstInvoiceWrite);
    expect(migration).toContain('v_repaired_count <> v_validated_zero_count');
  });

  it('blocks every known financial, approval, OCR, payment, and closed-period history', () => {
    for (const requiredGuard of [
      'abs(COALESCE(v_invoice.balance_due, 0)) > 0.01',
      'v_invoice.journal_entry_id IS NOT NULL',
      'FROM public.payment_allocations allocation',
      "allocation.allocation_type = 'invoice'",
      'FROM public.payments payment',
      'FROM public.invoice_approval_history approval',
      'zero_amount_invoice_has_approval_history',
      'FROM public.invoice_ocr_logs ocr_log',
      'zero_amount_invoice_has_ocr_history',
      'FROM public.journal_entries entry',
      'FROM public.journal_entry_lines line',
      'FROM public.journal_entry_status_history history',
      'entry.updated_by IS NOT NULL',
      "entry.workflow_notes, ''",
      "entry.rejection_reason, ''",
      'public.system_agent_date_in_closed_period(',
      'zero_amount_invoice_schedule_has_payment_history',
    ]) {
      expect(migration).toContain(requiredGuard);
    }
  });

  it('retires the empty row and reissues through INSERT instead of repricing it in place', () => {
    expect(migration).toMatch(/UPDATE public\.invoices invoice[\s\S]*?SET status = 'cancelled',[\s\S]*?payment_status = 'cancelled'/);
    expect(migration).toMatch(/UPDATE public\.contract_payment_schedules schedule[\s\S]*?SET invoice_id = NULL/);
    expect(migration).toContain('v_replacement_id := public.system_generate_invoice_for_contract_month_core(');
    expect(migration).toContain('zero_amount_invoice_reissue_postcondition_failed');
    expect(migration).toContain('zero_amount_invoice_reissue_journal_postcondition_failed');
    expect(migration).toContain('system_invoice_has_single_balanced_posted_journal(');
    expect(migration).toContain("lower(COALESCE(entry.status, '')) = 'posted'");
    expect(migration).toContain('FROM public.journal_entry_lines line');
    expect(migration).not.toContain('SET invoice_month = v_month');
    expect(migration).not.toContain('balance_due = v_amount');
    const wrapper = migration.slice(
      migration.indexOf('CREATE FUNCTION public.generate_invoice_for_contract_month('),
      migration.indexOf('REVOKE ALL ON FUNCTION public.generate_invoice_for_contract_month_before_zero_repair'),
    );
    expect(wrapper).not.toContain('INSERT INTO public.invoice_items');
  });

  it('returns the existing positive invoice when no target zero row was replaced', () => {
    expect(migration).toContain('RETURN COALESCE(v_repaired_target_id, v_invoice.id);');
    expect(migration).toContain('existing_positive_invoice_journal_postcondition_failed');
    expect(migration).toContain('contract_invoice_journal_postcondition_failed');
    expect(migration).toContain('contract_invoice_generation_postcondition_failed');
  });

  it('closes exact stale billing findings only after the positive invoice journal postcondition', () => {
    const helper = migration.slice(
      migration.indexOf('CREATE FUNCTION public.system_agent_resolve_invoice_month_findings'),
      migration.indexOf('CREATE FUNCTION public.generate_invoice_for_contract_month('),
    );

    expect(helper).toContain('system_invoice_has_single_balanced_posted_journal(');
    expect(helper).toContain("finding.code = 'invoice.month_reconciliation_needs_review'");
    expect(helper).toContain("finding.code = 'invoice.zero_amount_blocks_billing_month'");
    expect(helper).toContain("finding.code = 'contract.missing_billing_graph'");
    expect(helper).toContain("finding.evidence ->> 'target_month' = v_month::text");
    expect(helper).toContain("status = 'repaired'");

    const journalCheck = migration.indexOf('contract_invoice_journal_postcondition_failed');
    const lifecycleCall = migration.lastIndexOf(
      'PERFORM public.system_agent_resolve_invoice_month_findings(',
    );
    expect(lifecycleCall).toBeGreaterThan(journalCheck);
  });

  it('provides an exact function-name and permission rollback', () => {
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.generate_invoice_for_contract_month(uuid, date)');
    expect(rollback).toContain('RENAME TO generate_invoice_for_contract_month');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.system_invoice_has_single_balanced_posted_journal');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.system_agent_resolve_invoice_month_findings');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.system_generate_invoice_for_contract_month_core');
    expect(rollback).toContain('TO authenticated, service_role');
  });
});
