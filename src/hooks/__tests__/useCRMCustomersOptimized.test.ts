import { describe, it, expect, beforeEach } from 'vitest';
import { getPaymentStatusOptimized } from '../useCRMCustomersOptimized';

describe('getPaymentStatusOptimized', () => {
  describe('حساب حالة الدفع', () => {
    it('يجب أن يعود none عندما لا توجد فواتير', () => {
      const customer = {
        customer_id: 'test-1',
        created_at: new Date().toISOString(),
        total_invoices: 0,
        outstanding_amount: 0,
        overdue_invoices: 0,
      };
      expect(getPaymentStatusOptimized(customer)).toBe('none');
    });

    it('يجب أن يعود paid when outstanding is zero', () => {
      const customer = {
        customer_id: 'test-2',
        created_at: new Date().toISOString(),
        total_invoices: 5,
        total_invoiced_amount: 5000,
        total_paid_amount: 5000,
        outstanding_amount: 0,
        overdue_invoices: 0,
      };
      expect(getPaymentStatusOptimized(customer)).toBe('paid');
    });

    it('يجب أن يعود late when overdue invoices exist', () => {
      const customer = {
        customer_id: 'test-3',
        created_at: new Date().toISOString(),
        total_invoices: 5,
        total_invoiced_amount: 5000,
        total_paid_amount: 4000,
        outstanding_amount: 1000,
        overdue_invoices: 2,
        overdue_amount: 500,
      };
      expect(getPaymentStatusOptimized(customer)).toBe('late');
    });

    it('يجب أن يعود due when has outstanding but not overdue', () => {
      const customer = {
        customer_id: 'test-4',
        created_at: new Date().toISOString(),
        total_invoices: 5,
        total_invoiced_amount: 5000,
        total_paid_amount: 4000,
        outstanding_amount: 1000,
        overdue_invoices: 0,
        overdue_amount: 0,
      };
      expect(getPaymentStatusOptimized(customer)).toBe('due');
    });

    it('يجب أن يعود none when total_invoices is undefined', () => {
      const customer = {
        customer_id: 'test-5',
        created_at: new Date().toISOString(),
      } as any;
      expect(getPaymentStatusOptimized(customer)).toBe('none');
    });
  });
});

