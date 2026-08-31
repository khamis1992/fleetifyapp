import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260831114500_register_latest_august_operational_custody_snapshot.sql',
), 'utf8');
const rollback = readFileSync(resolve(
  process.cwd(),
  'supabase/rollbacks/20260831114500_register_latest_august_operational_custody_snapshot.rollback.sql',
), 'utf8');

function readManifest() {
  const startMarker = "v_manifest jsonb := '";
  const start = migration.indexOf(startMarker);
  const end = migration.indexOf("'::jsonb;", start + startMarker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return JSON.parse(migration.slice(start + startMarker.length, end).replaceAll("''", "'")) as Array<{
    sourceRow: number;
    sourcePlate: string;
    resolvedCustomerNationalId: string | null;
    resolvedCustomerPhone: string | null;
    supportingContractNumber: string | null;
    sourceClassification: string;
  }>;
}

describe('latest August operational custody snapshot', () => {
  it('registers 84 reviewed rows and leaves five newer decisions untouched', () => {
    const manifest = readManifest();
    expect(manifest).toHaveLength(84);
    expect(new Set(manifest.map((row) => row.sourcePlate)).size).toBe(84);
    expect(manifest.filter((row) => (
      row.resolvedCustomerNationalId || row.resolvedCustomerPhone
    ))).toHaveLength(70);

    for (const plate of ['722134', '2773', '848014', '846485', '847932']) {
      expect(manifest.some((row) => row.sourcePlate === plate)).toBe(false);
      expect(migration).toContain(`'${plate}'`);
    }
  });

  it('is operational-only and does not mutate legal or financial records', () => {
    expect(migration).not.toContain('UPDATE public.vehicles');
    expect(migration).not.toContain('UPDATE public.contracts');
    expect(migration).not.toContain('UPDATE public.invoices');
    expect(migration).not.toContain('UPDATE public.payments');
    expect(migration).not.toContain('UPDATE public.legal_cases');
    expect(migration).toContain("'vehicle_status_rows_changed', 0");
    expect(migration).toContain("'contract_rows_changed', 0");
    expect(migration).toContain("'proves_legal_claim', false");
  });

  it('resolves database entities from reviewed natural keys instead of generated ids', () => {
    const manifest = readManifest();
    expect(manifest.some((row) => row.resolvedCustomerNationalId)).toBe(true);
    expect(manifest.some((row) => row.resolvedCustomerPhone)).toBe(true);
    expect(migration).toContain('public.normalize_vehicle_plate(source."sourcePlate")');
    expect(migration).toContain('customer.national_id = source."resolvedCustomerNationalId"');
    expect(migration).toContain('contract.contract_number = source."supportingContractNumber"');
    expect(migration).not.toContain('"vehicleId"');
    expect(migration).not.toContain('"customerId"');
    expect(migration).not.toContain('"supportingContractId"');
  });

  it('aborts if a reviewed vehicle, customer, or supporting contract drifted', () => {
    expect(migration).toContain('Every imported row must resolve to its reviewed company vehicle');
    expect(migration).toContain('Vehicle status changed after review');
    expect(migration).toContain('A resolved operational customer is outside the company');
    expect(migration).toContain('A supporting contract no longer matches');
  });

  it('has a rollback that restores only the superseded prior assignments', () => {
    expect(migration).toContain("'previous_assignment_id', previous.previous_assignment_id");
    expect(rollback).toContain("latest.source_evidence ->> 'previous_assignment_id'");
    expect(rollback).toContain("previous.closed_reason = 'superseded_by_batch:' || v_batch_id::text");
    expect(rollback).toContain('Rollback aborted: an assignment was superseded or vehicle state changed');
    expect(rollback).not.toContain('UPDATE public.vehicles');
  });
});
