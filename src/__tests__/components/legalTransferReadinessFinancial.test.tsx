import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LegalTransferReadinessWizard } from '@/components/contracts/LegalTransferReadinessWizard';

const state = vi.hoisted(() => ({
  readiness: {} as Record<string, unknown>, claim: {} as Record<string, unknown>,
  readinessFetching: false, claimFetching: false, claimError: false,
  rpc: vi.fn(), convert: vi.fn(), invalidate: vi.fn(), refetch: vi.fn(),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: state.invalidate }),
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => ({
    data: queryKey[0] === 'legal-transfer-readiness' ? state.readiness
      : queryKey[0] === 'legal-claim-statement-v4' ? state.claim : null,
    isLoading: false,
    isFetching: queryKey[0] === 'legal-transfer-readiness' ? state.readinessFetching
      : queryKey[0] === 'legal-claim-statement-v4' && state.claimFetching,
    isError: queryKey[0] === 'legal-claim-statement-v4' && state.claimError,
    error: state.claimError ? new Error('مطابقة المخالفات مطلوبة') : null,
    refetch: state.refetch,
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'actor' } }) }));
vi.mock('@/hooks/useCurrencyFormatter', () => ({ useCurrencyFormatter: () => ({ formatCurrency: (amount: number) => `${amount.toFixed(2)} QAR` }) }));
vi.mock('@/hooks/useConvertToLegal', () => ({
  useConvertToLegal: () => ({ isPending: false, mutateAsync: state.convert }),
  useExistingLegalCase: () => ({ data: null }),
}));
vi.mock('@/hooks/useContractDocuments', () => ({ useCreateContractDocument: () => ({ isPending: false, mutateAsync: vi.fn() }) }));
vi.mock('@/services/legalContractIdentityVerifier', () => ({ normalizeLegalContractDocumentIdentityRow: vi.fn(), verifyLegalContractDocumentIdentity: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: state.rpc } }));
vi.mock('@/components/contracts/SignedContractScannerDialog', () => ({ SignedContractScannerDialog: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const contract = { id: 'contract', company_id: 'company', contract_number: 'TEST', customer_id: 'customer',
  vehicle_id: 'vehicle', start_date: '2026-01-01', end_date: '2026-12-31', status: 'active', monthly_amount: 1500,
  total_amount: 18000, balance_due: 1000, late_fine_amount: 0, vehicle_returned: true };
const mount = () => render(<LegalTransferReadinessWizard open contract={contract} onOpenChange={vi.fn()} />);
const next = () => fireEvent.click(screen.getByRole('button', { name: 'التالي' }));
const toFinal = () => {
  fireEvent.click(screen.getByRole('checkbox')); next(); // Financial review.
  next(); // Matched document.
  fireEvent.click(screen.getByRole('checkbox')); next(); // Traffic review.
  next(); // No outstanding customer liability: proof not required.
  return screen.getByRole('button', { name: 'اعتماد وتحويل للقانونية' });
};
beforeEach(() => {
  vi.clearAllMocks(); state.readinessFetching = false; state.claimFetching = false; state.claimError = false;
  state.convert.mockResolvedValue({});
  state.invalidate.mockResolvedValue(undefined); state.refetch.mockResolvedValue({});
  state.readiness = {
    financial_context: { version: 'canonical_legal_readiness_v1', company_id: 'company', contract_id: 'contract',
      as_of_date: '2026-09-04', rent_requires_review: false, traffic_requires_review: false,
      rent_total: 1000, traffic_total: 0, traffic_claim_total: 0, traffic_proof_required: false },
    invoices: [{ id: 'invoice', invoice_number: 'RENT', invoice_date: '2026-08-01', total_amount: 1500,
      paid_amount: 500, balance_due: 1000, payment_status: 'partial', status: 'sent', can_edit_amount: false }],
    payments: [], signed_contract_ready: true, violation_proof_ready: false,
    violations: [{ id: 'violation', source_type: 'penalties', violation_number: 'TV', violation_date: '2026-08-01',
      violation_type: 'مرور', responsibility_party: 'company', status: 'company_responsibility', liability_amount: 0, fine_amount: 500 }],
  };
  state.claim = { version: 'v4', claim_scope: 'full_outstanding', as_of_date: '2026-09-04', cutoff_date: '2026-09-04',
    total: 1000, violation_count: 0, violations_proof_ready: false,
    components: { rent_due: 1000, traffic_violations: 0, legal_extension_rent: 0, contractual_compensation: 0,
      damages: 0, retention: 0, security_deposit_deduction: 0 },
    excluded_amounts: { manual_invoice_exclusions: 0, future_rent: 0, penalty_linked_invoices: 0, non_rent_invoices: 0, legacy_late_fine: 0 } };
  state.rpc.mockImplementation(async () => ({ data: { ready: true, claim_amount: 1000, claim_statement: state.claim }, error: null }));
  // Use the same business date as the component, while keeping all effects mocked.
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-09-04T08:00:00Z'));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('rendered readiness financial safety (all external effects mocked)', () => {
  it('shows zero company liability and reaches final stage without unnecessary traffic proof', () => {
    mount(); const submit = toFinal(); expect(submit).toBeEnabled(); expect(state.rpc).not.toHaveBeenCalled();
  });
  for (const fetching of ['readinessFetching', 'claimFetching'] as const) it(`blocks final submission during ${fetching} even with cached data`, () => {
    const view = mount(); expect(toFinal()).toBeEnabled(); state[fetching] = true;
    view.rerender(<LegalTransferReadinessWizard open contract={contract} onOpenChange={vi.fn()} />);
    const submit = screen.getByRole('button', { name: 'اعتماد وتحويل للقانونية' });
    expect(submit).toBeDisabled(); fireEvent.click(submit); expect(state.rpc).not.toHaveBeenCalled();
  });
  it('blocks a new calculator failure at the final stage instead of using its old result', () => {
    const view = mount(); toFinal(); state.claimError = true;
    view.rerender(<LegalTransferReadinessWizard open contract={contract} onOpenChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'اعتماد وتحويل للقانونية' })).toBeDisabled();
    expect(screen.getByText('مطابقة المخالفات مطلوبة')).toBeInTheDocument();
  });
  it('blocks disagreement between readiness and calculator amounts', () => {
    state.claim.components = { rent_due: 1500, traffic_violations: 0 };
    mount(); fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'التالي' })).toBeDisabled();
    expect(screen.getByText(/تغيرت الأرقام بين فحص الجاهزية/)).toBeInTheDocument();
  });
  it('allows only one completion request while the readiness command is in flight', async () => {
    let finish!: (value: unknown) => void;
    state.rpc.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    mount(); const submit = toFinal(); fireEvent.click(submit); fireEvent.click(submit);
    expect(state.rpc).toHaveBeenCalledTimes(1); expect(submit).toBeDisabled(); expect(state.convert).not.toHaveBeenCalled();
    await act(async () => { finish({ data: { ready: true, claim_amount: 1000, claim_statement: state.claim }, error: null }); });
    await waitFor(() => expect(state.convert).toHaveBeenCalledTimes(1));
  });
  for (const invalid of [null, {}, { ready: false }, { ready: 'true' }]) {
    it(`does not convert when completion returns ${JSON.stringify(invalid)}`, async () => {
      state.rpc.mockResolvedValue({ data: invalid, error: null });
      mount(); fireEvent.click(toFinal());
      await waitFor(() => expect(state.invalidate).toHaveBeenCalled());
      expect(state.convert).not.toHaveBeenCalled();
    });
  }
  it('does not convert a changed claim returned by completion and refreshes both financial sources', async () => {
    state.rpc.mockResolvedValue({ data: { ready: true, claim_amount: 1500, claim_statement: {
      ...state.claim, total: 1500, components: { ...(state.claim.components as object), rent_due: 1500 },
    } }, error: null });
    mount(); fireEvent.click(toFinal());
    await waitFor(() => expect(state.invalidate).toHaveBeenCalledTimes(2));
    expect(state.convert).not.toHaveBeenCalled();
    expect(state.invalidate).toHaveBeenCalledWith({ queryKey: ['legal-claim-statement-v4', 'company', 'contract'] });
  });
  it('rejects a completion amount inconsistent with its own saved statement', async () => {
    state.rpc.mockResolvedValue({ data: { ready: true, claim_amount: 500, claim_statement: state.claim }, error: null });
    mount(); fireEvent.click(toFinal());
    await waitFor(() => expect(state.invalidate).toHaveBeenCalledTimes(2));
    expect(state.convert).not.toHaveBeenCalled();
  });
  it('rejects a changed component mix even when the grand total is unchanged', async () => {
    state.rpc.mockResolvedValue({ data: { ready: true, claim_amount: 1000, claim_statement: {
      ...state.claim, components: { ...(state.claim.components as object), rent_due: 500, traffic_violations: 500 },
    } }, error: null });
    mount(); fireEvent.click(toFinal());
    await waitFor(() => expect(state.invalidate).toHaveBeenCalledTimes(2));
    expect(state.convert).not.toHaveBeenCalled();
  });
});
