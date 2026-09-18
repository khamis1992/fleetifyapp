import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { DefaultersList } from '../DefaultersList';
import { LegalReports } from '../LegalReports';
import { arrearsEnvelope, arrearsReview, arrearsRow } from '@/test/fixtures/rentalArrears';

const state = vi.hoisted(() => ({
  rpc: vi.fn(), convert: vi.fn(), companyId: 'company-1', user: { id: 'actor-1' },
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: state.rpc } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ ...state, isInitializing: false }) }));
vi.mock('@/services/batchContractLegalConversion', () => ({ convertSelectedContractsToLegal: state.convert }));
vi.mock('@/components/help/HelpIcon', () => ({ HelpIcon: () => null }));

let client: QueryClient;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-04T10:00:00Z'));
  state.companyId = 'company-1'; state.user = { id: 'actor-1' };
  state.rpc.mockReset(); state.convert.mockReset();
  state.rpc.mockResolvedValue({ data: arrearsEnvelope(), error: null });
  state.convert.mockResolvedValue({ converted: [], failed: [], ineligible: 0 });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); vi.useRealTimers(); });
const mount = (page: ReactNode) => render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
const selectAndConvert = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'تحديد الكل' }));
  fireEvent.click(screen.getByRole('button', { name: 'إنشاء قضايا قانونية (1)' }));
};

describe('canonical arrears mounted consumers (all writes mocked)', () => {
  it('keeps review rows and less-than-30-day debt out of batch selection', async () => {
    const recent = { ...arrearsRow, contract_id: 'recent', contract_number: 'RECENT', oldest_unpaid_date: '2026-09-01', days_overdue: 3 };
    state.rpc.mockResolvedValue({ data: arrearsEnvelope([arrearsRow, recent, arrearsReview]), error: null });
    mount(<DefaultersList />);
    expect(await screen.findByText(/REVIEW-1 —/)).toBeTruthy();
    // Header select-all plus two verified rows; the review row has no checkbox.
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getAllByRole('checkbox').filter(el => (el as HTMLInputElement).disabled)).toHaveLength(1);
    await selectAndConvert();
    await waitFor(() => expect(state.convert).toHaveBeenCalledTimes(1));
    expect(state.convert.mock.calls[0][2].map((row: { contract_id: string }) => row.contract_id)).toEqual(['contract-1']);
  });

  it.each(['paid', 'review', 'changed_customer', 'read_error'])('does not convert stale selected debt after %s', async (change) => {
    mount(<DefaultersList />);
    await screen.findByText('C-1');
    const rows = change === 'review' ? [{ ...arrearsReview, contract_id: 'contract-1' }]
      : change === 'changed_customer' ? [{ ...arrearsRow, customer_id: 'other-customer' }] : [];
    state.rpc.mockResolvedValue(change === 'read_error'
      ? { data: null, error: { code: '42501' } } : { data: arrearsEnvelope(rows), error: null });
    await selectAndConvert();
    await waitFor(() => expect(state.rpc.mock.calls.length).toBeGreaterThanOrEqual(2));
    await waitFor(() => expect(client.isMutating()).toBe(0));
    expect(state.convert).not.toHaveBeenCalled();
  });

  it('passes the freshly re-read amount, never the previously displayed amount', async () => {
    mount(<DefaultersList />); await screen.findByText('C-1');
    state.rpc.mockResolvedValue({ data: arrearsEnvelope([{ ...arrearsRow, paid_amount: 1200, outstanding_amount: 300 }]), error: null });
    await selectAndConvert();
    await waitFor(() => expect(state.convert).toHaveBeenCalledTimes(1));
    expect(state.convert.mock.calls[0][2][0].total_outstanding).toBe(300);
  });

  it('prints only verified contracts and escapes all customer-supplied HTML', async () => {
    const malicious = '<img src=x onerror=alert(1)>';
    state.rpc.mockResolvedValue({ data: arrearsEnvelope([
      { ...arrearsRow, customer_name: malicious, contract_number: malicious, customer_phone: malicious, customer_email: malicious, vehicle_plate: malicious },
      { ...arrearsRow, contract_id: 'second', contract_number: 'SECOND-SAME-CUSTOMER' }, arrearsReview,
    ]), error: null });
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { write, close: vi.fn() } } as unknown as Window);
    mount(<LegalReports />);
    fireEvent.click(await screen.findByRole('button', { name: 'طباعة' }));
    const html = write.mock.calls[0][0] as string;
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain(malicious);
    expect(html).toContain('SECOND-SAME-CUSTOMER');
    expect(html).toContain('<td>2 عقد</td>');
    expect(html).not.toContain('REVIEW-1');
    expect(html).toContain('مسودة');
    expect(html).toContain('02 سبتمبر 2026');
  });

  it('removes printable cached reports during refresh and after failure', async () => {
    mount(<LegalReports />); await screen.findByRole('button', { name: 'طباعة' });
    let finish!: (value: unknown) => void;
    state.rpc.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    let refresh!: Promise<void>;
    act(() => { refresh = client.invalidateQueries({ queryKey: ['late-payment-customers'] }); });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'طباعة' })).toBeNull());
    expect(screen.queryByText('C-1')).toBeNull();
    await act(async () => { finish({ data: null, error: { code: '42501' } }); await refresh; });
    expect(await screen.findByText(/لا يعني/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'طباعة' })).toBeNull();
  });
});
