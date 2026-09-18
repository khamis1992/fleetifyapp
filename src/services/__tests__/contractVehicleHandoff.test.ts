import { beforeEach, expect, it, vi } from 'vitest';
import { createContractWithHandoff } from '../contractVehicleHandoff';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
beforeEach(() => rpc.mockReset());
it('sends cancellation consent and creation data through one atomic request', async () => {
  rpc.mockResolvedValue({ data: { success: true }, error: null });
  await createContractWithHandoff({ p_company_id: 'company', p_deposit_amount: 0 }, {
    contractId: 'previous', updatedAt: 'version', reason: 'replacement contract',
  });
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith('create_contract_with_vehicle_handoff_v1', {
    p_creation_args: { p_company_id: 'company' }, p_previous_contract_id: 'previous',
    p_expected_updated_at: 'version', p_reason: 'replacement contract',
  });
});
it('preserves nonzero deposits and the ordinary creator when no handoff is approved', async () => {
  await createContractWithHandoff({ p_company_id: 'company', p_deposit_amount: 500 });
  expect(rpc).toHaveBeenCalledWith('create_contract_with_violation_override_atomic', {
    p_company_id: 'company', p_deposit_amount: 500,
  });
});
