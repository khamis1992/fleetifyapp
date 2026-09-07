import { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BarChart3,
  Calculator,
  FileText,
  LineChart,
  Percent,
} from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { FinanceSectionTabs } from "@/components/finance/workspace/FinanceSectionTabs";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
const FinancialStatementsPanel = lazy(
  () => import("./FinancialStatementsPanel")
);
const FinancialPerformancePanel = lazy(
  () => import("./FinancialPerformancePanel")
);
const Calculators = lazy(() => import("./FinancialCalculatorsPanel"));
const Ratios = lazy(() =>
  import("@/components/finance/AdvancedFinancialRatios").then((module) => ({
    default: module.AdvancedFinancialRatios,
  }))
);
const sections = [
  {
    id: "reports",
    label: "القوائم المالية",
    icon: FileText,
    component: FinancialStatementsPanel,
  },
  {
    id: "analysis",
    label: "تحليل الأداء",
    icon: LineChart,
    component: FinancialPerformancePanel,
  },
  { id: "ratios", label: "النسب المالية", icon: Percent, component: Ratios },
  {
    id: "calculator",
    label: "الحاسبة المالية",
    icon: Calculator,
    component: Calculators,
  },
];
export default function ReportsAndAnalysis() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const active =
    sections.find((section) => section.id === requested)?.id || "reports";
  return (
    <section>
      <FinancePageHeader
        title="التقارير والتحليل المالي"
        description="قوائم مالية قابلة للمراجعة، ومؤشرات مرتبطة بالفترة ومصدر البيانات."
        icon={BarChart3}
      />
      <Tabs
        value={active}
        onValueChange={(tab) =>
          setParams((previous) => {
            const next = new URLSearchParams(previous);
            next.set("tab", tab);
            return next;
          })
        }
      >
        <FinanceSectionTabs items={sections} />
        {sections.map(({ id, component: Component }) => (
          <TabsContent key={id} value={id} className="finance-module-panel">
            <Suspense fallback={<PageSkeletonFallback />}>
              <Component />
            </Suspense>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
