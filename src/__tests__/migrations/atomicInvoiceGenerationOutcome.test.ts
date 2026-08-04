import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260803172000_atomic_invoice_generation_outcome.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260803172000_atomic_invoice_generation_outcome.rollback.sql',
), 'utf8');

describe('atomic invoice generation outcome migration', () => {
  it('serializes the existence check and canonical generation on the contract row', () => {
    const lock = migration.indexOf('FOR UPDATE;');
    const existing = migration.indexOf('INTO v_existing_invoice_id');
    const generation = migration.indexOf('public.generate_invoice_for_contract_month(');

    expect(lock).toBeGreaterThan(-1);
    expect(existing).toBeGreaterThan(lock);
    expect(generation).toBeGreaterThan(existing);
    expect(migration).toContain("'created', v_existing_invoice_id IS NULL");
  });

  it('is callable only by the service role', () => {
    expect(migration).toContain(
      'FROM PUBLIC, anon, authenticated, service_role;',
    );
    expect(migration).toContain('TO service_role;');
    expect(migration).not.toMatch(/TO authenticated\s*;/);
    expect(migration).toContain("v_jwt_role <> 'service_role'");
  });

  it('has a matching rollback', () => {
    expect(rollback).toContain(
      'DROP FUNCTION IF EXISTS public.generate_invoice_for_contract_month_outcome(uuid, date);',
    );
  });
});
