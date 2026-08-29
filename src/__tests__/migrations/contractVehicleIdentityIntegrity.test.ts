import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260827111617_repair_contract_vehicle_identity_integrity.sql'),
  'utf8',
);
const rollback = readFileSync(
  resolve(process.cwd(), 'supabase/rollbacks/20260827111617_repair_contract_vehicle_identity_integrity.rollback.sql'),
  'utf8',
);

describe('contract vehicle identity integrity migration', () => {
  it('fails closed on the verified repair cardinalities', () => {
    expect(migration).toContain('Expected 6 proven document-only contract aliases');
    expect(migration).toContain('Expected 29 unambiguous non-overlapping vehicle links');
    expect(migration).toContain('Postcondition failed: an active contract still lacks vehicle_id');
    expect(migration).toContain('Postcondition failed: rented vehicle without a current contract');
  });

  it('requires a unique same-company active vehicle and rejects overlapping rentals', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.normalize_vehicle_plate');
    expect(migration).toContain('v_match_count <> 1');
    expect(migration).toContain("occupied.status IN ('active', 'pending', 'confirmed')");
    expect(migration).toContain("USING ERRCODE = '23P01'");
  });

  it('preserves imported evidence and records the canonical alias without duplicating money', () => {
    expect(migration).toContain('signed_documents_retained_on_alias');
    expect(migration).toContain('INSERT INTO public.contract_number_history');
    expect(migration).toContain("sub_status = 'duplicate_merged'");
    expect(migration).not.toContain('UPDATE public.contract_documents');
  });

  it('has a matching rollback for triggers, links, aliases, and helper functions', () => {
    expect(rollback).toContain('DROP TRIGGER IF EXISTS trg_00_resolve_and_guard_contract_vehicle_identity');
    expect(migration).toContain("'audit_backfill', true");
    expect(rollback).not.toContain('SET vehicle_id = NULL');
    expect(rollback).toContain("SET status = 'active'");
    expect(rollback).toContain('CREATE TRIGGER update_vehicle_status_trigger');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.normalize_vehicle_plate(text)');
  });
});
