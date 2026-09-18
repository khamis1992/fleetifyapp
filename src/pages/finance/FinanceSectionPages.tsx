import { Suspense, lazy, type ReactNode } from "react";
import {
  Banknote,
  CalendarCheck,
  ChartNoAxesCombined,
  ClipboardCheck,
  ShieldCheck,
  Calculator,
  Percent,
} from "lucide-react";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { FinanceContextActions } from "@/components/finance/workspace/FinanceContextActions";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
const Collections = lazy(
  () => import("@/components/finance/BillingAIAssistant")
);
const Integrity = lazy(() =>
  import("@/components/finance/FinancialIntegrityPanel").then((m) => ({
    default: m.FinancialIntegrityPanel,
  }))
);
const Approvals = lazy(() =>
  import("@/components/finance/FinancialApprovalsPanel").then((m) => ({
    default: m.FinancialApprovalsPanel,
  }))
);
const Close = lazy(() =>
  import("@/components/finance/MonthlyClosePanel").then((m) => ({
    default: m.MonthlyClosePanel,
  }))
);
const Reconciliation = lazy(() =>
  import("@/components/finance/BankReconciliationPanel").then((m) => ({
    default: m.BankReconciliationPanel,
  }))
);
const Performance = lazy(() => import("./FinancialPerformancePanel"));
const Ratios = lazy(() =>
  import("@/components/finance/AdvancedFinancialRatios").then((m) => ({
    default: m.AdvancedFinancialRatios,
  }))
);
const Calculators = lazy(() => import("./FinancialCalculatorsPanel"));
function Section({
  title,
  description,
  icon,
  actions = [],
  children,
}: {
  title: string;
  description: string;
  icon: typeof Banknote;
  actions?: string[];
  children: ReactNode;
}) {
  return (
    <section dir="rtl" className="space-y-5">
      <FinancePageHeader title={title} description={description} icon={icon} />
      <FinanceContextActions ids={actions} />
      <Suspense fallback={<PageSkeletonFallback />}>{children}</Suspense>
    </section>
  );
}
export function CollectionsPage() {
  return (
    <Section
      title="متابعة التحصيل"
      description="رتّب متابعة العملاء وراجع مستحقات العقود والفواتير."
      icon={Banknote}
      actions={["rent", "tracking", "receive"]}
    >
      <Collections />
    </Section>
  );
}
export function IntegrityPage() {
  return (
    <Section
      title="سلامة البيانات المالية"
      description="راجع توازن القيود وربط الفواتير والدفعات قبل اعتماد النتائج."
      icon={ShieldCheck}
      actions={["invoice-journal", "sync"]}
    >
      <Integrity />
    </Section>
  );
}
export function ApprovalsPage() {
  return (
    <Section
      title="الموافقات المالية"
      description="راجع العمليات التي تحتاج إلى اعتماد."
      icon={ClipboardCheck}
    >
      <Approvals />
    </Section>
  );
}
export function ClosePage() {
  return (
    <Section
      title="الإقفال الشهري"
      description="راجع الفترة، عالج الملاحظات، ثم اعتمد الإقفال."
      icon={CalendarCheck}
      actions={["monthly-close-audit", "integrity"]}
    >
      <Close />
    </Section>
  );
}
export function ReconciliationPage() {
  return (
    <Section
      title="التسوية البنكية"
      description="طابق كشف البنك مع الحركات المسجلة في الخزينة."
      icon={Banknote}
      actions={["bank-transactions"]}
    >
      <Reconciliation />
    </Section>
  );
}
export function AnalysisPage() {
  return (
    <Section
      title="التحليل المالي"
      description="تابع النتائج واتجاهات الأداء استنادًا إلى القيود المرحلة."
      icon={ChartNoAxesCombined}
      actions={["ratios", "calculator"]}
    >
      <Performance />
    </Section>
  );
}
export function RatiosPage() {
  return (
    <Section
      title="النسب المالية"
      description="مؤشرات السيولة والربحية وكفاءة التشغيل."
      icon={Percent}
    >
      <Ratios />
    </Section>
  );
}
export function CalculatorPage() {
  return (
    <Section
      title="الحاسبة المالية"
      description="احسب السيناريوهات المالية وقارن النتائج."
      icon={Calculator}
    >
      <Calculators />
    </Section>
  );
}
