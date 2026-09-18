import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260831051341_enable_c_alf_0041_clause_13_3_penalty.sql',
  'utf8',
);
const rollback = readFileSync(
  'supabase/rollbacks/20260831051341_enable_c_alf_0041_clause_13_3_penalty.rollback.sql',
  'utf8',
);

describe('C-ALF-0041 clause 13.3 contractual penalty correction', () => {
  it('targets only the approved company and contract and fails closed on evidence', () => {
    expect(migration).toContain("'24bc0b21-4e2d-4413-9842-31719a3669f4'");
    expect(migration).toContain("'4fcdae07-20f2-4bad-ba1c-e3de57df2a6d'");
    expect(migration).toContain("v_contract_number CONSTANT TEXT := 'C-ALF-0041'");
    expect(migration).toContain("document.document_type IN ('signed_contract', 'signed_contract_image')");
    expect(migration).toContain("document.legal_identity_match_status = 'matched'");
    expect(migration).toContain("document.legal_evidence_state = 'active'");
    expect(migration).toContain('Expected one active identity-matched signed contract');
  });

  it('records clause 13.3 as a capped fixed QAR 2,000 compensation', () => {
    expect(migration).toContain("v_clause_number CONSTANT TEXT := '13.3'");
    expect(migration).toContain('غرامة 2000 ريال');
    expect(migration).toContain("contractual_compensation_method = 'fixed'");
    expect(migration).toContain('contractual_compensation_rate = 2000');
    expect(migration).toContain('contractual_compensation_cap = 2000');
    expect(migration).toContain("v_breakdown ->> 'contractual_compensation_amount'");
    expect(migration).not.toContain('20000');
  });

  it('has a guarded rollback and leaves immutable memo snapshots untouched', () => {
    expect(rollback).toContain("profile.contractual_compensation_clause_number = '13.3'");
    expect(rollback).toContain('profile.contractual_compensation_rate = 2000');
    expect(rollback).toContain('contractual_compensation_enabled = FALSE');
    expect(migration).not.toMatch(/UPDATE\s+public\.legal_case_memo_snapshots/i);
    expect(rollback).not.toMatch(/UPDATE\s+public\.legal_case_memo_snapshots/i);
  });
});
