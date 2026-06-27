import { Suspense, lazy } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Building2, Layers3, PiggyBank, Target } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
import { cn } from "@/lib/utils";

const Budgets = lazy(() => import("./Budgets"));
const CostCenters = lazy(() => import("./CostCenters"));

const tabs = [
  {
    id: "budgets",
    label: "الموازنات",
    description: "تخطيط الإيرادات والمصروفات ومتابعة الانحرافات",
    icon: PiggyBank,
    accent: "#22C7A1",
    soft: "#DDFBF4",
  },
  {
    id: "cost-centers",
    label: "مراكز التكلفة",
    description: "توزيع التكلفة على الإدارات والمشاريع بوضوح",
    icon: Building2,
    accent: "#7C83F6",
    soft: "#ECEEFE",
  },
];

const BudgetsAndCostCenters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get("tab") || "budgets";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
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
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8FBF6] text-[#22C7A1]">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#F6F8FB] px-3 py-1 text-xs font-bold text-[#94A3B8]">
                    التخطيط والرقابة
                  </span>
                  <span className="rounded-full bg-[#ECFEFF] px-3 py-1 text-xs font-bold text-[#38BDF8]">
                    QAR
                  </span>
                </div>
                <h1 className="text-2xl font-black text-[#020617]">
                  الموازنات ومراكز التكلفة
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#94A3B8]">
                  مساحة واحدة للتخطيط المالي، مقارنة المستهدف بالفعلي، ومعرفة أين تصرف التكلفة داخل النظام.
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

        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-stretch">
            <div className="grid gap-3 md:grid-cols-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;

                return (
                  <Card
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      "cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm transition",
                      isActive ? "border-[#22C7A1] ring-2 ring-[#22C7A1]/15" : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-2xl"
                            style={{ backgroundColor: tab.soft, color: tab.accent }}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-base font-black text-[#020617]">{tab.label}</p>
                            <p className="mt-1 text-xs font-medium text-[#94A3B8]">{tab.description}</p>
                          </div>
                        </div>
                        {isActive && (
                          <span className="rounded-full bg-[#E8FBF6] px-3 py-1 text-xs font-black text-[#22C7A1]">
                            نشط
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <TabsList className="h-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              {tabs.map((tab) => {
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

          <TabsContent value="budgets" className="mt-0">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Suspense fallback={<PageSkeletonFallback />}>
                <Budgets />
              </Suspense>
            </motion.div>
          </TabsContent>

          <TabsContent value="cost-centers" className="mt-0">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Suspense fallback={<PageSkeletonFallback />}>
                <CostCenters />
              </Suspense>
            </motion.div>
          </TabsContent>
        </Tabs>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <Layers3 className="mb-3 h-5 w-5 text-[#38BDF8]" />
            <p className="text-sm font-black text-[#020617]">تخطيط مرتبط بالتنفيذ</p>
            <p className="mt-1 text-xs leading-5 text-[#94A3B8]">كل رقم ظاهر بصيغة QAR مع مساحة واضحة للمتابعة والقرار.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <Target className="mb-3 h-5 w-5 text-[#22C7A1]" />
            <p className="text-sm font-black text-[#020617]">مؤشرات قابلة للمسح</p>
            <p className="mt-1 text-xs leading-5 text-[#94A3B8]">الانحرافات والحالات تظهر كباجات ملونة بدل قراءة الجداول يدويًا.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <Building2 className="mb-3 h-5 w-5 text-[#7C83F6]" />
            <p className="text-sm font-black text-[#020617]">توزيع تكلفة أوضح</p>
            <p className="mt-1 text-xs leading-5 text-[#94A3B8]">مراكز التكلفة تعرض المخصص، الفعلي، والمتبقي بشكل مباشر.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetsAndCostCenters;
