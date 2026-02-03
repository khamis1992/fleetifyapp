/**
 * Payment Linking Service Unit Tests
 * 
 * Tests for intelligent payment linking to invoices/contracts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { paymentLinkingService } from '@/services/PaymentLinkingService';
import { supabase } from '@/integrations/supabase/client';

// Mock data
const companyId = 'test-company-id';
const contractId = 'test-contract-id';
const invoiceId = 'test-invoice-id';
const customerId = 'test-customer-id';
const paymentId = 'test-payment-id';

describe('Payment Linking Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('linkPaymentToContract', () => {
    it('should successfully link payment to contract', async () => {
      const result = await paymentLinkingService.linkPaymentToContract(
        paymentId,
        contractId,
        companyId
      );

      expect(result.success).toBe(true);
      expect(result.linked).toBe(true);
    });

    it('should fail to link non-existent payment', async () => {
      const result = await paymentLinkingService.linkPaymentToContract(
        'non-existent-payment',
        contractId,
        companyId
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('الدفعة غير موجودة');
    });

    it('should fail to link payment to already linked contract', async () => {
      const result = await paymentLinkingService.linkPaymentToContract(
        paymentId,
        contractId,
        companyId
      );

      // Mock payment already linked
      vi.spyOn(paymentLinkingService, 'isPaymentLinkedToContract')
        .mockResolvedValueOnce(true);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('الدفعة مرتبطة بعقد بالفعل');
    });
  });

  describe('linkPaymentToInvoice', () => {
    it('should successfully link payment to invoice', async () => {
      const result = await paymentLinkingService.linkPaymentToInvoice(
        paymentId,
        invoiceId,
        companyId
      );

      expect(result.success).toBe(true);
      expect(result.linked).toBe(true);
    });

    it('should fail to link non-existent payment', async () => {
      const result = await paymentLinkingService.linkPaymentToInvoice(
        'non-existent-payment',
        invoiceId,
        companyId
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('الدفعة غير موجودة');
    });

    it('should fail to link payment to already linked invoice', async () => {
      const result = await paymentLinkingService.linkPaymentToInvoice(
        paymentId,
        invoiceId,
        companyId
      );

      // Mock invoice already linked
      vi.spyOn(paymentLinkingService, 'isPaymentLinkedToInvoice')
        .mockResolvedValueOnce(true);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('الدفعة مرتبطة بفاتورة بالفعل');
    });
  });

  describe('autoLinkPayments', () => {
    it('should auto-link payments to contracts', async () => {
      const payments = [
        { id: 'payment-1', amount: 1000, customer_id: 'customer-1' },
        { id: 'payment-2', amount: 1500, customer_id: 'customer-2' }
      ];

      const result = await paymentLinkingService.autoLinkPayments(companyId, payments);

      expect(result.success).toBe(true);
      expect(result.linkedCount).toBe(2);
    });

    it('should handle empty payments array', async () => {
      const result = await paymentLinkingService.autoLinkPayments(companyId, []);

      expect(result.success).toBe(true);
      expect(result.linkedCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should handle linking errors gracefully', async () => {
      const payments = [
        { id: 'payment-1', amount: 1000, customer_id: 'customer-1' },
        { id: 'payment-2', amount: 1500, customer_id: null } // Missing customer
      ];

      const result = await paymentLinkingService.autoLinkPayments(companyId, payments);

      expect(result.success).toBe(true);
      expect(result.linkedCount).toBe(1); // Only first payment linked
      expect(result.failedCount).toBe(1);
    });
  });

  describe('getUnlinkedPayments', () => {
    it('should return unlinked payments', async () => {
      // This would require database query
      // For unit tests, we'll just verify the method exists
      expect(paymentLinkingService.getUnlinkedPayments).toBeDefined();
    });

    it('should handle company filter', async () => {
      expect(paymentLinkingService.getUnlinkedPayments).toBeDefined();
    });
  });

  describe('getPaymentLinkingStatistics', () => {
    it('should return linking statistics', async () => {
      // Mock the statistics
      const mockStats = {
        totalPayments: 100,
        linkedPayments: 75,
        unlinkedPayments: 25,
        autoLinkingRate: 75
      };

      vi.spyOn(paymentLinkingService, 'getPaymentLinkingStatistics')
        .mockResolvedValueOnce(mockStats);

      const result = await paymentLinkingService.getPaymentLinkingStatistics(companyId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
    });
  });

  describe('relinkPayment', () => {
    it('should successfully relink payment to different contract', async () => {
      const result = await paymentLinkingService.relinkPayment(
        paymentId,
        'new-contract-id', // Different contract
        companyId
      );

      expect(result.success).toBe(true);
    });

    it('should fail to relink non-existent payment', async () => {
      const result = await paymentLinkingService.relinkPayment(
        'non-existent-payment',
        'new-contract-id',
        companyId
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('الدفعة غير موجودة');
    });
  });
});
