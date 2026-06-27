import { Suspense, lazy, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Cog,
  FileSearch,
  KeyRound,
  Link2,
  Lock,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
import { FinancialIntegrityPanel } from "@/components/finance/FinancialIntegrityPanel";
import { FinancialApprovalsPanel } from "@/components/finance/FinancialApprovalsPanel";
import { MonthlyClosePanel } from "@/components/finance/MonthlyClosePanel";
import { FinancePermissionsMatrixPanel } from "@/components/finance/FinancePermissionsMatrixPanel";
import { cn } from "@/lib/utils";

const AuditTrailPage = lazy(() => import("./AuditTrailPage"));
const FinanceSettings = lazy(() => import("./FinanceSettings"));

const topTabs = [
  {
    id: "audit",
    label: "سجل التدقيق",
    description: "تتبع العمليات والتعديلات المالية",
    icon: FileSearch,
    color: "#38BDF8",
    bg: "#EAF8FE",
  },
  {
    id: "settings",
    label: "الإعدادات",
    description: "الربط والصلاحيات وضبط النظام المالي",
    icon: Cog,
    color: "#22C7A1",
    bg: "#E8FBF6",
  },
];

const settingSections = [
  { id: "settings", label: "ربط الحسابات", icon: Link2, color: "#22C7A1", bg: "#E8FBF6" },
  { id: "wizard", label: "معالج الإعداد", icon: Sparkles, color: "#7C83F6", bg: "#ECEEFE" },
  { id: "permissions", label: "الصلاحيات", icon: KeyRound, color: "#FB6B7A", bg: "#FFF0F2" },
];

const currentDate = new Intl.DateTimeFormat("en-QA", {
  year: "numeric",
  month: "short",
  day: "2-digit",
}).format(new Date());

const AuditAndSettings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedTab = searchParams.get("tab") || "audit";
  const currentTab = requestedTab === "audit" ? "audit" : "settings";

  const settingsInitialTab = useMemo(() => {
    if (requestedTab === "permissions") return "permissions";
    if (requestedTab === "wizard") return "wizard";
    if (requestedTab === "audit-log") return "audit";
    return "mappings";
  }, [requestedTab]);

  const handleTopTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleSettingsSectionChange = (value: string) => {
    setSearchParams({ tab: value === "mappings" ? "settings" : value });
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] px-4 py-5 sm:px-6" dir="rtl">
      <div className="mx-auto w-full max-w-[1500px] space-y-5">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF8FE] text-[#38BDF8]">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#E8FBF6] px-3 py-1 text-xs font-black text-[#22C7A1]">
                    مراقبة مالية
                  </span>
                  <span className="rounded-full bg-[#F6F8FB] px-3 py-1 text-xs font-black text-[#94A3B8]">
                    {currentDate}
                  </span>
                </div>
                <h1 className="text-2xl font-black text-[#020617]">التدقيق والإعدادات</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#94A3B8]">
                  مركز واحد لمراجعة أثر التغييرات المالية، ضبط الربط المحاسبي، وإدارة صلاحيات الوصول الحساسة.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate("/finance/hub")}
              className="h-11 gap-2 rounded-xl border-slate-200 text-[#020617] hover:bg-[#F6F8FB]"
            >
              <ArrowLeft className="h-4 w-4" />
              العودة للمركز المالي
            </Button>
          </div>
        </motion.div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#94A3B8]">سجل التدقيق</p>
                  <p className="mt-1 text-lg font-black text-[#020617]">مفعل</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAF8FE] text-[#38BDF8]">
                  <FileSearch className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#94A3B8]">حالة الحماية</p>
                  <p className="mt-1 text-lg font-black text-[#22C7A1]">آمنة</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8FBF6] text-[#22C7A1]">
                  <Lock className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#94A3B8]">جاهزية الإعدادات</p>
                  <p className="mt-1 text-lg font-black text-[#020617]">قابلة للمراجعة</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ECEEFE] text-[#7C83F6]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <FinancialIntegrityPanel />

        <MonthlyClosePanel />

        <FinancialApprovalsPanel />

        <FinancePermissionsMatrixPanel />

        <Tabs value={currentTab} onValueChange={handleTopTabChange} className="space-y-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-stretch">
            <div className="grid gap-3 md:grid-cols-2">
              {topTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                return (
                  <Card
                    key={tab.id}
                    onClick={() => handleTopTabChange(tab.id)}
                    className={cn(
                      "cursor-pointer rounded-2xl border bg-white shadow-sm transition",
                      isActive ? "border-[#22C7A1] ring-2 ring-[#22C7A1]/15" : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: tab.bg, color: tab.color }}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-black text-[#020617]">{tab.label}</p>
                            <p className="mt-1 text-xs font-medium text-[#94A3B8]">{tab.description}</p>
                          </div>
                        </div>
                        {isActive && (
                          <span className="rounded-full bg-[#E8FBF6] px-3 py-1 text-xs font-black text-[#22C7A1]">نشط</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <TabsList className="h-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              {topTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="h-11 rounded-xl px-4 text-[#94A3B8] data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
                  >
                    <Icon className="ml-2 h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {currentTab === "settings" && (
            <div className="grid gap-3 md:grid-cols-3">
              {settingSections.map((section) => {
                const Icon = section.icon;
                const isActive = requestedTab === section.id || (section.id === "settings" && requestedTab === "settings");
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => handleSettingsSectionChange(section.id === "settings" ? "mappings" : section.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border bg-white p-4 text-right shadow-sm transition",
                      isActive ? "border-[#22C7A1] ring-2 ring-[#22C7A1]/15" : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: section.bg, color: section.color }}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-black text-[#020617]">{section.label}</span>
                      <span className="mt-1 block text-xs font-bold text-[#94A3B8]">فتح القسم مباشرة</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <TabsContent value="audit" className="mt-0">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Suspense fallback={<PageSkeletonFallback />}>
                <AuditTrailPage />
              </Suspense>
            </motion.div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Suspense fallback={<PageSkeletonFallback />}>
                <FinanceSettings initialTab={settingsInitialTab} onSectionChange={handleSettingsSectionChange} />
              </Suspense>
            </motion.div>
          </TabsContent>
        </Tabs>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0F2] text-[#FB6B7A]">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-[#020617]">نصيحة تشغيلية</p>
              <p className="mt-1 text-xs leading-5 text-[#94A3B8]">
                راجع سجل التدقيق بعد أي تعديل على الربط أو الصلاحيات، لأن هذه المناطق تؤثر مباشرة على القيود والفواتير والتقارير.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditAndSettings;
