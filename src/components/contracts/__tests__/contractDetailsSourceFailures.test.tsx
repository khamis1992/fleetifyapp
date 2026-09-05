/**
 * Executes the actual mounted details component/effect with controlled query
 * snapshots. Sync queryFn runs against a mocked RPC, never the live database.
 * Real query scheduling/races are tested separately with QueryClient/Observer.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContractDetailsPageRedesigned from '../ContractDetailsPageRedesigned';

const fixture = vi.hoisted(() => ({
  invalidate: vi.fn().mockResolvedValue(undefined),
  invalidateQueries(options: unknown) { return this.invalidate(options); },
  cancelQueries: vi.fn().mockResolvedValue(undefined),
  setQueryData: vi.fn(),
  rpc: vi.fn(),
  executeSync: (async () => undefined) as () => Promise<unknown>,
  executeInvoices: (async () => undefined) as () => Promise<unknown>,
  executePayments: (async () => undefined) as () => Promise<unknown>,
  selectPayments: ((value: unknown) => value) as (value: unknown) => unknown,
  paymentReader: vi.fn(),
  payments: [] as unknown[],
  paymentBundle: null as null | { payments: unknown[]; allocations: unknown[]; integrityWarnings?: string[] },
  invoiceReader: vi.fn(),
  invoiceKey: [] as unknown[],
  sync: { data: undefined as undefined | { changed: boolean; readError?: string }, dataUpdatedAt: 0, isFetching: false, error: null as Error | null },
  queryError: '' as string,
  scheduleError: false,
  loading: false,
  contract: {
    id: 'contract-1', company_id: 'company-1', contract_number: 'TEST-1',
    customer_id: 'customer-1', status: 'active', start_date: '2026-01-01',
    end_date: '2026-12-31', contract_amount: 18000, monthly_amount: 1500,
    total_paid: 0, balance_due: 18000,
  },
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => fixture,
  useQuery: ({ queryKey, queryFn, select }: { queryKey: unknown[]; queryFn: () => Promise<unknown>; select?: (value: unknown) => unknown }) => {
    if (queryKey[0] === 'contract-financial-refresh') {
      fixture.executeSync = queryFn;
      return fixture.sync;
    }
    if (queryKey[0] === 'contract-invoices') {
      fixture.executeInvoices = queryFn;
      fixture.invoiceKey = queryKey;
    }
    if (queryKey[0] === 'contract-payments') { fixture.executePayments = queryFn; fixture.selectPayments = select || ((value) => value); }
    return {
      // The payments query reads the whole evidence bundle (payments +
      // integrity warnings); tests inject either a bundle or a bare array.
      data: queryKey[0] === 'contract-details'
        ? fixture.contract
        : queryKey[0] === 'contract-payments'
          ? (fixture.paymentBundle ?? { payments: fixture.payments, allocations: [], integrityWarnings: [] })
          : [],
      error: queryKey[0] === fixture.queryError ? new Error('simulated read failure') : null,
      isLoading: fixture.loading,
    };
  },
}));
vi.mock('react-router-dom', () => ({
  useParams: () => ({ contractNumber: 'TEST-1' }),
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams()],
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: fixture.rpc } }));
vi.mock('@/services/contractInvoiceEvidence', () => ({ fetchContractInvoiceEvidence: (...args: unknown[]) => fixture.invoiceReader(...args) }));
vi.mock('@/services/contractPaymentEvidence', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/contractPaymentEvidence')>();
  return { ...actual, contractPaymentEvidenceQueryOptions: (scope: Parameters<typeof actual.contractPaymentEvidenceQueryOptions>[0]) => ({
    ...actual.contractPaymentEvidenceQueryOptions(scope), queryFn: () => fixture.paymentReader(scope),
  }) };
});
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({
  useUnifiedCompanyAccess: () => ({ companyId: 'company-1', isInitializing: false }),
}));
vi.mock('@/hooks/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({ formatCurrency: (value: number) => String(value) }),
}));
vi.mock('@/hooks/useVehicleInspections', () => ({
  useVehicleInspections: () => ({ data: [], isLoading: false, error: null }),
}));
vi.mock('@/hooks/useCustomerCRMActivity', () => ({
  useCustomerCRMActivity: () => ({ activities: [], stats: {}, addActivity: vi.fn() }),
}));
vi.mock('@/hooks/usePaymentSchedules', () => ({
  useContractPaymentSchedules: () => ({
    data: [], isLoading: false, error: fixture.scheduleError ? new Error('schedule read failed') : null,
  }),
  useGeneratePaymentSchedulesFromInvoices: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
}));
vi.mock('@/components/tour-guide', () => ({ useTourGuide: () => ({ startTour: vi.fn() }) }));
vi.mock('@/components/common/LazyPageWrapper', () => ({ PageSkeletonFallback: () => <div>Loading fixture</div> }));
vi.mock('@/components/finance/PayInvoiceDialog', () => ({ PayInvoiceDialog: () => null }));
vi.mock('@/components/finance/InvoicePreviewDialog', () => ({ InvoicePreviewDialog: () => null }));
vi.mock('@/components/contracts/ContractStatusManagement', () => ({ ContractStatusManagement: () => null }));
vi.mock('@/components/contracts/ContractCancellationDialog', () => ({ ContractCancellationDialog: () => null }));
vi.mock('@/components/contracts/LegalTransferReadinessWizard', () => ({ LegalTransferReadinessWizard: () => null }));
vi.mock('@/components/contracts/PermanentContractDeleteDialog', () => ({ PermanentContractDeleteDialog: () => null }));
vi.mock('@/components/contracts/ContractInvoiceDialog', () => ({ ContractInvoiceDialog: () => null }));
vi.mock('@/components/contracts/ContractRenewalDialog', () => ({ ContractRenewalDialog: () => null }));
vi.mock('@/components/contracts/SimpleContractWizard', () => ({ SimpleContractWizard: () => null }));
vi.mock('@/components/contracts/ContractPrintDialog', () => ({ ContractPrintDialog: () => null }));
vi.mock('@/components/contracts/FinancialDashboard', () => ({ FinancialDashboard: () => null }));
vi.mock('@/components/contracts/ContractAlerts', () => ({ ContractAlerts: () => null }));
vi.mock('@/components/contracts/TimelineView', () => ({ TimelineView: () => null }));
vi.mock('@/components/contracts/ContractPaymentsTabRedesigned', () => ({ ContractPaymentsTabRedesigned: () => null }));
vi.mock('@/components/contracts/ContractInvoicesTabRedesigned', () => ({ ContractInvoicesTabRedesigned: () => null }));
vi.mock('@/components/contracts/EnhancedPaymentScheduleTabRedesigned', () => ({ EnhancedPaymentScheduleTabRedesigned: () => null }));
vi.mock('@/components/contracts/VehiclePickupReturnTabRedesigned', () => ({ VehiclePickupReturnTabRedesigned: () => null }));
vi.mock('@/components/contracts/ContractViolationsTabRedesigned', () => ({ ContractViolationsTabRedesigned: () => null }));
vi.mock('@/components/contracts/ContractDocuments', () => ({ ContractDocuments: () => null }));
vi.mock('@/components/contracts/ContractHealthAnalysis', () => ({ ContractHealthAnalysis: () => null }));
vi.mock('@/components/contracts/SeizedActiveContractBanner', () => ({ SeizedActiveContractBanner: () => null }));
vi.mock('@/components/contracts/OfficialContractView', () => ({ OfficialContractView: () => null }));
vi.mock('@/components/contracts/contract-details-v3/ContractHero', () => ({ ContractHero: () => null }));
vi.mock('@/components/contracts/contract-details-v3/ContractActionBar', () => ({ ContractActionBar: () => null }));
vi.mock('@/components/contracts/contract-details-v3/ContractPulse', () => ({ ContractPulse: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.sync = { data: undefined, dataUpdatedAt: 0, isFetching: false, error: null };
  fixture.queryError = '';
  fixture.scheduleError = false;
  fixture.loading = false;
  fixture.invoiceReader.mockReset();
  fixture.paymentReader.mockReset();
  fixture.payments = [];
  fixture.paymentBundle = null;
  fixture.rpc.mockResolvedValue({ data: { contract_id: 'contract-1', changed: true }, error: null });
});
afterEach(cleanup);

const invoiceInvalidations = () => fixture.invalidate.mock.calls.filter(
  ([options]) => options.queryKey[0] === 'contract-invoices',
).length;

describe('contract details source failures and synchronization evidence', () => {
  it('calls the attributed payment reader from the real page query', async () => {
    const result = { payments: [{ id: 'p', financial_applications: [] }], allocations: [] };
    fixture.paymentReader.mockResolvedValue(result);
    render(<ContractDetailsPageRedesigned />);
    // The page reads the whole evidence bundle once and derives both the
    // payments and integrity warnings from the same cached query.
    expect(await fixture.executePayments()).toBe(result);
    expect(fixture.paymentReader).toHaveBeenCalledExactlyOnceWith({ companyId: 'company-1', contractId: 'contract-1', customerId: 'customer-1', invoiceIds: [] });
  });
  it('shows an attribution mismatch warning instead of silently relying on cached totals', () => {
    fixture.paymentBundle = {
      payments: [{ id: 'p', amount: 1000, payment_status: 'completed', invoice_id: null, financial_applications: [{ invoice_id: null, amount: 500 }] }],
      allocations: [],
    };
    render(<ContractDetailsPageRedesigned />);
    expect(screen.getByText(/المسدد محسوب من تخصيصات الدفعات المكتملة/)).toBeInTheDocument();
  });
  it('runs the complete evidence reader from the actual page query with company and customer scope', async () => {
    const result = [{ id: 'old-invoice' }];
    fixture.invoiceReader.mockResolvedValue(result);
    render(<ContractDetailsPageRedesigned />);
    expect(await fixture.executeInvoices()).toBe(result);
    expect(fixture.invoiceReader).toHaveBeenCalledExactlyOnceWith({ companyId: 'company-1', contractId: 'contract-1', customerId: 'customer-1' });
    expect(fixture.invoiceKey).toEqual(['contract-invoices', 'contract-1', 'company-1', 'customer-1', 'complete-evidence']);
  });

  it('preserves the invoice evidence failure rather than converting it into an empty result', async () => {
    const error = new Error('الفاتورة مرتبطة بعقد آخر');
    fixture.invoiceReader.mockRejectedValue(error);
    render(<ContractDetailsPageRedesigned />);
    await expect(fixture.executeInvoices()).rejects.toBe(error);
  });
  it.each([
    ['contract-invoices', 'الفواتير'],
    ['contract-payments', 'الدفعات'],
    ['contract-violations', 'المخالفات المرورية'],
  ])('blocks the financial page after %s fails', (key, label) => {
    fixture.queryError = key;
    render(<ContractDetailsPageRedesigned />);
    expect(screen.getByText('بيانات العقد غير مكتملة')).toBeInTheDocument();
    expect(screen.getByText(new RegExp('تعذر تحميل ' + label))).toBeInTheDocument();
    expect(screen.queryByText('المالي')).not.toBeInTheDocument();
    if (key === 'contract-invoices') expect(screen.getByRole('alert')).toHaveTextContent('simulated read failure');
  });

  it('blocks the page after the complete schedule read fails', () => {
    fixture.scheduleError = true;
    render(<ContractDetailsPageRedesigned />);
    expect(screen.getByText(/تعذر تحميل جدول الدفعات/)).toBeInTheDocument();
    expect(screen.queryByText('المالي')).not.toBeInTheDocument();
  });

  it('keeps initial loading separate from a zero financial balance', () => {
    fixture.loading = true;
    render(<ContractDetailsPageRedesigned />);
    expect(screen.getByText('Loading fixture')).toBeInTheDocument();
    expect(screen.queryByText('المالي')).not.toBeInTheDocument();
  });

  it('invalidates invoice reads after the first changed synchronization', async () => {
    fixture.loading = true;
    render(<ContractDetailsPageRedesigned />);
    expect(invoiceInvalidations()).toBe(0);
    await fixture.executeSync();
    expect(invoiceInvalidations()).toBe(1);
  });

  it('does not invalidate reads again on an unrelated render', async () => {
    fixture.loading = true;
    fixture.sync = { ...fixture.sync, data: { changed: true }, dataUpdatedAt: 1 };
    const view = render(<ContractDetailsPageRedesigned />);
    await fixture.executeSync();
    view.rerender(<ContractDetailsPageRedesigned />);
    expect(invoiceInvalidations()).toBe(1);
  });

  it('invalidates after a second successful changed=true result', async () => {
    fixture.loading = true;
    fixture.sync = { ...fixture.sync, data: { changed: true }, dataUpdatedAt: 1 };
    const view = render(<ContractDetailsPageRedesigned />);
    await fixture.executeSync();
    expect(invoiceInvalidations()).toBe(1);
    fixture.sync = { ...fixture.sync, data: { changed: true }, dataUpdatedAt: 2 };
    view.rerender(<ContractDetailsPageRedesigned />);
    await fixture.executeSync();
    expect(invoiceInvalidations()).toBe(2);
  });

  it('refreshes invoice reads even when contract aggregates did not change', async () => {
    fixture.loading = true;
    const view = render(<ContractDetailsPageRedesigned />);
    fixture.sync = { ...fixture.sync, data: { changed: false }, dataUpdatedAt: 1 };
    fixture.rpc.mockResolvedValue({ data: { contract_id: 'contract-1', changed: false }, error: null });
    view.rerender(<ContractDetailsPageRedesigned />);
    await fixture.executeSync();
    expect(invoiceInvalidations()).toBe(1);
  });

  it('recovers a failed post-sync invoice read without rerunning the command', async () => {
    fixture.queryError = 'contract-invoices';
    fixture.sync = { ...fixture.sync, data: { changed: false, readError: 'read failed' } };
    render(<ContractDetailsPageRedesigned />);
    fireEvent.click(screen.getByRole('button', { name: 'إعادة تحميل جميع بيانات العقد' }));
    await waitFor(() => expect(fixture.setQueryData).toHaveBeenCalled());
    expect(invoiceInvalidations()).toBe(1);
    expect(fixture.rpc).not.toHaveBeenCalled();
  });

  it('renders a failed synchronization message without hiding it as a no-op', () => {
    fixture.sync.error = new Error('دالة مزامنة أرصدة العقد غير متاحة في قاعدة البيانات');
    render(<ContractDetailsPageRedesigned />);
    expect(screen.getByText('دالة مزامنة أرصدة العقد غير متاحة في قاعدة البيانات')).toBeInTheDocument();
    expect(fixture.rpc).not.toHaveBeenCalled();
  });

  it('offers read-only retry for secondary reader failure after synchronization', async () => {
    fixture.sync.data = { changed: false, readError: 'اكتملت المزامنة وتعذر تحميل النتائج' };
    render(<ContractDetailsPageRedesigned />);
    expect(screen.getByText('اكتملت المزامنة وتعذر تحميل النتائج')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إعادة تحميل النتائج فقط' }));
    await waitFor(() => expect(fixture.setQueryData).toHaveBeenCalled());
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
});
