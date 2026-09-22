import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfessionalBalanceSheet, SavedBalanceSheet } from '@/types/balanceSheet';
import {
  BALANCE_SHEET_COMPANY, BALANCE_SHEET_OTHER_COMPANY, BALANCE_SHEET_REVIEWER,
  makeApprovedBalanceSheet, makeBalanceSheet, makeSavedBalanceSheet,
} from '@/test/fixtures/professionalBalanceSheet';
import { BalanceSheetReport } from '../BalanceSheetReport';

const { state, save, approve, voidReport, exportPDF, exportExcel, printReport, toastError } = vi.hoisted(() => ({
  state: {
    access: { companyId: '', user: { id: '' }, isInitializing: false, isAuthenticating: false },
    live: { data: undefined as ProfessionalBalanceSheet | undefined, error: null as Error | null, isFetching: false, refetch: vi.fn() },
    history: { data: [] as SavedBalanceSheet[], error: null as Error | null, isFetching: false, isLoading: false, refetch: vi.fn() },
    loadingChangedDate: false,
  },
  save: vi.fn(), approve: vi.fn(), voidReport: vi.fn(),
  exportPDF: vi.fn(), exportExcel: vi.fn(), printReport: vi.fn(), toastError: vi.fn(),
}));

vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => state.access }));
vi.mock('@/hooks/useTranslation', () => ({
  useFleetifyTranslation: () => ({ currentLanguage: 'en', t: (key: string) => key }),
}));
vi.mock('@/services/financialReporting', () => ({ financeToday: () => '2026-09-18' }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));
vi.mock('@/hooks/finance/useProfessionalBalanceSheet', () => ({
  useProfessionalBalanceSheet: (asOf: string, comparison: string | null) => ({
    ...state.live,
    isFetching: state.live.isFetching || (state.loadingChangedDate
      && (asOf !== state.live.data?.asOfDate || comparison !== state.live.data?.comparisonDate)),
  }),
  useSavedBalanceSheets: () => state.history,
  useBalanceSheetActions: () => ({
    save: { mutateAsync: save, isPending: false },
    approve: { mutateAsync: approve, isPending: false },
    voidReport: { mutateAsync: voidReport, isPending: false },
  }),
}));
vi.mock('@/hooks/finance/useFleetBridge', () => ({
  useNegativeExplanations: () => ({ data: [], error: null, isFetching: false, isLoading: false }),
  useUpsertNegativeExplanation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/utils/balanceSheetExport', () => ({
  exportBalanceSheetPDF: exportPDF, exportBalanceSheetExcel: exportExcel, printBalanceSheet: printReport,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: toastError } }));

const workspace = () => <MemoryRouter initialEntries={['/finance/balance-sheet?asOf=2026-08-31&compare=2025-12-31&lang=en']}>
  <BalanceSheetReport />
</MemoryRouter>;
const mount = () => render(workspace());
const selectVersion = () => fireEvent.click(screen.getByRole('button', { name: 'View version' }));
const approvalButton = () => screen.getByRole('button', { name: 'Record internal approval' });
const expectExportDisabled = () => {
  expect(screen.getByRole('button', { name: 'PDF' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Excel' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Print' })).toBeDisabled();
};

beforeEach(() => {
  vi.clearAllMocks();
  state.access = { companyId: BALANCE_SHEET_COMPANY, user: { id: BALANCE_SHEET_REVIEWER }, isInitializing: false, isAuthenticating: false };
  state.live = { data: makeBalanceSheet(), error: null, isFetching: false, refetch: vi.fn() };
  state.history = { data: [], error: null, isFetching: false, isLoading: false, refetch: vi.fn() };
  state.history.refetch.mockImplementation(async () => ({ data: state.history.data, error: state.history.error }));
  state.loadingChangedDate = false;
  save.mockResolvedValue(makeSavedBalanceSheet());
  approve.mockResolvedValue(makeApprovedBalanceSheet());
  exportPDF.mockResolvedValue(undefined);
  exportExcel.mockResolvedValue(undefined);
  printReport.mockResolvedValue(undefined);
});

