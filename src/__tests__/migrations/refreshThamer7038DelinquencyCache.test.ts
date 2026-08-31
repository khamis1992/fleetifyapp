import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260831023100_refresh_thamer_7038_delinquency_cache.sql',
  'utf8',
);

describe('Thamer 7038 delinquency cache refresh', () => {
  it('is single-customer scoped and derives rent and penalties separately', () => {
    expect(migration).toContain("v_contract_id constant uuid := 'b88a2ae9-b579-4b32-9f88-ec525d528642'");
    expect(migration).toContain('invoice.penalty_id IS NULL');
    expect(migration).toContain('FROM public.penalties penalty');
    expect(migration).toContain('single_customer_safe_refresh');
    expect(migration).not.toContain('CREATE OR REPLACE FUNCTION public.update_delinquent_customers');
  });

  it('fails closed unless the cache equals the verified legal claim', () => {
    expect(migration).toContain('delinquent.overdue_amount = 13240');
    expect(migration).toContain('delinquent.violations_amount = 4000');
    expect(migration).toContain('delinquent.total_debt = 17240');
    expect(migration).toContain('expected one Thamer cache row');
  });
});
