import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260830110005_reconcile_august_fleet_report.sql'),
  'utf8',
);
const rollback = readFileSync(
  resolve(process.cwd(), 'supabase/rollbacks/20260830110005_reconcile_august_fleet_report.rollback.sql'),
  'utf8',
);
const recursionFix = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260830111652_fix_vehicle_financial_trigger_recursion.sql'),
  'utf8',
);
const useVehiclesSource = readFileSync(
  resolve(process.cwd(), 'src/hooks/useVehicles.ts'),
  'utf8',
);

const manifestMatch = migration.match(/\$manifest\$(\[[\s\S]*?\])\$manifest\$::jsonb/);
if (!manifestMatch) throw new Error('Fleet report manifest is missing from migration');
const manifest = JSON.parse(manifestMatch[1]) as Array<{
  sourceRow: number;
  expectedVehicleStatus: string;
  targetStatus: string;
  sourceCustomerName: string | null;
}>;

describe('August fleet report reconciliation', () => {
  it('contains the verified 75 rows and exactly 64 status changes', () => {
    expect(manifest).toHaveLength(75);
    expect(new Set(manifest.map((row) => row.sourceRow)).size).toBe(75);
    expect(manifest.filter((row) => row.expectedVehicleStatus !== row.targetStatus)).toHaveLength(64);
    expect(manifest.filter((row) => row.sourceCustomerName !== null)).toHaveLength(25);
  });

  it('resolves every operational status with the reviewed cardinalities', () => {
    const counts = manifest.reduce<Record<string, number>>((result, row) => {
      result[row.targetStatus] = (result[row.targetStatus] ?? 0) + 1;
      return result;
    }, {});
    expect(counts).toEqual({
      rented: 42,
      maintenance: 2,
      street_52: 16,
      available: 7,
      accident: 1,
      police_station: 3,
      municipality: 3,
      out_of_service: 1,
    });
  });

  it('fails closed and keeps legal and financial ledgers outside the repair', () => {
    expect(migration).toContain('Every source plate must resolve to exactly one company vehicle');
    expect(migration).toContain('A vehicle status changed after report validation; batch aborted');
    expect(migration).toContain('Postcondition failed: not all 75 operational rows were applied');
    expect(migration).not.toContain('UPDATE public.contracts');
    expect(migration).not.toContain('UPDATE public.invoices');
    expect(migration).not.toContain('UPDATE public.payments');
    expect(migration).not.toContain('UPDATE public.legal_cases');
  });

  it('has company isolation, an audited rollback, and a read-only vehicle query', () => {
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('company_id = public.get_user_company_id()');
    expect(rollback).toContain('Rollback aborted: an applied vehicle changed');
    expect(rollback).toContain("closed_reason = 'migration_rollback'");

    const useVehiclesQuery = useVehiclesSource.slice(
      useVehiclesSource.indexOf('export const useVehicles ='),
      useVehiclesSource.indexOf('export const useAvailableVehicles ='),
    );
    expect(useVehiclesQuery).not.toContain('.update(');
    expect(useVehiclesQuery).not.toContain('.insert(');
    expect(useVehiclesQuery).not.toContain('.delete(');
  });

  it('prevents the legacy financial trigger from recursing on fleet-state updates', () => {
    expect(recursionFix).toContain('OLD.purchase_cost IS NOT DISTINCT FROM NEW.purchase_cost');
    expect(recursionFix).toContain('OLD.cost_center_id IS NOT DISTINCT FROM NEW.cost_center_id');
    expect(recursionFix).toContain('AFTER INSERT OR UPDATE OF purchase_cost, cost_center_id');
    expect(recursionFix).not.toContain('AFTER INSERT OR UPDATE ON public.vehicles');
  });
});
