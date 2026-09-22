import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FinancialStatementConfiguration, ProfessionalFinancialStatementPackage, SavedFinancialStatementPackage } from '@/types/financialStatementPackage';
import { fixtureCompanyId, fixturePreparerId, fixtureReviewerId, makeFinancialStatementPackageFixture, makeSavedFinancialStatementPackageFixture } from '../../../../tests/visual/financial-statement-package/fixtureData';
import { FinancialStatementPackageReport } from '../FinancialStatementPackageReport';

const { state, save, approve, voidReport, periodLock, exportPDF, exportExcel, printReport, readFresh, listFresh, toastError } = vi.hoisted(() => ({
  state: {
    access: { companyId: '', user: { id: '' }, isInitializing: false, isAuthenticating: false },
    live: { data: undefined as ProfessionalFinancialStatementPackage | undefined, error: null as Error | null, isFetching: false, refetch: vi.fn() },
    history: { data: [] as SavedFinancialStatementPackage[], error: null as Error | null, isFetching: false },
    language: 'en', freshConfig: null as FinancialStatementConfiguration | null,
  },
  save: vi.fn(), approve: vi.fn(), voidReport: vi.fn(), periodLock: vi.fn(), exportPDF: vi.fn(), exportExcel: vi.fn(), printReport: vi.fn(), readFresh: vi.fn(), listFresh: vi.fn(), toastError: vi.fn(),
}));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => state.access }));
vi.mock('@/hooks/useTranslation', () => ({ useFleetifyTranslation: () => ({ currentLanguage: state.language }) }));
vi.mock('@/services/financialReporting', () => ({ financeToday: () => '2026-09-18' }));
vi.mock('@/services/financialStatementPackage', async importOriginal => ({ ...await importOriginal<object>(), readFinancialStatementPackage: readFresh, listFinancialStatementPackages: listFresh }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));
vi.mock('@/hooks/finance/useFinancialStatementPackage', () => ({
  useFinancialStatementPackage: (config: FinancialStatementConfiguration) => {
    state.freshConfig = config;
    return { ...state.live, data: state.live.data ? { ...state.live.data, configuration: config } : undefined };
  },
  useFinancialStatementPackageHistory: () => state.history,
  useFinancialReportingPeriodLocks: () => ({ data: { company_id: state.access.companyId, managed_lock: null, other_closed_periods: [], history: [], can_manage: true }, error: null, isFetching: false }),
  useFinancialStatementPackageActions: () => ({ save: { mutateAsync: save, isPending: false }, approve: { mutateAsync: approve, isPending: false }, voidReport: { mutateAsync: voidReport, isPending: false }, periodLock: { mutateAsync: periodLock, isPending: false } }),
}));
vi.mock('@/utils/financialStatementPackageExport', () => ({ exportFinancialStatementPackagePDF: exportPDF, exportFinancialStatementPackageExcel: exportExcel, printFinancialStatementPackage: printReport }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: toastError } }));
const workspace = () => <MemoryRouter initialEntries={[`/finance/reports/financial-statements?asOf=2026-08-31&lang=${state.language}`]}><FinancialStatementPackageReport /></MemoryRouter>;
const mount = () => render(workspace());
const tab = (name: string) => fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0, ctrlKey: false });
const selectVersion = () => { tab('Versions and review'); fireEvent.click(screen.getByRole('button', { name: 'Open version' })); };
const exportsDisabled = () => ['PDF', 'Excel', 'Print'].forEach(name => expect(screen.getByRole('button', { name })).toBeDisabled());
beforeEach(() => {
  vi.clearAllMocks(); state.language = 'en';
  state.access = { companyId: fixtureCompanyId, user: { id: fixtureReviewerId }, isInitializing: false, isAuthenticating: false };
  state.live = { data: makeFinancialStatementPackageFixture(), error: null, isFetching: false, refetch: vi.fn() };
  state.history = { data: [], error: null, isFetching: false };
  readFresh.mockImplementation(async (_company, configuration) => ({ ...state.live.data, configuration }));
  listFresh.mockImplementation(async () => state.history.data);
  save.mockImplementation(async configuration => { const saved = makeSavedFinancialStatementPackageFixture({ ...makeFinancialStatementPackageFixture(), configuration }, 'draft'); state.history.data = [saved]; return saved; });
  approve.mockImplementation(async () => { const saved = makeSavedFinancialStatementPackageFixture(state.history.data[0].payload, 'approved'); state.history.data = [saved]; return saved; });
  exportPDF.mockResolvedValue(undefined); exportExcel.mockResolvedValue(undefined); printReport.mockResolvedValue(undefined); periodLock.mockResolvedValue({});
});

