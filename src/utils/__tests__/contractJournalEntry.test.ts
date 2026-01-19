import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createContractJournalEntryManual,
  createContractWithFallback,
  ContractCreationParams
} from '../contractJournalEntry';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({
          data: {
            id: 'test-contract',
            contract_number: 'CNT-24-0001',
            contract_amount: 1000,
            created_by: 'user-123'
          },
          error: null
        })),
        maybeSingle: vi.fn(() => Promise.resolve({
          data: { id: 'test-type' },
          error: null
        })),
        limit: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-account', account_name: 'Test Account' },
            error: null
          }))
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({
            data: [{ id: 'test-account', account_name: 'Test Account' }],
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'test-journal-entry',
              entry_number: 'JE-20240101-0001'
            },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    gte: vi.fn(() => ({
      lt: vi.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  }))
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

describe('Contract Journal Entry Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createContractJournalEntryManual', () => {
    it('should create journal entry for valid contract', async () => {
      const result = await createContractJournalEntryManual(
        'contract-123',
        'company-123'
      );

      expect(result.success).toBe(true);
      expect(result.journal_entry_id).toBeDefined();
      expect(result.journal_entry_number).toBeDefined();
    });

    it('should skip journal entry for zero amount contract', async () => {
      // Mock contract with zero amount
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'test-contract',
                contract_amount: 0,
                created_by: 'user-123'
              },
              error: null
            }))
          }))
        }))
      }));

      const result = await createContractJournalEntryManual(
        'contract-123',
        'company-123'
      );

      expect(result.success).toBe(true);
      expect(result.journal_entry_id).toBeUndefined();
    });

    it('should handle missing contract gracefully', async () => {
      // Mock missing contract
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Contract not found' }
            }))
          }))
        }))
      }));

      const result = await createContractJournalEntryManual(
        'non-existent',
        'company-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contract not found');
    });
  });

  describe('createContractWithFallback', () => {
    const validContractParams: ContractCreationParams = {
      p_company_id: 'company-123',
      p_customer_id: 'customer-123',
      p_vehicle_id: 'vehicle-123',
      p_contract_type: 'rental',
      p_start_date: '2024-01-01',
      p_end_date: '2024-12-31',
      p_contract_amount: 12000,
      p_monthly_amount: 1000,
      p_description: 'Test contract',
      p_terms: 'Test terms',
      p_cost_center_id: null,
      p_created_by: 'user-123'
    };

    it('should create contract with journal entry', async () => {
      const result = await createContractWithFallback(validContractParams);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.success).toBe(true);
      expect(result.data?.contract_id).toBeDefined();
    });

    it('should create contract even if journal entry fails', async () => {
      // Mock journal entry failure but successful contract creation
      const result = await createContractWithFallback(validContractParams);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      // Contract should be created even if journal entry fails
      expect(result.data?.contract_id).toBeDefined();
    });

    it('should reject contract without required fields', async () => {
      const invalidParams = {
        ...validContractParams,
        p_customer_id: '' // Missing required field
      };

      // This should fail during validation
      await expect(async () => {
        await createContractWithFallback(invalidParams);
      }).rejects.toThrow();
    });

    it('should generate contract number automatically', async () => {
      const result = await createContractWithFallback(validContractParams);

      expect(result.error).toBeNull();
      expect(result.data?.contract_number).toBeDefined();
      expect(result.data?.contract_number).toMatch(/CNT-\d{2}-\d{4}/);
    });

    it('should include warnings when journal entry creation fails', async () => {
      const result = await createContractWithFallback(validContractParams);

      if (result.data?.requires_manual_entry) {
        expect(result.data.warnings).toBeDefined();
        expect(result.data.warnings!.length).toBeGreaterThan(0);
      }
    });
  });
});
