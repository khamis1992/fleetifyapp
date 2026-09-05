import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260902035618_payment_cancellation_restores_original_invoice.sql',
  ),
  'utf8',
);

const rollback = readFileSync(
  resolve(
    process.cwd(),
    'supabase/rollbacks/20260902035618_payment_cancellation_restores_original_invoice.rollback.sql',
  ),
  'utf8',
);

const paymentOperations = readFileSync(
  resolve(process.cwd(), 'src/hooks/business/usePaymentOperations.ts'),
  'utf8',
);

describe('payment cancellation restores the original invoice', () => {
  it('delegates the accounting reversal and never inserts a cancellation invoice', () => {
    expect(migration).toContain(
      'public.cancel_payment_with_reversal_before_invoice_restore(',
    );
    expect(migration).toContain(
      'PERFORM public.recalculate_invoice_financial_state(v_invoice_id);',
    );
    expect(migration).toContain("'created_invoice_count', 0");

    const wrapperStart = migration.indexOf(
      'CREATE FUNCTION public.cancel_payment_with_reversal(',
    );
    const repairStart = migration.indexOf('DO $repair_lto202437$');
    const wrapper = migration.slice(wrapperStart, repairStart);
    expect(wrapper).not.toContain('INSERT INTO public.invoices');
  });

  it('uses the one non-penalty invoice in the same contract month as source of truth', () => {
    expect(migration).toContain('invoice.penalty_id IS NULL');
    expect(migration).toContain(
      'COALESCE(invoice.invoice_month, invoice.due_date, invoice.invoice_date)',
    );
    expect(migration).toContain('amount = round(v_invoice.total_amount::numeric, 2)');
    expect(migration).toContain('public.canonical_invoice_paid_amount(v_invoice.id, NULL)');
    expect(migration).toContain('cardinality(v_candidate_ids) > 1');
  });

  it('never changes the original invoice total while restoring its balance', () => {
    const wrapperStart = migration.indexOf(
      'CREATE FUNCTION public.cancel_payment_with_reversal(',
    );
    const repairStart = migration.indexOf('DO $repair_lto202437$');
    const wrapper = migration.slice(wrapperStart, repairStart);

    expect(wrapper).toContain(
      'PERFORM public.recalculate_invoice_financial_state(v_invoice_id);',
    );
    expect(wrapper).not.toMatch(/UPDATE\s+public\.invoices[\s\S]*?total_amount\s*=/i);
  });

  it('removes direct browser access to the renamed legacy implementation', () => {
    expect(migration).toContain(
      'public.cancel_payment_with_reversal_before_invoice_restore(uuid, uuid, text, uuid)',
    );
    expect(migration).toContain('FROM PUBLIC, anon, authenticated;');
  });

  it('repairs and can restore the four known LTO202437 schedule mismatches', () => {
    expect(migration).toContain("'f596cdbb-3df9-4281-9347-24d9400ada79'");
    expect(migration).toContain("'34077b49-a76d-4a1c-846c-d082cd8070f9'");
    expect(migration).toContain('1060::numeric, 0::numeric');
    expect(rollback).toContain('500::numeric');
    expect(rollback).toContain(
      'public.cancel_payment_with_reversal_before_invoice_restore(uuid, uuid, text, uuid)',
    );
  });

  it('refreshes contract invoices and schedules after a successful cancellation', () => {
    expect(paymentOperations).toContain("queryKey: ['contract-invoices']");
    expect(paymentOperations).toContain("queryKey: ['contract-payments']");
    expect(paymentOperations).toContain("queryKey: ['payment-schedules']");
    expect(paymentOperations).toContain("queryKey: ['contract-details']");
  });
});
