import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260904184500_relink_lto2024276_financials.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260904184500_relink_lto2024276_financials.rollback.sql',
), 'utf8');

describe('LTO2024276 financial relink', () => {
  it('relinks note-matched receipts and generates the 36-month invoice graph', () => {
    expect(migration).toContain("contract_number = 'LTO2024276'");
    expect(migration).toContain("notes ILIKE '%LTO2024276%'");
    expect(migration).toContain('app.financial_controls_bypass');
    expect(migration).toContain('generate_invoice_for_contract_month');
    expect(migration).toContain('allocate_contract_receipts_fifo');
    expect(migration).toContain('recalculate_contract_financial_state');
    expect(migration).not.toContain('generate_invoices_from_payment_schedule');
  });

  it('does not attach the payment-migration PYINV3 invoices', () => {
    expect(migration).toContain('Does not attach the 1,250 PYINV3');
    expect(migration).not.toContain('PYINV3-PAY-MIG');
  });

  it('has a matching rollback for payment and amount backups', () => {
    expect(rollback).toContain('_backup_lto2024276_payment_relink_20260904');
    expect(rollback).toContain('_backup_lto2024276_contract_amount_20260904');
    expect(rollback).toContain('app.financial_controls_bypass');
  });
});
