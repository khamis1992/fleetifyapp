/**
 * صفحة التدقيق والإعدادات الموحدة
 * تجمع: سجل التدقيق + الإعدادات المالية
 */
import { useState, Suspense, lazy } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
import {
  Settings,
  Shield,
  ArrowLeft,
  FileSearch,
  Cog,
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
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  {
    id: "settings",
    label: "الإعدادات",
    icon: Cog,
    description: "إعدادات النظام المالي",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
];

const AuditAndSettings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get("tab") || "audit";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="min-h-screen bg-[#f0efed] p-6" dir="rtl">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                التدقيق والإعدادات
              </h1>
              <p className="text-neutral-500">
                إدارة سجلات التدقيق وإعدادات النظام
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/finance/hub")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            العودة للمركز المالي
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {TABS.map((tab) => (
          <Card
            key={tab.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              currentTab === tab.id && "ring-2 ring-gray-500"
            )}
            onClick={() => handleTabChange(tab.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", tab.bgColor)}>
                  <tab.icon className={cn("w-6 h-6", tab.color)} />
                </div>
                <div>
                  <p className="font-semibold text-lg text-neutral-900">{tab.label}</p>
                  <p className="text-sm text-neutral-500">{tab.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Tabs Content */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-white/80 backdrop-blur-sm p-1 rounded-xl shadow-sm">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white rounded-lg px-6 gap-2"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* سجل التدقيق */}
        <TabsContent value="audit">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <AuditTrailPage />
            </Suspense>
          </motion.div>
        </TabsContent>

        {/* الإعدادات */}
        <TabsContent value="settings">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
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
