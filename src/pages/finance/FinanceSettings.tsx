import { Settings2, Link as LinkIcon, Users, Wand2 } from "lucide-react";
import { AccountMappingSettings } from "@/components/finance/AccountMappingSettings";
import { AccountingSystemWizard } from "@/components/finance/AccountingSystemWizard";
import { EssentialAccountMappingsManager } from "@/components/finance/EssentialAccountMappingsManager";
import { FinancePermissionsMatrixPanel } from "@/components/finance/FinancePermissionsMatrixPanel";
import { AuditTrailViewer } from "@/components/finance/AuditTrailViewer";
import { ProtectedFinanceRoute } from "@/components/finance/ProtectedFinanceRoute";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { FinanceContextActions } from "@/components/finance/workspace/FinanceContextActions";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
type FinanceSettingsTab =
  | "mappings"
  | "wizard"
  | "audit"
  | "permissions"
  | "system";
interface FinanceSettingsProps {
  initialTab?: FinanceSettingsTab;
  onSectionChange?: (tab: FinanceSettingsTab) => void;
}
const labels = {
  mappings: "ربط الحسابات",
  wizard: "معالج الإعداد",
  audit: "سجل التدقيق",
  permissions: "الصلاحيات المالية",
  system: "إعدادات النظام المالي",
};
const icons = {
  mappings: LinkIcon,
  wizard: Wand2,
  audit: Settings2,
  permissions: Users,
  system: Settings2,
};
export default function FinanceSettings({
  initialTab = "mappings",
}: FinanceSettingsProps) {
  return (
    <ProtectedFinanceRoute
      permission="finance.settings.view"
      title={labels[initialTab]}
    >
      <section dir="rtl" className="space-y-5">
        <FinancePageHeader
          title={labels[initialTab]}
          description="تهيئة الحسابات والإجراءات المالية حسب صلاحياتك."
          icon={icons[initialTab]}
        />
        {initialTab === "mappings" && (
          <>
            <FinanceContextActions ids={["audit"]} />
            <EssentialAccountMappingsManager />
            <AccountMappingSettings />
          </>
        )}
        {initialTab === "wizard" && <AccountingSystemWizard />}
        {initialTab === "audit" && <AuditTrailViewer compactHeader />}
        {initialTab === "permissions" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5">
              <p>
                توضح المصفوفة الصلاحية المطلوبة لكل إجراء. عدّل وصول الموظفين من
                إدارة الصلاحيات.
              </p>
              <Button asChild variant="outline">
                <Link to="/settings/permissions">إدارة صلاحيات الموظفين</Link>
              </Button>
            </div>
            <FinancePermissionsMatrixPanel />
          </>
        )}
        {initialTab === "system" && (
          <div className="rounded-xl border bg-card p-5">
            <p className="mb-5 text-muted-foreground">
              اختر إعدادًا لفتح صفحته. تظهر الإعدادات المتقدمة للمستخدمين
              المخولين.
            </p>
            <FinanceContextActions
              ids={[
                "wizard",
                "system-analysis",
                "journal-settings",
                "accounts-settings",
                "centers-settings",
                "automatic-accounts",
              ]}
            />
          </div>
        )}
      </section>
    </ProtectedFinanceRoute>
  );
}
