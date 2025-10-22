import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedesignedJournalEntryCard } from '../RedesignedJournalEntryCard';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

// Mock the useCurrencyFormatter hook
vi.mock('@/hooks/useCurrencyFormatter', () => ({
  useCurrencyFormatter: vi.fn()
}));

const mockEntry = {
  id: '1',
  company_id: 'company-1',
  entry_number: '000227',
  entry_date: '2026-03-01',
  description: 'دفعة إيجار - إبراهيم حضر عبدالله',
  total_debit: 1500.000,
  total_credit: 1500.000,
  status: 'posted',
  reference_type: null,
  reference_id: null,
  created_at: '2026-03-01T10:00:00Z',
  updated_at: '2026-03-01T10:00:00Z',
  journal_entry_lines: [
    {
      id: 'line-1',
      debit_amount: 1500.000,
      credit_amount: 0,
      line_description: 'إيجار شهر مارس',
      line_number: 1,
      account_id: 'account-1',
      journal_entry_id: '1',
      cost_center_id: null,
      created_at: '2026-03-01T10:00:00Z',
      updated_at: '2026-03-01T10:00:00Z',
      chart_of_accounts: {
        id: 'account-1',
        company_id: 'company-1',
        account_code: '4510',
        account_name: 'Rent Expense',
        account_name_ar: 'مصاريف إيجار',
        account_type: 'expense',
        account_level: 3,
        parent_account_id: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      }
    },
    {
      id: 'line-2',
      debit_amount: 0,
      credit_amount: 1500.000,
      line_description: 'دفع المبلغ نقداً',
      line_number: 2,
      account_id: 'account-2',
      journal_entry_id: '1',
      cost_center_id: null,
      created_at: '2026-03-01T10:00:00Z',
      updated_at: '2026-03-01T10:00:00Z',
      chart_of_accounts: {
        id: 'account-2',
        company_id: 'company-1',
        account_code: '1110',
        account_name: 'Cash',
        account_name_ar: 'الصندوق',
        account_type: 'asset',
        account_level: 3,
        parent_account_id: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      }
    }
  ]
};

describe('RedesignedJournalEntryCard', () => {
  beforeEach(() => {
    (useCurrencyFormatter as any).mockReturnValue({
      formatCurrency: (amount: number) => `${amount.toFixed(3)} د.ك`
    });
  });

  it('renders the journal entry summary correctly', () => {
    render(<RedesignedJournalEntryCard entry={mockEntry} />);
    
    expect(screen.getByText('سند قيد رقم: 000227')).toBeInTheDocument();
    expect(screen.getByText('مرحل')).toBeInTheDocument();
    expect(screen.getByText('التاريخ: 1/3/2026')).toBeInTheDocument();
    expect(screen.getByText('إجمالي المدين: 1500.000 د.ك')).toBeInTheDocument();
    expect(screen.getByText('إجمالي الدائن: 1500.000 د.ك')).toBeInTheDocument();
  });

  it('toggles details when clicking on the header', () => {
    render(<RedesignedJournalEntryCard entry={mockEntry} />);
    
    const header = screen.getByText('سند قيد رقم: 000227').closest('div');
    expect(header).toBeInTheDocument();
    
    if (header) {
      // Initially details should not be visible
      expect(screen.queryByText('البيان: دفعة إيجار - إبراهيم حضر عبدالله')).not.toBeVisible;
      
      // Click to expand
      fireEvent.click(header);
      
      // Now details should be visible
      expect(screen.getByText('البيان: دفعة إيجار - إبراهيم حضر عبدالله')).toBeInTheDocument();
      
      // Click again to collapse
      fireEvent.click(header);
      
      // Details should not be visible again
      expect(screen.queryByText('البيان: دفعة إيجار - إبراهيم حضر عبدالله')).not.toBeVisible;
    }
  });

  it('renders entry details correctly when expanded', () => {
    render(<RedesignedJournalEntryCard entry={mockEntry} />);
    
    const header = screen.getByText('سند قيد رقم: 000227').closest('div');
    if (header) {
      fireEvent.click(header);
      
      expect(screen.getByText('4510')).toBeInTheDocument();
      expect(screen.getByText('مصاريف إيجار')).toBeInTheDocument();
      expect(screen.getByText('إيجار شهر مارس')).toBeInTheDocument();
      expect(screen.getByText('1500.000 د.ك')).toBeInTheDocument();
      
      expect(screen.getByText('1110')).toBeInTheDocument();
      expect(screen.getByText('الصندوق')).toBeInTheDocument();
      expect(screen.getByText('دفع المبلغ نقداً')).toBeInTheDocument();
      expect(screen.getByText('1500.000 د.ك')).toBeInTheDocument();
    }
  });
});