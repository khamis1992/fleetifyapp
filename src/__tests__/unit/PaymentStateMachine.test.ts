import { describe, it, expect, beforeEach, vi } from 'vitest';
import { paymentStateMachine } from '@/services/PaymentStateMachine';
import { PaymentStatus, ProcessingStatus } from '@/types/payment-enums';

describe('PaymentStateMachine', () => {
  const mockPayment = {
    id: 'test-payment-id',
    company_id: 'test-company-id',
    customer_id: 'test-customer-id',
    payment_date: new Date().toISOString(),
    amount: 1000,
    payment_status: PaymentStatus.PENDING,
    processing_status: ProcessingStatus.NEW,
    payment_method: 'cash',
    payment_type: 'rental_income',
    transaction_type: 'income'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('transitionPaymentState', () => {
    it('should transition from NEW to PROCESSING', async () => {
      const result = await paymentStateMachine.transitionPaymentState(
        mockPayment.id,
        undefined,
        ProcessingStatus.PROCESSING
      );

      expect(result.payment_status).toBe(PaymentStatus.PENDING);
      expect(result.processing_status).toBe(ProcessingStatus.PROCESSING);
    });

    it('should transition from PROCESSING to COMPLETED', async () => {
      const result = await paymentStateMachine.transitionPaymentState(
        mockPayment.id,
        PaymentStatus.COMPLETED,
        ProcessingStatus.COMPLETED
      );

      expect(result.payment_status).toBe(PaymentStatus.COMPLETED);
      expect(result.processing_status).toBe(ProcessingStatus.COMPLETED);
    });

    it('should transition to FAILED with notes', async () => {
      const notes = 'Payment processing failed: Network error';

      const result = await paymentStateMachine.transitionPaymentState(
        mockPayment.id,
        PaymentStatus.FAILED,
        ProcessingStatus.FAILED,
        notes
      );

      expect(result.payment_status).toBe(PaymentStatus.FAILED);
      expect(result.processing_status).toBe(ProcessingStatus.FAILED);
      expect(result.processing_notes).toContain(notes);
    });

    it('should reject invalid transition', async () => {
      // Try to transition from COMPLETED to PENDING (invalid)
      const completedPayment = {
        ...mockPayment,
        payment_status: PaymentStatus.COMPLETED,
        processing_status: ProcessingStatus.COMPLETED
      };

      await expect(
        paymentStateMachine.transitionPaymentState(
          completedPayment.id,
          PaymentStatus.PENDING
        )
      ).rejects.toThrow('Invalid state transition');
    });
  });

  describe('markAsProcessing', () => {
    it('should mark payment as processing', async () => {
      const result = await paymentStateMachine.markAsProcessing(mockPayment.id);

      expect(result.processing_status).toBe(ProcessingStatus.PROCESSING);
      expect(result.processing_notes).toContain('Payment processing initiated.');
    });
  });

  describe('markAsCompleted', () => {
    it('should mark payment as completed', async () => {
      const result = await paymentStateMachine.markAsCompleted(mockPayment.id);

      expect(result.payment_status).toBe(PaymentStatus.COMPLETED);
      expect(result.processing_status).toBe(ProcessingStatus.COMPLETED);
      expect(result.processing_notes).toContain('completed successfully.');
    });
  });

  describe('markAsFailed', () => {
    it('should mark payment as failed with reason', async () => {
      const reason = 'Invalid payment method';

      const result = await paymentStateMachine.markAsFailed(mockPayment.id, reason);

      expect(result.payment_status).toBe(PaymentStatus.FAILED);
      expect(result.processing_status).toBe(ProcessingStatus.FAILED);
      expect(result.processing_notes).toContain(reason);
    });
  });

  describe('markForRetry', () => {
    it('should mark failed payment for retry', async () => {
      const failedPayment = {
        ...mockPayment,
        payment_status: PaymentStatus.FAILED,
        processing_status: ProcessingStatus.FAILED
      };

      const result = await paymentStateMachine.markForRetry(failedPayment.id);

      expect(result.payment_status).toBe(PaymentStatus.FAILED);
      expect(result.processing_status).toBe(ProcessingStatus.RETRYING);
      expect(result.processing_notes).toContain('Payment marked for retry.');
    });
  });

  describe('markAsCancelled', () => {
    it('should mark payment as cancelled', async () => {
      const result = await paymentStateMachine.markAsCancelled(mockPayment.id);

      expect(result.payment_status).toBe(PaymentStatus.CANCELLED);
      expect(result.processing_status).toBe(ProcessingStatus.CANCELLED);
      expect(result.processing_notes).toContain('Payment cancelled.');
    });
  });
});
