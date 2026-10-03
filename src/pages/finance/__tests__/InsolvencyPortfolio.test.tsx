import { Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InsolvencyPortfolio from '../InsolvencyPortfolio';
import routeConfigs from '@/routes';
import type { InsolvencyPortfolio as Portfolio, PortfolioDocument } from '@/types/insolvencyPortfolio';

const COMPANY_A = '11111111-1111-4111-8111-111111111111';
const COMPANY_B = '22222222-2222-4222-8222-222222222222';
const CUTOFF = '2026-09-30';
const ZIP_BUTTON = 'تنزيل الحافظة وأجزاء المرفقات ZIP';
const REPORT_BUTTON = 'تنزيل تقرير قابل للطباعة';
const mocks = vi.hoisted(() => ({
  companyId: '11111111-1111-4111-8111-111111111111' as string | null,
  authenticating: false,
  allowed: true,
  validate: vi.fn(),
  read: vi.fn(),
  download: vi.fn(),
  buildZip: vi.fn(),
  reportHtml: vi.fn(),
  storageFrom: vi.fn(),
  upload: vi.fn(),
  financePage: vi.fn(),
  permission: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({
  companyId: mocks.companyId,
  isAuthenticating: mocks.authenticating,
  validateCompanyAccess: mocks.validate,
}) }));
vi.mock('@/hooks/useTranslation', () => ({ useFleetifyTranslation: () => ({ currentLanguage: 'ar' }) }));
vi.mock('@/services/financialReporting', () => ({ financeToday: () => '2026-09-30' }));
vi.mock('@/services/insolvencyPortfolio', () => ({ readInsolvencyPortfolio: mocks.read, downloadPortfolioDocument: mocks.download }));
vi.mock('@/utils/insolvencyPortfolioExport', () => ({ buildInsolvencyPortfolioZip: mocks.buildZip, portfolioReportHtml: mocks.reportHtml }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, warning: mocks.warning, success: mocks.success } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { storage: { from: mocks.storageFrom } } }));
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: mocks.storageFrom } } }));
vi.mock('@/components/finance/ProtectedFinanceRoute', () => ({ ProtectedFinanceRoute: ({ permission, children }: { permission: string; children: ReactNode }) => {
  mocks.permission(permission);
  return mocks.allowed ? children : <p role="alert">Permission denied</p>;
} }));
// Keep the actual registry and lazy route; unrelated eager landing pages are outside this test's scope.
vi.mock('@/pages/PremiumLanding', () => ({ default: () => null }));
vi.mock('@/pages/landing/EnterpriseLanding', () => ({ default: () => null }));
vi.mock('@/pages/Auth', () => ({ default: () => null }));
vi.mock('@/pages/onboarding/Onboarding', () => ({ default: () => null }));
vi.mock('@/pages/ResetPassword', () => ({ default: () => null }));
vi.mock('@/pages/DemoTrial', () => ({ default: () => null }));
vi.mock('@/pages/NotFound', () => ({ default: () => null }));
vi.mock('@/pages/Finance', () => ({ default: () => {
  mocks.financePage();
  return <p>Nested Finance routes</p>;
} }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function fixture(companyId = COMPANY_A): Portfolio {
  const suffix = companyId === COMPANY_A ? 'A' : 'B';
  return {
    companyId, cutoff: CUTOFF, startedAt: '2026-09-30T19:00:00Z', completedAt: '2026-09-30T19:01:00Z',
    registers: [{
      key: 'vehicles', label: `سجل الشركة ${suffix}`, basis: 'current_records', readAt: '2026-09-30T19:01:00Z',
      rows: [{ id: `vehicle-${suffix}`, company_id: companyId, status: 'stolen', book_value: 1234.56 }],
    }],
    documents: [{ id: `document-${suffix}`, source: 'vehicle_documents', name: `registered-${suffix}.pdf`, category: 'registration', ownerId: `vehicle-${suffix}`, reference: `${companyId}/vehicle-documents/vehicle-${suffix}/registered.pdf`, buckets: ['documents'], active: true }],
    savedStatements: [],
  };
}

function zipResult() { return { blob: new Blob(['synthetic zip']), manifest: [], failed: 0, archives: [] }; }

const clients: QueryClient[] = [];
function createClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false } } });
  clients.push(client);
  return client;
}
function view(client: QueryClient, child: ReactNode = <InsolvencyPortfolio />) {
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={['/finance/reports/insolvency-portfolio']}>{child}</MemoryRouter></QueryClientProvider>;
}
function renderPortfolio(client = createClient()) {
  const result = render(view(client));
  return { ...result, client, refresh: () => result.rerender(view(client)) };
}
async function ready(suffix = 'A') { await screen.findByRole('button', { name: `تنزيل سجل الشركة ${suffix}` }); }
function attachLocal(name = 'local-A.pdf') {
  const file = new File(['synthetic local evidence'], name, { type: 'application/pdf' });
  fireEvent.change(screen.getByLabelText('نسخة المستند'), { target: { files: [file] } });
  fireEvent.change(screen.getByLabelText('الجهة والتاريخ والمركبة أو القضية المرتبطة'), { target: { value: 'جهة تجريبية، 2026-09-30، قضية تجريبية' } });
  fireEvent.click(screen.getByRole('button', { name: 'إضافة نسخة إلى الحافظة' }));
  expect(screen.getByText(name)).toBeInTheDocument();
  return file;
}
function centralRouteView() {
  const direct = routeConfigs.find(route => route.path === '/finance/reports/insolvency-portfolio');
  const fallback = routeConfigs.find(route => route.path === '/finance/*');
  expect(direct).toMatchObject({ protected: true, exact: true, group: 'finance' });
  expect(direct?.component).toBeDefined();
  expect(fallback?.component).toBeDefined();
  expect(direct?.component).not.toBe(fallback?.component);
  const Direct = direct!.component!;
  const Finance = fallback!.component!;
  return <Suspense fallback={<p>Loading route</p>}><Routes>
    <Route path={fallback!.path} element={<Finance />} />
    <Route path={direct!.path} element={<Direct />} />
  </Routes></Suspense>;
}

