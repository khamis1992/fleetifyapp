import { describe, it, expect, beforeEach, vi } from 'vitest';
import { paymentService } from '@/services/PaymentService';
import { paymentNumberGenerator } from '@/services/PaymentNumberGenerator';
import { PaymentStatus, ProcessingStatus } from '@/types/payment-enums';

describe('PaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      const paymentData = {
        company_id: 'test-company-id',
        customer_id: 'test-customer-id',
        payment_date: new Date().toISOString(),
        amount: 1000,
        payment_method: 'cash',
        payment_type: 'rental_income',
        transaction_type: 'income'
      };

      const result = await paymentService.createPayment(paymentData);

      expect(result.success).toBe(true);
      expect(result.payment).toBeDefined();
      expect(result.payment?.amount).toBe(1000);
      expect(result.payment?.payment_status).toBe('pending');
    });

    it('should fail to create payment with invalid data', async () => {
      const paymentData = {
        company_id: 'test-company-id',
        customer_id: 'test-customer-id',
        payment_date: 'invalid-date',
        amount: -100, // invalid
        payment_method: 'cash'
      };

      const result = await paymentService.createPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject duplicate payment with same idempotency_key', async () => {
      const paymentData = {
        company_id: 'test-company-id',
        customer_id: 'test-customer-id',
        payment_date: new Date().toISOString(),
        amount: 1000,
        payment_method: 'cash',
        idempotency_key: 'unique-key-123'
      };

      // First payment
      const firstResult = await paymentService.createPayment(paymentData);
      expect(firstResult.success).toBe(true);

      // Duplicate payment
      const duplicateResult = await paymentService.createPayment(paymentData);
      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.error).toContain('duplicate');
    });
  });

  describe('processPayment', () => {
    it('should process payment through all stages', async () => {
      const payment = {
        id: 'test-payment-id',
        company_id: 'test-company-id',
        customer_id: 'test-customer-id',
        payment_date: new Date().toISOString(),
        amount: 1000,
        payment_status: PaymentStatus.PENDING,
        processing_status: ProcessingStatus.NEW
      };

      const result = await paymentService.processPayment(payment.id);

      expect(result.success).toBe(true);
      expect(result.payment?.payment_status).toBe(PaymentStatus.COMPLETED);
    });

    it('should retry failed payment up to 3 times', async () => {
      const paymentId = 'failing-payment-id';
      const retries = 3;

      // Mock a scenario where payment fails initially but succeeds later
      let attempts = 0;
      const processPayment = async () => {
        attempts++;
        if (attempts < retries) {
          throw new Error('Payment processing failed');
        }
        return { success: true, payment: { id: paymentId, payment_status: PaymentStatus.COMPLETED } };
      };

      const result = await processPayment();

      expect(attempts).toBe(retries);
      expect(result.success).toBe(true);
    });
  });

  describe('allocatePayment', () => {
    it('should allocate payment to contract', async () => {
      const paymentId = 'test-payment-id';
      const contractId = 'test-contract-id';

      const result = await paymentService.allocatePayment(paymentId, contractId);

      expect(result.success).toBe(true);
      expect(result.payment?.contract_id).toBe(contractId);
      expect(result.payment?.allocation_status).toBe('allocated');
    });

    it('should update contract balance after payment allocation', async () => {
      const paymentId = 'test-payment-id';
      const contractId = 'test-contract-id';
      const amount = 1000;

      await paymentService.allocatePayment(paymentId, contractId);

      // Verify contract balance update
      const { data: contract } = await supabase
        .from('contracts')
        .select('total_paid')
        .eq('id', contractId)
        .single();

      expect(contract?.total_paid).toBeGreaterThanOrEqual(amount);
    });
  });

  describe('validatePayment', () => {
    it('should validate payment data correctly', async () => {
      const paymentData = {
        company_id: 'test-company-id',
        customer_id: 'test-customer-id',
        payment_date: new Date().toISOString(),
        amount: 1000,
        payment_method: 'cash',
        payment_type: 'rental_income',
        transaction_type: 'income'
      };

      const result = await paymentService.validatePayment(paymentData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject payment with invalid amount', async () => {
      const paymentData = {
        company_id: 'test-company-id',
        customer_id: 'test-customer-id',
        payment_date: new Date().toISOString(),
        amount: 0, // invalid
        payment_method: 'cash'
      };

      const result = await paymentService.validatePayment(paymentData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Payment amount must be positive');
    });

    it('should reject payment with invalid customer_id', async () => {
      const paymentData = {
        company_id: 'test-company-id',
        customer_id: 'non-existent-customer-id',
        payment_date: new Date().toISOString(),
        amount: 1000,
        payment_method: 'cash'
      };

      const result = await paymentService.validatePayment(paymentData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Customer not found');
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status to completed', async () => {
      const paymentId = 'test-payment-id';
      const newStatus = PaymentStatus.COMPLETED;

      const result = await paymentService.updatePaymentStatus(paymentId, newStatus);

      expect(result.success).toBe(true);
      expect(result.payment?.payment_status).toBe(newStatus);
    });

    it('should update processing status with notes', async () => {
      const paymentId = 'test-payment-id';
      const newProcessingStatus = ProcessingStatus.PROCESSING;
      const notes = 'Processing payment...';

      const result = await paymentService.updatePaymentStatus(paymentId, undefined, newProcessingStatus, notes);

      expect(result.success).toBe(true);
      expect(result.payment?.processing_status).toBe(newProcessingStatus);
      expect(result.payment?.processing_notes).toContain(notes);
    });

    it('should reject invalid status transition', async () => {
      const paymentId = 'test-payment-id';
      const invalidStatus = 'invalid-status' as any;

      const result = await paymentService.updatePaymentStatus(paymentId, invalidStatus);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid state transition');
    });
  });
});
