import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260831205505_harden_get_user_company_id_search_path.sql';
const rollbackPath = 'supabase/rollbacks/20260831205505_harden_get_user_company_id_search_path.rollback.sql';
const migration = readFileSync(migrationPath, 'utf8');
const rollback = readFileSync(rollbackPath, 'utf8');

describe('get_user_company_id search path hardening', () => {
  it('schema-qualifies profiles and works with an empty search path', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.get_user_company_id()');
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain('FROM public.profiles AS profile');
    expect(migration).toContain('profile.user_id = (SELECT auth.uid())');
  });

  it('uses explicit RPC grants instead of the implicit PUBLIC grant', () => {
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.get_user_company_id() FROM PUBLIC');
    expect(migration).toContain('TO anon, authenticated, service_role');
  });

  it('provides a matching rollback', () => {
    expect(rollback).toContain('CREATE OR REPLACE FUNCTION public.get_user_company_id()');
    expect(rollback).toContain('FROM profiles');
    expect(rollback).toContain('TO PUBLIC');
  });
});
