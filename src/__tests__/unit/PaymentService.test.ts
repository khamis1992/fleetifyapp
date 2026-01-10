/**
 * Payment Service Unit Tests
 * 
 * Comprehensive test suite for PaymentService
 * Covers CRUD operations, validation, linking, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { PaymentService } from '@/services/PaymentService';
import { PaymentMethod, PaymentType, PaymentStatus, ProcessingStatus } from '@/types/payment-enums';
import { supabase } from '@/integrations/supabase/client';

describe('PaymentService', () => {
  let paymentService: PaymentService;
  const companyId = '24bc0b21-4e2d-4413-9842-31719a3669f4';
  const userId = 'test-user-id';
  const customerId = 'test-customer-id';

  beforeEach(() => {
    paymentService = new PaymentService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a payment with valid data', async () => {
      const paymentData = {
        company_id: companyId,
        customer_id: customerId,
        contract_id: 'test-contract-id',
        amount: 1000,
        payment_date: new Date().toISOString(),
        payment_method: PaymentMethod.CASH,
        payment_type: PaymentType.RENTAL_INCOME,
        payment_status: PaymentStatus.PENDING
      };

      const result = await paymentService.createPayment(paymentData, userId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.payment_number).toMatch(/^PAY-\d{8}-\d{4}$/);
    });

    it('should reject payment without customer_id', async () => {
      const paymentData = {
        company_id: companyId,
        customer_id: null, // Missing customer_id
        amount: 1000,
        payment_date: new Date().toISOString(),
        payment_method: PaymentMethod.CASH,
        payment_type: PaymentType.RENTAL_INCOME,
        payment_status: PaymentStatus.PENDING
      };

      const result = await paymentService.createPayment(paymentData, userId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('معرف العميل مطلوب');
    });

    it('should reject payment with invalid amount', async () => {
      const paymentData = {
        company_id: companyId,
        customer_id: customerId,
        amount: 0, // Invalid amount
        payment_date: new Date().toISOString(),
        payment_method: PaymentMethod.CASH,
        payment_type: PaymentType.RENTAL_INCOME,
        payment_status: PaymentStatus.PENDING
      };

      const result = await paymentService.createPayment(paymentData, userId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('المبلغ يجب أن يكون أكبر من صفر');
    });

    it('should reject payment with future date', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const paymentData = {
        company_id: companyId,
        customer_id: customerId,
        amount: 1000,
        payment_date: futureDate.toISOString(),
        payment_method: PaymentMethod.CASH,
        payment_type: PaymentType.RENTAL_INCOME,
        payment_status: PaymentStatus.PENDING
      };

      const result = await paymentService.createPayment(paymentData, userId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('لا يمكن أن يكون في المستقبل');
    });
  });

  describe('updatePayment', () => {
    it('should update payment amount', async () => {
      const paymentId = 'test-payment-id';

      const updateData = {
        amount: 2000
      };

      const result = await paymentService.updatePayment(paymentId, companyId, userId, updateData);

      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(2000);
    });

    it('should update payment status to completed', async () => {
      const paymentId = 'test-payment-id';

      const updateData = {
        payment_status: PaymentStatus.COMPLETED
      };

      const result = await paymentService.updatePayment(paymentId, companyId, userId, updateData);

      expect(result.success).toBe(true);
      expect(result.data?.payment_status).toBe('completed');
    });

    it('should reject update with invalid payment_id', async () => {
      const result = await paymentService.updatePayment('invalid-id', companyId, userId, { amount: 1000 });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('الدفعة غير موجودة');
    });

    it('should reject update with invalid status', async () => {
      const result = await paymentService.updatePayment('test-payment-id', companyId, userId, { 
        payment_status: 'invalid-status'
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('getPayment', () => {
    it('should get a payment by id', async () => {
      const paymentId = 'test-payment-id';

      const result = await paymentService.getPayment(paymentId, companyId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(paymentId);
    });

    it('should return null for non-existent payment', async () => {
      const result = await paymentService.getPayment('non-existent-id', companyId);

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
    });
  });

  describe('listPayments', () => {
    it('should list all payments for a company', async () => {
      const result = await paymentService.listPayments(companyId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should filter payments by status', async () => {
      const result = await paymentService.listPayments(companyId, {
        payment_status: PaymentStatus.COMPLETED
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.every((p: any) => p.payment_status === 'completed')).toBe(true);
    });

    it('should paginate payments', async () => {
      const result = await paymentService.listPayments(companyId, {
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeLessThanOrEqual(10);
    });
  });

  describe('deletePayment', () => {
    it('should delete a payment', async () => {
      const paymentId = 'test-payment-id';

      const result = await paymentService.deletePayment(paymentId, companyId, userId);

      expect(result.success).toBe(true);
    });

    it('should reject deletion of non-existent payment', async () => {
      const result = await paymentService.deletePayment('non-existent-id', companyId, userId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('الدفعة غير موجودة');
    });
  });

  describe('Payment Linking', () => {
    it('should link payment to invoice', async () => {
      const paymentId = 'test-payment-id';
      const invoiceId = 'test-invoice-id';

      const result = await paymentService.linkPaymentToInvoice(paymentId, invoiceId, companyId, userId);

      expect(result.success).toBe(true);
    });

    it('should link payment to contract', async () => {
      const paymentId = 'test-payment-id';
      const contractId = 'test-contract-id';

      const result = await paymentService.linkPaymentToContract(paymentId, contractId, companyId, userId);

      expect(result.success).toBe(true);
    });
  });

  describe('Payment Validation', () => {
    it('should validate payment number format', () => {
      const validPaymentNumber = 'PAY-202401101234-0001';
      const isValid = paymentService.validatePaymentNumberFormat(validPaymentNumber);

      expect(isValid).toBe(true);
    });

    it('should reject invalid payment number format', () => {
      const invalidPaymentNumber = 'INVALID-PAYMENT-NUMBER';
      const isValid = paymentService.validatePaymentNumberFormat(invalidPaymentNumber);

      expect(isValid).toBe(false);
    });

    it('should validate payment date', () => {
      const validDate = new Date().toISOString();
      const isValid = paymentService.validatePaymentDate(validDate, PaymentType.RENTAL_INCOME);

      expect(isValid).toBe(true);
    });

    it('should reject future payment date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const isValid = paymentService.validatePaymentDate(futureDate.toISOString(), PaymentType.RENTAL_INCOME);

      expect(isValid).toBe(false);
      expect(isValid.errors).toContain('لا يمكن أن يكون في المستقبل');
    });

    it('should validate payment amount', () => {
      const isValid = paymentService.validatePaymentAmount(1000);

      expect(isValid).toBe(true);
    });

    it('should reject invalid payment amount', () => {
      const isValid = paymentService.validatePaymentAmount(-100);

      expect(isValid).toBe(false);
      expect(isValid.errors).toContain('المبلغ يجب أن يكون موجباً');
    });
  });

  describe('Payment Status Updates', () => {
    it('should update payment status to completed', async () => {
      const paymentId = 'test-payment-id';

      const result = await paymentService.updatePaymentStatus(
        paymentId,
        PaymentStatus.COMPLETED,
        companyId,
        userId
      );

      expect(result.success).toBe(true);
      expect(result.data?.payment_status).toBe('completed');
    });

    it('should update payment status to failed', async () => {
      const paymentId = 'test-payment-id';

      const result = await paymentService.updatePaymentStatus(
        paymentId,
        PaymentStatus.FAILED,
        companyId,
        userId
      );

      expect(result.success).toBe(true);
      expect(result.data?.payment_status).toBe('failed');
    });

    it('should reject update with invalid status', async () => {
      const result = await paymentService.updatePaymentStatus(
        'test-payment-id',
        'invalid-status' as any,
        companyId,
        userId
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Payment Statistics', () => {
    it('should get payment statistics', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);

      const result = await paymentService.getPaymentStatistics(companyId, {
        startDate: startDate.toISOString()
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.totalPayments).toBeGreaterThan(0);
      expect(result.data?.totalAmount).toBeGreaterThan(0);
    });

    it('should calculate average payment amount', () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);

      const result = await paymentService.getPaymentStatistics(companyId, {
        startDate: startDate.toISOString()
      });

      expect(result.success).toBe(true);
      expect(result.data?.averagePaymentAmount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      vi.mocked(supabase).from.mockReturnValueOnce({
        insert: vi.fn().mockRejectedValueOnce(new Error('Database connection failed'))
      });

      const paymentData = {
        company_id: companyId,
        customer_id: customerId,
        amount: 1000,
        payment_date: new Date().toISOString(),
        payment_method: PaymentMethod.CASH,
        payment_type: PaymentType.RENTAL_INCOME,
        payment_status: PaymentStatus.PENDING
      };

      const result = await paymentService.createPayment(paymentData, userId);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent payment creation', async () => {
      // Test idempotency - creating same payment twice
      const paymentData1 = {
        company_id: companyId,
        customer_id: customerId,
        amount: 1000,
        payment_date: new Date().toISOString(),
        payment_method: PaymentMethod.CASH,
        payment_type: PaymentType.RENTAL_INCOME,
        payment_status: PaymentStatus.PENDING
      };

      const paymentData2 = { ...paymentData1 };

      const result1 = await paymentService.createPayment(paymentData1, userId);
      const result2 = await paymentService.createPayment(paymentData2, userId);

      // Both should succeed with different payment numbers
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data?.payment_number).not.toBe(result2.data?.payment_number);
    });

    it('should create payment and automatically link to invoice', async () => {
      const invoiceId = 'test-invoice-id';

      const paymentData = {
        company_id: companyId,
        customer_id: customerId,
        amount: 1000,
        payment_date: new Date().toISOString(),
        payment_method: PaymentMethod.CASH,
        payment_type: PaymentType.RENTAL_INCOME,
        payment_status: PaymentStatus.PENDING,
        invoice_id: invoiceId
      };

      const result = await paymentService.createPayment(paymentData, userId);

      expect(result.success).toBe(true);
      expect(result.data?.invoice_id).toBe(invoiceId);
    });
  });

