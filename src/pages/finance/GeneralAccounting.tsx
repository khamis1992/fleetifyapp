/**
 * صفحة المحاسبة العامة الموحدة
 * تجمع: دليل الحسابات + دفتر الأستاذ + القيود اليومية
 */
import { useState, useEffect, Suspense, lazy } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
import {
  BookOpen,
  FileText,
  ListTree,
  Calculator,
  RefreshCw,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Lazy load the tab content components
const ChartOfAccounts = lazy(() => import("./ChartOfAccounts"));
const GeneralLedger = lazy(() => import("./GeneralLedger"));
const Ledger = lazy(() => import("./Ledger"));

// Tab configuration
const TABS = [
  {
    id: "chart",
    label: "دليل الحسابات",
    icon: ListTree,
    description: "شجرة الحسابات وإدارتها",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    id: "ledger",
    label: "دفتر الأستاذ",
    icon: BookOpen,
    description: "سجل الحركات المالية",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    id: "entries",
    label: "القيود اليومية",
    icon: FileText,
    description: "إدارة القيود المحاسبية",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
];

const GeneralAccounting = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get("tab") || "chart";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const activeTabConfig = TABS.find((t) => t.id === currentTab) || TABS[0];

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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Calculator className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                المحاسبة العامة
              </h1>
              <p className="text-neutral-500">
                إدارة الحسابات والقيود المحاسبية
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
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {TABS.map((tab, index) => (
          <Card
            key={tab.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              currentTab === tab.id && "ring-2 ring-indigo-500"
            )}
            onClick={() => handleTabChange(tab.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", tab.bgColor)}>
                  <tab.icon className={cn("w-5 h-5", tab.color)} />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">{tab.label}</p>
                  <p className="text-xs text-neutral-500">{tab.description}</p>
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
              className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white rounded-lg px-6 gap-2"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* دليل الحسابات */}
        <TabsContent value="chart">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <ChartOfAccounts />
            </Suspense>
          </motion.div>
        </TabsContent>

        {/* دفتر الأستاذ */}
        <TabsContent value="ledger">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <GeneralLedger />
            </Suspense>
          </motion.div>
        </TabsContent>

        {/* القيود اليومية */}
        <TabsContent value="entries">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <Ledger />
            </Suspense>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GeneralAccounting;
