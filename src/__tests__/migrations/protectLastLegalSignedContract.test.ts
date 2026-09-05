import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260903173353_protect_last_legal_signed_contract.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260903173353_protect_last_legal_signed_contract.rollback.sql',
), 'utf8');

describe('last legal signed-contract protection', () => {
  it('protects both supported signed contract document types', () => {
    expect(migration).toContain("'signed_contract'");
    expect(migration).toContain("'signed_contract_image'");
    expect(migration).toContain('BEFORE DELETE OR UPDATE OF document_type, file_path, contract_id, company_id');
    expect(migration).toContain('v_removes_signed_evidence');
  });

  it('allows deletion only after a replacement signed file exists', () => {
    expect(migration).toContain('replacement.id <> OLD.id');
    expect(migration).toContain('v_has_replacement');
    expect(migration).toContain('IF NOT v_has_replacement THEN');
    expect(migration).toContain("replacement.legal_identity_match_status = 'matched'");
    expect(migration).toContain("replacement.legal_evidence_state = 'active'");
    expect(migration).toContain('FOR SHARE OF replacement NOWAIT');
  });

  it('blocks deletion during active contract or case legal workflow', () => {
    expect(migration).toContain("v_contract.status <> 'under_legal_procedure'");
    expect(migration).toContain('v_has_open_legal_case');
    expect(migration).toContain('SIGNED_CONTRACT_REPLACEMENT_REQUIRED');
  });

  it('protects canonical consumers and makes lock contention explicit', () => {
    expect(migration).toContain('link.canonical_contract_id = v_contract.id');
    expect(migration).toContain('FOR NO KEY UPDATE NOWAIT');
    expect(migration).toContain('SIGNED_CONTRACT_EVIDENCE_BUSY');
    expect(migration).toContain("NOT IN ('closed', 'cancelled')");
  });

  it('is tenant-qualified, locked down and reversible', () => {
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain('replacement.company_id = OLD.company_id');
    expect(migration).toContain('legal_case.company_id = OLD.company_id');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(rollback).toContain('DROP TRIGGER IF EXISTS trg_protect_last_legal_signed_contract');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.protect_last_legal_signed_contract_v1');
  });
});
