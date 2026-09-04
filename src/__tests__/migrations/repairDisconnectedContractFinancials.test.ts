import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260904192000_repair_disconnected_contract_financials.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260904192000_repair_disconnected_contract_financials.rollback.sql',
), 'utf8');

describe('disconnected contract financial repair', () => {
  it('repairs by company instead of a single hardcoded contract', () => {
    expect(migration).toContain('repair_disconnected_contract_financials_v1');
    expect(migration).toContain('p_company_id uuid');
    expect(migration).toContain("ترحيل من الاتفاقية القديمة: ([A-Z0-9-]+)");
    expect(migration).toContain("status IN ('active', 'under_legal_procedure')");
    expect(migration).toContain('generate_invoice_for_contract_month');
    expect(migration).toContain('allocate_contract_receipts_fifo');
    expect(migration).not.toContain("contract_number = 'LTO2024276'");
  });

  it('does not attach payment-migration PYINV3 invoices', () => {
    expect(migration).toContain('Does not attach PYINV3');
    expect(migration).not.toContain('PYINV3-PAY-MIG');
  });

  it('has a matching rollback', () => {
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.repair_disconnected_contract_financials_v1');
    expect(rollback).toContain('_backup_disconnected_payment_relink_20260904');
  });
});
