import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revertContractLegalProcedure } from '../contractLegalProcedureService';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));

const input = {
  contractId: 'contract-1',
  companyId: 'company-1',
  reason: 'تمت مراجعة طلب إزالة الإجراء القانوني',
  idempotencyKey: 'request-1',
};

describe('legal procedure reversal service', () => {
  beforeEach(() => rpc.mockReset());

  it('uses the atomic endpoint with explicit company scope and a stable request key', async () => {
    rpc.mockResolvedValue({ error: null, data: {
      success: true, contract_id: input.contractId, changed: true,
      closed_cases: 2, cancelled_jobs: 1, cancelled_preparations: 1,
      deactivated_delinquent_records: 1, vehicle_status: 'available',
    } });
    await expect(revertContractLegalProcedure({ ...input, reason: `  ${input.reason}  ` }))
      .resolves.toEqual({
        changed: true, closedCases: 2, cancelledJobs: 1, cancelledPreparations: 1,
        deactivatedDelinquentRecords: 1, vehicleStatus: 'available',
      });
    expect(rpc).toHaveBeenCalledWith('revert_contract_from_legal_v2', {
      p_company_id: input.companyId, p_contract_id: input.contractId,
      p_reason: input.reason, p_idempotency_key: input.idempotencyKey,
    });
  });

  it.each(['', '     ', '123456789', ' 12345  '])('rejects a short reason before making writes: %j', async (reason) => {
    await expect(revertContractLegalProcedure({ ...input, reason })).rejects.toThrow('10');
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(['companyId', 'contractId', 'idempotencyKey'] as const)('rejects missing %s before making writes', async (field) => {
    await expect(revertContractLegalProcedure({ ...input, [field]: ' ' })).rejects.toThrow('معرّف العملية');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails closed when the migration is absent, without invoking a legacy fallback', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Function not found' } });
    await expect(revertContractLegalProcedure(input)).rejects.toThrow('لم يُنشر بعد');
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('preserves server-side filing and permission guard errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'Not authorized' } });
    await expect(revertContractLegalProcedure(input)).rejects.toThrow('Not authorized');
  });

  it.each([null, [], {}, { success: false }, { success: 'true' }])('rejects an unconfirmed response: %j', async (data) => {
    rpc.mockResolvedValue({ data, error: null });
    await expect(revertContractLegalProcedure(input)).rejects.toThrow('لم تؤكد قاعدة البيانات');
  });

  it.each([
    { success: true, changed: true, contract_id: 'other-contract' },
    { success: true, changed: true },
    { success: true, contract_id: input.contractId },
  ])('does not report success for a mismatched or incomplete acknowledgement: %j', async (data) => {
    rpc.mockResolvedValue({ data, error: null });
    await expect(revertContractLegalProcedure(input)).rejects.toThrow('غير مكتملة أو لا تخص العقد');
  });

  it('accepts a confirmed idempotent no-op without inventing another mutation', async () => {
    rpc.mockResolvedValue({ error: null, data: {
      success: true, contract_id: input.contractId, changed: false, idempotent_replay: true,
    } });
    await expect(revertContractLegalProcedure(input)).resolves.toMatchObject({ changed: false });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
