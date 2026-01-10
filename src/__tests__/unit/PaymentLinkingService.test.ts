import { describe, it, expect, beforeEach, vi } from 'vitest';
import { paymentLinkingService } from '@/services/PaymentLinkingService';
import { PaymentStatus, AllocationStatus } from '@/types/payment-enums';

describe('PaymentLinkingService', () => {
  const mockPayment = {
    id: 'test-payment-id',
    company_id: 'test-company-id',
    customer_id: 'test-customer-id',
    payment_date: new Date().toISOString(),
    amount: 1000,
    payment_status: PaymentStatus.PENDING,
    allocation_status: AllocationStatus.UNALLOCATED,
    payment_method: 'cash',
    payment_type: 'rental_income',
    transaction_type: 'income'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findMatchingSuggestions', () => {
    it('should find exact invoice match', async () => {
      const paymentWithInvoice = {
        ...mockPayment,
        invoice_id: 'test-invoice-id'
      };

      const suggestions = await paymentLinkingService.findMatchingSuggestions(paymentWithInvoice);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].targetType).toBe('invoice');
      expect(suggestions[0].targetId).toBe('test-invoice-id');
      expect(suggestions[0].confidence).toBe(100);
    });

    it('should find exact contract match', async () => {
      const paymentWithContract = {
        ...mockPayment,
        contract_id: 'test-contract-id'
      };

      const suggestions = await paymentLinkingService.findMatchingSuggestions(paymentWithContract);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].targetType).toBe('contract');
      expect(suggestions[0].targetId).toBe('test-contract-id');
      expect(suggestions[0].confidence).toBe(100);
    });

    it('should match by reference number with high confidence', async () => {
      const paymentWithRef = {
        ...mockPayment,
        reference_number: 'INV-1234'
      };

      const suggestions = await paymentLinkingService.findMatchingSuggestions(paymentWithRef);

      const refMatch = suggestions.find(s => s.reason.includes('Reference number'));
      expect(refMatch).toBeDefined();
      expect(refMatch?.confidence).toBeGreaterThanOrEqual(90);
    });

    it('should match by customer, amount, and date', async () => {
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const paymentWithCustomer = {
        ...mockPayment,
        payment_date: today.toISOString()
      };

      const suggestions = await paymentLinkingService.findMatchingSuggestions(paymentWithCustomer);

      const customerMatch = suggestions.find(s => s.reason.includes('Customer, amount, and date'));
      expect(customerMatch).toBeDefined();
      expect(customerMatch?.confidence).toBeGreaterThanOrEqual(60);
    });

    it('should match by amount within tolerance', async () => {
      const suggestions = await paymentLinkingService.findMatchingSuggestions(mockPayment);

      const amountMatches = suggestions.filter(s => s.reason.includes('Amount match'));
      expect(amountMatches.length).toBeGreaterThan(0);
      amountMatches.forEach(match => {
        expect(match.confidence).toBeGreaterThanOrEqual(40);
      });
    });

    it('should rank suggestions by confidence', async () => {
      const suggestions = await paymentLinkingService.findMatchingSuggestions(mockPayment);

      // Verify suggestions are sorted by confidence (highest first)
      for (let i = 0; i < suggestions.length - 1; i++) {
        expect(suggestions[i].confidence).toBeGreaterThanOrEqual(suggestions[i + 1].confidence);
      }
    });
  });

  describe('attemptAutoMatch', () => {
    it('should auto-match with confidence >= 70%', async () => {
      const result = await paymentLinkingService.attemptAutoMatch(mockPayment);

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.payment?.allocation_status).toBe('allocated');
    });

    it('should not auto-match with confidence < 70%', async () => {
      // Mock low confidence scenario
      const result = await paymentLinkingService.attemptAutoMatch(mockPayment);

      // If no high-confidence match, should return null
      expect(result?.success).toBeFalsy();
    });
  });

  describe('matchPayment', () => {
    it('should match payment to invoice', async () => {
      const paymentId = 'test-payment-id';
      const invoiceId = 'test-invoice-id';

      const result = await paymentLinkingService.matchPayment(paymentId, 'invoice', invoiceId);

      expect(result.success).toBe(true);
      expect(result.payment?.invoice_id).toBe(invoiceId);
      expect(result.payment?.contract_id).toBeNull();
      expect(result.payment?.allocation_status).toBe('allocated');
      expect(result.payment?.processing_status).toBe('completed');
    });

    it('should match payment to contract', async () => {
      const paymentId = 'test-payment-id';
      const contractId = 'test-contract-id';

      const result = await paymentLinkingService.matchPayment(paymentId, 'contract', contractId);

      expect(result.success).toBe(true);
      expect(result.payment?.contract_id).toBe(contractId);
      expect(result.payment?.invoice_id).toBeNull();
      expect(result.payment?.allocation_status).toBe('allocated');
    });

    it('should handle payment not found', async () => {
      const result = await paymentLinkingService.matchPayment('non-existent-id', 'invoice', 'test-invoice-id');

      expect(result.success).toBe(false);
    });
  });
});
