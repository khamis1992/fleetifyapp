import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260803173500_durable_daily_invoice_repair_progress.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260803173500_durable_daily_invoice_repair_progress.rollback.sql',
), 'utf8');

describe('durable daily invoice repair progress', () => {
  it('persists a tenant-scoped compare-and-swap cursor', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.daily_invoice_repair_cursors');
    expect(migration).toContain('company_id uuid PRIMARY KEY');
    expect(migration).toContain('version bigint NOT NULL DEFAULT 0');
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('GRANT SELECT, INSERT, UPDATE ON TABLE public.daily_invoice_repair_cursors TO service_role');
  });

  it('provides bounded service-only recalculation commands', () => {
    expect(migration).toContain('public.recalculate_invoice_financial_states_batch(');
    expect(migration).toContain('public.recalculate_contract_financial_states_batch(');
    expect(migration).toContain('Invoice recalculation batch cannot exceed 500 rows');
    expect(migration).toContain('Contract recalculation batch cannot exceed 500 rows');
    expect(migration).toContain("v_role <> 'service_role'");
    expect(migration).toContain("'errors', v_errors");
  });

  it('has a matching rollback', () => {
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.recalculate_contract_financial_states_batch(uuid, uuid[])');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.recalculate_invoice_financial_states_batch(uuid, uuid[])');
    expect(rollback).toContain('DROP TABLE IF EXISTS public.daily_invoice_repair_cursors');
  });
});
