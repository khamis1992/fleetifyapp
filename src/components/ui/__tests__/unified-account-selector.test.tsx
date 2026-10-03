import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnifiedAccountSelector } from '../unified-account-selector';

const { selected, accounts } = vi.hoisted(() => ({
  selected: vi.fn(),
  accounts: [
    { id:'1f00a054-a846-4a46-974d-232769f63408', account_code:'11211', account_name:'Customer deposits', account_name_ar:'دفعات العملاء', account_type:'liabilities', account_level:5, balance_type:'credit' },
    { id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', account_code:'112112', account_name:'Sarah customer account', account_name_ar:'حساب سارة', account_type:'assets', account_level:6, balance_type:'debit' },
    { id:'250f6a9f-2057-45cb-a0ca-1e2364b3debe', account_code:'1200', account_name:'Receivables', account_name_ar:'الذمم المدينة', account_type:'assets', account_level:3, balance_type:'debit' },
  ],
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase:{} }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ companyId:'company-a' }) }));
vi.mock('@/hooks/useUnifiedAccountSelector', async importOriginal => ({ ...await importOriginal<object>(), useUnifiedAccountSelector: () => ({ data:accounts, isLoading:false, error:null }) }));
beforeEach(() => vi.clearAllMocks());
const open=() => { render(<UnifiedAccountSelector onValueChange={selected} filterLevel="all_allowed" />); fireEvent.click(screen.getByRole('combobox')); };
describe('account selector search and identity', () => {
  it('keeps code matches visible regardless of UUID and selects the exact account UUID', async () => {
    open(); fireEvent.change(screen.getByPlaceholderText('البحث في الحسابات...'), { target:{ value:'11211' } });
    await waitFor(() => expect(screen.getByRole('option', { name:/11211 - دفعات العملاء/ })).toBeVisible());
    expect(screen.getByRole('option', { name:/112112 - حساب سارة/ })).toBeVisible();
    expect(screen.queryByRole('option', { name:/1200 -/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
    fireEvent.click(screen.getByRole('option', { name:/11211 - دفعات العملاء/ }));
    expect(selected).toHaveBeenCalledWith('1f00a054-a846-4a46-974d-232769f63408');
  });
  it.each(['Receivables','الذمم المدينة'])('searches the displayed name %s and preserves UUID selection', async name => {
    open(); fireEvent.change(screen.getByPlaceholderText('البحث في الحسابات...'), { target:{ value:name } });
    await waitFor(() => expect(screen.getByRole('option', { name:/1200 - الذمم المدينة/ })).toBeVisible());
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.click(screen.getByRole('option', { name:/1200 - الذمم المدينة/ }));
    expect(selected).toHaveBeenCalledWith('250f6a9f-2057-45cb-a0ca-1e2364b3debe');
  });
});
