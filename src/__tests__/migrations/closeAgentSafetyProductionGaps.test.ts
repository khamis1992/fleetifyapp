import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260828141115_close_agent_safety_production_gaps.sql'),
  'utf8',
);
const rollback = readFileSync(
  resolve(process.cwd(), 'supabase/rollbacks/20260828141115_close_agent_safety_production_gaps.rollback.sql'),
  'utf8',
);

describe('agent safety production gap closure', () => {
  it('adds direct company and contract scoped links to Taqadi jobs', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS lawsuit_preparation_id uuid');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS source_document_id uuid');
    expect(migration).toContain('taqadi_filing_jobs_lawsuit_preparation_scope_fkey');
    expect(migration).toContain('taqadi_filing_jobs_source_document_scope_fkey');
  });

  it('hydrates and rejects unverifiable Taqadi links before queue insertion', () => {
    expect(migration).toContain('hydrate_and_guard_taqadi_filing_links_v1');
    expect(migration).toContain('TAQADI_PAYLOAD_SOURCE_DOCUMENT_MISMATCH');
    expect(migration).toContain('TAQADI_LAWSUIT_PREPARATION_LINK_REQUIRED');
    expect(migration).toContain('TAQADI_DIRECT_ACTIVE_MATCHED_SOURCE_REQUIRED');
    expect(migration).toContain("document.legal_identity_match_status = 'matched'");
    expect(migration).toContain("document.legal_evidence_state = 'active'");
  });

  it('quarantines every ambiguous legacy candidate instead of guessing a winner', () => {
    expect(migration).toContain("HAVING count(*) > 1");
    expect(migration).toContain("legal_evidence_state = 'quarantined'");
    expect(migration).toContain('AMBIGUOUS_MULTIPLE_ACTIVE_MATCHED_DOCUMENTS');
    expect(migration).toContain('enqueue_missing_contract_pdf_request_v1');
    expect(migration).not.toContain('plate_number');
  });

  it('keeps quarantined legal evidence quarantined on rollback', () => {
    expect(rollback).toContain('DROP COLUMN IF EXISTS source_document_id');
    expect(rollback).toContain('DROP COLUMN IF EXISTS lawsuit_preparation_id');
    expect(rollback).toContain('must never reactivate ambiguous legal evidence automatically');
    expect(rollback).not.toContain("SET legal_evidence_state = 'active'");
  });
});
