import { useEffect, useState } from "react";
import { HelpCircle, KeyRound, Link as LinkIcon, Shield, Sparkles, Users, Wand2 } from "lucide-react";
import { AccountMappingSettings } from "@/components/finance/AccountMappingSettings";
import { AuditTrailViewer } from "@/components/finance/AuditTrailViewer";
import { EssentialAccountMappingsManager } from "@/components/finance/EssentialAccountMappingsManager";
import { FinanceErrorBoundary } from "@/components/finance/FinanceErrorBoundary";
import { ProtectedFinanceRoute } from "@/components/finance/ProtectedFinanceRoute";
import { HelpIcon } from "@/components/help/HelpIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type FinanceSettingsTab = "mappings" | "wizard" | "audit" | "permissions";

interface FinanceSettingsProps {
  initialTab?: FinanceSettingsTab;
  onSectionChange?: (tab: FinanceSettingsTab) => void;
}

const sections: Array<{
  id: FinanceSettingsTab;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}> = [
  {
    id: "mappings",
    label: "ربط الحسابات",
    description: "ربط الحسابات الأساسية مع العمليات المالية",
    icon: LinkIcon,
    color: "#22C7A1",
    bg: "#E8FBF6",
  },
  {
    id: "wizard",
    label: "معالج الإعداد",
    description: "تهيئة محاسبية منظمة للشركات الجديدة",
    icon: Wand2,
    color: "#7C83F6",
    bg: "#ECEEFE",
  },
  {
    id: "audit",
    label: "سجل التدقيق",
    description: "مراجعة أثر تغييرات الإعدادات والربط",
    icon: Shield,
    color: "#38BDF8",
    bg: "#EAF8FE",
  },
  {
    id: "permissions",
    label: "الصلاحيات",
    description: "ضبط وصول المستخدمين للمناطق المالية الحساسة",
    icon: Users,
    color: "#FB6B7A",
    bg: "#FFF0F2",
  },
];

const PlaceholderPanel = ({
  icon: Icon,
  title,
  description,
  actionLabel,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
}) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-[#F6F8FB] p-8 text-center">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#7C83F6] shadow-sm">
      <Icon className="h-7 w-7" />
    </div>
    <h3 className="mt-4 text-xl font-black text-[#020617]">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#94A3B8]">{description}</p>
    <Button className="mt-5 h-11 rounded-xl bg-[#22C7A1] px-5 font-black text-white hover:bg-[#1DAE8D]">
      {actionLabel}
    </Button>
  </div>
);

const FinanceSettings = ({ initialTab = "mappings", onSectionChange }: FinanceSettingsProps) => {
  const [activeTab, setActiveTab] = useState<FinanceSettingsTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (value: string) => {
    const tab = value as FinanceSettingsTab;
    setActiveTab(tab);
    onSectionChange?.(tab);
  };

  return (
    <ProtectedFinanceRoute permission="finance.settings.view" title="الإعدادات المالية">
      <FinanceErrorBoundary
        error={null}
        isLoading={false}
        onRetry={() => window.location.reload()}
        title="خطأ في الإعدادات المالية"
        context="الإعدادات المالية"
      >
        <div className="space-y-5">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E8FBF6] text-[#22C7A1]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-[#020617]">الإعدادات المالية</h2>
                      <HelpIcon topic="financeSettings" />
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[#94A3B8]">
                      اضبط الربط المحاسبي والصلاحيات من نفس المكان مع إمكانية العودة لسجل التدقيق بسرعة.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-[#F6F8FB] px-3 py-2 text-xs font-black text-[#94A3B8]">
                  <HelpCircle className="h-4 w-4 text-[#38BDF8]" />
                  تؤثر هذه الإعدادات على القيود والفواتير والتقارير
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeTab === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => handleTabChange(section.id)}
                    className={cn(
                      "rounded-2xl border bg-white p-4 text-right shadow-sm transition",
                      isActive ? "border-[#22C7A1] ring-2 ring-[#22C7A1]/15" : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: section.bg, color: section.color }}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block font-black text-[#020617]">{section.label}</span>
                        <span className="mt-1 block text-xs font-medium leading-5 text-[#94A3B8]">{section.description}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <TabsTrigger
                    key={section.id}
                    value={section.id}
                    className="h-11 rounded-xl px-4 text-[#94A3B8] data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
                  >
                    <Icon className="ml-2 h-4 w-4" />
                    {section.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="mappings" className="mt-0 space-y-5">
              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-black text-[#020617]">
                    <LinkIcon className="h-5 w-5 text-[#22C7A1]" />
                    ربط الحسابات
                    <HelpIcon topic="accountMappings" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-[#F6F8FB] p-4">
                      <p className="text-xs font-bold text-[#94A3B8]">الأولوية</p>
                      <p className="mt-1 font-black text-[#020617]">الحسابات الأساسية</p>
                    </div>
                    <div className="rounded-2xl bg-[#E8FBF6] p-4">
                      <p className="text-xs font-bold text-[#0F9F82]">الأثر</p>
                      <p className="mt-1 font-black text-[#020617]">قيود تلقائية أدق</p>
                    </div>
                    <div className="rounded-2xl bg-[#EAF8FE] p-4">
                      <p className="text-xs font-bold text-[#0284C7]">المراجعة</p>
                      <p className="mt-1 font-black text-[#020617]">تظهر في سجل التدقيق</p>
                    </div>
                  </div>
                  <EssentialAccountMappingsManager />
                  <AccountMappingSettings />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wizard" className="mt-0">
              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardContent className="p-5">
                  <PlaceholderPanel
                    icon={Wand2}
                    title="معالج إعداد النظام المحاسبي"
                    description="مسار موجه للشركات الجديدة لضبط الحسابات الأساسية والربط المحاسبي خطوة بخطوة قبل بدء العمليات اليومية."
                    actionLabel="بدء المعالج"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="mt-0">
              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-black text-[#020617]">
                    <Shield className="h-5 w-5 text-[#38BDF8]" />
                    سجل التدقيق الشامل
                    <HelpIcon topic="auditTrail" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AuditTrailViewer compactHeader />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions" className="mt-0">
              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardContent className="p-5">
                  <PlaceholderPanel
                    icon={KeyRound}
                    title="إدارة الصلاحيات المالية"
                    description="قسم مخصص للتحكم في من يستطيع إنشاء القيود، تعديل الفواتير، اعتماد المدفوعات، أو تغيير إعدادات الربط."
                    actionLabel="مراجعة الصلاحيات"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </FinanceErrorBoundary>
    </ProtectedFinanceRoute>
  );
};

export default FinanceSettings;
