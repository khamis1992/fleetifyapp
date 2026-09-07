import { beforeEach, describe, expect, it, vi } from 'vitest';
import { accountingService } from '../AccountingService';

const { from, balances } = vi.hoisted(() => ({ from: vi.fn(), balances: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));
vi.mock('../financialReporting', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../financialReporting')>()),
  readAccountBalances: balances,
}));

describe('accounting refresh idempotency', () => {
  const scopes: [string, unknown][] = [];
  beforeEach(() => {
    vi.clearAllMocks();
    scopes.length = 0;
    from.mockImplementation((table: string) => {
      // No update/insert methods: a refresh must never write settlement totals.
      const reader = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((column: string, value: unknown) => {
          scopes.push([column, value]);
          return reader;
        }),
        single: vi
          .fn()
          .mockResolvedValue({
            error: null,
            data:
              table === 'payments'
                ? { invoice_id: 'invoice-a', contract_id: 'contract-a' }
                : table === 'invoices'
                ? { payment_status: 'partial', paid_amount: 300, balance_due: 700 }
                : { total_paid: 300, balance_due: 700 },
          }),
      };
      return reader;
    });
  });
  it('repeated invoice refreshes retain the committed settlement', async () => {
    const first = await accountingService.updateInvoicePaymentStatus(
      'invoice-a',
      'payment-a',
      300,
      'company-a'
    );
    const retry = await accountingService.updateInvoicePaymentStatus(
      'invoice-a',
      'payment-a',
      300,
      'company-a'
    );
    expect(first).toMatchObject({ success: true, paidAmount: 300, remainingBalance: 700 });
    expect(retry).toEqual(first);
    expect(scopes.filter(([column]) => column === 'company_id')).toEqual(
      Array(4).fill(['company_id', 'company-a'])
    );
  });
  it('repeated contract refreshes retain the committed settlement', async () => {
    for (let i = 0; i < 2; i++)
      expect(
        await accountingService.updateContractPaymentStatus('contract-a', 'payment-a', 300, 'company-a')
      ).toMatchObject({ success: true, totalPaid: 300, remainingBalance: 700 });
  });
  it('rejects missing scope and unrelated payments', async () => {
    expect(
      (await accountingService.updateContractPaymentStatus('contract-a', 'payment-a', 300)).success
    ).toBe(false);
    expect(from).not.toHaveBeenCalled();
    expect(
      (await accountingService.updateContractPaymentStatus('contract-b', 'payment-a', 300, 'company-a'))
        .success
    ).toBe(false);
    expect(from).not.toHaveBeenCalledWith('contracts');
  });
  it('does not substitute zero for an unavailable balance', async () => {
    balances.mockRejectedValueOnce(new Error('Ledger unavailable'));
    await expect(accountingService.getAccountBalance('account-a', 'company-a')).rejects.toThrow(
      'Ledger unavailable'
    );
    balances.mockResolvedValueOnce([]);
    await expect(accountingService.getAccountBalance('foreign-account', 'company-a')).rejects.toThrow(
      'selected company'
    );
  });
});
