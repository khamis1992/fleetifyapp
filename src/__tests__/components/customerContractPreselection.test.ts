import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const customerDetailsSource = readFileSync(
  resolve(process.cwd(), 'src/components/customers/CustomerDetailsPageNew.tsx'),
  'utf8',
);
const contractsPageSource = readFileSync(
  resolve(process.cwd(), 'src/pages/ContractsRedesigned.tsx'),
  'utf8',
);
const wizardSource = readFileSync(
  resolve(process.cwd(), 'src/components/contracts/SimpleContractWizard.tsx'),
  'utf8',
);

describe('customer contract preselection', () => {
  it('passes the customer ID from customer details to the contracts page', () => {
    expect(customerDetailsSource).toContain('navigate(`/contracts?customer=${customerId}`)');
    expect(contractsPageSource).toContain('const customerParam = searchParams.get("customer")');
    expect(contractsPageSource).toContain('setPreselectedCustomerId(customerParam)');
  });

  it('opens the wizard with the requested customer selected', () => {
    expect(contractsPageSource).toContain('preselectedCustomerId={preselectedCustomerId}');
    expect(wizardSource).toContain("customer_id: preselectedCustomerId || ''");
  });

  it('loads the requested customer even when it is outside the recent customer page', () => {
    expect(wizardSource).toContain(".eq('id', preselectedCustomerId)");
    expect(wizardSource).toContain('customersWithFullName.unshift({');
  });
});
