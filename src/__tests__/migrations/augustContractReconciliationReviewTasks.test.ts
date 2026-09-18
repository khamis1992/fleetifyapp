import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260831120000_create_august_contract_reconciliation_review_tasks.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260831120000_create_august_contract_reconciliation_review_tasks.rollback.sql',
), 'utf8');

interface ReviewTaskManifest {
  taskKey: string;
  title: string;
  cases: Array<Record<string, unknown>>;
}

function readManifest(): ReviewTaskManifest[] {
  const startMarker = "v_manifest jsonb := '";
  const start = migration.indexOf(startMarker);
  const end = migration.indexOf("'::jsonb;", start + startMarker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return JSON.parse(migration.slice(start + startMarker.length, end).replaceAll("''", "'"));
}

describe('August contract reconciliation review tasks', () => {
  it('creates five grouped tasks with the reviewed case counts', () => {
    const tasks = readManifest();
    const counts = Object.fromEntries(tasks.map((task) => [task.taskKey, task.cases.length]));
    expect(counts).toEqual({
      different_customer_live_contract: 10,
      matched_with_parallel_conflict: 6,
      expected_customer_contract_on_other_vehicle: 4,
      no_live_contract: 20,
      legal_claim_penalty_invoice_double_count: 16,
    });
  });

  it('carries the corrected financial impact for the 16 legal claims', () => {
    const legalTask = readManifest().find((task) => (
      task.taskKey === 'legal_claim_penalty_invoice_double_count'
    ));
    expect(legalTask).toBeDefined();
    const cases = legalTask?.cases as Array<{
      duplicated_penalty_invoice_due: number;
      claim_total_after_deduplication: number;
    }>;
    expect(cases.reduce((sum, item) => sum + item.duplicated_penalty_invoice_due, 0)).toBe(117815);
    expect(cases.reduce((sum, item) => sum + item.claim_total_after_deduplication, 0)).toBe(422443);
  });

  it('requires the operational snapshot and claim fix before exposing tasks', () => {
    expect(migration).toContain('Latest August operational snapshot must be applied first');
    expect(migration).toContain('calculate_legal_claim_breakdown_v3(uuid,uuid,date)');
    expect(migration).toContain('Legal claim component de-duplication must be applied first');
  });

  it('creates tasks only and leaves business records untouched', () => {
    expect(migration).toContain('INSERT INTO public.tasks');
    expect(migration).not.toContain('UPDATE public.contracts');
    expect(migration).not.toContain('UPDATE public.vehicles');
    expect(migration).not.toContain('UPDATE public.invoices');
    expect(migration).not.toContain('UPDATE public.payments');
    expect(migration).not.toContain('UPDATE public.penalties');
    expect(migration).not.toContain('UPDATE public.legal_cases');
    expect(migration).toContain("'augustReconciliationTaskKey'");
  });

  it('rolls back only untouched pending tasks and preserves human work', () => {
    expect(rollback).toContain("task.status = 'pending'");
    expect(rollback).toContain("SET status = 'cancelled'");
    expect(rollback).not.toContain("task.status = 'in_progress'");
    expect(rollback).not.toContain("task.status = 'completed'");
  });
});
