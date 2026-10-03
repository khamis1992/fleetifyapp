import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Ledger from '../Ledger';

const { post, state } = vi.hoisted(() => ({ post: vi.fn(), state: { companyId: 'company-a', cachedCompanyId:'company-a', user: { id: 'actor-a' } as { id: string } | null, creatorId: 'actor-a', allowed: true } }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => state }));
vi.mock('@/hooks/finance/useFinanceAccessGuard', () => ({ useFinanceAccessGuard: () => ({ can: () => state.allowed, isLoading: false }) }));
vi.mock('@/hooks/finance/useJournalEntries', () => ({ usePostJournalEntry: () => ({ mutateAsync: post, isPending: false }) }));
vi.mock('@/hooks/useGeneralLedger', () => ({ useEnhancedJournalEntries: () => ({ data: [{ id: 'entry-a', company_id:state.cachedCompanyId, created_by: state.creatorId, entry_number: 'MJ-1', description: 'تصحيح غير نقدي' }], error: null, isLoading: false, refetch: vi.fn() }), useReverseJournalEntry: () => ({ mutateAsync: vi.fn() }), useDeleteJournalEntry: () => ({ mutateAsync: vi.fn() }), useExportLedgerData: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('@/components/finance/EnhancedJournalEntriesTab', () => ({ EnhancedJournalEntriesTab: ({ onPostEntry }: { onPostEntry?: (id: string) => Promise<void> }) => <button onClick={() => onPostEntry?.('entry-a')}>open posting</button> }));
vi.mock('@/components/finance/JournalEntryForm', () => ({ JournalEntryForm: () => null }));
vi.mock('@/components/finance/workspace/FinanceContextActions', () => ({ FinanceContextActions: () => null }));
beforeEach(() => { vi.clearAllMocks(); state.companyId='company-a'; state.cachedCompanyId='company-a'; state.user={ id:'actor-a' }; state.creatorId='actor-a'; state.allowed=true; post.mockResolvedValue({ id:'entry-a' }); });
const workspace=() => <MemoryRouter><Ledger /></MemoryRouter>;
describe('ledger posting review', () => {
  it('requires an unchecked explicit internal review for the creator', async () => {
    render(workspace()); fireEvent.click(screen.getByText('open posting'));
    const confirm=screen.getByRole('button', { name:'تأكيد ترحيل القيد' });
    expect(confirm).toBeDisabled(); expect(screen.getByRole('checkbox')).not.toBeChecked(); expect(post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(confirm);
    await waitFor(() => expect(post).toHaveBeenCalledWith({ entryId:'entry-a', selfReviewAcknowledged:true }));
  });
  it('sends false when a different user reviews the journal', async () => {
    state.creatorId='other-actor'; render(workspace()); fireEvent.click(screen.getByText('open posting'));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name:'تأكيد ترحيل القيد' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith({ entryId:'entry-a', selfReviewAcknowledged:false }));
  });
  it('keeps server refusal visible without automatic retry', async () => {
    post.mockRejectedValue(new Error('Financial period is locked')); render(workspace()); fireEvent.click(screen.getByText('open posting'));
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name:'تأكيد ترحيل القيد' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Financial period is locked'));
    expect(post).toHaveBeenCalledOnce(); expect(screen.getByRole('dialog')).toBeVisible();
  });
  it('clears selected review when company changes', () => {
    const view=render(workspace()); fireEvent.click(screen.getByText('open posting')); fireEvent.click(screen.getByRole('checkbox'));
    state.companyId='company-b'; view.rerender(workspace());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(post).not.toHaveBeenCalled();
  });
  it('cannot post or acknowledge a review without an authenticated actor', () => {
    state.user=null; state.creatorId=''; render(workspace()); fireEvent.click(screen.getByText('open posting'));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name:'تأكيد ترحيل القيد' })).toBeDisabled(); expect(post).not.toHaveBeenCalled();
  });
  it('cancels the review without posting', () => {
    render(workspace()); fireEvent.click(screen.getByText('open posting')); fireEvent.click(screen.getByRole('button', { name:'إلغاء' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(post).not.toHaveBeenCalled();
  });
  it('refuses cached entries from a different company even after a post callback', () => {
    state.companyId='company-b'; render(workspace()); fireEvent.click(screen.getByText('open posting'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(post).not.toHaveBeenCalled();
  });
});
