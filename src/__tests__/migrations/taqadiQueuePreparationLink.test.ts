import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260902212707_ensure_taqadi_preparation_before_queue.sql',
);
const rollbackPath = resolve(
  process.cwd(),
  'supabase/rollbacks/20260902212707_ensure_taqadi_preparation_before_queue.rollback.sql',
);

const migration = readFileSync(migrationPath, 'utf8');
const rollback = readFileSync(rollbackPath, 'utf8');

describe('Taqadi queue preparation link migration', () => {
  it('freezes a company, contract and case scoped preparation before the job insert', () => {
    const preparationInsert = migration.indexOf(
      'INSERT INTO public.lawsuit_preparations',
    );
    const jobInsert = migration.indexOf('INSERT INTO public.taqadi_filing_jobs');

    expect(preparationInsert).toBeGreaterThan(-1);
    expect(jobInsert).toBeGreaterThan(preparationInsert);
    expect(migration).toContain('preparation.legal_case_id = p_legal_case_id');
    expect(migration).toContain('v_preparation_id,');
    expect(migration).toContain('v_source_document_id');
  });

  it('keeps queue creation atomic, idempotent and tenant checked', () => {
    expect(migration).toContain('BEGIN;');
    expect(migration).toContain('COMMIT;');
    expect(migration).toContain('public.get_user_company_id() IS DISTINCT FROM p_company_id');
    expect(migration).toContain('job.idempotency_key = pg_catalog.btrim(p_idempotency_key)');
    expect(migration).toContain("SET search_path = ''");
  });

  it('has a rollback that restores the previous RPC contract and grants', () => {
    expect(rollback).toContain(
      'CREATE OR REPLACE FUNCTION public.enqueue_taqadi_filing_job_v1',
    );
    expect(rollback).toContain('TO authenticated, service_role;');
  });
});
