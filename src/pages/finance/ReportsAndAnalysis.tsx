/**
 * صفحة التقارير والتحليل المالي الموحدة
 * تجمع: التقارير المالية + التحليل المالي + النسب المالية + الحاسبة
 */
import { useState, Suspense, lazy } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
import {
  BarChart3,
  TrendingUp,
  Percent,
  Calculator,
  ArrowLeft,
  FileText,
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Lazy load the tab content components
const Reports = lazy(() => import("./Reports"));
const FinancialAnalysis = lazy(() => import("./FinancialAnalysis"));
const FinancialRatios = lazy(() => import("./FinancialRatios"));
const FinancialCalculator = lazy(() => import("./Calculator"));

// Tab configuration
const TABS = [
  {
    id: "reports",
    label: "التقارير المالية",
    icon: FileText,
    description: "تقارير وتحليلات شاملة",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    id: "analysis",
    label: "التحليل المالي",
    icon: TrendingUp,
    description: "تحليل الأداء والاتجاهات",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    id: "ratios",
    label: "النسب المالية",
    icon: Percent,
    description: "تحليل النسب والمؤشرات",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
];

const ReportsAndAnalysis = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get("tab") || "reports";
  const [showCalculator, setShowCalculator] = useState(false);

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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                التقارير والتحليل المالي
              </h1>
              <p className="text-neutral-500">
                تقارير شاملة وتحليلات مالية متقدمة
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {/* Calculator Modal Button */}
            <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calculator className="w-4 h-4" />
                  الحاسبة المالية
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>الحاسبة المالية</DialogTitle>
                </DialogHeader>
                <Suspense fallback={<PageSkeletonFallback />}>
                  <FinancialCalculator />
                </Suspense>
              </DialogContent>
            </Dialog>
            
            <Button
              variant="outline"
              onClick={() => navigate("/finance/hub")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              العودة للمركز المالي
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {TABS.map((tab) => (
          <Card
            key={tab.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              currentTab === tab.id && "ring-2 ring-emerald-500"
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
              className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-lg px-6 gap-2"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* التقارير المالية */}
        <TabsContent value="reports">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <Reports />
            </Suspense>
          </motion.div>
        </TabsContent>

        {/* التحليل المالي */}
        <TabsContent value="analysis">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <FinancialAnalysis />
            </Suspense>
          </motion.div>
        </TabsContent>

        {/* النسب المالية */}
        <TabsContent value="ratios">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <FinancialRatios />
            </Suspense>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsAndAnalysis;
