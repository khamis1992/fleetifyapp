import React from 'react';
import { UnifiedAccountSelector } from '@/components/ui/unified-account-selector';
import { useUnifiedAccountSelector, UnifiedAccount, filterAccountsBySearch } from '@/hooks/useUnifiedAccountSelector';

interface EnhancedAccountSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  filterLevel?: 'level_4_5' | 'level_5_6' | 'all_allowed';
  accountTypeFilter?: (account: UnifiedAccount) => boolean;
  showAccountType?: boolean;
  showParentAccount?: boolean;
  allowSearch?: boolean;
}

export const EnhancedAccountSelector: React.FC<EnhancedAccountSelectorProps> = ({
  value,
  onValueChange,
  placeholder = "اختر الحساب المحاسبي",
  disabled = false,
  className,
  filterLevel = 'level_5_6',
  accountTypeFilter,
  showAccountType = true,
  showParentAccount = true,
  allowSearch = true
}) => {
  const { data: accounts, isLoading, error } = useUnifiedAccountSelector({
    filterLevel,
    includeUnavailable: false
  });

  // Apply additional filtering if provided
  const filteredAccounts = accountTypeFilter && accounts 
    ? accounts.filter(accountTypeFilter)
    : accounts;

  // If we have filtered accounts, we need to handle the selection logic manually
  if (accountTypeFilter && filteredAccounts) {
    return (
      <UnifiedAccountSelector
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        filterLevel={filterLevel}
        showAccountType={showAccountType}
        showParentAccount={showParentAccount}
        allowSearch={allowSearch}
      />
    );
  }

  return (
    <UnifiedAccountSelector
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      filterLevel={filterLevel}
      showAccountType={showAccountType}
      showParentAccount={showParentAccount}
      allowSearch={allowSearch}
    />
  );
};

// Pre-defined account type filters
export const AccountTypeFilters = {
  vendorPayable: (account: UnifiedAccount) => 
    account.account_type === 'liabilities' || 
    account.account_name.toLowerCase().includes('payable') ||
    account.account_name.includes('دائن') ||
    account.account_name.includes('موردين'),
    
  expense: (account: UnifiedAccount) => 
    account.account_type === 'expenses',
    
  advance: (account: UnifiedAccount) => 
    account.account_type === 'assets' && 
    (account.account_name.toLowerCase().includes('advance') ||
     account.account_name.includes('مقدم')),
     
  customerReceivable: (account: UnifiedAccount) => 
    account.account_type === 'assets' && 
    (account.account_name.toLowerCase().includes('receivable') ||
     account.account_name.includes('مدين') ||
     account.account_name.includes('عملاء')),
     
  revenue: (account: UnifiedAccount) => 
    account.account_type === 'revenue',
    
  asset: (account: UnifiedAccount) => 
    account.account_type === 'assets',
    
  liability: (account: UnifiedAccount) => 
    account.account_type === 'liabilities',
    
  equity: (account: UnifiedAccount) => 
    account.account_type === 'equity'
};