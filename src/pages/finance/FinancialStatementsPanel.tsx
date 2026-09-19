import { Suspense, lazy } from "react";
import { Link, useParams } from "react-router-dom";
import { FileText } from "lucide-react";
import { allFinanceDestinations } from "@/components/finance/workspace/financeNavigation";
import { FinanceReportShell } from "@/components/finance/workspace/FinanceReportShell";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
const reports = {
  "financial-statements": lazy(() =>
    import("@/components/finance/FinancialStatementPackageReport").then((module) => ({
      default: module.FinancialStatementPackageReport,
    }))
  ),
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
      <div className="fin-reports-workspace" dir="rtl">
        <div className="dw-container">
          <div className="dw-state" role="status">
            <FileText size={28} />
            <p>التقرير غير موجود في مكتبة التقارير</p>
            <Link to="/finance/reports" className="dw-button">
              مكتبة التقارير
            </Link>
          </div>
        </div>
      </div>
    );
  const Report = reports[reportId as keyof typeof reports];
  return (
    <FinanceReportShell
      title={destination.ar}
      description={destination.descriptionAr}
    >
      <Suspense fallback={<PageSkeletonFallback />}>
        <Report />
      </Suspense>
    </FinanceReportShell>
  );
}
