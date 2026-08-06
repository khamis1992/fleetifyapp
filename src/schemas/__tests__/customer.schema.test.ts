import { describe, expect, it } from 'vitest';

import { createCustomerSchema, updateCustomerSchema } from '../customer.schema';

describe('customer.schema official Arabic data', () => {
  it('accepts a complete individual customer with Arabic official data', () => {
    const result = createCustomerSchema.safeParse({
      customer_type: 'individual',
      first_name: 'Ahmed',
      last_name: 'Ali',
      first_name_ar: 'أحمد',
      last_name_ar: 'علي',
      nationality: 'قطر',
      phone: '50000000',
    });

    expect(result.success).toBe(true);
  });

  it('rejects non-Arabic nationality on customer creation', () => {
    const result = createCustomerSchema.safeParse({
      customer_type: 'individual',
      first_name: 'Ahmed',
      last_name: 'Ali',
      first_name_ar: 'أحمد',
      last_name_ar: 'علي',
      nationality: 'Qatar',
      phone: '50000000',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('nationality');
  });

  it('keeps partial customer updates available for legacy operational edits', () => {
    const result = updateCustomerSchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      phone: '50000000',
    });

    expect(result.success).toBe(true);
  });
});
