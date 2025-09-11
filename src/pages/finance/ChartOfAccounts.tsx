import React from 'react';
import { EnhancedChartOfAccountsManagement } from '@/components/finance/EnhancedChartOfAccountsManagement';
import { ChartOfAccountsErrorBoundary } from '@/components/finance/ChartOfAccountsErrorBoundary';

const ChartOfAccounts = () => {
  return (
    <ChartOfAccountsErrorBoundary
      error={null}
      isLoading={false}
      onRetry={() => window.location.reload()}
    >
      <EnhancedChartOfAccountsManagement />
    </ChartOfAccountsErrorBoundary>
  );
};

export default ChartOfAccounts;