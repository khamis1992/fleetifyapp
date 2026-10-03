import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Ledger from '../Ledger';
import type { LedgerFilters } from '@/hooks/useGeneralLedger';

const { readEntries } = vi.hoisted(() => ({ readEntries: vi.fn() }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ companyId: 'company-a', user: { id: 'actor-a' } }) }));
vi.mock('@/hooks/finance/useFinanceAccessGuard', () => ({ useFinanceAccessGuard: () => ({ can: () => true, isLoading: false }) }));
vi.mock('@/hooks/finance/useJournalEntries', () => ({ usePostJournalEntry: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock('@/hooks/useGeneralLedger', () => ({
  useEnhancedJournalEntries: readEntries,
  useReverseJournalEntry: () => ({ mutateAsync: vi.fn() }),
  useDeleteJournalEntry: () => ({ mutateAsync: vi.fn() }),
  useExportLedgerData: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/components/finance/EnhancedJournalEntriesTab', () => ({ EnhancedJournalEntriesTab: ({ filters, onFiltersChange }: { filters: LedgerFilters; onFiltersChange: (next: LedgerFilters) => void }) => <>
  <output data-testid="filters">{JSON.stringify(filters)}</output>
  <button onClick={() => onFiltersChange({ searchTerm: 'typed search' })}>type search</button>
</> }));
vi.mock('@/components/finance/JournalEntryForm', () => ({ JournalEntryForm: () => <p>draft form</p> }));
vi.mock('@/components/finance/workspace/FinanceContextActions', () => ({ FinanceContextActions: () => null }));

const Navigate = () => {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/finance/journal-entries?status=posted&search=JE-2026')}>change URL</button>;
};
const workspace = (url: string) => <MemoryRouter initialEntries={[url]}><Ledger /><Navigate /></MemoryRouter>;
beforeEach(() => { readEntries.mockReset(); readEntries.mockReturnValue({ data: [], error: null, isLoading: false, refetch: vi.fn() }); });

describe('journal deep-link search', () => {
  it('supplies both URL filters before the first reader invocation', () => {
    render(workspace('/finance/journal-entries?status=draft&search=ADJ-20260930'));
    expect(readEntries.mock.calls[0][0]).toEqual({ status: 'draft', searchTerm: 'ADJ-20260930' });
  });
  it('updates the reader after navigation without remounting Ledger', async () => {
    render(workspace('/finance/journal-entries?status=draft&search=ADJ-20260930'));
    fireEvent.click(screen.getByText('change URL'));
    await waitFor(() => expect(readEntries).toHaveBeenLastCalledWith({ status: 'posted', searchTerm: 'JE-2026' }));
  });
  it('keeps a typed search when the new-entry dialog changes only action', () => {
    render(workspace('/finance/journal-entries?status=draft&search=ADJ-20260930'));
    fireEvent.click(screen.getByText('type search'));
    fireEvent.click(screen.getByRole('button', { name: 'قيد جديد' }));
    expect(screen.getByText('draft form')).toBeVisible();
    expect(readEntries).toHaveBeenLastCalledWith({ status: 'draft', searchTerm: 'typed search' });
  });
});
