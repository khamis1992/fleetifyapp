import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260901090230_unify_legal_claim_engine_and_cancelled_collection.sql',
), 'utf8');

const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260901090230_unify_legal_claim_engine_and_cancelled_collection.rollback.sql',
), 'utf8');

const volatilityFix = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260901121641_fix_legal_transfer_readiness_v2_volatility.sql',
), 'utf8');

describe('unified legal claim engine v4', () => {
  it('uses one evidenced calculation and discloses excluded amounts', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.calculate_legal_claim_statement_v4');
    expect(migration).toContain('FROM public.penalties penalty');
    expect(migration).toContain("document.document_type = 'violations_proof'");
    expect(migration).toContain("'future_rent'");
    expect(migration).toContain("'penalty_linked_invoices'");
    expect(migration).toContain("'legacy_late_fine'");
  });

  it('stops every component at the initial judgment date', () => {
    expect(migration).toContain("'judgment_issued', 'appeal', 'enforcement', 'collection', 'closed'");
    expect(migration).toContain('v_effective_date := LEAST(');
    expect(migration).toContain("'cutoff_source'");
    expect(migration).toContain("'initial_judgment'");
    expect(migration).toContain('trg_freeze_initial_judgment_claim_snapshot');
  });

  it('preserves cancelled contract and vehicle state while creating collection case', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_collection_v2');
    expect(migration).toContain("'cancelled', 'canceled', 'closed', 'expired'");
    expect(migration).toContain("'contract_status_preserved', true");
    expect(migration).toContain("'vehicle_state_preserved', true");

    const cancelledBranch = migration.slice(
      migration.indexOf('ELSE\n    SELECT\n      COALESCE('),
      migration.indexOf('IF v_case_id IS NULL THEN'),
    );
    expect(cancelledBranch).not.toMatch(/UPDATE\s+public\.contracts/i);
    expect(cancelledBranch).not.toMatch(/UPDATE\s+public\.vehicles/i);
  });

  it('freezes transfer and initial-judgment snapshots behind tenant checks', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.legal_claim_snapshots');
    expect(migration).toContain('public.can_prepare_contract_for_legal_v1');
    expect(migration).toContain("'transfer'");
    expect(migration).toContain("'initial_judgment'");
    expect(migration).toContain('REVOKE ALL ON TABLE public.legal_claim_snapshots FROM PUBLIC, anon, authenticated');
  });

  it('has a matching rollback for all new database objects', () => {
    expect(rollback).toContain('DROP TRIGGER IF EXISTS trg_freeze_initial_judgment_claim_snapshot');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.convert_contract_to_legal_collection_v2');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.calculate_legal_claim_statement_v4');
    expect(rollback).toContain('DROP TABLE IF EXISTS public.legal_claim_snapshots');
    expect(rollback).toContain('DROP COLUMN IF EXISTS source_contract_status');
  });

  it('keeps the readiness wrapper volatile because v1 performs locking work', () => {
    const readinessV2 = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION public.get_legal_transfer_readiness_v2'),
      migration.indexOf('CREATE OR REPLACE FUNCTION public.complete_legal_transfer_readiness_v2'),
    );
    expect(readinessV2).toContain('VOLATILE');
    expect(readinessV2).not.toContain('\nSTABLE\n');
    expect(volatilityFix).toContain(
      'ALTER FUNCTION public.get_legal_transfer_readiness_v2(uuid, uuid) VOLATILE',
    );
    expect(volatilityFix).toContain("NOTIFY pgrst, 'reload schema'");
  });
});
