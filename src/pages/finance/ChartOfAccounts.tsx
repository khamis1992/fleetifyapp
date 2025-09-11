import React from 'react';
import { EnhancedChartOfAccountsManagement } from '@/components/finance/EnhancedChartOfAccountsManagement';
import { ProtectedFinanceRoute } from '@/components/finance/ProtectedFinanceRoute';
import { ChartOfAccountsErrorBoundary } from '@/components/finance/ChartOfAccountsErrorBoundary';

const ChartOfAccounts = () => {
  return (
    <ProtectedFinanceRoute 
      permission="finance.accounts.view"
      title="دليل الحسابات"
    >
      <ChartOfAccountsErrorBoundary
        error={null}
        isLoading={false}
        onRetry={() => window.location.reload()}
      >
        <EnhancedChartOfAccountsManagement />
      </ChartOfAccountsErrorBoundary>
    </ProtectedFinanceRoute>
  );
};

export default ChartOfAccounts;