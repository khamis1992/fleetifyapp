import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { Contract } from '@/types/contracts';
import { OfficialContractLetterDocument } from '../OfficialContractLetterDocument';

const makeContract = (overrides: Record<string, unknown> = {}) => ({
  id: 'contract-1',
  company_id: 'company-1',
  customer_id: 'customer-1',
  contract_number: 'LTO-TEST-1',
  contract_date: '2026-01-01',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  contract_amount: 19_200,
  monthly_amount: 1_600,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  contract_type: 'monthly_rental',
  status: 'active',
  customer: {
    id: 'customer-1',
    customer_code: 'C-1',
    customer_type: 'individual',
    first_name_ar: 'عميل',
    last_name_ar: 'اختبار',
  },
  vehicle: {
    id: 'vehicle-1',
    plate_number: '1234',
    make: 'GAC',
    model: 'GS3',
    year: 2024,
  },
  ...overrides,
}) as unknown as Contract;

describe('OfficialContractLetterDocument', () => {
  it('does not invent a security deposit when the contract has none', () => {
    const html = renderToStaticMarkup(
      <OfficialContractLetterDocument contract={makeContract()} />,
    );

    expect(html).toContain('مبلغ التأمين');
    expect(html).toContain('غير مسجل');
    expect(html).toContain('لم يسجل على هذا العقد مبلغ تأمين نقدي');
    expect(html).not.toContain('8,000');
  });

  it('derives the two-installment early termination amount from the monthly rent', () => {
    const html = renderToStaticMarkup(
      <OfficialContractLetterDocument contract={makeContract()} />,
    );

    expect(html).toContain('3,200.00 ر.ق');
    expect(html).not.toContain('3,000 ريال قطري، بما يعادل قسطين');
  });

  it('prints a legacy deposit only when a positive amount is explicitly present', () => {
    const html = renderToStaticMarkup(
      <OfficialContractLetterDocument
        contract={makeContract({ deposit_amount: 2_500 })}
      />,
    );

    expect(html).toContain('2,500.00 ر.ق');
    expect(html).not.toContain('لم يسجل على هذا العقد مبلغ تأمين نقدي');
  });
});