describe('balance sheet report workflow', () => {
  it('defaults to Arabic and exports the selected language without changing reporting dates', async () => {
    render(<MemoryRouter initialEntries={['/finance/reports/balance-sheet?asOf=2026-08-31&compare=2025-12-31']}><BalanceSheetReport /></MemoryRouter>);
    expect(screen.getByTestId('balance-sheet-report')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText('نطاق التقرير والإصدار')).toBeVisible();
    expect(screen.getByText('مسودة غير معتمدة')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(exportPDF).toHaveBeenCalledWith(expect.objectContaining({ locale: 'ar' })));
    fireEvent.change(screen.getByRole('combobox', { name: 'لغة التقرير / Report language' }), { target: { value: 'en' } });
    expect(screen.getByTestId('balance-sheet-report')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByLabelText('As of date')).toHaveValue('2026-08-31');
    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    await waitFor(() => expect(exportExcel).toHaveBeenCalledWith(expect.objectContaining({ locale: 'en' })));
  });
  it('keeps a balanced preview draft and displays the contra asset with its negative sign', async () => {
    mount();
    expect(screen.getByText('Unapproved draft')).toBeVisible();
    expect(screen.queryByText('Internally approved')).not.toBeInTheDocument();
    expect(screen.getByText('Arithmetic balance does not establish completeness or approval.')).toBeVisible();
    const row = screen.getByRole('row', { name: /Accumulated depreciation/ });
    expect(within(row).getAllByRole('cell')[2]).toHaveTextContent(/[-−].*100\.00/);
    expect(within(row).getAllByRole('cell')[3]).toHaveTextContent(/[-−].*50\.00/);
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(exportPDF).toHaveBeenCalledWith({ report: state.live.data, snapshot: null, locale: 'en' }));
  });

  it('shows the variance column with signed delta and percentage against the comparison base', () => {
    mount();
    const cashRow = screen.getByRole('row', { name: /Cash/ });
    const cells = within(cashRow).getAllByRole('cell');
    expect(cells[4]).toHaveTextContent(/300\.00/);
    expect(cells[4]).toHaveTextContent(/42\.9%/);
    const equityTotalRow = screen.getByRole('row', { name: /Total equity/ });
    expect(within(equityTotalRow).getAllByRole('cell')[4]).toHaveTextContent(/150\.00/);
  });

  it('derives liquidity indicators from the displayed balances', () => {
    mount();
    // Fixture: current assets 1000 (Cash), current liabilities 200, equity 700, no inventory.
    expect(screen.getByText('Current ratio')).toBeVisible();
    expect(screen.getByText('Quick ratio')).toBeVisible();
    expect(screen.getAllByText('5.00×')).toHaveLength(2);
    expect(screen.getByText('0.29×')).toBeVisible();
    expect(screen.getByText(/QAR.*800\.00/)).toBeVisible();
    expect(screen.getByText(/not statement line items/i)).toBeVisible();
  });

  it('reports full classification coverage and omits the classification link', () => {
    mount();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.queryByRole('link', { name: 'Classify the remaining items' })).not.toBeInTheDocument();
  });

  it('surfaces unclassified statement lines with a link to classify them', () => {
    state.live.data = makeBalanceSheet({
      accounts: [
        ...makeBalanceSheet().accounts,
        {
          id: '55555555-5555-4555-8555-000000000007', code: '7000', name: 'Unclassified asset', nameAr: null,
          type: 'asset', subtype: 'mystery', classification: 'unclassified', level: 3, isHeader: false, isActive: true,
          debit: 50, credit: 0, balance: 50, comparisonBalance: 0,
        },
      ],
    });
    mount();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByRole('link', { name: 'Classify the remaining items' })).toHaveAttribute('href', '/finance/chart-of-accounts');
  });

  it('disables export of previous data as soon as a changed date starts loading', () => {
    state.loadingChangedDate = true;
    mount();
    expect(screen.getByRole('button', { name: 'PDF' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('As of date'), { target: { value: '2026-07-31' } });
    expect(screen.getByLabelText('As of date')).toHaveValue('2026-07-31');
    expectExportDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    expect(exportPDF).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Save for review' })).not.toBeInTheDocument();
  });

  it('does not export or save cached data for a different cutoff even if no fetch is reported', () => {
    mount();
    fireEvent.change(screen.getByLabelText('As of date'), { target: { value: '2026-07-31' } });
    expectExportDisabled();
    expect(screen.queryByRole('row', { name: /Accumulated depreciation/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save for review' })).not.toBeInTheDocument();
  });

  it('rejects cached report data from another company during a query transition', () => {
    state.live.data = makeBalanceSheet({ company: { ...makeBalanceSheet().company, id: BALANCE_SHEET_OTHER_COMPANY, name: 'Foreign Company' } });
    mount();
    expectExportDisabled();
    expect(screen.queryByText('Foreign Company')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save for review' })).not.toBeInTheDocument();
  });

  it('disables export and hides old balances after a source error', () => {
    const view = mount();
    state.live.error = new Error('Source query failed');
    view.rerender(workspace());
    expectExportDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('The balance sheet could not be verified');
    expect(screen.queryByRole('row', { name: /Accumulated depreciation/ })).not.toBeInTheDocument();
    expect(exportPDF).not.toHaveBeenCalled();
  });

  it('requires the documented self-review acknowledgment before preparer self approval', async () => {
    const saved = makeSavedBalanceSheet({ created_by: BALANCE_SHEET_REVIEWER });
    state.history.data = [saved];
    const approved = makeApprovedBalanceSheet();
    approve.mockImplementation(async () => { state.history.data = [approved]; return approved; });
    mount();
    selectVersion();
    expect(approvalButton()).toBeDisabled();
    // The strict note is replaced by the documented sole-admin acknowledgment path.
    expect(screen.queryByText('A different authorized user must review and approve this version.')).not.toBeInTheDocument();
    const confirmations = within(screen.getByRole('group', { name: 'Reviewer confirmations' })).getAllByRole('checkbox');
    confirmations.forEach(checkbox => fireEvent.click(checkbox));
    const notes = screen.getByLabelText('Review conclusion and resolution of findings');
    fireEvent.change(notes, { target: { value: 'Reviewed bank reconciliations and supporting records.' } });
    expect(approvalButton()).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Documented self-review: I prepared this version/));
    expect(approvalButton()).toBeEnabled();
    fireEvent.click(approvalButton());
    await waitFor(() => expect(approve).toHaveBeenCalledWith({
      id: saved.id, notes: 'Reviewed bank reconciliations and supporting records.',
      confirmations: { assets: true, liabilities: true, equity: true, reconciliation: true, completeness: true },
      selfReviewAcknowledged: true,
    }));
  });

  it('disallows approval of a stale snapshot and explains why a new version is needed', () => {
    state.history.data = [makeSavedBalanceSheet({ payload: makeBalanceSheet({ fingerprint: 'b'.repeat(64) }) })];
    mount();
    selectVersion();
    expect(approvalButton()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Source data changed after this version was saved');
    expect(screen.queryByRole('group', { name: 'Reviewer confirmations' })).not.toBeInTheDocument();
    expect(approve).not.toHaveBeenCalled();
  });

  it('clears the selected snapshot when the active company changes', () => {
    state.history.data = [makeSavedBalanceSheet()];
    const view = mount();
    selectVersion();
    expect(screen.getByText('Version and approval record')).toBeVisible();

    state.access.companyId = BALANCE_SHEET_OTHER_COMPANY;
    state.live.data = makeBalanceSheet({ company: { ...makeBalanceSheet().company, id: BALANCE_SHEET_OTHER_COMPANY, name: 'Other Company' } });
    state.history.data = [];
    view.rerender(workspace());
    expect(screen.getByText('Other Company')).toBeVisible();
    expect(screen.queryByText('Version and approval record')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Preparer')).not.toBeInTheDocument();
    expect(screen.getByText('Unapproved draft')).toBeVisible();
  });

  it('fails closed when the selected saved version disappears from verified history', () => {
    state.history.data = [makeSavedBalanceSheet()];
    const view = mount();
    selectVersion();
    expect(screen.getByRole('button', { name: 'PDF' })).toBeEnabled();
    state.history.data = [];
    view.rerender(workspace());
    expectExportDisabled();
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Record internal approval' })).not.toBeInTheDocument();
  });

  it('requires every reviewer confirmation and substantive notes before recording independent approval', async () => {
    // Saved capabilities describe the preparer; the current reviewer's live capabilities govern the action.
    const saved = makeSavedBalanceSheet({ payload: makeBalanceSheet({ permissions: { canSave: true, canApprove: false } }) });
    state.history.data = [saved];
    const approved = makeApprovedBalanceSheet();
    approve.mockImplementation(async () => { state.history.data = [approved]; return approved; });
    mount();
    selectVersion();
    expect(approvalButton()).toBeDisabled();
    const confirmations = within(screen.getByRole('group', { name: 'Reviewer confirmations' })).getAllByRole('checkbox');
    confirmations.forEach(checkbox => fireEvent.click(checkbox));
    expect(approvalButton()).toBeDisabled();
    const notes = screen.getByLabelText('Review conclusion and resolution of findings');
    fireEvent.change(notes, { target: { value: 'Short review' } });
    expect(approvalButton()).toBeDisabled();
    fireEvent.change(notes, { target: { value: 'Reviewed bank reconciliations and supporting records.' } });
    expect(approvalButton()).toBeEnabled();
    fireEvent.click(confirmations[0]);
    expect(approvalButton()).toBeDisabled();
    fireEvent.click(confirmations[0]);
    fireEvent.click(approvalButton());
    await waitFor(() => expect(approve).toHaveBeenCalledWith({
      id: saved.id, notes: 'Reviewed bank reconciliations and supporting records.',
      confirmations: { assets: true, liabilities: true, equity: true, reconciliation: true, completeness: true },
      selfReviewAcknowledged: false,
    }));
    await waitFor(() => expect(screen.getByText(/Test Reviewer/)).toBeVisible());
    expect(screen.queryByRole('button', { name: 'Record internal approval' })).not.toBeInTheDocument();
  });

  it('uses current reviewer permissions instead of approval permissions stored in the snapshot', () => {
    state.live.data!.permissions.canApprove = false;
    state.history.data = [makeSavedBalanceSheet()];
    mount();
    selectVersion();
    expect(approvalButton()).toBeDisabled();
    expect(screen.queryByRole('group', { name: 'Reviewer confirmations' })).not.toBeInTheDocument();
  });

  it('blocks approval for accounting errors even when the statement balances', () => {
    const payload = makeBalanceSheet({ checks: [{ code: 'unclassified_accounts', severity: 'error', count: 1, asOfDate: '2026-08-31' }] });
    state.live.data = payload;
    state.history.data = [makeSavedBalanceSheet({ payload })];
    mount();
    selectVersion();
    expect(screen.getByText('Blocks approval')).toBeVisible();
    expect(approvalButton()).toBeDisabled();
    expect(approve).not.toHaveBeenCalled();
  });

  it('exports approval status only from an approved saved version with its recorded reviewer', async () => {
    const approved = makeApprovedBalanceSheet();
    state.history.data = [approved];
    mount();
    selectVersion();
    expect(screen.getByText('Internally approved by')).toBeVisible();
    expect(screen.getByText(/Test Reviewer/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    await waitFor(() => expect(exportExcel).toHaveBeenCalledWith({ report: approved.payload, snapshot: approved, locale: 'en' }));
  });

  it('rechecks saved status before export and refuses a version voided since it was viewed', async () => {
    const approved = makeApprovedBalanceSheet();
    state.history.data = [approved];
    mount();
    selectVersion();
    expect(screen.getByRole('button', { name: 'PDF' })).toBeEnabled();
    state.history.refetch.mockImplementation(async () => {
      const voided: SavedBalanceSheet = { ...approved, status: 'voided', void_reason: 'Replaced after reconciliation corrections.' };
      state.history.data = [voided];
      return { data: [voided], error: null };
    });
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(state.history.refetch).toHaveBeenCalled();
    expect(exportPDF).not.toHaveBeenCalled();
  });

  it.each(['missing', 'error'] as const)('refuses export when the latest saved-version read is %s', async (outcome) => {
    const approved = makeApprovedBalanceSheet();
    state.history.data = [approved];
    mount();
    selectVersion();
    state.history.refetch.mockResolvedValue(outcome === 'missing'
      ? { data: [], error: null }
      : { data: [approved], error: new Error('Saved-version read failed') });
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(exportPDF).not.toHaveBeenCalled();
  });

  it('exports the latest returned approval metadata instead of the status originally viewed', async () => {
    const draft = makeSavedBalanceSheet();
    const approved = makeApprovedBalanceSheet();
    state.history.data = [draft];
    mount();
    selectVersion();
    expect(screen.getByText('Unapproved draft')).toBeVisible();
    state.history.refetch.mockImplementation(async () => {
      state.history.data = [approved];
      return { data: [approved], error: null };
    });
    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    await waitFor(() => expect(exportExcel).toHaveBeenCalledWith({ report: approved.payload, snapshot: approved, locale: 'en' }));
    expect(state.history.refetch).toHaveBeenCalled();
    expect(screen.getByText(/Test Reviewer/)).toBeVisible();
  });
});
