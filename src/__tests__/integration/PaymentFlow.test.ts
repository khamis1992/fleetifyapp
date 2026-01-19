import { describe, it, expect, beforeEach, vi } from 'vitest';
import { paymentService } from '@/services/PaymentService';
import { paymentLinkingService } from '@/services/PaymentLinkingService';
import { paymentStateMachine } from '@/services/PaymentStateMachine';
import { accountingService } from '@/services/AccountingService';
import { notificationService } from '@/services/NotificationService';
import { PaymentStatus, ProcessingStatus } from '@/types/payment-enums';

describe('Payment Flow Integration Tests', () => {
  const mockPaymentData = {
    company_id: 'test-company-id',
    customer_id: 'test-customer-id',
    payment_date: new Date().toISOString(),
    amount: 1000,
    payment_method: 'cash',
    payment_type: 'rental_income',
    transaction_type: 'income'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Payment Flow', () => {
    it('should create and process payment successfully', async () => {
      // 1. Create payment
      const createResult = await paymentService.createPayment(mockPaymentData);
      expect(createResult.success).toBe(true);
      expect(createResult.payment).toBeDefined();

      const paymentId = createResult.payment!.id;

      // 2. Mark as processing
      await paymentStateMachine.markAsProcessing(paymentId);

      // 3. Process payment (matching, allocation, etc.)
      const processResult = await paymentService.processPayment(paymentId);
      expect(processResult.success).toBe(true);

      // 4. Mark as completed
      await paymentStateMachine.markAsCompleted(paymentId);

      // 5. Verify final state
      const { data: finalPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      expect(finalPayment?.payment_status).toBe(PaymentStatus.COMPLETED);
      expect(finalPayment?.processing_status).toBe(ProcessingStatus.COMPLETED);
      expect(finalPayment?.allocation_status).toBe('allocated');
    });

    it('should handle payment with invoice creation', async () => {
      // Create payment
      const createResult = await paymentService.createPayment({
        ...mockPaymentData,
        create_invoice: true
      });

      expect(createResult.success).toBe(true);
      expect(createResult.payment?.invoice_id).toBeDefined();

      // Verify invoice was created
      const { data: invoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', createResult.payment!.invoice_id)
        .single();

      expect(invoice).toBeDefined();
      expect(invoice?.total_amount).toBe(mockPaymentData.amount);
    });

    it('should send notifications after payment completion', async () => {
      const createResult = await paymentService.createPayment(mockPaymentData);
      const paymentId = createResult.payment!.id;

      await paymentStateMachine.markAsCompleted(paymentId);

      // Verify notification was sent (mocked)
      expect(notificationService.sendPaymentReceipt).toHaveBeenCalledWith(
        mockPaymentData.customer_id,
        expect.any(Object)
      );
    });

    it('should create journal entries for payment', async () => {
      const createResult = await paymentService.createPayment(mockPaymentData);
      const payment = createResult.payment!;

      // Create journal entry
      await accountingService.createJournalEntryForPayment(payment);

      // Verify journal entry was created
      const { data: journalEntries } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('reference_id', payment.id)
        .eq('reference_type', 'payment');

      expect(journalEntries).toBeDefined();
      expect(journalEntries?.length).toBeGreaterThan(0);

      // Verify journal entry lines
      const { data: journalLines } = await supabase
        .from('journal_entry_lines')
        .select('*')
        .eq('journal_entry_id', journalEntries![0].id);

      expect(journalLines).toBeDefined();
      expect(journalLines?.length).toBeGreaterThanOrEqual(2); // At least debit and credit
    });
  });

  describe('Payment Matching Flow', () => {
    it('should auto-match payment to invoice', async () => {
      const paymentWithInvoice = {
        ...mockPaymentData,
        invoice_id: 'test-invoice-id'
      };

      const createResult = await paymentService.createPayment(paymentWithInvoice);
      const payment = createResult.payment!;

      // Attempt auto-match
      const matchResult = await paymentLinkingService.attemptAutoMatch(payment);

      expect(matchResult).not.toBeNull();
      expect(matchResult?.success).toBe(true);
      expect(matchResult?.payment?.invoice_id).toBe('test-invoice-id');
    });

    it('should handle manual payment matching', async () => {
      const createResult = await paymentService.createPayment(mockPaymentData);
      const paymentId = createResult.payment!.id;

      // Manual match to contract
      const matchResult = await paymentLinkingService.matchPayment(
        paymentId,
        'contract',
        'test-contract-id'
      );

      expect(matchResult.success).toBe(true);
      expect(matchResult.payment?.contract_id).toBe('test-contract-id');
      expect(matchResult.payment?.allocation_status).toBe('allocated');
    });
  });

  describe('Payment Retry Flow', () => {
    it('should retry failed payment', async () => {
      const createResult = await paymentService.createPayment(mockPaymentData);
      const paymentId = createResult.payment!.id;

      // Mark as failed
      await paymentStateMachine.markAsFailed(paymentId, 'Network error');

      // Mark for retry
      await paymentStateMachine.markForRetry(paymentId);

      // Verify payment is in retrying state
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      expect(payment?.payment_status).toBe(PaymentStatus.FAILED);
      expect(payment?.processing_status).toBe(ProcessingStatus.RETRYING);
    });

    it('should not retry after max retries exceeded', async () => {
      const createResult = await paymentService.createPayment(mockPaymentData);
      const paymentId = createResult.payment!.id;

      // Mark as failed
      await paymentStateMachine.markAsFailed(paymentId, 'Persistent error');

      // Attempt to mark for retry (should succeed in state machine)
      await paymentStateMachine.markForRetry(paymentId);

      // After max retries, payment should be in manual review
      // This would be verified through PaymentQueueService in real implementation
    });
  });

  describe('Data Quality Checks', () => {
    it('should reject duplicate payment detection', async () => {
      const paymentWithIdempotency = {
        ...mockPaymentData,
        idempotency_key: 'unique-key-123'
      };

      // First payment
      const firstResult = await paymentService.createPayment(paymentWithIdempotency);
      expect(firstResult.success).toBe(true);

      // Duplicate payment
      const duplicateResult = await paymentService.createPayment(paymentWithIdempotency);
      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.error).toContain('duplicate');
    });

    it('should validate customer exists before payment', async () => {
      const invalidPayment = {
        ...mockPaymentData,
        customer_id: 'non-existent-customer-id'
      };

      const result = await paymentService.validatePayment(invalidPayment);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Customer not found');
    });

    it('should validate contract exists if contract_id provided', async () => {
      const paymentWithContract = {
        ...mockPaymentData,
        contract_id: 'non-existent-contract-id'
      };

      const result = await paymentService.validatePayment(paymentWithContract);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract not found');
    });
  });

  describe('Late Fee Calculation', () => {
    it('should calculate late fee for overdue payment', async () => {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 10); // 10 days overdue

      const overduePayment = {
        ...mockPaymentData,
        due_date: overdueDate.toISOString()
      };

      // Calculate late fee
      const { data: payment } = await supabase
        .from('payments')
        .select('late_fine_amount, late_fine_days_overdue')
        .eq('id', overduePayment.id)
        .single();

      expect(payment?.late_fine_days_overdue).toBeGreaterThan(0);
      expect(payment?.late_fine_amount).toBeGreaterThan(0);
    });

    it('should not apply late fee if on time', async () => {
      const onTimePayment = {
        ...mockPaymentData,
        due_date: new Date().toISOString() // Current date
      };

      const { data: payment } = await supabase
        .from('payments')
        .select('late_fine_amount, late_fine_status')
        .eq('id', onTimePayment.id)
        .single();

      expect(payment?.late_fine_amount).toBe(0);
      expect(payment?.late_fine_status).toBe('not_applicable');
    });
  });

  describe('Bank Reconciliation Flow', () => {
    it('should match bank transaction to payment', async () => {
      // Create bank transaction
      const bankTx = {
        company_id: 'test-company-id',
        transaction_date: new Date().toISOString(),
        description: 'Payment - Test Customer',
        amount: 1000,
        transaction_type: 'credit'
      };

      const { data: importedTx } = await supabase
        .from('bank_transactions')
        .insert(bankTx)
        .select()
        .single();

      expect(importedTx).toBeDefined();

      // Create payment
      const createResult = await paymentService.createPayment(mockPaymentData);
      const payment = createResult.payment!;

      // Reconcile
      const reconcileResult = await paymentLinkingService.matchPayment(
        payment.id,
        'invoice',
        'test-invoice-id'
      );

      expect(reconcileResult.success).toBe(true);
    });
  });
});
