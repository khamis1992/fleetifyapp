import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChartOfAccount } from '@/hooks/useChartOfAccounts';
import { EnhancedAccountEditDialog } from '../EnhancedAccountEditDialog';

const { mutateAsync, language } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  language: { current: 'ar' },
}));

vi.mock('@/hooks/useChartOfAccounts', () => ({
  useUpdateAccount: () => ({ mutateAsync, isPending: false }),
  useChartOfAccounts: () => ({ data: [] }),
}));
vi.mock('@/hooks/useTranslation', () => ({
  useFleetifyTranslation: () => ({
    currentLanguage: language.current,
    t: (key: string, options?: { defaultValue?: string; subtype?: string }) =>
      (options?.defaultValue ?? key).replace('{{subtype}}', options?.subtype ?? ''),
  }),
}));
vi.mock('../InteractiveAccountTree', () => ({ InteractiveAccountTree: () => null }));
vi.mock('../SmartParentSelector', () => ({ SmartParentSelector: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const account: ChartOfAccount = {
  id: 'account-fixture',
  company_id: 'company-fixture',
  account_code: '11211',
  account_name: 'Lease receivable',
  account_name_ar: 'إيجار منتهي بالتملك',
  account_type: 'assets',
  account_subtype: 'legacy_lease',
  balance_type: 'debit',
  account_level: 3,
  is_header: false,
  is_active: true,
  is_system: false,
  current_balance: -2500,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const mount = (overrides: Partial<ChartOfAccount> = {}) => {
  const onOpenChange = vi.fn();
  render(<EnhancedAccountEditDialog open account={{ ...account, ...overrides }} onOpenChange={onOpenChange} />);
  return onOpenChange;
};

const choose = async (label: string, option: string) => {
  fireEvent.keyDown(screen.getByRole('combobox', { name: label }), { key: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name: option, exact: true }));
};

const save = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
  return mutateAsync.mock.calls[0][0].updates;
};

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockResolvedValue({});
  language.current = 'ar';
});

describe('account financial classification editing', () => {
  it.each(['legacy_lease', 'contra_asset'])('preserves existing subtype %s when another field changes', async (subtype) => {
    mount({ account_subtype: subtype });
    expect(screen.getByRole('combobox', { name: 'تصنيف الميزانية العمومية' })).toHaveTextContent(`التصنيف الحالي: ${subtype}`);
    expect(screen.getByRole('button', { name: 'حفظ التغييرات' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('اسم الحساب (إنجليزي)'), { target: { value: 'Updated receivable' } });
    const updates = await save();
    expect(updates.account_subtype).toBe(subtype);
    expect(updates.balance_type).toBe('debit');
    expect(updates).not.toHaveProperty('current_balance');
  });

  it.each([
    ['assets', 'أصل متداول', 'current_asset'],
    ['assets', 'أصل غير متداول', 'non_current_asset'],
    ['assets', 'حساب مقابل لأصل متداول', 'contra_current_asset'],
    ['assets', 'حساب مقابل لأصل غير متداول (مثل مجمع الإهلاك)', 'contra_non_current_asset'],
    ['liabilities', 'التزام متداول', 'current_liability'],
    ['liabilities', 'التزام غير متداول', 'non_current_liability'],
  ])('saves an explicit %s classification %s through the existing mutation', async (accountType, label, subtype) => {
    const onOpenChange = mount({ account_type: accountType });
    await choose('تصنيف الميزانية العمومية', label);
    expect(screen.getByRole('combobox', { name: 'تصنيف الميزانية العمومية' })).toHaveTextContent(label);
    const updates = await save();
    expect(mutateAsync).toHaveBeenCalledWith({ id: account.id, updates: expect.objectContaining({ account_subtype: subtype }) });
    expect(updates.balance_type).toBe(account.balance_type);
    expect(updates).not.toHaveProperty('current_balance');
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it.each([undefined, ''])('preserves an unclassified value %s when another field changes', async (subtype) => {
    mount({ account_subtype: subtype });
    expect(screen.getByRole('combobox', { name: 'تصنيف الميزانية العمومية' })).toHaveTextContent('غير مصنف');
    fireEvent.change(screen.getByLabelText('اسم الحساب (إنجليزي)'), { target: { value: 'Updated receivable' } });
    expect((await save()).account_subtype).toBe(subtype ?? null);
  });

  it.each(['revenue', 'expenses', 'equity'])('preserves the existing subtype for %s without offering asset classifications', async (accountType) => {
    mount({ account_type: accountType, account_subtype: 'existing_custom_subtype' });
    expect(screen.queryByRole('combobox', { name: 'تصنيف الميزانية العمومية' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('اسم الحساب (إنجليزي)'), { target: { value: 'Updated account' } });
    expect((await save()).account_subtype).toBe('existing_custom_subtype');
  });

  it('does not replace a legacy subtype when the account type changes', async () => {
    mount();
    await choose('نوع الحساب', 'الخصوم');
    expect(screen.getByRole('combobox', { name: 'تصنيف الميزانية العمومية' })).toHaveTextContent('legacy_lease');
    const updates = await save();
    expect(updates.account_type).toBe('liabilities');
    expect(updates.account_subtype).toBe('legacy_lease');
  });

  it('labels the classification accessibly in English', async () => {
    language.current = 'en';
    mount();
    const selector = screen.getByRole('combobox', { name: 'Balance sheet classification' });
    expect(selector).toHaveAccessibleDescription('Choose the classification based on the asset or liability. The existing classification is preserved until you change it.');
    await choose('Balance sheet classification', 'Non-current asset');
    expect((await save()).account_subtype).toBe('non_current_asset');
  });
});
