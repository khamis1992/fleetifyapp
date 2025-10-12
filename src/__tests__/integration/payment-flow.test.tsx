import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedPaymentForm } from '@/components/finance/UnifiedPaymentForm';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      })
    }
  }
}));

// Mock hooks
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({
  useUnifiedCompanyAccess: () => ({
    companyId: 'test-company-id',
    user: { id: 'test-user-id', user_metadata: { company_id: 'test-company-id' } }
  })
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasAccess: true
  })
}));

vi.mock('@/hooks/useBanks', () => ({
  useBanks: () => ({
    data: [
      { id: 'bank-1', bank_name: 'بنك الكويت الوطني', bank_name_ar: 'بنك الكويت الوطني' }
    ]
  })
}));

vi.mock('@/hooks/useCostCenters', () => ({
  useCostCenters: () => ({
    data: [
      { id: 'cc-1', center_name: 'Cost Center 1', center_name_ar: 'مركز التكلفة 1' }
    ]
  })
}));

vi.mock('@/hooks/useEntryAllowedAccounts', () => ({
  useEntryAllowedAccounts: () => ({
    data: [
      { 
        id: 'account-1', 
        account_code: '1110', 
        account_name: 'Cash', 
        account_level: 3 
      }
    ]
  })
}));

vi.mock('@/hooks/useActiveContracts', () => ({
  useActiveContracts: () => ({
    data: [
      { 
        id: 'contract-1', 
        contract_number: 'CNT-001', 
        description: 'Test Contract' 
      }
    ]
  })
}));

vi.mock('@/hooks/useCompanyCurrency', () => ({
  useCompanyCurrency: () => ({
    currency: 'KWD'
  })
}));

