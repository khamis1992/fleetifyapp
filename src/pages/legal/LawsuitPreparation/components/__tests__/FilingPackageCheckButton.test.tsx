import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilingPackageCheckButton } from '../FilingPackageCheckButton';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), success: vi.fn(), error: vi.fn(), ready: true }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock('../../store', () => ({ useLawsuitPreparationContext: () => ({ state: { companyId: 'company', contractId: 'contract', ui: {} } }) }));
vi.mock('../../utils/taqadiAutomation', () => ({ buildTaqadiFilingPayload: () => ({ documents: [] }) }));
vi.mock('../../utils/filingReadiness', () => ({ getFilingReadiness: () => ({ canStartFiling: mocks.ready, missingReasons: ['مستند ناقص'] }) }));

afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.ready = true; });
const check = () => { render(<FilingPackageCheckButton />); fireEvent.click(screen.getByRole('button', { name: 'فحص جاهزية الحافظة' })); };
describe('server package preflight', () => {
  it('runs only the read-only validator and reports success without enqueueing', async () => {
    mocks.rpc.mockResolvedValue({ data: { ready: true, missing: [] }, error: null });
    check();
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('validate_taqadi_filing_payload_v1', {
      p_company_id: 'company', p_contract_id: 'contract', p_payload: { documents: [] },
    });
  });
  it('explains server evidence failures in Arabic instead of reporting success', async () => {
    mocks.rpc.mockResolvedValue({ data: { ready: false, missing: ['documents.violationsEvidence'] }, error: null });
    check();
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('مستند إثبات المخالفات الرسمي')));
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it.each([null, {}, { ready: 'true' }])('does not claim success for an invalid response %j', async (data) => {
    mocks.rpc.mockResolvedValue({ data, error: null });
    check();
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('تعذر تأكيد')));
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it('shows local missing requirements without sending an incomplete package', async () => {
    mocks.ready = false;
    check();
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('مستند ناقص'));
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
