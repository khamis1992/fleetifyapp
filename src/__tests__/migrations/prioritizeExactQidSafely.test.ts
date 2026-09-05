import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260903163521_prioritize_exact_qid_for_legal_contract_identity.sql',
), 'utf8');

describe('safe exact-QID legal identity repair', () => {
  it('never overrules an authoritative tenant name extracted from the contract', () => {
    expect(migration.match(/legal_identity_extracted_name/g)?.length).toBeGreaterThanOrEqual(2);
    expect(migration.match(/IS NULL/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('still requires a complete exact QID on both sides', () => {
    expect(migration).toContain("LENGTH(pg_catalog.regexp_replace(COALESCE(document.legal_identity_expected_id, ''), '[^0-9]', '', 'g')) = 11");
    expect(migration).toContain('document.legal_identity_extracted_id');
  });
});
