import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = read(
  'supabase/migrations/20260827155145_agent_owned_legal_filing_approval.sql',
);
const rollback = read(
  'supabase/rollbacks/20260827155145_agent_owned_legal_filing_approval.rollback.sql',
);

describe('agent-owned legal filing approval', () => {
  it('allows only the trusted Taqadi worker to approve a reviewed packet', () => {
    expect(migration).toContain('approve_taqadi_reviewed_legal_file_v1');
    expect(migration).toContain("COALESCE(auth.role(), '') <> 'service_role'");
    expect(migration).toContain("v_job.status <> 'reviewing'");
    expect(migration).toContain("v_job.current_step <> 'final_review'");
    expect(migration).toContain('job.locked_by = BTRIM(p_worker_id)');
    expect(migration).toContain('TO service_role');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('prevent_direct_legal_memo_snapshot_approval_v1');
    expect(migration).toContain('only the Taqadi worker may approve the legal file after portal review');
  });

  it('fails closed when the portal review, snapshot, or claim changed', () => {
    expect(migration).toContain("p_review_details ->> 'matched'");
    expect(migration).toContain("p_review_details ->> 'claimAmountMatches'");
    expect(migration).toContain("v_job.payload ->> 'memoSnapshotId'");
    expect(migration).toContain('a newer memo snapshot exists');
    expect(migration).toContain('calculate_legal_claim_amount_v1');
    expect(migration).toContain('claim amount changed after the reviewed memo was frozen');
    expect(migration).toContain('trg_legal_memo_snapshot_invalidates_approval');
    expect(migration).toContain("WHEN (NEW.readiness_status <> 'approved')");
    expect(migration).toContain("OLD.readiness_status <> 'approved'");
    expect(migration).toContain('old_material IS NOT DISTINCT FROM new_material');
  });

  it('records the agent source, job, worker, and review event', () => {
    expect(migration).toContain("approval_source = 'taqadi_agent'");
    expect(migration).toContain('approval_job_id = v_job.id');
    expect(migration).toContain('approval_worker_id = BTRIM(p_worker_id)');
    expect(migration).toContain("'agent_approved'");
  });

  it('has a reversible schema and function rollback', () => {
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.approve_taqadi_reviewed_legal_file_v1');
    expect(rollback).toContain('DROP COLUMN IF EXISTS approval_source');
    expect(rollback).toContain('CREATE OR REPLACE FUNCTION public.guard_legal_memo_profile_approval');
    expect(rollback).toContain('DROP TRIGGER IF EXISTS trg_legal_memo_snapshot_invalidates_approval');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.prevent_direct_legal_memo_snapshot_approval_v1');
    expect(rollback).toContain('CREATE OR REPLACE FUNCTION public.prevent_legal_memo_snapshot_mutation');
  });
});
