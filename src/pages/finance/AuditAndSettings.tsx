/**
 * صفحة التدقيق والإعدادات - تصميم جديد متوافق مع الداشبورد
 */
import { Suspense, lazy } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
import { StatCard } from "@/components/ui/StatCard";
import {
  Shield,
  ArrowLeft,
  FileSearch,
  Cog,
  Settings,
  History,
  Lock,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Lazy load the tab content components
const AuditTrailPage = lazy(() => import("./AuditTrailPage"));
const FinanceSettings = lazy(() => import("./FinanceSettings"));

// Tab configuration
const TABS = [
  {
    id: "audit",
    label: "سجل التدقيق",
    icon: FileSearch,
    description: "تتبع جميع التعديلات والعمليات",
    variant: "coral" as const,
  },
  {
    id: "settings",
    label: "الإعدادات",
    icon: Cog,
    description: "إعدادات النظام المالي",
    variant: "slate" as const,
  },
];

const AuditAndSettings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get("tab") || "audit";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Get current date for display
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#f0efed] p-6" dir="rtl">
      {/* Hero Header */}
      <motion.div
        className="bg-white rounded-xl p-6 mb-6 border border-slate-200 shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
              <Shield className="w-7 h-7 text-rose-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">التدقيق والإعدادات</h1>
              <p className="text-neutral-500 text-sm mt-1">
                إدارة سجلات التدقيق وإعدادات النظام المالي
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/finance/hub')}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة
            </Button>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-neutral-500 text-sm">سجل التدقيق</p>
            <p className="text-2xl font-bold mt-1">نشط</p>
            <p className="text-xs text-neutral-400">تتبع جميع العمليات</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-neutral-500 text-sm">حالة النظام</p>
            <p className="text-2xl font-bold mt-1 text-green-600">آمن</p>
            <p className="text-xs text-neutral-400">لا توجد مشاكل</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-neutral-500 text-sm">الإعدادات</p>
            <p className="text-2xl font-bold mt-1">مكتملة</p>
            <p className="text-xs text-neutral-400">جميع الإعدادات محددة</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-neutral-500 text-sm">آخر تحديث</p>
            <p className="text-lg font-bold mt-1">{currentDate}</p>
            <p className="text-xs text-neutral-400">التاريخ الحالي</p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="سجل التدقيق"
          value="نشط"
          subtitle="Audit Trail Active"
          icon={History}
          variant="coral"
        />
        <StatCard
          title="أمان النظام"
          value="محمي"
          subtitle="System Secured"
          icon={Lock}
          variant="success"
        />
        <StatCard
          title="المستخدمين النشطين"
          value="متصل"
          subtitle="Connected"
          icon={Users}
          variant="sky"
        />
        <StatCard
          title="الإعدادات"
          value="مكتملة"
          subtitle="Configured"
          icon={Settings}
          variant="violet"
        />
      </div>

      {/* Tab Navigation Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {TABS.map((tab) => (
          <Card
            key={tab.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-2",
              currentTab === tab.id 
                ? "border-rose-500 bg-rose-50/50 shadow-md" 
                : "border-transparent hover:border-slate-200"
            )}
            onClick={() => handleTabChange(tab.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center",
                  tab.variant === 'coral' ? 'bg-rose-100' : 'bg-slate-100'
                )}>
                  <tab.icon className={cn(
                    "w-7 h-7",
                    tab.variant === 'coral' ? 'text-rose-600' : 'text-slate-600'
                  )} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-lg text-neutral-900">{tab.label}</p>
                    {currentTab === tab.id && (
                      <Badge className="bg-rose-500 text-white">نشط</Badge>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">{tab.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Tabs Content */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <TabsList className="bg-white/80 backdrop-blur-sm p-1.5 rounded-xl shadow-sm">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:bg-rose-500 data-[state=active]:text-white rounded-lg px-6 py-2.5 gap-2 transition-all"
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </motion.div>

        {/* سجل التدقيق */}
        <TabsContent value="audit">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl shadow-sm overflow-hidden"
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <AuditTrailPage />
            </Suspense>
          </motion.div>
        </TabsContent>

        {/* الإعدادات */}
        <TabsContent value="settings">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl shadow-sm overflow-hidden"
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <FinanceSettings />
            </Suspense>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuditAndSettings;