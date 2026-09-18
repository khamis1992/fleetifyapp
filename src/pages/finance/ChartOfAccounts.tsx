import { EnhancedChartOfAccountsManagement } from "@/components/finance/EnhancedChartOfAccountsManagement";
import { ChartOfAccountsErrorBoundary } from "@/components/finance/ChartOfAccountsErrorBoundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";

export default function ChartOfAccounts() {
  const { error, isLoading, refetch } = useChartOfAccounts();
  return (
    <ChartOfAccountsErrorBoundary
      error={error}
      isLoading={isLoading}
      onRetry={() => refetch()}
    >
      {isLoading ? (
        <div role="status" className="flex justify-center p-10">
          <LoadingSpinner />
        </div>
      ) : (
        <EnhancedChartOfAccountsManagement />
      )}
    </ChartOfAccountsErrorBoundary>
  );
}
