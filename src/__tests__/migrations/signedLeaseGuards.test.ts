import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260823002617_signed_lease_legal_guards.sql'),
  'utf8'
);

describe('Signed Lease Legal Guards Migration', () => {
  it('should contain the helper function check_contract_has_verified_signed_lease_v1', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.check_contract_has_verified_signed_lease_v1');
    expect(migration).toContain('RETURNS boolean');
  });

  it('should contain the helper function check_contract_identity_verified_v1', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.check_contract_identity_verified_v1');
    expect(migration).toContain('RETURNS boolean');
  });

  it('should wrap the existing convert_contract_to_legal_v1 function', () => {
    expect(migration).toContain('RENAME TO convert_contract_to_legal_v1_pre_signed_lease_guard');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_v1');
  });

  it('should enforce signed lease requirement in convert_contract_to_legal_v1', () => {
    expect(migration).toContain('check_contract_has_verified_signed_lease_v1');
    expect(migration).toContain('لا يمكن التحويل للشؤون القانونية: عقد موقّع مطابق غير موجود');
  });

  it('should enforce identity verification in convert_contract_to_legal_v1', () => {
    expect(migration).toContain('check_contract_identity_verified_v1');
    expect(migration).toContain('لا يمكن التحويل للشؤون القانونية: الهوية غير متحققة');
  });

  it('should create the gap list view', () => {
    expect(migration).toContain('CREATE OR REPLACE VIEW public.legal_contracts_without_signed_lease');
  });

  it('should check for signed_contract and signed_contract_image document types', () => {
    expect(migration).toContain("IN ('signed_contract', 'signed_contract_image')");
  });

  it('should grant appropriate permissions', () => {
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.check_contract_has_verified_signed_lease_v1');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.check_contract_identity_verified_v1');
    expect(migration).toContain('GRANT SELECT ON public.legal_contracts_without_signed_lease');
  });

  it('should use SECURITY DEFINER for helper functions', () => {
    expect(migration).toContain('SECURITY DEFINER');
  });

  it('should filter contracts in legal status for gap list', () => {
    expect(migration).toContain("= 'under_legal_procedure'");
    expect(migration).toContain('legal_status IS NOT NULL');
  });
});

describe('Signed Lease Guards Rollback', () => {
  const rollback = readFileSync(
    resolve(process.cwd(), 'supabase/rollbacks/20260823002617_signed_lease_legal_guards.rollback.sql'),
    'utf8'
  );

  it('should drop the gap list view', () => {
    expect(rollback).toContain('DROP VIEW IF EXISTS public.legal_contracts_without_signed_lease');
  });

  it('should restore original convert_contract_to_legal_v1 function', () => {
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.convert_contract_to_legal_v1');
    expect(rollback).toContain('RENAME TO convert_contract_to_legal_v1');
  });

  it('should drop helper functions', () => {
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.check_contract_identity_verified_v1');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.check_contract_has_verified_signed_lease_v1');
  });
});
