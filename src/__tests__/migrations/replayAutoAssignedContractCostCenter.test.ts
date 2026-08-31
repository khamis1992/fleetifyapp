import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260831223500_replay_auto_assigned_contract_cost_center.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260831223500_replay_auto_assigned_contract_cost_center.rollback.sql',
), 'utf8');

describe('idempotent replay of auto-assigned contract cost centers', () => {
  it('compares an omitted cost center to the customer default the insert trigger would write', () => {
    expect(migration).toContain(
      'OR v_existing_contract.cost_center_id IS DISTINCT FROM COALESCE(p_cost_center_id, public.get_customer_default_cost_center(p_customer_id))',
    );
    expect(migration).toContain(
      'OR v_existing_contract.cost_center_id IS DISTINCT FROM p_cost_center_id',
    );
  });

  it('restores the strict cost-center comparison on rollback', () => {
    expect(rollback).toContain(
      'OR v_existing_contract.cost_center_id IS DISTINCT FROM p_cost_center_id',
    );
    expect(rollback).toContain(
      'OR v_existing_contract.cost_center_id IS DISTINCT FROM COALESCE(p_cost_center_id, public.get_customer_default_cost_center(p_customer_id))',
    );
  });
});
