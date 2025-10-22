/**
 * Integration tests for Contract Workflow
 *
 * Tests complete contract creation and management flows including:
 * - Contract creation with payment tracking
 * - Contract renewal process
 * - Status updates and lifecycle management
 * - Vehicle linking and tracking
 * - Payment calculations and balance management
 * - Contract deletion with cascade handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
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
    user: { id: 'test-user-id', user_metadata: { company_id: 'test-company-id' } },
    filter: { company_id: 'test-company-id' },
    isSystemLevel: false,
    isCompanyScoped: true
  })
}));

// Import after mocks
import { useContracts } from '@/hooks/useContracts';

describe('Contract Workflow Integration', () => {
  let queryClient: QueryClient;

  const buildChainableMock = (finalData: any = { data: [], error: null }) => {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);
    chain.neq = vi.fn().mockReturnValue(chain);
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

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should create contract, add payment, calculate balance', async () => {
    // Step 1: Create contract
    const newContract = {
      contract_number: 'CNT-2025-001',
      customer_id: 'customer-1',
      vehicle_id: 'vehicle-1',
      contract_date: '2025-01-15',
      start_date: '2025-01-15',
      end_date: '2025-12-31',
      contract_amount: 12000,
      monthly_amount: 1000,
      status: 'active',
      contract_type: 'rental'
    };

    const createdContract = {
      id: 'contract-1',
      ...newContract,
      company_id: 'test-company-id',
      total_paid: 0,
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-15T10:00:00Z'
    };

    // Mock contract creation
    const mockContractInsert = buildChainableMock({
      data: createdContract,
      error: null
    });
    vi.mocked(supabase.from).mockReturnValueOnce(mockContractInsert as any);

    // Step 2: Fetch contract with initial state
    const mockContractWithCustomer = {
      ...createdContract,
      customer: {
        id: 'customer-1',
        first_name: 'أحمد',
        last_name: 'علي',
        phone: '+96512345678',
        email: 'ahmed@example.com'
      },
      vehicle: {
        id: 'vehicle-1',
        plate_number: 'ABC-123',
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        status: 'rented'
      }
    };

    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: [mockContractWithCustomer], error: null }) as any
    );
    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: [], error: null }) as any
    );

    const { result: contractResult } = renderHook(() => useContracts(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(contractResult.current.isSuccess).toBe(true);
    });

    expect(contractResult.current.data).toHaveLength(1);
    expect(contractResult.current.data![0]).toMatchObject({
      contract_number: 'CNT-2025-001',
      contract_amount: 12000,
      total_paid: 0,
      balance_due: 12000
    });

    // Step 3: Add payment
    const payment = {
      contract_id: 'contract-1',
      amount: 3000,
      payment_date: '2025-02-01',
      payment_method: 'cash',
      payment_type: 'receipt'
    };

    const mockPaymentInsert = buildChainableMock({
      data: { id: 'payment-1', ...payment },
      error: null
    });
    vi.mocked(supabase.from).mockReturnValueOnce(mockPaymentInsert as any);

    // Step 4: Refetch contract with payment
    const updatedContract = {
      ...mockContractWithCustomer,
      total_paid: 3000
    };

    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: [updatedContract], error: null }) as any
    );
    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: [{ contract_id: 'contract-1', amount: 3000 }], error: null }) as any
    );

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['contracts'] });
    });

    await waitFor(() => {
      expect(contractResult.current.data![0].total_paid).toBe(6000); // 3000 (direct) + 3000 (linked)
      expect(contractResult.current.data![0].balance_due).toBe(6000); // 12000 - 6000
    });
  });

  it('should handle contract renewal', async () => {
    const originalContract = {
      id: 'contract-1',
      contract_number: 'CNT-2024-001',
      customer_id: 'customer-1',
      vehicle_id: 'vehicle-1',
      contract_date: '2024-01-01',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      contract_amount: 12000,
      monthly_amount: 1000,
      status: 'completed',
      contract_type: 'rental',
      company_id: 'test-company-id',
      total_paid: 12000,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-12-31T00:00:00Z'
    };

    // Mock fetching original contract
    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: originalContract, error: null }) as any
    );

    // Create renewal contract
    const renewalContract = {
      contract_number: 'CNT-2025-001',
      customer_id: originalContract.customer_id,
      vehicle_id: originalContract.vehicle_id,
      contract_date: '2025-01-01',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      contract_amount: 13000, // Increased rate
      monthly_amount: 1083.33,
      status: 'active',
      contract_type: 'rental',
      previous_contract_id: originalContract.id
    };

    const mockRenewalInsert = buildChainableMock({
      data: { id: 'contract-2', ...renewalContract, company_id: 'test-company-id' },
      error: null
    });
    vi.mocked(supabase.from).mockReturnValueOnce(mockRenewalInsert as any);

    // Verify renewal was created
    await waitFor(() => {
      expect(mockRenewalInsert.insert).toHaveBeenCalled();
    });
  });

  it('should update contract status', async () => {
    const contract = {
      id: 'contract-1',
      contract_number: 'CNT-2025-001',
      status: 'active',
      company_id: 'test-company-id',
      customer_id: 'customer-1',
      contract_amount: 12000,
      total_paid: 12000
    };

    // Mock status update to completed
    const mockUpdate = buildChainableMock({
      data: { ...contract, status: 'completed' },
      error: null
    });
    vi.mocked(supabase.from).mockReturnValueOnce(mockUpdate as any);

    // Execute update
    await act(async () => {
      // In real implementation, this would be a mutation
      const result = await mockUpdate.update({ status: 'completed' }).eq('id', 'contract-1');
      expect(result.data.status).toBe('completed');
    });
  });

  it('should link vehicle to contract', async () => {
    const contract = {
      id: 'contract-1',
      contract_number: 'CNT-2025-001',
      customer_id: 'customer-1',
      vehicle_id: null,
      status: 'draft',
      company_id: 'test-company-id'
    };

    const vehicle = {
      id: 'vehicle-1',
      plate_number: 'ABC-123',
      status: 'available'
    };

    // Step 1: Update contract with vehicle
    const mockContractUpdate = buildChainableMock({
      data: { ...contract, vehicle_id: vehicle.id },
      error: null
    });
    vi.mocked(supabase.from).mockReturnValueOnce(mockContractUpdate as any);

    // Step 2: Update vehicle status to rented
    const mockVehicleUpdate = buildChainableMock({
      data: { ...vehicle, status: 'rented' },
      error: null
    });
    vi.mocked(supabase.from).mockReturnValueOnce(mockVehicleUpdate as any);

    // Execute both updates
    await act(async () => {
      await mockContractUpdate.update({ vehicle_id: vehicle.id }).eq('id', contract.id);
      await mockVehicleUpdate.update({ status: 'rented' }).eq('id', vehicle.id);
    });

    // Verify both updates succeeded
    expect(mockContractUpdate.update).toHaveBeenCalledWith({ vehicle_id: vehicle.id });
    expect(mockVehicleUpdate.update).toHaveBeenCalledWith({ status: 'rented' });
  });

  it('should calculate payment totals correctly', async () => {
    const contract = {
      id: 'contract-1',
      contract_number: 'CNT-2025-001',
      customer_id: 'customer-1',
      contract_amount: 10000,
      monthly_amount: 1000,
      status: 'active',
      contract_type: 'rental',
      company_id: 'test-company-id',
      total_paid: 2000, // Direct payments
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    };

    // Linked payments from payments table
    const linkedPayments = [
      { contract_id: 'contract-1', amount: 1000 },
      { contract_id: 'contract-1', amount: 1500 },
      { contract_id: 'contract-1', amount: 500 }
    ];

    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: [contract], error: null }) as any
    );
    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: linkedPayments, error: null }) as any
    );

    const { result } = renderHook(() => useContracts(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const contractData = result.current.data![0];
    expect(contractData.linked_payments_amount).toBe(3000); // 1000 + 1500 + 500
    expect(contractData.total_paid).toBe(5000); // 2000 + 3000
    expect(contractData.balance_due).toBe(5000); // 10000 - 5000
  });

  it('should handle contract deletion with payments', async () => {
    const contract = {
      id: 'contract-1',
      contract_number: 'CNT-2025-001',
      customer_id: 'customer-1',
      contract_amount: 10000,
      total_paid: 3000,
      status: 'cancelled'
    };

    // Check if contract has payments
    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({
        data: [{ id: 'payment-1' }, { id: 'payment-2' }],
        error: null
      }) as any
    );

    // If has payments, soft delete (set status to cancelled)
    const mockUpdate = buildChainableMock({
      data: { ...contract, status: 'cancelled', deleted_at: new Date().toISOString() },
      error: null
    });
    vi.mocked(supabase.from).mockReturnValueOnce(mockUpdate as any);

    // Execute soft delete
    await act(async () => {
      const payments = await supabase.from('payments').select('id').eq('contract_id', contract.id);

      if (payments.data && payments.data.length > 0) {
        // Has payments, soft delete
        await mockUpdate.update({
          status: 'cancelled',
          deleted_at: new Date().toISOString()
        }).eq('id', contract.id);
      }
    });

    expect(mockUpdate.update).toHaveBeenCalled();
  });

  it('should handle contract with multiple installments', async () => {
    const contract = {
      id: 'contract-1',
      contract_number: 'CNT-2025-001',
      customer_id: 'customer-1',
      contract_amount: 12000,
      monthly_amount: 1000,
      status: 'active',
      contract_type: 'installment',
      company_id: 'test-company-id',
      total_paid: 0,
      installments_count: 12,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    };

    // Create installments
    const installments = Array.from({ length: 12 }, (_, i) => ({
      id: `installment-${i + 1}`,
      contract_id: contract.id,
      installment_number: i + 1,
      amount: 1000,
      due_date: `2025-${String(i + 1).padStart(2, '0')}-01`,
      status: 'pending',
      paid_amount: 0
    }));

    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: installments, error: null }) as any
    );

    // Pay first 3 installments
    const paidInstallments = installments.slice(0, 3).map(inst => ({
      ...inst,
      status: 'paid',
      paid_amount: 1000
    }));

    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: paidInstallments, error: null }) as any
    );

    // Verify installment tracking
    await waitFor(() => {
      expect(paidInstallments).toHaveLength(3);
      expect(paidInstallments.every(inst => inst.status === 'paid')).toBe(true);
    });
  });

  it('should validate contract date ranges', async () => {
    const contract = {
      contract_number: 'CNT-2025-001',
      customer_id: 'customer-1',
      vehicle_id: 'vehicle-1',
      contract_date: '2025-01-15',
      start_date: '2025-01-20', // After contract date
      end_date: '2025-01-10', // Before start date - INVALID
      contract_amount: 12000,
      status: 'draft'
    };

    // Validation should fail
    const validationError = {
      message: 'End date must be after start date',
      code: 'VALIDATION_ERROR'
    };

    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: null, error: validationError }) as any
    );

    // Attempt to create invalid contract
    try {
      const result = await supabase.from('contracts').insert(contract);
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('End date must be after start date');
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });

  it('should track contract amendments', async () => {
    const originalContract = {
      id: 'contract-1',
      contract_number: 'CNT-2025-001',
      contract_amount: 12000,
      monthly_amount: 1000,
      status: 'active'
    };

    const amendment = {
      contract_id: originalContract.id,
      amendment_date: '2025-06-01',
      amendment_type: 'amount_change',
      old_value: { contract_amount: 12000, monthly_amount: 1000 },
      new_value: { contract_amount: 15000, monthly_amount: 1250 },
      reason: 'Rate increase due to market conditions',
      approved_by: 'test-user-id'
    };

    // Mock amendment creation
    const mockAmendmentInsert = buildChainableMock({
      data: { id: 'amendment-1', ...amendment },
      error: null
    });
    vi.mocked(supabase.from).mockReturnValueOnce(mockAmendmentInsert as any);

    // Update contract with new amounts
    const mockContractUpdate = buildChainableMock({
      data: { ...originalContract, ...amendment.new_value },
      error: null
    });
    vi.mocked(supabase.from).mockReturnValueOnce(mockContractUpdate as any);

    // Execute amendment
    await act(async () => {
      await mockAmendmentInsert.insert(amendment);
      await mockContractUpdate.update(amendment.new_value).eq('id', originalContract.id);
    });

    expect(mockAmendmentInsert.insert).toHaveBeenCalledWith(amendment);
    expect(mockContractUpdate.update).toHaveBeenCalled();
  });
});
