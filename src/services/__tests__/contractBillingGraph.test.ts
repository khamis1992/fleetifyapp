import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc },
}));

import { generateContractBillingGraph } from '@/services/contractBillingGraph';

describe('generateContractBillingGraph', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('returns the verified authoritative schedule outcome', async () => {
    rpc.mockResolvedValue({
      data: {
        success: true,
        mode: 'authoritative_schedule',
        created_invoices: 37,
        schedule_count: 37,
        schedule_total: 64_800,
      },
      error: null,
    });

    await expect(generateContractBillingGraph('contract-id')).resolves.toEqual({
      mode: 'authoritative_schedule',
      createdInvoices: 37,
      scheduleCount: 37,
      scheduleTotal: 64_800,
    });
    expect(rpc).toHaveBeenCalledWith('generate_contract_billing_graph_v2', {
      p_contract_id: 'contract-id',
    });
  });

  it('fails closed when the required database command is not deployed', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function' },
    });

    await expect(generateContractBillingGraph('contract-id')).rejects.toThrow(
      'أُوقف التوليد لمنع إنشاء فواتير خاطئة',
    );
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('rejects a response that does not prove database success', async () => {
    rpc.mockResolvedValue({
      data: { success: false, error: 'schedule total mismatch' },
      error: null,
    });

    await expect(generateContractBillingGraph('contract-id')).rejects.toThrow(
      'schedule total mismatch',
    );
  });

  it('preserves the generated-schedule response without inventing an unknown total', async () => {
    rpc.mockResolvedValue({ data: {
      success: true, mode: 'generated_schedule', created_invoices: 12, schedule_count: 12,
    }, error: null });
    await expect(generateContractBillingGraph('contract-id')).resolves.toEqual({
      mode: 'generated_schedule', createdInvoices: 12, scheduleCount: 12, scheduleTotal: null,
    });
  });

  it('accepts an explicit zero created count for already covered installments', async () => {
    rpc.mockResolvedValue({ data: {
      success: true, mode: 'authoritative_schedule', created_invoices: 0,
      schedule_count: 12, schedule_total: 18_000,
    }, error: null });
    await expect(generateContractBillingGraph('contract-id')).resolves.toMatchObject({ createdInvoices: 0 });
  });

  it.each([
    { success: true },
    { mode: 'unknown' },
    { mode: undefined },
    { created_invoices: undefined },
    { created_invoices: null },
    { created_invoices: '' },
    { created_invoices: false },
    { created_invoices: '1' },
    { created_invoices: -1 },
    { created_invoices: 1.5 },
    { created_invoices: Number.NaN },
    { created_invoices: Number.POSITIVE_INFINITY },
    { schedule_count: undefined },
    { schedule_count: -1 },
    { schedule_count: 1.5 },
    { schedule_total: undefined },
    { schedule_total: null },
    { schedule_total: 'invalid' },
    { schedule_total: -1 },
    { schedule_total: Number.POSITIVE_INFINITY },
  ])('rejects incomplete or malformed acknowledgement %j without another mutation', async (patch) => {
    const data = Object.keys(patch).length === 1 && 'success' in patch
      ? patch
      : { success: true, mode: 'authoritative_schedule', created_invoices: 1,
          schedule_count: 12, schedule_total: 18_000, ...patch };
    rpc.mockResolvedValue({ data, error: null });
    await expect(generateContractBillingGraph('contract-id')).rejects.toThrow('تعذر التحقق من نتيجة إنشاء الفواتير');
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['P0001', 'function generate_contract_billing_graph_v2: schedule lies outside contract dates'],
    ['42501', 'permission denied for function generate_contract_billing_graph_v2'],
  ])('preserves server error %s instead of mislabelling it as a missing migration', async (code, message) => {
    rpc.mockResolvedValue({ data: null, error: { code, message } });
    await expect(generateContractBillingGraph('contract-id')).rejects.toThrow(message);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
