import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260903085138_restore_authenticated_contract_financial_refresh.sql',
  ),
  'utf8',
);

const rollback = readFileSync(
  resolve(
    process.cwd(),
    'supabase/rollbacks/20260903085138_restore_authenticated_contract_financial_refresh.rollback.sql',
  ),
  'utf8',
);

describe('contract financial refresh gateway', () => {
  it('recalculates every active invoice before recalculating the contract', () => {
    expect(migration).toContain('public.recalculate_invoice_financial_state(v_invoice_id)');
    expect(migration).toContain('public.recalculate_contract_financial_state(p_contract_id)');
    expect(migration.indexOf('public.recalculate_invoice_financial_state(v_invoice_id)'))
      .toBeLessThan(migration.indexOf('public.recalculate_contract_financial_state(p_contract_id)'));
  });

  it('fails closed for unauthenticated or cross-company callers', () => {
    expect(migration).toContain("v_actor IS NULL AND v_jwt_role <> 'service_role'");
    expect(migration).toContain('profile.user_id = v_actor');
    expect(migration).toContain('profile.company_id = v_contract_before.company_id');
    expect(migration).toContain("USING ERRCODE = '42501'");
  });

  it('locks down the security-definer search path and grants only explicit roles', () => {
    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain('FROM PUBLIC, anon, authenticated;');
    expect(migration).toContain('TO authenticated, service_role;');
    expect(migration).not.toContain('TO anon');
  });

  it('ships a matching rollback', () => {
    expect(rollback.trim()).toBe(
      'DROP FUNCTION IF EXISTS public.refresh_contract_financial_state_v1(uuid);',
    );
  });
});
