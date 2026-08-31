import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260830151737_legal_accrual_continuation.sql',
), 'utf8');

describe('legal rent accrual continuation migration', () => {
  it('keeps legal extension separate and prevents rent/retention overlap', () => {
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.calculate_legal_claim_breakdown_v2',
    );
    expect(migration).toContain("lp.contract_status = 'under_legal_procedure'");
    expect(migration).toContain("lp.vehicle_custody = 'with_defendant'");
    expect(migration).toContain('lp.rescission_effective_date + 1');
    expect(migration).toContain("'legal_extension_rent_amount'");
    expect(migration).toContain("'retention_start_date'");
  });

  it('does not apply contractual compensation to the legal extension component', () => {
    const claimRows = migration.indexOf('claim_rows AS');
    const extensionAmount = migration.indexOf('extension_amount AS');
    const contractualRaw = migration.indexOf('contractual_raw AS');

    expect(claimRows).toBeGreaterThan(-1);
    expect(extensionAmount).toBeGreaterThan(claimRows);
    expect(contractualRaw).toBeGreaterThan(extensionAmount);
    expect(migration.slice(contractualRaw, migration.indexOf('extras AS')))
      .not.toContain('legal_extension_rent_amount');
  });

  it('limits the production correction to the twenty authorized contracts', () => {
    const authorized = [
      'AGR-202504-400949', 'AGR-202504-406129', 'AGR-202504-424958',
      'C-ALF-0001', 'C-ALF-0008', 'C-ALF-0014', 'C-ALF-0023',
      'C-ALF-0025', 'C-ALF-0033', 'C-ALF-0039', 'C-ALF-0042',
      'C-ALF-0067', 'C-ALF-0083', 'CON-25-ZV0RA7',
      'HIST-XLS-B70-706150', 'HIST-XLS-T77-5900', 'LTO2024141',
      'LTO2024263', 'LTO2024270', 'LTO2024284',
    ];

    authorized.forEach((contractNumber) => expect(migration).toContain(`'${contractNumber}'`));
    expect(migration).not.toContain('C-ALF-0046');
    expect(migration).not.toMatch(/SET\s+customer_id\s*=/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.customers/i);
  });
});
