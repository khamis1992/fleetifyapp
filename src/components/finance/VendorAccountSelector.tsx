import React from 'react';
import { EnhancedAccountSelector, AccountTypeFilters } from '@/components/ui/enhanced-account-selector';

interface VendorAccountSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  accountType?: 'payable' | 'expense' | 'advance';
  placeholder?: string;
  disabled?: boolean;
}

// Get account type filter based on vendor account type
const getAccountTypeFilter = (accountType?: 'payable' | 'expense' | 'advance') => {
  switch (accountType) {
    case 'payable':
      return AccountTypeFilters.vendorPayable;
    case 'expense':
      return AccountTypeFilters.expense;
    case 'advance':
      return AccountTypeFilters.advance;
    default:
      return undefined;
  }
};


export const VendorAccountSelector: React.FC<VendorAccountSelectorProps> = ({
  value,
  onValueChange,
  accountType,
  placeholder = "اختر الحساب المحاسبي",
  disabled = false,
}) => {
  const accountTypeFilter = getAccountTypeFilter(accountType);
  
  return (
    <EnhancedAccountSelector
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      disabled={disabled}
      filterLevel="level_4_5"
      accountTypeFilter={accountTypeFilter}
      showAccountType={true}
      showParentAccount={true}
      allowSearch={true}
    />
  );
};