describe('InsolvencyPortfolio company scope and extraction state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.companyId = COMPANY_A; mocks.authenticating = false; mocks.allowed = true;
    mocks.validate.mockImplementation((companyId: string) => { if (companyId !== mocks.companyId) throw new Error('Company access denied'); });
    mocks.read.mockImplementation((companyId: string) => Promise.resolve(fixture(companyId)));
    mocks.download.mockResolvedValue(new Blob(['synthetic registered evidence']));
    mocks.buildZip.mockResolvedValue(zipResult());
    mocks.reportHtml.mockReturnValue('<html>synthetic report</html>');
    mocks.storageFrom.mockReturnValue({ upload: mocks.upload });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:synthetic-portfolio'), revokeObjectURL: vi.fn() }));
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('33333333-3333-4333-8333-333333333333');
  });

  afterEach(() => {
    clients.splice(0).forEach(client => client.clear());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('hides old successful records during refetch and after failure, without reporting an empty portfolio', async () => {
    const { client } = renderPortfolio();
    await ready();
    const refresh = deferred<Portfolio>();
    mocks.read.mockReturnValueOnce(refresh.promise);
    fireEvent.click(screen.getByRole('button', { name: 'تحديث السجلات' }));
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: ZIP_BUTTON })).toBeDisabled());
    expect(screen.getByRole('button', { name: REPORT_BUTTON })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'تنزيل سجل الشركة A' })).not.toBeInTheDocument();
    expect(screen.queryByText('أرصدة العملاء الموجبة الحالية')).not.toBeInTheDocument();
    await act(async () => { refresh.reject(new Error('synthetic source denied')); await Promise.resolve(); });
    expect(await screen.findByRole('alert')).toHaveTextContent('synthetic source denied');
    expect(screen.getByRole('alert')).toHaveTextContent('لم تُستخدم نتائج جزئية');
    // React Query still retains the last successful snapshot: hiding it is a UI safety guard, not an empty cache.
    expect(client.getQueryData<Portfolio>(['insolvency-portfolio', COMPANY_A, CUTOFF])?.registers[0].rows).toHaveLength(1);
    expect(screen.queryByText('سجل الشركة A')).not.toBeInTheDocument();
    expect(screen.queryByText(/لا توجد سجلات|لا توجد بيانات|الحافظة فارغة/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: ZIP_BUTTON }));
    fireEvent.click(screen.getByRole('button', { name: REPORT_BUTTON }));
    expect(mocks.buildZip).not.toHaveBeenCalled();
    expect(mocks.reportHtml).not.toHaveBeenCalled();
  });

  it('clears the visible prior company scope and excludes its local evidence from the next company export', async () => {
    const { refresh } = renderPortfolio();
    await ready();
    attachLocal();
    const nextCompany = deferred<Portfolio>();
    mocks.read.mockReturnValueOnce(nextCompany.promise);
    mocks.companyId = COMPANY_B;
    refresh();
    expect(screen.getByRole('button', { name: ZIP_BUTTON })).toBeDisabled();
    expect(screen.getByRole('button', { name: REPORT_BUTTON })).toBeDisabled();
    expect(screen.queryByText('سجل الشركة A')).not.toBeInTheDocument();
    expect(screen.queryByText('local-A.pdf')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: ZIP_BUTTON }));
    expect(mocks.buildZip).not.toHaveBeenCalled();
    await act(async () => { nextCompany.resolve(fixture(COMPANY_B)); await nextCompany.promise; });
    await ready('B');
    fireEvent.click(screen.getByRole('button', { name: ZIP_BUTTON }));
    await waitFor(() => expect(mocks.buildZip).toHaveBeenCalledOnce());
    const [portfolio, , options] = mocks.buildZip.mock.calls[0];
    expect(portfolio.companyId).toBe(COMPANY_B);
    expect(options.documents).toEqual(fixture(COMPANY_B).documents);
    expect(options.evidenceNotes).toEqual([]);
    expect(mocks.read).toHaveBeenLastCalledWith(COMPANY_B, CUTOFF, expect.any(Function));
    expect(mocks.validate).toHaveBeenLastCalledWith(COMPANY_B);
  });

  it('rejects a mismatched company snapshot even if it was cached under the active query key', async () => {
    const client = createClient();
    client.setQueryData(['insolvency-portfolio', COMPANY_B, CUTOFF], fixture(COMPANY_A));
    mocks.companyId = COMPANY_B;
    mocks.read.mockResolvedValue(fixture(COMPANY_A));
    renderPortfolio(client);
    await waitFor(() => expect(mocks.read).toHaveBeenCalledOnce());
    await waitFor(() => expect(client.getQueryState(['insolvency-portfolio', COMPANY_B, CUTOFF])?.fetchStatus).toBe('idle'));
    expect(screen.getByRole('button', { name: ZIP_BUTTON })).toBeDisabled();
    expect(screen.getByRole('button', { name: REPORT_BUTTON })).toBeDisabled();
    expect(screen.queryByText('سجل الشركة A')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: ZIP_BUTTON }));
    expect(mocks.buildZip).not.toHaveBeenCalled();
  });

  it('keeps a local copy in browser memory and supplies that File to ZIP without calling storage or upload', async () => {
    mocks.read.mockResolvedValue({ ...fixture(), documents: [] });
    renderPortfolio();
    await ready();
    const file = attachLocal();
    expect(mocks.storageFrom).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.download).not.toHaveBeenCalled();
    let resolvedCopy: Blob | undefined;
    mocks.buildZip.mockImplementation(async (_portfolio: Portfolio, download: (doc: PortfolioDocument) => Promise<Blob>, options: { documents: PortfolioDocument[] }) => {
      expect(options.documents).toHaveLength(1);
      expect(options.documents[0]).toMatchObject({ source: 'local_supporting_evidence', ownerId: COMPANY_A, name: file.name });
      resolvedCopy = await download(options.documents[0]);
      return zipResult();
    });
    fireEvent.click(screen.getByRole('button', { name: ZIP_BUTTON }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
    expect(resolvedCopy).toBe(file);
    expect(mocks.buildZip.mock.calls[0][2].evidenceNotes[0]).toMatchObject({ company_id: COMPANY_A, document_name: file.name });
    expect(mocks.storageFrom).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it('cancels pending ZIP parts and the final download if the company changes during export', async () => {
    const { refresh } = renderPortfolio();
    await ready();
    const pendingZip = deferred<ReturnType<typeof zipResult>>();
    mocks.buildZip.mockReturnValueOnce(pendingZip.promise);
    fireEvent.click(screen.getByRole('button', { name: ZIP_BUTTON }));
    await waitFor(() => expect(mocks.buildZip).toHaveBeenCalledOnce());
    const options = mocks.buildZip.mock.calls[0][2];
    mocks.companyId = COMPANY_B;
    refresh();
    expect(() => options.assertCurrent()).toThrow('تغيرت الشركة أو الفترة');
    expect(() => options.onPartReady(new Blob(['synthetic part']), 'part-A.zip')).toThrow('تغيرت الشركة أو الفترة');
    await act(async () => { pendingZip.resolve(zipResult()); await pendingZip.promise; });
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('تغيرت الشركة أو الفترة')));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(screen.queryByText(/نسخ ملفات ضمن ZIP/)).not.toBeInTheDocument();
  });

  it('opens the direct central route through InsolvencyPortfolioRoute with finance.reports.view, bypassing nested Finance routing', async () => {
    render(view(createClient(), centralRouteView()));
    await ready();
    expect(screen.getByRole('heading', { name: 'حافظة الوضع المالي ومستندات المحامي' })).toBeInTheDocument();
    expect(mocks.permission).toHaveBeenCalledWith('finance.reports.view');
    expect(mocks.financePage).not.toHaveBeenCalled();
    expect(screen.queryByText('Nested Finance routes')).not.toBeInTheDocument();
    expect(mocks.read).toHaveBeenCalledWith(COMPANY_A, CUTOFF, expect.any(Function));
  });

  it('does not read or export data when the direct route permission is denied', async () => {
    mocks.allowed = false;
    render(view(createClient(), centralRouteView()));
    expect(await screen.findByRole('alert')).toHaveTextContent('Permission denied');
    expect(mocks.permission).toHaveBeenCalledWith('finance.reports.view');
    expect(mocks.financePage).not.toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.buildZip).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: ZIP_BUTTON })).not.toBeInTheDocument();
  });
});
