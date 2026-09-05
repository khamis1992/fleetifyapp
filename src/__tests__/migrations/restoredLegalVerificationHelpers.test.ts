import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260902152033_restore_legal_transfer_verification_helpers.sql',
  ),
  'utf8',
);

const rollback = readFileSync(
  resolve(
    process.cwd(),
    'supabase/rollbacks/20260902152033_restore_legal_transfer_verification_helpers.rollback.sql',
  ),
  'utf8',
);

describe('restored legal-transfer verification helpers', () => {
  it('restores both functions required by the conversion RPC', () => {
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.check_contract_has_verified_signed_lease_v1',
    );
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.check_contract_identity_verified_v1',
    );
  });

  it('uses the current direct active identity-matched evidence model', () => {
    expect(migration).toContain('public.get_direct_signed_contract_evidence_state_v1');
    expect(migration).toContain("(v_evidence ->> 'ready')::boolean");
    expect(migration).toContain("(v_evidence ->> 'activeMatchedCount')::integer");
    expect(migration).not.toContain('customer_verification_tasks');
  });

  it('is scoped, fail-closed, and callable only by trusted application roles', () => {
    expect(migration).toContain('public.can_prepare_contract_for_legal_v1');
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain('FROM PUBLIC, anon');
    expect(migration).toContain('TO authenticated, service_role');
  });

  it('provides an explicit rollback for both helpers', () => {
    expect(rollback).toContain(
      'DROP FUNCTION IF EXISTS public.check_contract_identity_verified_v1',
    );
    expect(rollback).toContain(
      'DROP FUNCTION IF EXISTS public.check_contract_has_verified_signed_lease_v1',
    );
  });
});
