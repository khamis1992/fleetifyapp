import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ContractsWithoutSignedLease from '../ContractsWithoutSignedLease';

const query = vi.hoisted(() => ({ select: vi.fn(), eq: vi.fn(), order: vi.fn(), navigate: vi.fn(), receiver: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => query.navigate }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ companyId: 'company-1' }) }));
vi.mock('@/integrations/supabase/client', () => {
  const client = {
    from(this: unknown, relation: string) {
      query.receiver(this, relation);
      if (this !== client) throw new Error('Client receiver was lost');
      return { select: query.select };
    },
  };
  return { supabase: client };
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('unsigned contract navigation', () => {
  it('retains the database client, scopes the read to the company and opens the registered preparation route', async () => {
    query.select.mockReturnValue({ eq: query.eq });
    query.eq.mockReturnValue({ order: query.order });
    query.order.mockResolvedValue({ data: [{ id: 'contract-1', contract_number: 'TEST-1', status: 'under_legal_procedure' }], error: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ContractsWithoutSignedLease /></QueryClientProvider>);
    await screen.findByText('TEST-1');
    expect(query.receiver).toHaveBeenCalledWith(expect.any(Object), 'legal_contracts_without_signed_lease');
    expect(query.eq).toHaveBeenCalledWith('company_id', 'company-1');
    fireEvent.click(screen.getByRole('button', { name: 'إعداد الحزمة' }));
    await waitFor(() => expect(query.navigate).toHaveBeenCalledWith('/legal/lawsuit/prepare/contract-1'));
    client.clear();
  });
});
