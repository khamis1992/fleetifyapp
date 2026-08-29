import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSignedLeaseValidation } from '../useSignedLeaseValidation';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('useSignedLeaseValidation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should return false for all checks when no contract or company ID', () => {
    const { result } = renderHook(() => useSignedLeaseValidation(), { wrapper });

    expect(result.current.hasSignedLease).toBe(false);
    expect(result.current.hasIdentityMatch).toBe(false);
    expect(result.current.canConvertToLegal).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should return validation status when both checks pass', async () => {
    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc.mockResolvedValue({ data: true, error: null } as any);

    const { result } = renderHook(
      () => useSignedLeaseValidation('contract-123', 'company-456'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasSignedLease).toBe(true);
    expect(result.current.hasIdentityMatch).toBe(true);
    expect(result.current.canConvertToLegal).toBe(true);
    expect(result.current.blockingReason).toBeUndefined();
  });

  it('should return blocking reason when signed lease is missing', async () => {
    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc
      .mockResolvedValueOnce({ data: false, error: null } as any) // signed lease check
      .mockResolvedValueOnce({ data: true, error: null } as any); // identity check

    const { result } = renderHook(
      () => useSignedLeaseValidation('contract-123', 'company-456'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasSignedLease).toBe(false);
    expect(result.current.hasIdentityMatch).toBe(true);
    expect(result.current.canConvertToLegal).toBe(false);
    expect(result.current.blockingReason).toBe('عقد موقّع مطابق غير موجود');
  });

  it('should return blocking reason when identity verification is missing', async () => {
    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc
      .mockResolvedValueOnce({ data: true, error: null } as any) // signed lease check
      .mockResolvedValueOnce({ data: false, error: null } as any); // identity check

    const { result } = renderHook(
      () => useSignedLeaseValidation('contract-123', 'company-456'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasSignedLease).toBe(true);
    expect(result.current.hasIdentityMatch).toBe(false);
    expect(result.current.canConvertToLegal).toBe(false);
    expect(result.current.blockingReason).toBe('الهوية غير متحققة');
  });

  it('should return combined blocking reason when both checks fail', async () => {
    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc
      .mockResolvedValueOnce({ data: false, error: null } as any) // signed lease check
      .mockResolvedValueOnce({ data: false, error: null } as any); // identity check

    const { result } = renderHook(
      () => useSignedLeaseValidation('contract-123', 'company-456'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasSignedLease).toBe(false);
    expect(result.current.hasIdentityMatch).toBe(false);
    expect(result.current.canConvertToLegal).toBe(false);
    expect(result.current.blockingReason).toBe('عقد موقّع مطابق غير موجود والهوية غير متحققة');
  });

  it('should handle errors gracefully', async () => {
    const mockRpc = vi.mocked(supabase.rpc);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc.mockResolvedValue({ 
      data: null, 
      error: { message: 'Test error' } 
    } as any);

    const { result } = renderHook(
      () => useSignedLeaseValidation('contract-123', 'company-456'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasSignedLease).toBe(false);
    expect(result.current.hasIdentityMatch).toBe(false);
    expect(result.current.canConvertToLegal).toBe(false);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('should call the correct RPC functions with correct parameters', async () => {
    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc.mockResolvedValue({ data: true, error: null } as any);

    const contractId = 'contract-123';
    const companyId = 'company-456';

    renderHook(() => useSignedLeaseValidation(contractId, companyId), { wrapper });

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('check_contract_has_verified_signed_lease_v1', {
        p_company_id: companyId,
        p_contract_id: contractId,
      });
      expect(mockRpc).toHaveBeenCalledWith('check_contract_identity_verified_v1', {
        p_company_id: companyId,
        p_contract_id: contractId,
      });
    });
  });
});
