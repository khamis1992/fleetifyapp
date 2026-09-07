import { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, PiggyBank, Target } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { FinanceSectionTabs } from "@/components/finance/workspace/FinanceSectionTabs";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
const Budgets = lazy(() => import("./Budgets"));
const CostCenters = lazy(() => import("./CostCenters"));
const sections = [
  { id: "budgets", label: "الموازنات", icon: PiggyBank },
  { id: "cost-centers", label: "مراكز التكلفة", icon: Building2 },
];
export default function BudgetsAndCostCenters() {
  const [params, setParams] = useSearchParams();
  const active =
    params.get("tab") === "cost-centers" ? "cost-centers" : "budgets";
  return (
    <section>
      <FinancePageHeader
        title="الموازنات ومراكز التكلفة"
        description="خطّط للفترات المالية وتابع المخصص والفعلي على مستوى الإدارات والمشاريع."
        icon={Target}
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
        <TabsContent value="budgets" className="finance-module-panel">
          <Suspense fallback={<PageSkeletonFallback />}>
            <Budgets />
          </Suspense>
        </TabsContent>
        <TabsContent value="cost-centers" className="finance-module-panel">
          <Suspense fallback={<PageSkeletonFallback />}>
            <CostCenters />
          </Suspense>
        </TabsContent>
      </Tabs>
    </section>
  );
}