describe('financial statement package workspace', () => {
  it('defaults to Arabic and passes the chosen report language to exports', async () => {
    render(<MemoryRouter initialEntries={['/finance/reports/financial-statements?asOf=2026-08-31']}><FinancialStatementPackageReport /></MemoryRouter>);
    expect(screen.getByText('حزمة القوائم المالية')).toBeVisible();
    expect(screen.getByText('حزمة القوائم المالية').closest('.financial-statement-workspace')).toHaveAttribute('dir', 'rtl');
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(exportPDF).toHaveBeenCalledWith(expect.objectContaining({ locale: 'ar' })));
    fireEvent.change(screen.getByRole('combobox', { name: 'لغة التقرير / Report language' }), { target: { value: 'en' } });
    expect(screen.getByText('Financial statement package')).toBeVisible();
    expect(state.freshConfig?.periodEnd).toBe('2026-08-31');
    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    await waitFor(() => expect(exportExcel).toHaveBeenCalledWith(expect.objectContaining({ locale: 'en' })));
  });
  it('shows five statements with distinct position and performance comparison dates', () => {
    mount();
    expect(screen.getByText('Draft for preparation and review')).toBeVisible();
    expect(screen.getAllByRole('table')).toHaveLength(5);
    expect(screen.getAllByText(/2025-01-01 — 2025-08-31/)[0]).toBeVisible();
    expect(screen.getByRole('button', { name: 'PDF' })).toBeEnabled();
    expect(screen.getByText(/does not generate a compliance declaration/)).toBeVisible();
  });
  it('blocks export and saving as soon as dates or legal-form settings change', () => {
    mount();
    fireEvent.change(screen.getByLabelText('Legal form'), { target: { value: 'llc' } });
    exportsDisabled(); expect(screen.getByRole('button', { name: 'Save review version' })).toBeDisabled();
    expect(screen.queryAllByRole('table')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Calculate package' }));
    expect(state.freshConfig?.legalForm).toBe('llc'); expect(screen.getByRole('button', { name: 'PDF' })).toBeEnabled();
  });
  it('hides cached figures and disables issue when the source fails', () => {
    const view = mount(); state.live.error = new Error('Source unavailable'); view.rerender(workspace());
    exportsDisabled(); expect(screen.queryAllByRole('table')).toHaveLength(0); expect(screen.getByRole('alert')).toBeVisible();
  });
  it('never displays another company source even in mapping or journal tabs', () => {
    state.live.data!.company = { ...state.live.data!.company, id: fixturePreparerId, name: 'Confidential foreign company' };
    mount(); exportsDisabled(); tab('Account mappings');
    expect(screen.queryByText(/Cash and bank/)).not.toBeInTheDocument(); expect(screen.queryByText('Confidential foreign company')).not.toBeInTheDocument();
  });
  it('rechecks a live report immediately before download', async () => {
    mount(); fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(exportPDF).toHaveBeenCalledOnce());
    expect(readFresh).toHaveBeenCalledWith(fixtureCompanyId, state.freshConfig);
    expect(exportPDF.mock.calls[0][0].snapshot).toBeUndefined();
  });
  it('refuses issuance when an approved version was voided after it was opened', async () => {
    const saved = makeSavedFinancialStatementPackageFixture(makeFinancialStatementPackageFixture(), 'approved'); state.history.data = [saved];
    listFresh.mockResolvedValue([{ ...saved, status: 'voided', void_reason: 'Revoked after independent review.' }]);
    mount(); selectVersion(); fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(toastError).toHaveBeenCalled()); expect(exportPDF).not.toHaveBeenCalled();
  });
  it('requires the documented self-review acknowledgment before preparer self approval', () => {
    state.access.user.id = fixturePreparerId; state.history.data = [makeSavedFinancialStatementPackageFixture(makeFinancialStatementPackageFixture(), 'draft')];
    mount(); selectVersion();
    const button = screen.getByRole('button', { name: 'Approve package internally' });
    // The strict note is replaced by the documented sole-admin acknowledgment path.
    expect(screen.queryByText(/a different authorized user must review/)).not.toBeInTheDocument();
    const reviewChecks = within(screen.getByRole('tabpanel', { name: 'Versions and review' })).getAllByRole('checkbox');
    expect(reviewChecks).toHaveLength(6); // five confirmations + the self-review acknowledgment
    reviewChecks.forEach(input => fireEvent.click(input));
    fireEvent.change(screen.getByLabelText('Review conclusion — at least 20 characters'), { target: { value: 'Reviewed all policy evidence and ledger reconciliations.' } });
    expect(button).toBeEnabled();
  });
  it('blocks approval on findings and stale source fingerprints', () => {
    const saved = makeSavedFinancialStatementPackageFixture(makeFinancialStatementPackageFixture(), 'draft'); state.history.data = [saved];
    state.live.data!.fingerprint = 'b'.repeat(64);
    mount(); selectVersion(); expect(screen.getByRole('button', { name: 'Approve package internally' })).toBeDisabled(); expect(screen.getByRole('alert')).toHaveTextContent('source changed');
  });
  it('requires five review confirmations and notes for an independent reviewer', async () => {
    state.history.data = [makeSavedFinancialStatementPackageFixture(makeFinancialStatementPackageFixture(), 'draft')];
    mount(); selectVersion();
    const button = screen.getByRole('button', { name: 'Approve package internally' }); expect(button).toBeDisabled();
    const reviewChecks = within(screen.getByRole('tabpanel', { name: 'Versions and review' })).getAllByRole('checkbox'); expect(reviewChecks).toHaveLength(5);
    reviewChecks.forEach(input => fireEvent.click(input)); fireEvent.change(screen.getByLabelText('Review conclusion — at least 20 characters'), { target: { value: 'Reviewed all policy evidence and ledger reconciliations.' } });
    expect(button).toBeEnabled(); fireEvent.click(button);
    await waitFor(() => expect(approve).toHaveBeenCalledOnce()); expect(approve.mock.calls[0][0].confirmations.periodCutoff).toBe(true);
  });
  it('saves only the applied configuration as a fixed package version', async () => {
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Save review version' }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0]).not.toHaveProperty('statements');
    expect(screen.getByRole('button', { name: 'Prepare a new version from these settings' })).toBeVisible();
    expect(screen.getByLabelText('Financial year start')).toBeDisabled();
  });
  it('records a deliberate period lock only with a substantive reason', async () => {
    mount(); tab('Period locks'); const lock = screen.getByRole('button', { name: 'Lock through selected date' }); expect(lock).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reason for locking or reopening — at least 20 characters'), { target: { value: 'Period balances reviewed and reconciled with supporting evidence.' } });
    fireEvent.click(lock); await waitFor(() => expect(periodLock).toHaveBeenCalledWith({ cutoff: '2026-08-31', reason: 'Period balances reviewed and reconciled with supporting evidence.' }));
  });
  it('clears a saved version when switching companies', () => {
    state.history.data = [makeSavedFinancialStatementPackageFixture(makeFinancialStatementPackageFixture(), 'draft')];
    const view = mount(); selectVersion(); state.access.companyId = fixturePreparerId; state.history.data = [];
    state.live.data = { ...makeFinancialStatementPackageFixture(), company: { ...makeFinancialStatementPackageFixture().company, id: fixturePreparerId } };
    view.rerender(workspace()); expect(screen.queryByRole('button', { name: 'Prepare a new version from these settings' })).not.toBeInTheDocument();
  });
});
