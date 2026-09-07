import { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ClipboardCheck,
  CalendarCheck,
  FileSearch,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { FinanceSectionTabs } from "@/components/finance/workspace/FinanceSectionTabs";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
import { FinancialIntegrityPanel } from "@/components/finance/FinancialIntegrityPanel";
import { MonthlyClosePanel } from "@/components/finance/MonthlyClosePanel";
import { FinancialApprovalsPanel } from "@/components/finance/FinancialApprovalsPanel";
const AuditTrailPage = lazy(() => import("./AuditTrailPage"));
const FinanceSettings = lazy(() => import("./FinanceSettings"));
const sections = [
  { id: "integrity", label: "سلامة البيانات", icon: ShieldCheck },
  { id: "approvals", label: "الموافقات", icon: ClipboardCheck },
  { id: "close", label: "الإقفال الشهري", icon: CalendarCheck },
  { id: "audit", label: "سجل التدقيق", icon: FileSearch },
  { id: "settings", label: "الإعدادات", icon: Settings2 },
];
export default function AuditAndSettings() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab") || "audit";
  const settingsTab =
    requested === "permissions"
      ? "permissions"
      : requested === "wizard"
      ? "wizard"
      : requested === "audit-log"
      ? "audit"
      : "mappings";
  const active = ["permissions", "wizard", "audit-log"].includes(requested)
    ? "settings"
    : sections.some((section) => section.id === requested)
    ? requested
    : "audit";
  const changeTab = (tab: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("tab", tab);
      return next;
    });
  return (
    <section>
      <FinancePageHeader
        title="الرقابة والإعدادات المالية"
        description="راجع سلامة العمليات، أنجز الموافقات، واضبط الإقفال والربط المحاسبي."
        icon={ShieldCheck}
      />
      <Tabs value={active} onValueChange={changeTab}>
        <FinanceSectionTabs items={sections} />
        <TabsContent value="integrity">
          <FinancialIntegrityPanel />
        </TabsContent>
        <TabsContent value="approvals">
          <FinancialApprovalsPanel />
        </TabsContent>
        <TabsContent value="close">
          <MonthlyClosePanel />
        </TabsContent>
        <TabsContent value="audit" className="finance-module-panel">
          <Suspense fallback={<PageSkeletonFallback />}>
            <AuditTrailPage />
          </Suspense>
        </TabsContent>
        <TabsContent value="settings" className="finance-module-panel">
          <Suspense fallback={<PageSkeletonFallback />}>
            <FinanceSettings
              initialTab={settingsTab}
              onSectionChange={(tab) =>
                changeTab(
                  tab === "mappings"
                    ? "settings"
                    : tab === "audit"
                    ? "audit-log"
                    : tab
                )
              }
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </section>
  );
}
