import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = read('supabase/migrations/20260803164500_disable_unsafe_invoice_repricing_agent.sql');
const rollback = read('supabase/rollbacks/20260803164500_disable_unsafe_invoice_repricing_agent.rollback.sql');
const workers = read('supabase/functions/_shared/system-audit/workers.ts');
const dispatcher = read('supabase/functions/system-audit-worker/index.ts');

describe('unsafe invoice repricing command retirement', () => {
  it('disables the registry command and requires review', () => {
    expect(migration).toContain("registry.command = 'invoice.sync_zero_impact_amount'");
    expect(migration).toContain('SET enabled = false');
    expect(migration).toContain('approval_required = true');
  });

  it('moves previously queued findings to review while preserving rollback metadata', () => {
    expect(migration).toContain("SET status = 'review'");
    expect(migration).toContain("'disabled_by_migration', '20260803164500'");
    expect(migration).toContain('repair_command = NULL');
    expect(migration).toContain('repair_payload = NULL');
    expect(migration).toContain("finding.status IN ('detected', 'planned', 'repairing', 'failed')");
  });

  it('removes the command from both finding production and command dispatch', () => {
    expect(workers).not.toContain('command: "invoice.sync_zero_impact_amount"');
    expect(workers).toContain('invoice.schedule_amount_mismatch_requires_review');
    expect(dispatcher).not.toContain('"invoice.sync_zero_impact_amount"');
  });

  it('restores the exact prior description and preserved finding payload on rollback', () => {
    expect(rollback).toContain('Align a history-free invoice amount with its one linked payment schedule.');
    expect(rollback).toContain("repair_command = finding.evidence ->> 'disabled_repair_command'");
    expect(rollback).toContain("finding.evidence ->> 'disabled_by_migration' = '20260803164500'");
  });
});
