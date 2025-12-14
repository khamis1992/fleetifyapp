/**
 * صفحة التقارير المالية - تصميم جديد متوافق مع الداشبورد
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  BarChart3,
  FileBarChart,
  Clock,
  Filter,
  PieChart,
  ArrowLeft,
  RefreshCw,
  Wallet,
  Scale,
  Receipt,
  Users,
  Building2,
  DollarSign,
} from "lucide-react";
import { CostCenterReports } from "@/components/finance/CostCenterReports";
import { PayablesReport } from "@/components/finance/PayablesReport";
import { ReceivablesReport } from "@/components/finance/ReceivablesReport";
import { PayrollReportsPanel } from "@/components/finance/PayrollReportsPanel";
import { TrialBalanceReport } from "@/components/finance/TrialBalanceReport";
import { IncomeStatementReport } from "@/components/finance/IncomeStatementReport";
import { BalanceSheetReport } from "@/components/finance/BalanceSheetReport";
import { CashFlowStatementReport } from "@/components/finance/CashFlowStatementReport";
import { useBalanceSheet, useIncomeStatement } from "@/hooks/useFinancialAnalysis";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { cn } from "@/lib/utils";

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

// Tab Configuration
const TABS = [
  { id: "trial-balance", label: "ميزان المراجعة", icon: Scale, gradient: "from-blue-500 to-cyan-500" },
  { id: "income-statement", label: "قائمة الدخل", icon: TrendingUp, gradient: "from-green-500 to-emerald-500" },
  { id: "balance-sheet", label: "المركز المالي", icon: BarChart3, gradient: "from-purple-500 to-indigo-500" },
  { id: "cash-flow", label: "التدفقات النقدية", icon: Wallet, gradient: "from-coral-500 to-orange-500" },
  { id: "payroll", label: "الرواتب", icon: Users, gradient: "from-pink-500 to-rose-500" },
  { id: "cost-centers", label: "مراكز التكلفة", icon: Building2, gradient: "from-amber-500 to-yellow-500" },
  { id: "receivables", label: "الذمم المدينة", icon: Receipt, gradient: "from-teal-500 to-cyan-500" },
  { id: "payables", label: "الذمم الدائنة", icon: FileText, gradient: "from-red-500 to-rose-500" },
];

const Reports = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const [activeTab, setActiveTab] = useState("trial-balance");

  // Fetch financial data for summary
  const { data: balanceSheet } = useBalanceSheet();
  const { data: incomeStatement } = useIncomeStatement();

  // Calculate quick stats
  const stats = useMemo(() => {
    return {
      totalAssets: balanceSheet?.totalAssets || 0,
      totalLiabilities: balanceSheet?.totalLiabilities || 0,
      totalEquity: balanceSheet?.totalEquity || 0,
      totalRevenue: incomeStatement?.totalRevenue || 0,
      totalExpenses: incomeStatement?.totalExpenses || 0,
      netIncome: incomeStatement?.netIncome || 0,
    };
  }, [balanceSheet, incomeStatement]);

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
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">التقارير المالية</h1>
              <p className="text-white/80 text-sm mt-1">
                الميزانية العمومية وقائمة الدخل والتقارير التحليلية
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            >
              <Download className="h-4 w-4 ml-2" />
              تصدير
            </Button>
            <Button
              onClick={() => navigate('/finance/reports-analysis')}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة
            </Button>
          </div>
        </div>

        {/* Quick Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">إجمالي الأصول</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalAssets)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">إجمالي الإيرادات</p>
            <p className="text-2xl font-bold mt-1 text-green-200">{formatCurrency(stats.totalRevenue)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">إجمالي المصروفات</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalExpenses)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">صافي الربح</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              stats.netIncome >= 0 ? 'text-green-200' : 'text-red-200'
            )}>
              {formatCurrency(stats.netIncome)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="التقارير المتاحة"
          value={TABS.length}
          subtitle="نوع تقرير"
          icon={FileBarChart}
          iconBg="bg-gradient-to-br from-coral-500 to-orange-500"
          delay={0.1}
        />
        <StatCard
          title="آخر تحديث"
          value="اليوم"
          subtitle={new Date().toLocaleDateString('en-US')}
          icon={Calendar}
          iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
          delay={0.15}
        />
        <StatCard
          title="إجمالي الأصول"
          value={formatCurrency(stats.totalAssets)}
          subtitle="Total Assets"
          icon={BarChart3}
          iconBg="bg-gradient-to-br from-green-500 to-emerald-500"
          delay={0.2}
        />
        <StatCard
          title="صافي الربح"
          value={formatCurrency(stats.netIncome)}
          subtitle="Net Income"
          icon={DollarSign}
          iconBg="bg-gradient-to-br from-purple-500 to-indigo-500"
          delay={0.25}
        />
      </div>

      {/* Financial Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <TabsList className="bg-white/80 backdrop-blur-sm p-1.5 rounded-xl shadow-sm w-full flex flex-wrap justify-start gap-1">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:bg-coral-500 data-[state=active]:text-white rounded-lg px-3 py-2 text-sm gap-1.5 transition-all"
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden md:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </motion.div>

        {/* Tab Content Cards */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {TABS.map((tab, index) => (
            <Card
              key={tab.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg border-2",
                activeTab === tab.id 
                  ? "border-coral-500 bg-coral-50/50 shadow-md" 
                  : "border-transparent hover:border-gray-200"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br",
                    tab.gradient
                  )}>
                    <tab.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-neutral-900">{tab.label}</p>
                    {activeTab === tab.id && (
                      <Badge className="bg-coral-500 text-white text-xs mt-1">نشط</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          <TabsContent value="trial-balance" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <TrialBalanceReport />
            </motion.div>
          </TabsContent>

          <TabsContent value="income-statement" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <IncomeStatementReport />
            </motion.div>
          </TabsContent>

          <TabsContent value="balance-sheet" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <BalanceSheetReport />
            </motion.div>
          </TabsContent>

          <TabsContent value="cash-flow" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <CashFlowStatementReport />
            </motion.div>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <PayrollReportsPanel />
            </motion.div>
          </TabsContent>

          <TabsContent value="cost-centers" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <CostCenterReports />
            </motion.div>
          </TabsContent>

          <TabsContent value="receivables" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <ReceivablesReport companyName="اسم الشركة" />
            </motion.div>
          </TabsContent>

          <TabsContent value="payables" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <PayablesReport companyName="اسم الشركة" />
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
};

export default Reports;
