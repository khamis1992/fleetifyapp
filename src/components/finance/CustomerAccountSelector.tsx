import React from 'react';
import { EnhancedAccountSelector, AccountTypeFilters } from '@/components/ui/enhanced-account-selector';

interface CustomerAccountSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  accountType?: 'receivable' | 'revenue' | 'advance';
  placeholder?: string;
  disabled?: boolean;
}

// Get account type filter based on customer account type
const getAccountTypeFilter = (accountType?: 'receivable' | 'revenue' | 'advance') => {
  switch (accountType) {
    case 'receivable':
      return AccountTypeFilters.customerReceivable;
    case 'revenue':
      return AccountTypeFilters.revenue;
    case 'advance':
      return AccountTypeFilters.advance;
    default:
      return AccountTypeFilters.customerReceivable; // Default to customer receivable accounts
  }
};

export const CustomerAccountSelector: React.FC<CustomerAccountSelectorProps> = ({
  value,
  onValueChange,
  accountType = 'receivable',
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
      filterLevel="all_allowed"
      accountTypeFilter={accountTypeFilter}
      showAccountType={true}
      showParentAccount={true}
      allowSearch={true}
    />
  );
};