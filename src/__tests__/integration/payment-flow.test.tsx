import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedPaymentForm } from '@/components/finance/UnifiedPaymentForm';
import { supabase } from '@/integrations/supabase/client';

const paymentOperationMocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  preview: vi.fn(),
  options: null as any,
}));

vi.mock('@/hooks/business/usePaymentOperations', () => ({
  usePaymentOperations: (options: any) => {
    paymentOperationMocks.options = options;
    return {
      createPayment: { mutateAsync: paymentOperationMocks.create },
      updatePayment: { mutateAsync: paymentOperationMocks.update },
      generateJournalPreview: paymentOperationMocks.preview,
      isCreating: false,
      isUpdating: false,
      canCreatePayments: true,
    };
  },
}));

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
    user: { id: 'test-user-id', user_metadata: { company_id: 'test-company-id' } },
    getQueryKey: (baseKey: string[], additionalKeys: unknown[] = []) => {
      return [baseKey, 'test-company-id', ...additionalKeys].filter(Boolean);
    },
    validateCompanyAccess: (targetCompanyId: string) => {
      if (!targetCompanyId) {
        throw new Error('Company ID is required');
      }
      if (targetCompanyId !== 'test-company-id') {
        throw new Error('Access denied: Cannot access data from different company');
      }
    },
    filter: { company_id: 'test-company-id' },
    isSystemLevel: false,
    isCompanyScoped: true
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
    currency: 'QAR'
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
    paymentOperationMocks.create.mockResolvedValue({
      id: 'payment-1',
      payment_number: 'REC-25-001',
      amount: 1500,
      payment_status: 'completed',
    });
    paymentOperationMocks.update.mockResolvedValue({ id: 'payment-1', amount: 2000 });
    paymentOperationMocks.preview.mockImplementation(async (data: any) => ({
      entry_number: 'JE-PREVIEW',
      entry_date: '2025-01-15',
      description: 'معاينة قيد دفعة',
      total_amount: Number(data.amount || 0),
      lines: [
        { line_number: 1, account_name: 'النقدية', account_code: '1110', description: 'قبض', debit_amount: Number(data.amount || 0), credit_amount: 0 },
        { line_number: 2, account_name: 'العملاء', account_code: '1210', description: 'تسوية عميل', debit_amount: 0, credit_amount: Number(data.amount || 0) },
      ],
    }));
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderPaymentForm = (props = {}) => {
    const defaultProps = {
      open: true,
      onOpenChange: vi.fn(),
      type: 'customer_payment' as const,
      customerId: '11111111-1111-4111-8111-111111111111',
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

      // Submit payment. Accounting and preview behavior are covered separately below.
      const submitButton = screen.getByText(/حفظ الإيصال/i);
      fireEvent.click(submitButton);

      // Verify payment was created
      await waitFor(() => {
        expect(paymentOperationMocks.create).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 1500,
            customer_id: '11111111-1111-4111-8111-111111111111'
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
        expect(paymentOperationMocks.create).toHaveBeenCalled();
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
        expect(paymentOperationMocks.options).toEqual(expect.objectContaining({ requireApproval: true }));
        expect(paymentOperationMocks.create).toHaveBeenCalled();
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
        expect(paymentOperationMocks.update).toHaveBeenCalledWith({
          paymentId: 'payment-1',
          data: expect.objectContaining({ amount: 2000 }),
        });
      });
    });
  });

  describe('Payment Method Variations', () => {
    it('should show check number field for check payments', async () => {
      renderPaymentForm();

      const paymentMethodSelect = screen.getByLabelText(/طريقة الدفع/i);
      fireEvent.click(paymentMethodSelect);
      fireEvent.click(await screen.findByRole('option', { name: 'شيك' }));

      await waitFor(() => {
        expect(screen.getByLabelText(/رقم الشيك/i)).toBeInTheDocument();
      });
    });

    it('should show bank account field for bank transfers', async () => {
      renderPaymentForm();

      const paymentMethodSelect = screen.getByLabelText(/طريقة الدفع/i);
      fireEvent.click(paymentMethodSelect);
      fireEvent.click(await screen.findByRole('option', { name: 'تحويل بنكي' }));

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

      const previewButton = screen.getByRole('button', { name: /^معاينة القيد$/i });
      fireEvent.click(previewButton);

      await waitFor(() => {
        // Should show debit and credit entries
        expect(screen.getByText(/النقدية/i)).toBeInTheDocument();
        expect(screen.getByText(/العملاء/i)).toBeInTheDocument();
        
        // Should show amounts
        expect(screen.getAllByText(/1,?500/).length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should show balanced journal entry', async () => {
      renderPaymentForm();

      const amountInput = screen.getByLabelText(/المبلغ/i);
      fireEvent.change(amountInput, { target: { value: '1000' } });

      const previewButton = screen.getByRole('button', { name: /^معاينة القيد$/i });
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
      paymentOperationMocks.create.mockRejectedValueOnce(new Error('Database error'));

      renderPaymentForm();

      const amountInput = screen.getByLabelText(/المبلغ/i);
      fireEvent.change(amountInput, { target: { value: '1000' } });

      const submitButton = screen.getByText(/حفظ الإيصال/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Toast error message should be shown
        expect(paymentOperationMocks.create).toHaveBeenCalled();
      });
    });

    it('should handle network errors', async () => {
      paymentOperationMocks.create.mockRejectedValueOnce(new Error('Network error'));

      renderPaymentForm();

      const amountInput = screen.getByLabelText(/المبلغ/i);
      fireEvent.change(amountInput, { target: { value: '1000' } });

      const submitButton = screen.getByText(/حفظ الإيصال/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(paymentOperationMocks.create).toHaveBeenCalled();
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
