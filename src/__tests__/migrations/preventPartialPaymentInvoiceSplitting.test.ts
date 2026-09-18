import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260901172854_prevent_partial_payment_invoice_splitting.sql',
);
const rollbackPath = resolve(
  process.cwd(),
  'supabase/rollbacks/20260901172854_prevent_partial_payment_invoice_splitting.rollback.sql',
);
const paymentDialogPath = resolve(
  process.cwd(),
  'src/components/finance/PayInvoiceDialog.tsx',
);

const migration = readFileSync(migrationPath, 'utf8');
const rollback = readFileSync(rollbackPath, 'utf8');
const paymentDialog = readFileSync(paymentDialogPath, 'utf8');

describe('partial invoice payment invariant', () => {
  it('removes browser execution access from the legacy invoice-from-payment RPC', () => {
    expect(migration).toContain('REVOKE EXECUTE ON FUNCTION public.create_invoice_from_payment(');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated;');
    expect(migration).not.toMatch(/GRANT\s+EXECUTE[\s\S]*TO\s+(?:PUBLIC|anon|authenticated)/i);
  });

  it('keeps a reversible rollback for the legacy grants', () => {
    expect(rollback).toContain('GRANT EXECUTE ON FUNCTION public.create_invoice_from_payment(');
    expect(rollback).toContain('TO PUBLIC, anon, authenticated;');
  });

  it('tells the operator that a partial payment leaves the balance on the same invoice', () => {
    expect(paymentDialog).toContain('سيبقى الرصيد على نفس الفاتورة');
    expect(paymentDialog).not.toContain('سيتم إنشاء فاتورة للمتبقي');
  });

  it('keeps a persisted late-fee waiver effective after reopening the dialog', () => {
    expect(paymentDialog).toContain('.in("status", ["pending", "applied", "waived"])');
    expect(paymentDialog).toContain('const persistedLateFeeWaived');
    // Only refreshed database evidence may waive the currently open invoice.
    // A dialog-local flag can leak a previous invoice's waiver after navigation.
    // The mounted PayInvoiceDialog.feedback suite verifies both waiver sources
    // and late responses arriving after switching invoices.
    expect(paymentDialog).toContain('const isLateFeeWaived = persistedLateFeeWaived;');
    expect(paymentDialog).not.toContain('lateFeeWaived || persistedLateFeeWaived');
  });

  it('persists a waiver even when the late fee was calculated only in the browser', () => {
    expect(paymentDialog).toContain('fee_type: "daily"');
    expect(paymentDialog).toContain('status: "waived"');
    expect(paymentDialog).toContain('waived_at: waivedAt');
  });
});
