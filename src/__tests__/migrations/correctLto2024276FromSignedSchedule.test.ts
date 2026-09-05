import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260903162734_correct_lto2024276_from_signed_schedule.sql',
), 'utf8');

describe('LTO2024276 signed-schedule correction', () => {
  it('fails closed if financial or legal state changed after review', () => {
    expect(migration).toContain('LTO2024276 changed after review');
    expect(migration).toContain('LTO2024276 schedule changed after review');
    expect(migration).toContain('acquired invoices, payments, or a frozen legal snapshot');
    expect(migration).toContain('CASE-26-0059');
    expect(migration).toContain('filing_date IS NULL');
  });

  it('uses the exact schedule printed in signed Agreement 2024/276', () => {
    expect(migration).toContain("DATE '2024-08-15' AS due_date, 900::numeric AS amount");
    expect(migration).toContain("DATE '2024-09-01'");
    expect(migration).toContain("DATE '2027-07-01'");
    expect(migration).toContain("SELECT 37::integer, DATE '2027-08-01', 900::numeric");
    expect(migration).toContain('monthly_amount = 1800');
    expect(migration).toContain('contract_amount = 64800');
    expect(migration).toContain('v_schedule_count <> 37 OR v_schedule_total <> 64800');
  });

  it('requires the reviewed document to have an exact 11-digit identity match', () => {
    expect(migration).toContain("document.legal_identity_match_status = 'matched'");
    expect(migration).toContain("LENGTH(pg_catalog.regexp_replace(COALESCE(document.legal_identity_expected_id, ''), '[^0-9]', '', 'g')) = 11");
    expect(migration).toContain("document.legal_identity_extracted_id");
  });
});