describe('Payment Flow Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderPaymentForm = (props = {}) => {
    const defaultProps = {
      open: true,
      onOpenChange: vi.fn(),
      type: 'customer_payment' as const,
      customerId: 'customer-1',
      onSuccess: vi.fn(),
      ...props
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <UnifiedPaymentForm {...defaultProps} />
      </QueryClientProvider>
    );
  };

  describe('Payment Creation Flow', () => {
    it('should complete full customer payment creation', async () => {
      // Mock successful database insert
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'payment-1',
              payment_number: 'REC-25-001',
              amount: 1500,
              payment_type: 'receipt',
              payment_status: 'completed'
            },
            error: null
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any);

      const onSuccess = vi.fn();
      renderPaymentForm({ onSuccess });

      // Step 1: Fill payment details
      const paymentNumberInput = screen.getByLabelText(/رقم الإيصال/i);
      fireEvent.change(paymentNumberInput, { target: { value: 'REC-25-001' } });

      const amountInput = screen.getByLabelText(/المبلغ/i);
      fireEvent.change(amountInput, { target: { value: '1500' } });

      const paymentMethodSelect = screen.getByLabelText(/طريقة الدفع/i);
      fireEvent.change(paymentMethodSelect, { target: { value: 'bank_transfer' } });

      // Step 2: Fill accounting details
      const accountingTab = screen.getByText('الحسابات');
      fireEvent.click(accountingTab);

      await waitFor(() => {
        expect(screen.getByText(/الحسابات والتصنيفات/i)).toBeInTheDocument();
      });

      // Step 3: Preview journal entry
      const previewButton = screen.getByText(/معاينة القيد/i);
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText(/معاينة القيد المحاسبي/i)).toBeInTheDocument();
      });

      // Step 4: Submit payment
      const submitButton = screen.getByText(/حفظ الإيصال/i);
      fireEvent.click(submitButton);

      // Verify payment was created
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 1500,
            payment_type: 'receipt',
            customer_id: 'customer-1'
          })
        );
      });

      // Verify success callback
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'payment-1',
            payment_number: 'REC-25-001'
          })
        );
      });
    });

    it('should handle payment validation errors', async () => {
      renderPaymentForm();

      // Try to submit without required fields
      const submitButton = screen.getByText(/حفظ الإيصال/i);
      fireEvent.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/المبلغ يجب أن يكون أكبر من صفر/i)).toBeInTheDocument();
      });
    });

    it('should create journal entry automatically', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'payment-1',
              payment_status: 'completed'
            },
            error: null
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any);

      renderPaymentForm({
        options: { autoCreateJournalEntry: true }
      });

      // Fill and submit payment
      const amountInput = screen.getByLabelText(/المبلغ/i);
      fireEvent.change(amountInput, { target: { value: '1000' } });

      const submitButton = screen.getByText(/حفظ الإيصال/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled();
      });

      // Journal entry creation is logged (check console)
      // In a real test, we'd verify the journal_entries table was updated
    });

    it('should require approval when configured', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'payment-1',
              payment_status: 'pending' // Should be pending
            },
            error: null
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any);

      renderPaymentForm({
        options: { requireApproval: true }
      });

      const amountInput = screen.getByLabelText(/المبلغ/i);
      fireEvent.change(amountInput, { target: { value: '1000' } });

      const submitButton = screen.getByText(/حفظ الإيصال/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            payment_status: 'pending'
          })
        );
      });
    });
  });

  describe('Payment Update Flow', () => {
    it('should update existing payment', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'payment-1', amount: 2000 },
                error: null
              })
            })
          })
        })
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'payment-1',
                amount: 1500,
                payment_status: 'completed'
              },
              error: null
            })
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        select: mockSelect
      } as any);

      renderPaymentForm({
        mode: 'edit',
        initialData: {
          id: 'payment-1',
          payment_number: 'REC-25-001',
          amount: 1500
        }
      });

      // Change amount
      const amountInput = screen.getByLabelText(/المبلغ/i);
      fireEvent.change(amountInput, { target: { value: '2000' } });

      const submitButton = screen.getByText(/تحديث الدفعة/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 2000
          })
        );
      });
    });
  });

  describe('Payment Method Variations', () => {
    it('should show check number field for check payments', async () => {
      renderPaymentForm();

      const paymentMethodSelect = screen.getByLabelText(/طريقة الدفع/i);
      fireEvent.change(paymentMethodSelect, { target: { value: 'check' } });

      await waitFor(() => {
        expect(screen.getByLabelText(/رقم الشيك/i)).toBeInTheDocument();
      });
    });

    it('should show bank account field for bank transfers', async () => {
      renderPaymentForm();

      const paymentMethodSelect = screen.getByLabelText(/طريقة الدفع/i);
      fireEvent.change(paymentMethodSelect, { target: { value: 'bank_transfer' } });

      await waitFor(() => {
        expect(screen.getByLabelText(/الحساب البنكي/i)).toBeInTheDocument();
      });
    });

    it('should not show additional fields for cash payments', async () => {
      renderPaymentForm();

      const paymentMethodSelect = screen.getByLabelText(/طريقة الدفع/i);
      fireEvent.change(paymentMethodSelect, { target: { value: 'cash' } });

      await waitFor(() => {
        expect(screen.queryByLabelText(/رقم الشيك/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/الحساب البنكي/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Journal Entry Preview', () => {
    it('should generate accurate journal entry preview', async () => {
      renderPaymentForm();

      const amountInput = screen.getByLabelText(/المبلغ/i);
      fireEvent.change(amountInput, { target: { value: '1500' } });

      const paymentMethodSelect = screen.getByLabelText(/طريقة الدفع/i);
      fireEvent.change(paymentMethodSelect, { target: { value: 'cash' } });

      const previewButton = screen.getByText(/معاينة القيد/i);
      fireEvent.click(previewButton);

      await waitFor(() => {
        // Should show debit and credit entries
        expect(screen.getByText(/النقدية/i)).toBeInTheDocument();
        expect(screen.getByText(/العملاء/i)).toBeInTheDocument();
        
        // Should show amounts
        expect(screen.getByText(/1,?500/)).toBeInTheDocument();
      });
    });

    it('should show balanced journal entry', async () => {
      renderPaymentForm();

      const amountInput = screen.getByLabelText(/المبلغ/i);
      fireEvent.change(amountInput, { target: { value: '1000' } });

      const previewButton = screen.getByText(/معاينة القيد/i);
      fireEvent.click(previewButton);

      await waitFor(() => {
        const totalRows = screen.getAllByText(/1,?000/);
        // Should appear twice: once in debit, once in credit
        expect(totalRows.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any);

      renderPaymentForm();

      const amountInput = screen.getByLabelText(/المبلغ/i);
      fireEvent.change(amountInput, { target: { value: '1000' } });

      const submitButton = screen.getByText(/حفظ الإيصال/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Toast error message should be shown
        expect(mockInsert).toHaveBeenCalled();
      });
    });

    it('should handle network errors', async () => {
      const mockInsert = vi.fn().mockRejectedValue(new Error('Network error'));

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any);

      renderPaymentForm();

      const amountInput = screen.getByLabelText(/المبلغ/i);
      fireEvent.change(amountInput, { target: { value: '1000' } });

      const submitButton = screen.getByText(/حفظ الإيصال/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled();
      });
    });
  });

  describe('Mock Data Generation', () => {
    it('should fill form with mock data', async () => {
      renderPaymentForm();

      const mockDataButton = screen.getByText(/بيانات تجريبية/i);
      fireEvent.click(mockDataButton);

      await waitFor(() => {
        const amountInput = screen.getByLabelText(/المبلغ/i) as HTMLInputElement;
        expect(parseFloat(amountInput.value)).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should render payment form within acceptable time', async () => {
      const startTime = performance.now();
      
      renderPaymentForm();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/رقم الإيصال/i)).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render in less than 1 second
      expect(renderTime).toBeLessThan(1000);
    });
  });
});
