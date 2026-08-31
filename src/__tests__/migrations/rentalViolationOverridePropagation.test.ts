import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260831212558_propagate_confirmed_violation_override_to_rental_guard.sql',
), 'utf8');

describe('confirmed violation override rental-guard propagation', () => {
  it('skips unpaid-violation blocking only for the matching atomic insert', () => {
    expect(migration).toContain("current_setting('fleetify.confirmed_violation_override', true)");
    expect(migration).toContain("current_setting('fleetify.atomic_contract_creation', true)");
    expect(migration).toContain('confirmed_violation_override_company_id');
    expect(migration).toContain('confirmed_violation_override_customer_id');
    expect(migration).toContain('confirmed_violation_override_vehicle_id');
    expect(migration).toContain('confirmed_violation_override_idempotency_key');
    expect(migration).toContain("NEW.creation_idempotency_key");
    expect(migration).toContain("set_config('fleetify.confirmed_violation_override', 'off', true)");
  });
});
