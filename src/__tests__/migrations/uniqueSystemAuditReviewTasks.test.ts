import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260803171500_unique_open_system_audit_review_tasks.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260803171500_unique_open_system_audit_review_tasks.rollback.sql',
), 'utf8');

describe('unique open system audit review tasks migration', () => {
  it('deduplicates existing producer-owned tasks before creating a partial unique index', () => {
    const dedupe = migration.indexOf('WITH ranked AS');
    const index = migration.indexOf('CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_open_system_audit_key');

    expect(dedupe).toBeGreaterThan(-1);
    expect(index).toBeGreaterThan(dedupe);
    expect(migration).toContain("task.metadata ->> 'source' = 'system_audit_agent'");
    expect(migration).toContain("task.metadata ->> 'systemAuditTaskKey'");
    expect(migration).toContain("task.status IN ('pending', 'in_progress', 'on_hold')");
  });

  it('does not include tasks owned by the daily audit producer', () => {
    expect(migration).not.toContain("metadata ->> 'source' = 'daily_audit_agent'");
  });

  it('restores deduplicated open statuses on rollback', () => {
    expect(rollback).toContain('DROP INDEX IF EXISTS public.uq_tasks_open_system_audit_key');
    expect(rollback).toContain("openSystemAuditTaskUniqueMigration,previousStatus");
    expect(rollback).toContain("metadata = task.metadata - 'openSystemAuditTaskUniqueMigration'");
  });
});
