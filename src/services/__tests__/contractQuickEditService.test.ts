import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveContractNotes } from '../contractQuickEditService';

const { from, update, eq, select, single } = vi.hoisted(() => ({
  from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));

const input = {
  companyId: 'company-1', contractId: 'contract-1',
  expectedUpdatedAt: '2026-09-03T12:00:00.123456+00:00', notes: 'ملاحظات الموظف',
};
const saved = {
  id: input.contractId, company_id: input.companyId, description: input.notes,
  updated_at: '2026-09-03T12:01:00.123456+00:00',
};

describe('notes-only contract quick save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const chain = { update, eq, select, single };
    from.mockReturnValue(chain);
    update.mockReturnValue(chain);
    eq.mockReturnValue(chain);
    select.mockReturnValue(chain);
    single.mockResolvedValue({ data: saved, error: null });
  });

  it('writes only description and scopes the atomic update by company, ID and exact version', async () => {
    await expect(saveContractNotes(input)).resolves.toEqual(saved);
    expect(from).toHaveBeenCalledWith('contracts');
    expect(update).toHaveBeenCalledWith({ description: input.notes });
    expect(eq.mock.calls).toEqual([
      ['id', input.contractId], ['company_id', input.companyId], ['updated_at', input.expectedUpdatedAt],
    ]);
    expect(select).toHaveBeenCalledWith('id, company_id, description, updated_at');
    expect(single).toHaveBeenCalledTimes(1);
  });

  it.each(['companyId', 'contractId', 'expectedUpdatedAt'] as const)('requires %s before issuing any write', async (field) => {
    await expect(saveContractNotes({ ...input, [field]: ' ' })).rejects.toThrow('نسخة العقد');
    expect(from).not.toHaveBeenCalled();
  });

  it.each(['', null])('supports clearing a note explicitly: %j', async (notes) => {
    single.mockResolvedValue({ data: { ...saved, description: null }, error: null });
    await expect(saveContractNotes({ ...input, notes })).resolves.toMatchObject({ description: null });
    expect(update).toHaveBeenCalledWith({ description: null });
  });

  it('rejects a zero-row/stale/unauthorized response instead of announcing success', async () => {
    single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: '0 rows' } });
    await expect(saveContractNotes(input)).rejects.toThrow('لم يُحفظ');
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('preserves backend errors and never retries with broader filters', async () => {
    single.mockResolvedValue({ data: null, error: { code: '42501', message: 'Not authorized' } });
    await expect(saveContractNotes(input)).rejects.toThrow('Not authorized');
    expect(update).toHaveBeenCalledTimes(1);
  });

  it.each([
    null, { ...saved, id: 'other' }, { ...saved, company_id: 'other' },
    { ...saved, description: 'not the submitted note' }, { ...saved, updated_at: null },
  ])('rejects an incomplete or mismatched acknowledgement: %j', async (data) => {
    single.mockResolvedValue({ data, error: null });
    await expect(saveContractNotes(input)).rejects.toThrow('نتيجة حفظ مطابقة');
  });
});
