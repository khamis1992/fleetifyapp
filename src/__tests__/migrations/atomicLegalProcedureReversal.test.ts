import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260903181343_atomic_retry_safe_legal_procedure_reversal.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260903181343_atomic_retry_safe_legal_procedure_reversal.rollback.sql',
), 'utf8');
const service = readFileSync(resolve(
  process.cwd(),
  'src/services/contractLegalProcedureService.ts',
), 'utf8');

describe('atomic legal-procedure reversal', () => {
  it('serializes the full contract transition and supports retry-safe replay', () => {
    expect(migration).toContain('pg_catalog.pg_advisory_xact_lock');
    expect(migration).toContain('idempotency_key uuid');
    expect(migration).toContain('uq_contract_operations_company_type_idempotency');
    expect(migration).toContain("'idempotent_replay', true");
  });

  it('fails closed for filed cases and active Taqadi submissions', () => {
    expect(migration).toContain('legal_case.filing_date IS NOT NULL');
    expect(migration).toContain("job.status = 'filed'");
    expect(migration).toContain("'validating', 'filling_case', 'validating_parties', 'uploading_documents', 'reviewing', 'submitting'");
    expect(migration).toContain('close it through the audited case-outcome workflow');
    expect(migration).toContain("job.error_code = 'SUBMISSION_UNCERTAIN'");
    expect(migration).toContain('preparation.submitted_at IS NOT NULL OR preparation.registered_at IS NOT NULL');
  });

  it('locks case, job, and preparation rows before checking filing state without waiting on conflicting writers', () => {
    const start = migration.indexOf('-- Enqueue locks the case');
    const lockSection = migration.slice(start, migration.indexOf('IF EXISTS (', start));
    expect(lockSection).toContain('ORDER BY legal_case.id');
    expect(lockSection).toContain('ORDER BY job.id');
    expect(lockSection).toContain('ORDER BY preparation.id');
    expect(lockSection.match(/FOR UPDATE NOWAIT/g)).toHaveLength(3);
    expect(lockSection).toContain("USING ERRCODE = '55P03'");
  });

  it('guards every queue re-entry, including old restart RPCs, and rolls back that guard', () => {
    expect(migration).toContain('BEFORE INSERT OR UPDATE OF status, company_id, contract_id, legal_case_id');
    expect(migration).toContain("v_case.workflow_stage IS DISTINCT FROM 'preparation'");
    expect(migration).toContain('FOR SHARE NOWAIT');
    expect(rollback).toContain('DROP TRIGGER IF EXISTS trg_guard_taqadi_queue_open_case');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.guard_taqadi_queue_open_case_v1');
  });

  it('updates every dependent legal state in the same database transaction', () => {
    expect(migration).toContain('UPDATE public.taqadi_filing_jobs');
    expect(migration).toContain('INSERT INTO public.taqadi_filing_job_events');
    expect(migration).toContain('UPDATE public.lawsuit_preparations');
    expect(migration).toContain('UPDATE public.legal_cases');
    expect(migration).toContain('UPDATE public.delinquent_customers');
    expect(migration).toContain('UPDATE public.contracts');
    expect(migration).toContain('public.system_agent_vehicle_derived_state');
    expect(migration).toContain('INSERT INTO public.contract_operations_log');
  });

  it('uses hardened definer privileges and has a reversible schema change', () => {
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain('FROM PUBLIC, anon');
    expect(migration).toContain('TO authenticated, service_role');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.revert_contract_from_legal_v2');
    expect(rollback).toContain('DROP COLUMN IF EXISTS idempotency_key');
  });

  it('removes the browser-side multi-write rollback and fails closed if the RPC is absent', () => {
    expect(service).toContain("supabase.rpc('revert_contract_from_legal_v2'");
    expect(service).toContain('PGRST202');
    expect(service).not.toContain(".from('legal_cases')");
    expect(service).not.toContain(".from('delinquent_customers')");
    expect(service).not.toContain(".from('contracts')");
  });
});
