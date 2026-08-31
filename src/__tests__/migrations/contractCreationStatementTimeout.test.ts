import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260831221500_raise_contract_creation_statement_timeout.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260831221500_raise_contract_creation_statement_timeout.rollback.sql',
), 'utf8');

describe('contract creation statement timeout migration', () => {
  it('raises the API 8s timeout on the override wrapper and the billing-graph writer', () => {
    expect(migration).toContain(
      'ALTER FUNCTION public.create_contract_with_violation_override_atomic(',
    );
    expect(migration).toContain(
      'ALTER FUNCTION public.create_contract_with_billing_graph_atomic(',
    );
    expect(migration).toContain("SET statement_timeout = '60s'");
    expect(migration).toContain("SET lock_timeout = '60s'");
  });

  it('resets the function-scoped timeouts on rollback', () => {
    expect(rollback).toContain(
      'ALTER FUNCTION public.create_contract_with_violation_override_atomic(',
    );
    expect(rollback).toContain(
      'ALTER FUNCTION public.create_contract_with_billing_graph_atomic(',
    );
    expect(rollback).toContain('RESET statement_timeout');
    expect(rollback).toContain('RESET lock_timeout');
  });
});
