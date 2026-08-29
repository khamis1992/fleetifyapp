import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/hooks/useDashboardStats.ts'),
  'utf8',
);

describe('dashboard count filters', () => {
  it('distinguishes active vehicles from all vehicles', () => {
    const activeVehicleQuery = source.match(
      /from\('vehicles'\).*?eq\('company_id', company_id\)\.eq\('is_active', true\)/,
    );

    expect(activeVehicleQuery).not.toBeNull();
    expect(source).toContain('activeVehiclesCount = results[resultIndex++].count || 0');
    expect(source).toContain('vehiclesCount = results[resultIndex++].count || 0');
  });

  it('counts only active customers in both current and comparison periods', () => {
    const customerQueries = source.match(
      /from\('customers'\)[^\n]+eq\('is_active', true\)/g,
    );

    expect(customerQueries).toHaveLength(2);
  });
});
