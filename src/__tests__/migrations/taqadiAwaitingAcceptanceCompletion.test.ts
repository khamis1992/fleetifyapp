import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = read('supabase/migrations/20260903062009_advance_completed_taqadi_filing_to_awaiting_acceptance.sql');
const rollback = read('supabase/rollbacks/20260903062009_advance_completed_taqadi_filing_to_awaiting_acceptance.rollback.sql');

describe('completed Taqadi filing court-acceptance state', () => {
  it('records filing first and then advances to awaiting court acceptance', () => {
    expect(migration).toContain("'filed',\n      'تم إيداع الدعوى آليًا في نظام تقاضي'");
    expect(migration).toContain("IF v_case.workflow_stage = 'filed' THEN");
    expect(migration).toContain("'awaiting_acceptance',\n      'تم تأكيد إيداع الدعوى في تقاضي؛ بانتظار قبول المحكمة'");
    expect(migration).toContain("'legalWorkflowStage', 'awaiting_acceptance'");
  });

  it('requires a real portal reference before changing the legal workflow', () => {
    const referenceGuard = migration.indexOf('IF v_reference IS NULL');
    const filedTransition = migration.indexOf("'filed',\n      'تم إيداع الدعوى آليًا في نظام تقاضي'");
    expect(referenceGuard).toBeGreaterThan(-1);
    expect(filedTransition).toBeGreaterThan(referenceGuard);
  });

  it('keeps the completion RPC service-role only and pins its search path', () => {
    expect(migration).toContain("SET search_path TO ''");
    expect(migration).toContain("COALESCE(auth.role(), '') <> 'service_role'");
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
  });

  it('provides a rollback to the previous filed-only behavior', () => {
    expect(rollback).toContain("ELSIF v_case.workflow_stage <> 'filed' THEN");
    expect(rollback).not.toContain("'legalWorkflowStage', 'awaiting_acceptance'");
  });
});
