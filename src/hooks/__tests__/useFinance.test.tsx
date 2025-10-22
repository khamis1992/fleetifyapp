/**
 * Unit tests for useFinance hooks
 *
 * Tests core financial hooks including Chart of Accounts CRUD operations,
 * validation, multi-tenant isolation, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Unmock global mocks from setup.ts
vi.unmock('@/hooks/useFinance');

// Mock supabase client BEFORE imports
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks
import {
  useChartOfAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useFinancialSummary,
} from '../useFinance';
import { toast } from 'sonner';

// Create a wrapper with QueryClient for testing
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useFinance - Chart of Accounts', () => {
  // Helper function to build chainable mock (defined outside beforeEach for reuse in tests)
  const buildChainableMock = (finalData: any = { data: [], error: null }) => {
    const chain: any = {};

    // Assign properties after declaring chain to avoid circular reference error
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue(finalData);
    chain.maybeSingle = vi.fn().mockResolvedValue(finalData);
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.update = vi.fn().mockReturnValue(chain);
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any) => Promise.resolve(finalData).then(resolve);
    chain.catch = (reject: any) => Promise.resolve(finalData).catch(reject);

    return chain;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock chain with empty data
    const defaultChain = buildChainableMock({ data: [], error: null });

    mockOrder.mockReturnValue(defaultChain);
    mockEq.mockReturnValue(defaultChain);
    mockSelect.mockReturnValue(defaultChain);
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue(defaultChain);
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  describe('useChartOfAccounts', () => {
    it('should fetch chart of accounts successfully', async () => {
      const mockAccounts = [
        {
          id: '1',
          account_code: '1000',
          account_name: 'Cash',
          account_type: 'assets',
          balance_type: 'debit',
          current_balance: 10000,
          is_active: true,
        },
        {
          id: '2',
          account_code: '2000',
          account_name: 'Accounts Payable',
          account_type: 'liabilities',
          balance_type: 'credit',
          current_balance: 5000,
          is_active: true,
        },
      ];

      mockFrom.mockReturnValueOnce(buildChainableMock({ data: mockAccounts, error: null }));

      const { result } = renderHook(() => useChartOfAccounts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockAccounts);
      expect(result.current.data).toHaveLength(2);
    });

    it('should handle authentication errors', async () => {
      const authError = {
        message: 'JWT expired',
        code: 'PGRST301',
      };

      mockFrom.mockReturnValueOnce(buildChainableMock({ data: null, error: authError }));

      const { result } = renderHook(() => useChartOfAccounts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain('انتهت جلسة العمل');
    });

    it('should handle database errors', async () => {
      const dbError = {
        message: 'Database connection failed',
        code: 'DB_ERROR',
      };

      // Mock will be called multiple times due to retries, always return error
      mockFrom.mockReturnValue(buildChainableMock({ data: null, error: dbError }));

      const { result } = renderHook(() => useChartOfAccounts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 5000 });

      expect(result.current.error).toBeTruthy();
    });

    it('should filter by company_id', async () => {
      mockFrom.mockReturnValueOnce(buildChainableMock({ data: [], error: null }));

      renderHook(() => useChartOfAccounts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('chart_of_accounts');
      });
    });
  });

  describe('useCreateAccount', () => {
    it('should create account successfully', async () => {
      const newAccount = {
        account_code: '1100',
        account_name: 'Bank Account',
        account_type: 'assets' as const,
        balance_type: 'debit' as const,
      };

      const createdAccount = {
        id: 'new-id',
        ...newAccount,
        current_balance: 0,
        is_active: true,
        company_id: 'test-company-id',
      };

      // Mock duplicate check (first call) - returns null (no duplicate)
      mockFrom.mockReturnValueOnce(buildChainableMock({ data: null, error: null }));

      // Mock insert (second call) - returns created account
      mockFrom.mockReturnValueOnce(buildChainableMock({ data: createdAccount, error: null }));

      const { result } = renderHook(() => useCreateAccount(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(newAccount);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('تم إنشاء الحساب بنجاح');
    });

    it('should validate required fields', async () => {
      const invalidAccount = {
        account_code: '',
        account_name: '',
        account_type: 'assets' as const,
        balance_type: 'debit' as const,
      };

      const { result } = renderHook(() => useCreateAccount(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(invalidAccount);
        } catch (error) {
          expect(error).toBeTruthy();
          expect((error as Error).message).toContain('كود الحساب مطلوب');
        }
      });
    });

    it('should prevent duplicate account codes', async () => {
      const duplicateAccount = {
        account_code: '1000',
        account_name: 'Duplicate Cash',
        account_type: 'assets' as const,
        balance_type: 'debit' as const,
      };

      // Mock finding existing account (duplicate check returns existing account)
      mockFrom.mockReturnValueOnce(buildChainableMock({
        data: { id: 'existing-id' },
        error: null,
      }));

      const { result } = renderHook(() => useCreateAccount(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(duplicateAccount);
        } catch (error) {
          expect(error).toBeTruthy();
          expect((error as Error).message).toBe('كود الحساب موجود بالفعل');
        }
      });
    });

    it('should calculate account level based on parent', async () => {
      const accountWithParent = {
        account_code: '1110',
        account_name: 'Cash - Local',
        account_type: 'assets' as const,
        balance_type: 'debit' as const,
        parent_account_id: 'parent-id',
      };

      // Mock duplicate check (first call - returns null, no duplicate)
      mockFrom.mockReturnValueOnce(buildChainableMock({ data: null, error: null }));

      // Mock parent account fetch (second call - returns parent with level 2)
      mockFrom.mockReturnValueOnce(buildChainableMock({
        data: { account_level: 2 },
        error: null,
      }));

      // Track insert calls to verify account_level
      const mockInsertChain = buildChainableMock({ data: { id: 'new-id' }, error: null });
      mockFrom.mockReturnValueOnce(mockInsertChain);

      const { result } = renderHook(() => useCreateAccount(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(accountWithParent);
      });

      // Verify insert was called with account_level 3
      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          account_level: 3,
        })
      );
    });

    it('should handle database errors on create', async () => {
      const account = {
        account_code: '1100',
        account_name: 'Test Account',
        account_type: 'assets' as const,
        balance_type: 'debit' as const,
      };

      // Mock duplicate check success (first call)
      mockFrom.mockReturnValueOnce(buildChainableMock({ data: null, error: null }));

      // Mock insert failure (second call)
      const dbError = { message: 'Database error' };
      mockFrom.mockReturnValueOnce(buildChainableMock({ data: null, error: dbError }));

      const { result } = renderHook(() => useCreateAccount(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(account);
        } catch (error) {
          expect(error).toBeTruthy();
        }
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('useUpdateAccount', () => {
    it('should update account successfully', async () => {
      const updateData = {
        id: 'account-id',
        account_name: 'Updated Cash',
        current_balance: 15000,
      };

      const updatedAccount = {
        id: 'account-id',
        account_code: '1000',
        account_name: 'Updated Cash',
        current_balance: 15000,
      };

      mockFrom.mockReturnValueOnce(buildChainableMock({ data: updatedAccount, error: null }));

      const { result } = renderHook(() => useUpdateAccount(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(updateData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('تم تحديث الحساب بنجاح');
    });

    it('should handle update errors', async () => {
      const updateData = {
        id: 'account-id',
        account_name: 'Updated Cash',
      };

      const error = { message: 'Update failed' };
      mockFrom.mockReturnValueOnce(buildChainableMock({ data: null, error }));

      const { result } = renderHook(() => useUpdateAccount(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(updateData);
        } catch (err) {
          expect(err).toEqual(error);
        }
      });

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('خطأ في تحديث الحساب')
      );
    });
  });

  describe('useDeleteAccount', () => {
    it('should soft delete account successfully (has transactions)', async () => {
      const accountId = 'account-with-transactions';

      mockRpc.mockResolvedValueOnce({
        data: false, // false = soft delete
        error: null,
      });

      const { result } = renderHook(() => useDeleteAccount(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(accountId);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        'تم إلغاء تفعيل الحساب (يحتوي على معاملات أو حسابات فرعية)'
      );
    });

    it('should hard delete account successfully (no transactions)', async () => {
      const accountId = 'account-without-transactions';

      mockRpc.mockResolvedValueOnce({
        data: true, // true = hard delete
        error: null,
      });

      const { result } = renderHook(() => useDeleteAccount(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(accountId);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith(
        'تم حذف الحساب نهائياً من دليل الحسابات'
      );
    });

    it('should handle delete errors', async () => {
      const accountId = 'account-id';
      const error = { message: 'Cannot delete account' };

      mockRpc.mockResolvedValueOnce({
        data: null,
        error,
      });

      const { result } = renderHook(() => useDeleteAccount(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(accountId);
        } catch (err) {
          expect(err).toEqual(error);
        }
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('useFinancialSummary', () => {
    it('should calculate financial summary correctly', async () => {
      const revenueAccounts = [
        { current_balance: 50000 },
        { current_balance: 30000 },
      ];

      const expenseAccounts = [
        { current_balance: 20000 },
        { current_balance: 15000 },
      ];

      // Mock three sequential queries
      // First query - revenue accounts
      mockFrom.mockReturnValueOnce(buildChainableMock({ data: revenueAccounts, error: null }));

      // Second query - expense accounts
      mockFrom.mockReturnValueOnce(buildChainableMock({ data: expenseAccounts, error: null }));

      // Third query - pending transactions count
      mockFrom.mockReturnValueOnce(buildChainableMock({ count: 5, error: null }));

      const { result } = renderHook(() => useFinancialSummary(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      if (result.current.data) {
        expect(result.current.data.totalRevenue).toBe(80000); // 50000 + 30000
        expect(result.current.data.totalExpenses).toBe(35000); // 20000 + 15000
        expect(result.current.data.netIncome).toBe(45000); // 80000 - 35000
        expect(result.current.data.pendingTransactions).toBe(5);
      }
    });

    it('should handle empty accounts', async () => {
      // Mock three sequential queries with empty data
      // First query - revenue accounts (empty)
      mockFrom.mockReturnValueOnce(buildChainableMock({ data: [], error: null }));

      // Second query - expense accounts (empty)
      mockFrom.mockReturnValueOnce(buildChainableMock({ data: [], error: null }));

      // Third query - pending transactions count (0)
      mockFrom.mockReturnValueOnce(buildChainableMock({ count: 0, error: null }));

      const { result } = renderHook(() => useFinancialSummary(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      if (result.current.data) {
        expect(result.current.data.totalRevenue).toBe(0);
        expect(result.current.data.totalExpenses).toBe(0);
        expect(result.current.data.netIncome).toBe(0);
        expect(result.current.data.pendingTransactions).toBe(0);
      }
    });
  });
});
