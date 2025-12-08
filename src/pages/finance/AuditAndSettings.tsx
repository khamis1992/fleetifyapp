/**
 * صفحة التدقيق والإعدادات - تصميم جديد متوافق مع الداشبورد
 */
import { useState, Suspense, lazy, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
import {
  Shield,
  ArrowLeft,
  FileSearch,
  Cog,
  RefreshCw,
  Clock,
  Activity,
  Settings,
  History,
  Lock,
  Users,
  AlertTriangle,
  CheckCircle,
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
    gradient: "from-red-500 to-rose-500",
  },
  {
    id: "settings",
    label: "الإعدادات",
    icon: Cog,
    description: "إعدادات النظام المالي",
    gradient: "from-gray-600 to-slate-600",
  },
];

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  delay = 0,
}) => (
  <motion.div
    className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-gray-100"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <p className="text-sm text-neutral-500 mb-1">{title}</p>
    <p className="text-2xl font-bold text-neutral-900">{value}</p>
    {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
  </motion.div>
);

const AuditAndSettings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get("tab") || "audit";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Get current date for display
  const currentDate = new Date().toLocaleDateString('ar-QA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#f0efed] p-6" dir="rtl">
      {/* Hero Header */}
      <motion.div
        className="bg-gradient-to-r from-coral-500 to-orange-500 rounded-2xl p-6 mb-6 text-white shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">التدقيق والإعدادات</h1>
              <p className="text-white/80 text-sm mt-1">
                إدارة سجلات التدقيق وإعدادات النظام المالي
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/finance/hub')}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة
            </Button>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">سجل التدقيق</p>
            <p className="text-2xl font-bold mt-1">نشط</p>
            <p className="text-xs text-white/60">تتبع جميع العمليات</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">حالة النظام</p>
            <p className="text-2xl font-bold mt-1 text-green-200">آمن</p>
            <p className="text-xs text-white/60">لا توجد مشاكل</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">الإعدادات</p>
            <p className="text-2xl font-bold mt-1">مكتملة</p>
            <p className="text-xs text-white/60">جميع الإعدادات محددة</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">آخر تحديث</p>
            <p className="text-lg font-bold mt-1">{currentDate}</p>
            <p className="text-xs text-white/60">التاريخ الحالي</p>
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
          iconBg="bg-gradient-to-br from-red-500 to-rose-500"
          delay={0.1}
        />
        <StatCard
          title="أمان النظام"
          value="محمي"
          subtitle="System Secured"
          icon={Lock}
          iconBg="bg-gradient-to-br from-green-500 to-emerald-500"
          delay={0.15}
        />
        <StatCard
          title="المستخدمين النشطين"
          value="متصل"
          subtitle="Connected"
          icon={Users}
          iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
          delay={0.2}
        />
        <StatCard
          title="الإعدادات"
          value="مكتملة"
          subtitle="Configured"
          icon={Settings}
          iconBg="bg-gradient-to-br from-purple-500 to-indigo-500"
          delay={0.25}
        />
      </div>

      {/* Tab Navigation Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {TABS.map((tab, index) => (
          <Card
            key={tab.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg border-2",
              currentTab === tab.id 
                ? "border-coral-500 bg-coral-50/50 shadow-md" 
                : "border-transparent hover:border-gray-200"
            )}
            onClick={() => handleTabChange(tab.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br",
                  tab.gradient
                )}>
                  <tab.icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-lg text-neutral-900">{tab.label}</p>
                    {currentTab === tab.id && (
                      <Badge className="bg-coral-500 text-white">نشط</Badge>
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
                className="data-[state=active]:bg-coral-500 data-[state=active]:text-white rounded-lg px-6 py-2.5 gap-2 transition-all"
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
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
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
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
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
