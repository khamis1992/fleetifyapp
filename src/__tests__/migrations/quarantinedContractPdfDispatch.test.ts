import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260828143400_fix_quarantined_contract_pdf_dispatch.sql'),
  'utf8',
) + readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260828143935_expire_stale_contract_identity_before_pdf_dispatch.sql'),
  'utf8',
);
const rollback = readFileSync(
  resolve(process.cwd(), 'supabase/rollbacks/20260828143400_fix_quarantined_contract_pdf_dispatch.rollback.sql'),
  'utf8',
);

describe('quarantined contract PDF dispatch', () => {
  it('accepts only active identity-matched evidence as ready', () => {
    expect(migration).toContain("document.legal_identity_match_status = 'matched'");
    expect(migration).toContain("document.legal_evidence_state = 'active'");
    expect(migration).toContain("document.legal_evidence_state = 'quarantined'");
  });

  it('never fulfills a request from quarantined evidence', () => {
    expect(migration).toContain("NEW.legal_identity_match_status <> 'matched'");
    expect(migration).toContain("NEW.legal_evidence_state <> 'active'");
  });

  it('queues future quarantine events and repairs existing gaps idempotently', () => {
    expect(migration).toContain('queue_quarantined_contract_pdf_request_v1');
    expect(migration).toContain('trg_queue_quarantined_contract_pdf_request');
    expect(migration).toContain('NOT EXISTS (');
    expect(migration).toContain("'identity_mismatch'");
    expect(migration).toContain('ON CONFLICT (request_id, phone_e164) DO NOTHING');
  });

  it('expires identity checks after the documented 24-hour window', () => {
    expect(migration).toContain("document.created_at + interval '24 hours'");
    expect(migration).toContain("'expired_unverified'");
    expect(migration).toContain("document.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid");
    expect(migration).toContain('FROM public.contracts contract');
    expect(migration).toContain('AMBIGUOUS_MULTIPLE_ACTIVE_MATCHED_DOCUMENTS');
  });

  it('does not restore unsafe evidence behavior on rollback', () => {
    expect(rollback).toContain('refusing an unsafe rollback');
    expect(rollback).not.toContain("legal_evidence_state = 'active'");
  });
});
