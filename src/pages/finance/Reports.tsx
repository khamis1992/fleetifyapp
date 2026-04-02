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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  BarChart3,
  FileBarChart,
  Wallet,
  Scale,
  Receipt,
  Users,
  Building2,
  DollarSign,
  Table,
  ArrowLeft,
  Printer,
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
import { StatCard } from "@/components/ui/StatCard";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { toast } from "sonner";

// Tab Configuration
const TABS = [
  { id: "trial-balance", label: "ميزان المراجعة", icon: Scale },
  { id: "income-statement", label: "قائمة الدخل", icon: TrendingUp },
  { id: "balance-sheet", label: "المركز المالي", icon: BarChart3 },
  { id: "cash-flow", label: "التدفقات النقدية", icon: Wallet },
  { id: "payroll", label: "الرواتب", icon: Users },
  { id: "cost-centers", label: "مراكز التكلفة", icon: Building2 },
  { id: "receivables", label: "الذمم المدينة", icon: Receipt },
  { id: "payables", label: "الذمم الدائنة", icon: FileText },
];

// Export helpers
const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    toast.error("لا توجد بيانات للتصدير");
    return;
  }
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => row[h]).join(','))
  ].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success("تم تصدير الملف بنجاح");
};

const exportToPDF = (title: string) => {
  window.document.title = title;
  window.print();
  toast.success("استخدم Ctrl+P للطباعة");
};

const Reports = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const [activeTab, setActiveTab] = useState("trial-balance");

  const { data: balanceSheet } = useBalanceSheet();
  const { data: incomeStatement } = useIncomeStatement();

  const stats = useMemo(() => {
    return {
      totalAssets: (balanceSheet as any)?.totalAssets || 0,
      totalLiabilities: (balanceSheet as any)?.totalLiabilities || 0,
      totalEquity: (balanceSheet as any)?.totalEquity || 0,
      totalRevenue: (incomeStatement as any)?.totalRevenue || 0,
      totalExpenses: (incomeStatement as any)?.totalExpenses || 0,
      netIncome: (incomeStatement as any)?.netIncome || 0,
    };
  }, [balanceSheet, incomeStatement]);

  return (
    <div className="min-h-screen bg-[#f0efed] p-6" dir="rtl">
      {/* Hero Header */}
      <FinancePageHeader
        title="التقارير المالية"
        description="الميزانية العمومية وقائمة الدخل والتقارير التحليلية"
        icon={FileText}
        breadcrumbs={[{ label: "النظام المالي" }, { label: "التقارير" }]}
        actions={
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                >
                  <Download className="h-4 w-4 ml-2" />
                  تصدير الكل
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportToCSV([], 'financial-reports')}>
                  <Table className="h-4 w-4 ml-2" />
                  تصدير CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToPDF('التقارير المالية')}>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        }
      >
        {/* Quick Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      </FinancePageHeader>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="التقارير المتاحة"
          value={TABS.length}
          subtitle="نوع تقرير"
          icon={FileBarChart}
          variant="coral"
          delay={0.1}
        />
        <StatCard
          title="آخر تحديث"
          value="اليوم"
          subtitle={new Date().toLocaleDateString('en-US')}
          icon={Calendar}
          variant="sky"
          delay={0.15}
        />
        <StatCard
          title="إجمالي الأصول"
          value={formatCurrency(stats.totalAssets)}
          subtitle="Total Assets"
          icon={BarChart3}
          variant="success"
          delay={0.2}
        />
        <StatCard
          title="صافي الربح"
          value={formatCurrency(stats.netIncome)}
          subtitle="Net Income"
          icon={DollarSign}
          variant="violet"
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
                className="data-[state=active]:bg-rose-500 data-[state=active]:text-white rounded-lg px-3 py-2 text-sm gap-1.5 transition-all"
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {TABS.map((tab) => (
            <Card
              key={tab.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg border-2",
                activeTab === tab.id 
                  ? "border-slate-900 bg-slate-50 shadow-md" 
                  : "border-transparent hover:border-slate-200"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    activeTab === tab.id 
                      ? "bg-slate-900" 
                      : "bg-slate-100"
                  )}>
                    <tab.icon className={cn(
                      "w-5 h-5",
                      activeTab === tab.id ? "text-white" : "text-slate-600"
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-900">{tab.label}</p>
                    {activeTab === tab.id && (
                      <Badge className="bg-slate-900 text-white text-xs mt-1">نشط</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Tab Contents with Export Buttons */}
        <AnimatePresence mode="wait">
          <TabsContent value="trial-balance" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="p-4 border-b flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToCSV([], 'trial-balance')}>
                  <Table className="h-4 w-4 ml-2" />
                  تصدير CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF('ميزان المراجعة')}>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة PDF
                </Button>
              </div>
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
              <div className="p-4 border-b flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToCSV([], 'income-statement')}>
                  <Table className="h-4 w-4 ml-2" />
                  تصدير CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF('قائمة الدخل')}>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة PDF
                </Button>
              </div>
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
              <div className="p-4 border-b flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToCSV([], 'balance-sheet')}>
                  <Table className="h-4 w-4 ml-2" />
                  تصدير CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF('المركز المالي')}>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة PDF
                </Button>
              </div>
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
              <div className="p-4 border-b flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToCSV([], 'cash-flow')}>
                  <Table className="h-4 w-4 ml-2" />
                  تصدير CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF('التدفقات النقدية')}>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة PDF
                </Button>
              </div>
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
              <div className="p-4 border-b flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToCSV([], 'payroll')}>
                  <Table className="h-4 w-4 ml-2" />
                  تصدير CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF('تقرير الرواتب')}>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة PDF
                </Button>
              </div>
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
              <div className="p-4 border-b flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToCSV([], 'cost-centers')}>
                  <Table className="h-4 w-4 ml-2" />
                  تصدير CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF('مراكز التكلفة')}>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة PDF
                </Button>
              </div>
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
              <div className="p-4 border-b flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToCSV([], 'receivables')}>
                  <Table className="h-4 w-4 ml-2" />
                  تصدير CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF('الذمم المدينة')}>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة PDF
                </Button>
              </div>
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
              <div className="p-4 border-b flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToCSV([], 'payables')}>
                  <Table className="h-4 w-4 ml-2" />
                  تصدير CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF('الذمم الدائنة')}>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة PDF
                </Button>
              </div>
              <PayablesReport companyName="اسم الشركة" />
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
};

export default Reports;