import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  canReactivateCancelledContract,
  reactivateCancelledContract,
} from '../contractReactivationService';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc },
}));

describe('contract reactivation service', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('only exposes reactivation for cancelled spellings', () => {
    expect(canReactivateCancelledContract('cancelled')).toBe(true);
    expect(canReactivateCancelledContract('CANCELED')).toBe(true);
    expect(canReactivateCancelledContract('active')).toBe(false);
    expect(canReactivateCancelledContract('under_legal_procedure')).toBe(false);
  });

  it('calls the dedicated atomic RPC with the explicit violation acknowledgement', async () => {
    rpc.mockResolvedValue({
      data: {
        success: true,
        contract_id: 'contract-1',
        status: 'active',
        financial_documents_preserved: true,
      },
      error: null,
    });

    await expect(reactivateCancelledContract({
      contractId: 'contract-1',
      acceptUnpaidViolations: true,
    })).resolves.toMatchObject({ status: 'active' });

    expect(rpc).toHaveBeenCalledWith(
      'reactivate_cancelled_contract_atomic_v1',
      {
        p_contract_id: 'contract-1',
        p_accept_unpaid_violations: true,
      },
    );
  });

  it('surfaces database guard failures', async () => {
    const error = new Error('المركبة مرتبطة بعقد نشط');
    rpc.mockResolvedValue({ data: null, error });

    await expect(reactivateCancelledContract({
      contractId: 'contract-1',
      acceptUnpaidViolations: false,
    })).rejects.toBe(error);
  });
});
