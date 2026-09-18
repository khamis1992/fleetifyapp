import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260903161841_support_authoritative_partial_contract_schedules.sql',
  ),
  'utf8',
);
const rollback = readFileSync(
  resolve(
    process.cwd(),
    'supabase/rollbacks/20260903161841_support_authoritative_partial_contract_schedules.rollback.sql',
  ),
  'utf8',
);
const detailsPage = readFileSync(
  resolve(process.cwd(), 'src/components/contracts/ContractDetailsPageRedesigned.tsx'),
  'utf8',
);
const quickPayment = readFileSync(
  resolve(process.cwd(), 'src/components/payments/QuickPaymentRecording.tsx'),
  'utf8',
);

describe('authoritative partial contract schedule migration', () => {
  it('exposes one tenant-authorized atomic billing command with a rollback', () => {
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.generate_contract_billing_graph_v2(',
    );
    expect(migration).toMatch(/SECURITY DEFINER\s+SET search_path = ''/i);
    expect(migration).toContain('public.is_finance_action_authorized(');
    expect(migration).toContain('profile.company_id = v_contract.company_id');
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.generate_contract_billing_graph_v2\(uuid\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role;/i,
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.generate_contract_billing_graph_v2\(uuid\)[\s\S]*TO authenticated, service_role;/i,
    );
    expect(rollback).toContain(
      'DROP FUNCTION IF EXISTS public.generate_contract_billing_graph_v2(uuid);',
    );
  });

  it('treats a complete schedule as authoritative without weakening financial invariants', () => {
    expect(migration).toContain('v_schedule_total - v_contract_total');
    expect(migration).toContain('v_distinct_schedule_month_count <> v_active_schedule_count');
    expect(migration).toContain('v_expected_schedule_month_count <> v_active_schedule_count');
    expect(migration).toContain('v_distinct_installment_count <> v_active_schedule_count');
    expect(migration).toContain('The first installment must be partial');
    expect(migration).toContain('The last installment must be partial');
    expect(migration).toContain(
      'Partial-period contract requires an authoritative payment schedule',
    );
    expect(migration).toContain('schedule.amount > v_monthly_amount + 0.01');
    expect(migration).toContain('public.system_agent_date_in_closed_period(');
    expect(migration).toContain('public.system_generate_invoice_for_contract_month_core(');
    expect(migration).toContain('public.system_invoice_has_single_balanced_posted_journal(');
    expect(migration).toContain('public.system_agent_resolve_invoice_month_findings(');
    expect(migration).not.toMatch(/UPDATE\s+public\.contracts\s+SET\s+(?:contract_amount|monthly_amount)/i);
  });

  it('routes both invoice-generation interfaces through the same command', () => {
    for (const source of [detailsPage, quickPayment]) {
      expect(source).toContain('generateContractBillingGraph(');
      expect(source).not.toContain(".rpc('generate_invoices_from_payment_schedule'");
      expect(source).not.toContain(".rpc('generate_payment_schedules_for_contract'");
    }
  });
});
