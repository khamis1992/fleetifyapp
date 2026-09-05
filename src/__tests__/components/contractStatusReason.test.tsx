import type { ReactNode } from 'react';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContractStatusManagement } from '@/components/contracts/ContractStatusManagement';

vi.mock('@/hooks/useContractRenewal', () => ({
  useUpdateContractStatus: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useContractCancellationImpact: () => ({ data: null, isLoading: false, isFetching: false, error: null }),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));
vi.mock('@/components/contracts/ContractCancellationImpactPanel', () => ({
  ContractCancellationImpactPanel: () => null,
}));

// Isolate the status/reason rules from Radix pointer events in jsdom.
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, disabled }: {
    value: string; onValueChange: (value: string) => void; disabled: boolean;
  }) => <select aria-label="الحالة الجديدة" value={value} disabled={disabled}
    onChange={(event) => onValueChange(event.target.value)}>
    <option value="">اختر الحالة</option>
    <option value="active">نشط</option>
    <option value="suspended">معلق</option>
  </select>,
  SelectContent: ({ children }: { children: ReactNode }) => children,
  SelectItem: () => null,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

afterEach(cleanup);

const renderStatus = (status: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>
    <ContractStatusManagement open onOpenChange={vi.fn()}
      contract={{ id: 'contract-1', company_id: 'company-1', contract_number: 'LTO2024276', status }} />
  </QueryClientProvider>);
};

describe('contract status reason validation', () => {
  it('requires ten non-whitespace characters before enabling legal reversal', () => {
    renderStatus('under_legal_procedure');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'active' } });
    const reason = screen.getByRole('textbox');
    const submit = document.querySelector('button[type="submit"]');
    expect(screen.getByText(/من 10 أحرف على الأقل/)).toBeInTheDocument();
    fireEvent.change(reason, { target: { value: ' 123456789 ' } });
    expect(submit).toBeDisabled();
    fireEvent.change(reason, { target: { value: '1234567890' } });
    expect(submit).toBeEnabled();
  });

  it('preserves the existing five-character rule for ordinary suspension', () => {
    renderStatus('active');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'suspended' } });
    const reason = screen.getByRole('textbox');
    const submit = document.querySelector('button[type="submit"]');
    expect(screen.getByText(/من 5 أحرف على الأقل/)).toBeInTheDocument();
    fireEvent.change(reason, { target: { value: '1234' } });
    expect(submit).toBeDisabled();
    fireEvent.change(reason, { target: { value: '12345' } });
    expect(submit).toBeEnabled();
  });
});
