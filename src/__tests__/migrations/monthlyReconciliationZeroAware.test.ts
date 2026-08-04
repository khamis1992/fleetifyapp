import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = read('supabase/migrations/20260803163500_make_monthly_reconciliation_zero_aware.sql');
const rollback = read('supabase/rollbacks/20260803163500_make_monthly_reconciliation_zero_aware.rollback.sql');

describe('zero-aware monthly contract invoice reconciliation', () => {
  it('treats only a positive active invoice as an existing collectible month', () => {
    expect(migration).toContain('COALESCE(candidate.total_amount, 0) > 0.01');
    expect(migration).toContain('v_had_zero_placeholder := EXISTS');
    expect(migration).toContain('abs(COALESCE(candidate.total_amount, 0)) <= 0.01');
    expect(migration).toContain('public.generate_invoice_for_contract_month(v_contract.id, v_month)');
    expect(migration).toContain("action := 'reissued'");
    expect(migration).toContain('v_had_positive_invoice := invoice_id IS NOT NULL');
    expect(migration).toContain("message := 'positive_invoice_and_journal_validated'");
    expect(migration.indexOf('v_had_positive_invoice := invoice_id IS NOT NULL'))
      .toBeLessThan(migration.indexOf('public.generate_invoice_for_contract_month(v_contract.id, v_month)'));
    expect(migration).not.toContain(
      'A positive active invoice now exists for the canonical month.',
    );
  });

  it('creates durable agent runs, jobs, and a current-run review finding on failure', () => {
    expect(migration).toContain('INSERT INTO public.system_agent_runs');
    expect(migration).toContain('INSERT INTO public.system_agent_jobs');
    expect(migration).toContain('INSERT INTO public.system_agent_findings');
    expect(migration).toContain("'invoice.month_reconciliation_needs_review'");
    expect(migration).toContain('v_run_id,');
    expect(migration).toContain('v_job_id,');
    expect(migration).toContain("status = 'ignored'");
    expect(migration).toContain("'superseded_by_run_id', v_run_id");
    expect(migration).toContain('finding.run_id <> v_run_id');
    expect(migration).not.toContain('v_existing_finding_id');
  });

  it('reports per-job and per-run review counts instead of a failed boolean', () => {
    expect(migration).toMatch(/'needs_review', \(\s*SELECT count\(\*\)[\s\S]*?finding\.job_id = job\.id/);
    expect(migration).toContain("'needs_review', v_review_count");
    expect(migration).not.toContain("'needs_review', CASE WHEN job.status = 'failed' THEN 1 ELSE 0 END");
  });

  it('uses a truthful cron summary and never swallows authorization failures', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.run_monthly_contract_invoice_reconciliation(');
    expect(migration).toContain("WHEN SQLSTATE '42501' THEN");
    expect(migration).toMatch(/WHEN SQLSTATE '42501' THEN\s*RAISE;/);
    expect(migration).toContain('SELECT public.run_monthly_contract_invoice_reconciliation(');
    expect(migration).not.toContain('SELECT COUNT(*) FROM public.monthly_contract_invoice_reconciliation');
  });

  it('restores the prior cron and function description on rollback', () => {
    expect(rollback).toContain('SELECT COUNT(*) FROM public.monthly_contract_invoice_reconciliation');
    expect(rollback).toContain('Creates missing contract invoices for one canonical issue month using invoice_month/invoice_date only');
  });
});
