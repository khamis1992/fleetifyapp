import { describe, expect, it } from 'vitest';
import { parseCustomerCSV } from '../useCSVUpload';

describe('parseCustomerCSV', () => {
  it('preserves quoted commas and strips a UTF-8 BOM from the first header', () => {
    const rows = parseCustomerCSV(
      '\uFEFFcustomer_type,phone,company_name,address\ncorporate,55555555,"Acme, Qatar","Street 1, Doha"'
    );

    expect(rows).toEqual([expect.objectContaining({
      customer_type: 'corporate',
      phone: '55555555',
      company_name: 'Acme, Qatar',
      address: 'Street 1, Doha',
      rowNumber: 2
    })]);
  });

  it('ignores empty lines while keeping source row numbers stable', () => {
    const rows = parseCustomerCSV(
      'customer_type,phone\nindividual,11111111\n\ncorporate,22222222'
    );

    expect(rows.map((row) => row.phone)).toEqual(['11111111', '22222222']);
    expect(rows.map((row) => row.rowNumber)).toEqual([2, 3]);
  });
});
