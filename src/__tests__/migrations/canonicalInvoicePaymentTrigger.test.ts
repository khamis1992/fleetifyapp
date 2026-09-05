import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260901175416_canonicalize_legacy_invoice_payment_trigger.sql',
  ),
  'utf8',
);

const rollback = readFileSync(
  resolve(
    process.cwd(),
    'supabase/rollbacks/20260901175416_canonicalize_legacy_invoice_payment_trigger.rollback.sql',
  ),
  'utf8',
);

const reportedInvoiceRepair = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260901175802_repair_inv_c_alf_0045_025_financial_state.sql',
  ),
  'utf8',
);

describe('canonical invoice payment trigger', () => {
  it('finishes payment writes by recalculating from the allocation ledger', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.update_invoice_on_payment()');
    expect(migration).toContain('public.recalculate_invoice_financial_state(NEW.invoice_id)');
    expect(migration).not.toContain('SELECT COALESCE(SUM(amount), 0)');
  });

  it('keeps the production migration schema-only and free of bulk financial rewrites', () => {
    expect(migration).not.toContain('DO $repair$');
    expect(migration).not.toContain('UPDATE public.invoices');
    expect(migration).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });

  it('protects the security-definer trigger function from browser roles', () => {
    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain('SET search_path TO \'public\'');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated;');
  });

  it('keeps a rollback for the previous direct-payment-only behavior', () => {
    expect(rollback).toContain('SELECT COALESCE(SUM(amount), 0)');
    expect(rollback).toContain('TO PUBLIC, anon, authenticated, service_role;');
  });

  it('repairs only the reported invoice and verifies that it is fully paid', () => {
    expect(reportedInvoiceRepair).toContain("invoice.invoice_number = 'INV-C-ALF-0045-025'");
    expect(reportedInvoiceRepair).toContain('public.recalculate_invoice_financial_state(v_invoice_id)');
    expect(reportedInvoiceRepair).toContain("v_invoice.payment_status <> 'paid'");
    expect(reportedInvoiceRepair).toContain("v_invoice.status <> 'paid'");
  });
});
