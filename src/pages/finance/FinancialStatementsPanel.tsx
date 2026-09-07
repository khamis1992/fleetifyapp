import { Suspense, lazy } from "react";
import { Link, useParams } from "react-router-dom";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { allFinanceDestinations } from "@/components/finance/workspace/financeNavigation";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
const reports = {
  "trial-balance": lazy(() =>
    import("@/components/finance/TrialBalanceReport").then((module) => ({
      default: module.TrialBalanceReport,
    }))
  ),
  "income-statement": lazy(() =>
    import("@/components/finance/IncomeStatementReport").then((module) => ({
      default: module.IncomeStatementReport,
    }))
  ),
  "balance-sheet": lazy(() =>
    import("@/components/finance/BalanceSheetReport").then((module) => ({
      default: module.BalanceSheetReport,
    }))
  ),
  "cash-flow": lazy(() =>
    import("@/components/finance/CashFlowStatementReport").then((module) => ({
      default: module.CashFlowStatementReport,
    }))
  ),
  payroll: lazy(() =>
    import("@/components/finance/PayrollReportsPanel").then((module) => ({
      default: module.PayrollReportsPanel,
    }))
  ),
  "cost-centers": lazy(() =>
    import("@/components/finance/CostCenterReports").then((module) => ({
      default: module.CostCenterReports,
    }))
  ),
  receivables: lazy(() =>
    import("@/components/finance/ReceivablesReport").then((module) => ({
      default: module.ReceivablesReport,
    }))
  ),
  payables: lazy(() =>
    import("@/components/finance/PayablesReport").then((module) => ({
      default: module.PayablesReport,
    }))
  ),
};
export default function FinancialStatementsPanel() {
  const { reportId = "" } = useParams();
  const destination = allFinanceDestinations.find(
    (item) => item.id === `report-${reportId}`
  );
  if (!Object.hasOwn(reports, reportId) || !destination)
    return (
      <section className="space-y-4 p-6" dir="rtl">
        <h1 className="text-xl font-bold">التقرير غير موجود</h1>
        <Button asChild variant="outline">
          <Link to="/finance/reports">مكتبة التقارير</Link>
        </Button>
      </section>
    );
  const Report = reports[reportId as keyof typeof reports];
  return (
    <section className="space-y-5" dir="rtl">
      <FinancePageHeader
        title={destination.ar}
        description="راجع الفترة والمرشحات قبل التصدير أو الطباعة."
        icon={FileText}
        actions={
          <Button variant="outline" asChild>
            <Link to="/finance/reports">مكتبة التقارير</Link>
          </Button>
        }
      />
      <Suspense fallback={<PageSkeletonFallback />}>
        <Report />
      </Suspense>
    </section>
  );
}
