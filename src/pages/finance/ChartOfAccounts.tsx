import React from 'react';
import { EnhancedChartOfAccountsManagement } from '@/components/finance/EnhancedChartOfAccountsManagement';
import { ChartOfAccountsErrorBoundary } from '@/components/finance/ChartOfAccountsErrorBoundary';
import { PageHelp } from "@/components/help";
import { ChartOfAccountsPageHelpContent } from "@/components/help/content";

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