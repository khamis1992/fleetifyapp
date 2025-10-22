import { describe, it, expect, beforeEach, vi } from 'vitest';
import { paymentAllocationEngine, AllocationRule } from '../paymentAllocationEngine';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { id: 'test-account', account_name: 'Test Account' },
                error: null
              }))
            }))
          }))
        }))
      }))
    }))
  }
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('PaymentAllocationEngine', () => {
  const validPaymentData = {
    id: 'payment-123',
    amount: 1000,
    customerId: 'customer-123',
    contractId: 'contract-123',
    paymentMethod: 'cash',
    companyId: 'company-123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('allocatePayment', () => {
    it('should successfully allocate a valid payment', async () => {
      const result = await paymentAllocationEngine.allocatePayment(validPaymentData);

      expect(result.success).toBe(true);
      expect(result.allocations).toBeDefined();
      expect(result.allocations.length).toBeGreaterThan(0);
    });

    it('should reject payment with invalid amount', async () => {
      const invalidPayment = { ...validPaymentData, amount: 0 };
      const result = await paymentAllocationEngine.allocatePayment(invalidPayment);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should reject payment with negative amount', async () => {
      const invalidPayment = { ...validPaymentData, amount: -100 };
      const result = await paymentAllocationEngine.allocatePayment(invalidPayment);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject payment without company ID', async () => {
      const invalidPayment = { ...validPaymentData, companyId: '' };
      const result = await paymentAllocationEngine.allocatePayment(invalidPayment);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('معرف الشركة مطلوب');
    });

    it('should generate journal entry preview for valid payment', async () => {
      const result = await paymentAllocationEngine.allocatePayment(validPaymentData);

      expect(result.success).toBe(true);
      expect(result.journalEntryPreview).toBeDefined();
      expect(result.journalEntryPreview?.totalAmount).toBe(validPaymentData.amount);
      expect(result.journalEntryPreview?.lines).toBeDefined();
    });
  });

  describe('createAllocationRule', () => {
    it('should create a new allocation rule', async () => {
      const rule: Omit<AllocationRule, 'id'> = {
        name: 'Test Rule',
        priority: 1,
        conditions: {
          minAmount: 100,
          maxAmount: 1000,
          paymentMethod: 'cash'
        },
        distribution: [
          {
            accountId: 'account-123',
            percentage: 100,
            description: 'Test Distribution'
          }
        ]
      };

      const ruleId = await paymentAllocationEngine.createAllocationRule(rule, 'company-123');

      expect(ruleId).toBeDefined();
      expect(typeof ruleId).toBe('string');
    });
  });

  describe('getAllocationRules', () => {
    it('should return allocation rules for a company', async () => {
      const rules = await paymentAllocationEngine.getAllocationRules('company-123');

      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });
  });
});
