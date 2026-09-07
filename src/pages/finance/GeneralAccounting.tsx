import { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen, FileText, ListTree } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { FinanceSectionTabs } from "@/components/finance/workspace/FinanceSectionTabs";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
const ChartOfAccounts = lazy(() => import("./ChartOfAccounts"));
const GeneralLedger = lazy(() => import("./GeneralLedger"));
const Ledger = lazy(() => import("./Ledger"));
const sections = [
  {
    id: "chart",
    label: "دليل الحسابات",
    icon: ListTree,
    component: ChartOfAccounts,
  },
  {
    id: "ledger",
    label: "دفتر الأستاذ",
    icon: BookOpen,
    component: GeneralLedger,
  },
  { id: "entries", label: "القيود اليومية", icon: FileText, component: Ledger },
];
export default function GeneralAccounting() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const active =
    sections.find((section) => section.id === requested)?.id || "chart";
  return (
    <section data-tour="accounting-header">
      <FinancePageHeader
        title="المحاسبة العامة"
        description="نظّم دليل الحسابات، تتبّع الحركة، وراجع القيود من مصدرها."
        icon={BookOpen}
      />
      <Tabs
        value={active}
        onValueChange={(tab) =>
          setParams((previous) => {
            const next = new URLSearchParams(previous);
            next.set("tab", tab);
            next.delete("action");
            return next;
          })
        }
      >
        <div data-tour="accounting-tabs">
          <FinanceSectionTabs items={sections} />
        </div>
        {sections.map(({ id, component: Component }) => (
          <TabsContent
            key={id}
            value={id}
            className="finance-module-panel"
            data-tour={`accounting-${id}-panel`}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <Component />
            </Suspense>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
