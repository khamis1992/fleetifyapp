import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260831214914_qualify_auto_tag_contract_relations.sql',
  'utf8',
);

const rollback = readFileSync(
  'supabase/rollbacks/20260831214914_qualify_auto_tag_contract_relations.rollback.sql',
  'utf8',
);

describe('contract auto-tag trigger search-path safety', () => {
  it('schema-qualifies every application relation used by the trigger function', () => {
    expect(migration).toContain('SET search_path TO');
    expect(migration).toContain('FROM public.contract_tags');
    expect(migration).toContain('INSERT INTO public.contract_tags');
    expect(migration).toContain('INSERT INTO public.contract_tag_assignments');
    expect(migration).toContain('DELETE FROM public.contract_tag_assignments');
  });

  it('does not retain unqualified tag-relation statements in the migration', () => {
    expect(migration).not.toMatch(/FROM\s+contract_tags\b/i);
    expect(migration).not.toMatch(/INTO\s+contract_tags\b/i);
    expect(migration).not.toMatch(/FROM\s+contract_tag_assignments\b/i);
    expect(migration).not.toMatch(/INTO\s+contract_tag_assignments\b/i);
  });

  it('provides a reversible definition matching the legacy behavior', () => {
    expect(rollback).toContain('CREATE OR REPLACE FUNCTION public.auto_tag_contract');
    expect(rollback).toContain('FROM contract_tags');
    expect(rollback).not.toContain('SET search_path TO');
  });
});
