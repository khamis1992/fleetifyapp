import { describe, expect, it } from 'vitest';
import { contractRegisterSearchFilter, contractSearchPattern } from '../contractRegisterSearch';

describe('contract register search', () => {
  it('finds contracts through the current vehicle even if the stored plate is empty or old', () => {
    expect(contractRegisterSearchFilter('10853', [], ['vehicle-1']))
      .toContain('vehicle_id.in.(vehicle-1)');
  });
  it('keeps customer, contract number and stored plate matches alongside vehicle matches', () => {
    const filter = contractRegisterSearchFilter('10853', ['customer-1'], ['vehicle-1']);
    expect(filter).toContain('customer_id.in.(customer-1)');
    expect(filter).toContain('contract_number.ilike."%10853%"');
    expect(filter).toContain('license_plate.ilike."%10853%"');
  });
  it('does not generate empty relation filters', () => {
    expect(contractRegisterSearchFilter('محمد', [], [])).not.toContain('.in.');
  });
  it('quotes commas, parentheses, quotes and backslashes as search text', () => {
    expect(contractSearchPattern('a,(b)"\\c')).toBe('"%a,(b)\\"\\\\c%"');
  });
});
