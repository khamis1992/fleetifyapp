import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Car,
  Wrench,
  Calculator,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  Info,
  AlertCircle,
  CheckCircle2,
  Download,
  Printer,
  Calendar,
  Activity,
  PiggyBank,
  BarChart3,
  PieChart,
  BarChart2,
  AreaChart,
  LayoutGrid,
  Receipt,
  FileText,
  Eye,
} from "lucide-react";
import {
  useFleetFinancialOverview,
  useMaintenanceFinancialData,
  useFleetFinancialSummary,
  useProcessVehicleDepreciation,
  useUpdateVehicleCosts,
  useValidateDepreciationData,
} from "@/hooks/useFleetFinancialAnalytics";
import { toast } from "sonner";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import {
  LineChart,
  Line,
  AreaChart as RechartsAreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const FleetFinancialAnalysisNew = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [dateFrom, setDateFrom] = useState("2024-01-01");
  const [dateTo, setDateTo] = useState("2024-12-31");
  const [period, setPeriod] = useState("monthly");

  const { data: financialOverview, isLoading: overviewLoading } =
    useFleetFinancialOverview();
  const { data: maintenanceData, isLoading: maintenanceLoading } =
    useMaintenanceFinancialData();
  const { data: summary, isLoading: summaryLoading } =
    useFleetFinancialSummary();
  const { data: validationData, isLoading: isValidationLoading } =
    useValidateDepreciationData();

  const processDepreciation = useProcessVehicleDepreciation();
  const updateVehicleCosts = useUpdateVehicleCosts();
  const { formatCurrency } = useCurrencyFormatter();

  // Calculate all vehicle costs mutation
  const calculateAllCostsMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Company ID not found");

      const { data, error } = await supabase.rpc("calculate_all_vehicle_costs", {
        company_id_param: companyId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const successCount = data?.filter((r: any) => r.status === "success").length || 0;
      toast.success(`تم حساب التكاليف لـ ${successCount} مركبة بنجاح`);
      queryClient.invalidateQueries({ queryKey: ["fleet-financial-overview"] });
      queryClient.invalidateQueries({ queryKey: ["fleet-financial-summary"] });
    },
    onError: (error: any) => {
      toast.error(`فشل في حساب التكاليف: ${error.message}`);
    },
  });

  const handleProcessDepreciation = async () => {
    try {
      const result = await processDepreciation.mutateAsync(
        new Date().toISOString().split("T")[0]
      );
      toast.success(`تم معالجة الاستهلاك لـ ${result.length} مركبة`, {
        description: "تم تحديث قيم الاستهلاك بنجاح",
      });
    } catch (error: any) {
      console.error("خطأ في معالجة الاستهلاك:", error);
      toast.error("فشل في معالجة الاستهلاك", {
        description: error.message || "حدث خطأ غير متوقع",
      });
    }
  };

  const handleDiagnostics = () => {
    setShowDiagnostics(!showDiagnostics);
  };

  const handleUpdateCosts = async (vehicleId: string) => {
    try {
      await updateVehicleCosts.mutateAsync(vehicleId);
      toast.success("تم تحديث تكاليف المركبة بنجاح");
    } catch (error) {
      toast.error("فشل في تحديث تكاليف المركبة");
    }
  };

  // Mock data for charts
  const lineChartData = [
    { month: "يناير", revenue: 65000, expenses: 42000, profit: 23000 },
    { month: "فبراير", revenue: 72000, expenses: 45000, profit: 27000 },
    { month: "مارس", revenue: 78000, expenses: 48000, profit: 30000 },
    { month: "أبريل", revenue: 82000, expenses: 51000, profit: 31000 },
    { month: "مايو", revenue: 88000, expenses: 49000, profit: 39000 },
    { month: "يونيو", revenue: 95000, expenses: 52000, profit: 43000 },
    { month: "يوليو", revenue: 102000, expenses: 55000, profit: 47000 },
    { month: "أغسطس", revenue: 98000, expenses: 53000, profit: 45000 },
    { month: "سبتمبر", revenue: 105000, expenses: 56000, profit: 49000 },
    { month: "أكتوبر", revenue: 112000, expenses: 58000, profit: 54000 },
    { month: "نوفمبر", revenue: 118000, expenses: 60000, profit: 58000 },
    { month: "ديسمبر", revenue: 125000, expenses: 62000, profit: 63000 },
  ];

  const pieChartData = [
    { name: "صيانة", value: 42, color: "hsl(var(--primary))" },
    { name: "وقود", value: 28, color: "hsl(var(--warning))" },
    { name: "تأمين", value: 18, color: "hsl(142 56% 42%)" },
    { name: "تشغيل أخرى", value: 12, color: "hsl(var(--muted-foreground))" },
  ];

  const barChartData = [
    { vehicle: "ABC123", profit: 85000 },
    { vehicle: "XYZ789", profit: 72000 },
    { vehicle: "DEF456", profit: 58000 },
    { vehicle: "GHI101", profit: 45000 },
    { vehicle: "JKL202", profit: 38000 },
    { vehicle: "MNO303", profit: 32000 },
    { vehicle: "PQR404", profit: 28000 },
    { vehicle: "STU505", profit: 24000 },
    { vehicle: "VWX606", profit: 19000 },
    { vehicle: "YZA707", profit: 15000 },
  ];

  const areaChartData = [
    { period: "Q1-يناير", roi: 28.5 },
    { period: "Q1-فبراير", roi: 30.2 },
    { period: "Q1-مارس", roi: 32.8 },
    { period: "Q2-أبريل", roi: 35.1 },
    { period: "Q2-مايو", roi: 36.9 },
    { period: "Q2-يونيو", roi: 38.2 },
    { period: "Q3-يوليو", roi: 39.5 },
    { period: "Q3-أغسطس", roi: 38.7 },
    { period: "Q3-سبتمبر", roi: 40.1 },
    { period: "Q4-أكتوبر", roi: 41.3 },
    { period: "Q4-نوفمبر", roi: 42.0 },
    { period: "Q4-ديسمبر", roi: 38.7 },
  ];

  if (overviewLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        جارٍ تحميل البيانات المالية...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header Section */}
      <div className="animate-slide-up">
        <div className="mb-4">
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <TrendingUp className="w-10 h-10 text-primary" />
            التحليل المالي للأسطول
          </h1>
          <p className="text-muted-foreground text-lg">
            نظرة شاملة على الأوضاع المالية لعمليات أسطولك
          </p>
        </div>

        {/* Filters and Actions Row */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Date Filters */}
          <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-4 py-2 shadow-card">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">من:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border-0 text-sm focus:ring-0 p-0 w-auto"
            />
            <span className="text-sm text-muted-foreground">إلى:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border-0 text-sm focus:ring-0 p-0 w-auto"
            />
          </div>

          {/* Period Filter */}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">📊 عرض شهري</SelectItem>
              <SelectItem value="quarterly">📊 عرض ربع سنوي</SelectItem>
              <SelectItem value="yearly">📊 عرض سنوي</SelectItem>
              <SelectItem value="custom">📊 مخصص</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1"></div>

          {/* Action Buttons */}
          <Button
            onClick={handleDiagnostics}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            فحص البيانات
          </Button>

          <Button
            onClick={() => calculateAllCostsMutation.mutate()}
            disabled={calculateAllCostsMutation.isPending}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90"
          >
            {calculateAllCostsMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4" />
            )}
            {calculateAllCostsMutation.isPending
              ? "جاري الحساب..."
              : "حساب جميع التكاليف"}
          </Button>

          <Button
            onClick={handleProcessDepreciation}
            disabled={
              processDepreciation.isPending || !validationData?.hasActiveVehicles
            }
            variant="outline"
          >
            {processDepreciation.isPending ? (
              <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <TrendingDown className="w-4 h-4 ml-2" />
            )}
            {processDepreciation.isPending ? "جاري المعالجة..." : "معالجة الاستهلاك"}
          </Button>

          <Button variant="outline" className="flex items-center gap-2 bg-success text-white hover:bg-success/90">
            <Download className="w-4 h-4" />
            تصدير Excel
          </Button>

          <Button variant="outline" className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            طباعة PDF
          </Button>

          <Button variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Alert Section */}
      <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
        {/* Data Not Calculated Alert */}
        {summary &&
          summary.totalMaintenanceCost === 0 &&
          summary.totalOperatingCost === 0 &&
          summary.totalBookValue === 0 && (
            <Alert className="bg-blue-50 border-l-4 border-primary mb-3">
              <AlertCircle className="h-5 w-5 text-primary" />
              <AlertDescription className="text-foreground">
                <div className="space-y-2">
                  <p className="font-semibold">📊 البيانات المالية غير محسوبة بعد</p>
                  <p className="text-sm">
                    لعرض الأرقام الصحيحة، انقر على زر{" "}
                    <strong>"حساب جميع التكاليف"</strong> أعلاه. سيتم حساب التكاليف
                    من سجلات الصيانة والعقود والتأمين.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

        {/* Diagnostics Results */}
        {showDiagnostics && validationData && (
          <Alert className="border border-border">
            <Info className="h-5 w-5 text-muted-foreground" />
            <AlertDescription>
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">نتائج فحص البيانات:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    {validationData.hasActiveVehicles ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm">
                      المركبات النشطة: {validationData.vehicleCount}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {validationData.vehiclesWithoutDepreciationRate === 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-warning" />
                    )}
                    <span className="text-sm">
                      بدون معدل استهلاك:{" "}
                      {validationData.vehiclesWithoutDepreciationRate}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {validationData.vehiclesWithoutPurchaseCost === 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-warning" />
                    )}
                    <span className="text-sm">
                      بدون سعر شراء: {validationData.vehiclesWithoutPurchaseCost}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {validationData.hasActiveVehicles &&
                    validationData.vehiclesWithoutDepreciationRate === 0 &&
                    validationData.vehiclesWithoutPurchaseCost === 0 ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm text-success font-medium">
                          ✓ جاهز للمعالجة
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-warning" />
                        <span className="text-sm text-warning font-medium">
                          يحتاج مراجعة
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Total Fleet Value */}
        <Card className="card-hover animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي قيمة الأسطول
            </CardTitle>
            <div className="bg-primary/10 p-2 rounded-lg">
              <Car className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground mb-2">
              {formatCurrency(summary?.totalBookValue || 0)}
            </div>
            <div className="h-1 bg-muted rounded-full mb-3">
              <div className="h-1 bg-primary rounded-full" style={{ width: "85%" }} />
            </div>
            <p className="text-sm text-muted-foreground">
              القيمة الدفترية بعد الاستهلاك
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.vehicleCount || 0} مركبة نشطة
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total Revenue */}
        <Card
          className="card-hover animate-slide-up"
          style={{ animationDelay: "0.15s" }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي الإيرادات
            </CardTitle>
            <div className="bg-success/10 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground mb-2">
              {formatCurrency(summary?.totalRevenue || 0)}
            </div>
            <div className="h-1 bg-muted rounded-full mb-3">
              <div className="h-1 bg-success rounded-full" style={{ width: "78%" }} />
            </div>
            <div className="flex items-center gap-2 text-sm text-success font-medium">
              <TrendingUp className="w-4 h-4" />
              <span>+15.2% شهرياً</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              من {summary?.vehicleCount || 0} عقد نشط
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Operating Costs */}
        <Card
          className="card-hover animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              تكاليف التشغيل
            </CardTitle>
            <div className="bg-warning/10 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground mb-2">
              {formatCurrency(summary?.totalOperatingCost || 0)}
            </div>
            <div className="h-1 bg-muted rounded-full mb-3">
              <div className="h-1 bg-warning rounded-full" style={{ width: "43%" }} />
            </div>
            <div className="flex items-center gap-2 text-sm text-destructive font-medium">
              <TrendingDown className="w-4 h-4" />
              <span>-8.3% شهرياً</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              متوسط: {formatCurrency(summary?.averageOperatingCost || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Maintenance Costs */}
        <Card
          className="card-hover animate-slide-up"
          style={{ animationDelay: "0.25s" }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              تكاليف الصيانة
            </CardTitle>
            <div className="bg-purple-500/10 p-2 rounded-lg">
              <Wrench className="w-5 h-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground mb-2">
              {formatCurrency(summary?.totalMaintenanceCost || 0)}
            </div>
            <div className="h-1 bg-muted rounded-full mb-3">
              <div
                className="h-1 bg-purple-600 rounded-full"
                style={{ width: "18%" }}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-success font-medium">
              <TrendingUp className="w-4 h-4" />
              <span>+5.7% شهرياً</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">85 عملية صيانة</p>
          </CardContent>
        </Card>

        {/* Card 5: Accumulated Depreciation */}
        <Card
          className="card-hover animate-slide-up"
          style={{ animationDelay: "0.3s" }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              الاستهلاك المتراكم
            </CardTitle>
            <div className="bg-destructive/10 p-2 rounded-lg">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground mb-2">
              {formatCurrency(summary?.totalAccumulatedDepreciation || 0)}
            </div>
            <div className="h-1 bg-muted rounded-full mb-3">
              <div
                className="h-1 bg-destructive rounded-full"
                style={{ width: "31%" }}
              />
            </div>
            <p className="text-sm text-muted-foreground">المتراكم السنوي</p>
            <p className="text-xs text-muted-foreground mt-1">معدل: 12.7%</p>
          </CardContent>
        </Card>

        {/* Card 6: Net Profit */}
        <Card
          className="card-hover animate-slide-up"
          style={{ animationDelay: "0.35s" }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              صافي الربح
            </CardTitle>
            <div className="bg-success/10 p-2 rounded-lg">
              <PiggyBank className="w-5 h-5 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success mb-2">
              {formatCurrency(summary?.netProfit || 0)}
            </div>
            <div className="h-1 bg-muted rounded-full mb-3">
              <div className="h-1 bg-success rounded-full" style={{ width: `${Math.min((summary?.profitMargin || 0), 100)}%` }} />
            </div>
            <div className="flex items-center gap-2 text-sm text-success font-medium">
              <TrendingUp className="w-4 h-4" />
              <span>+{(summary?.profitMargin || 0).toFixed(1)}% ROI</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">هامش الربح: {(summary?.profitMargin || 0).toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Dashboard Section */}
      <div className="mb-8 animate-slide-up" style={{ animationDelay: "0.4s" }}>
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primary" />
          لوحة الرسوم البيانية
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Revenue & Expenses Line Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              تطور الإيرادات والمصروفات (شهري)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(142 56% 42%)"
                  strokeWidth={3}
                  name="الإيرادات"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="hsl(0 65% 51%)"
                  strokeWidth={3}
                  name="المصروفات"
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  name="صافي الربح"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Chart 2: Cost Distribution Pie Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-600" />
              توزيع التكاليف التشغيلية
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </Card>

          {/* Chart 3: Vehicle Profitability Bar Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-success" />
              مقارنة الربحية (أعلى 10 مركبات)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="vehicle" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="profit" fill="hsl(142 56% 42%)" radius={[8, 8, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </Card>

          {/* Chart 4: ROI Area Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <AreaChart className="w-5 h-5 text-warning" />
              تحليل ROI عبر الزمن
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsAreaChart data={areaChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="roi"
                  stroke="hsl(25 85% 55%)"
                  fill="hsl(25 85% 55% / 0.3)"
                  strokeWidth={3}
                />
              </RechartsAreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>

      {/* Detailed Analysis Tabs Section */}
      <Card className="animate-slide-up" style={{ animationDelay: "0.5s" }}>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" />
            التحليل التفصيلي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                نظرة عامة
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                الصيانة
              </TabsTrigger>
              <TabsTrigger value="profitability" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                الربحية
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                المعاملات
              </TabsTrigger>
              <TabsTrigger value="revenue" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                الإيرادات
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview */}
            <TabsContent value="overview" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  النظرة المالية العامة للمركبات
                </h3>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="بحث..." className="pr-9" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="available">متاحة</SelectItem>
                      <SelectItem value="rented">مؤجرة</SelectItem>
                      <SelectItem value="maintenance">قيد الصيانة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                {financialOverview?.slice(0, 3).map((vehicle) => (
                  <div
                    key={vehicle.vehicle_id}
                    className="border border-border rounded-lg p-4 hover:bg-accent/50 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <Car className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground text-lg">
                            {vehicle.vehicle_number}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            القيمة الدفترية: {formatCurrency(vehicle.book_value)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            vehicle.vehicle_status === "available"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {vehicle.vehicle_status === "available"
                            ? "✅ متاحة"
                            : vehicle.vehicle_status === "rented"
                            ? "🔴 مؤجرة"
                            : "🔧 قيد الصيانة"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateCosts(vehicle.vehicle_id);
                          }}
                        >
                          <RefreshCw className="w-4 h-4 ml-1" />
                          تحديث
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          القيمة الدفترية
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(vehicle.book_value)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          الإيرادات
                        </p>
                        <p className="text-sm font-semibold text-success">
                          {formatCurrency(vehicle.revenue_generated)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">التشغيل</p>
                        <p className="text-sm font-semibold text-warning">
                          {formatCurrency(vehicle.total_operating_cost)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">الصيانة</p>
                        <p className="text-sm font-semibold text-purple-600">
                          {formatCurrency(vehicle.total_maintenance_cost)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">الربح</p>
                        <p className="text-sm font-semibold text-success">
                          {formatCurrency(vehicle.net_profit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">ROI</p>
                        <p
                          className={`text-sm font-semibold flex items-center gap-1 ${
                            vehicle.roi_percentage >= 0
                              ? "text-success"
                              : "text-destructive"
                          }`}
                        >
                          {vehicle.roi_percentage >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {vehicle.roi_percentage >= 0 ? "+" : ""}
                          {vehicle.roi_percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab 2: Maintenance */}
            <TabsContent value="maintenance" className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                التكامل المالي للصيانة
              </h3>
              <p className="text-muted-foreground">
                سجلات الصيانة وحالة التكامل المحاسبي
              </p>
              {maintenanceLoading ? (
                <div>جارٍ تحميل بيانات الصيانة...</div>
              ) : (
                <div className="space-y-3">
                  {maintenanceData?.slice(0, 5).map((maintenance) => (
                    <div
                      key={maintenance.maintenance_id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Wrench className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium">
                            {maintenance.maintenance_number}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {maintenance.vehicle_number} - {maintenance.maintenance_type}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <div className="font-medium">
                            {formatCurrency(maintenance.actual_cost)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(maintenance.completed_date).toLocaleDateString(
                              "ar-SA"
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          {maintenance.journal_entry_id ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-warning" />
                          )}
                        </div>
                        <Badge
                          variant={
                            maintenance.journal_entry_id ? "default" : "destructive"
                          }
                        >
                          {maintenance.journal_entry_id ? "مدمج" : "في الانتظار"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab 3: Profitability */}
            <TabsContent value="profitability" className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                تحليل ربحية المركبات
              </h3>
              <p className="text-muted-foreground">
                مؤشرات العائد على الاستثمار والربحية لكل مركبة
              </p>
              <div className="space-y-4">
                {financialOverview?.slice(0, 5).map((vehicle) => (
                  <div
                    key={vehicle.vehicle_id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Car className="h-6 w-6 text-primary" />
                      <div>
                        <h3 className="font-semibold">{vehicle.vehicle_number}</h3>
                        <p className="text-sm text-muted-foreground">
                          سعر الشراء: {formatCurrency(vehicle.purchase_price)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="font-medium">
                          {formatCurrency(vehicle.net_profit)}
                        </div>
                        <div className="text-sm text-muted-foreground">صافي الربح</div>
                      </div>
                      <div className="text-center">
                        <div
                          className={`font-medium ${
                            vehicle.roi_percentage >= 0
                              ? "text-success"
                              : "text-destructive"
                          }`}
                        >
                          {vehicle.roi_percentage.toFixed(2)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          العائد على الاستثمار
                        </div>
                      </div>
                      <div className="flex items-center">
                        {vehicle.roi_percentage >= 0 ? (
                          <TrendingUp className="h-5 w-5 text-success" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab 4: Transactions */}
            <TabsContent value="transactions" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  سجل المعاملات المالية
                </h3>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="بحث..." className="pr-9" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الأنواع</SelectItem>
                      <SelectItem value="revenue">إيرادات</SelectItem>
                      <SelectItem value="expenses">مصروفات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                        التاريخ
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                        النوع
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                        المركبة
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                        الطرف
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                        المبلغ
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                        الحالة
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                        الإجراء
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-accent/50 transition">
                      <td className="px-4 py-3 text-sm">2024-01-15</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-sm text-success">
                          <DollarSign className="w-4 h-4" />
                          إيراد تأجير
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">ABC-123</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        محمد أحمد
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-success">
                        +{formatCurrency(8500)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge>✅ مكتمل</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      💰 إجمالي الإيرادات
                    </p>
                    <p className="text-lg font-bold text-success">{formatCurrency(summary?.totalRevenue || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      💸 إجمالي المصروفات
                    </p>
                    <p className="text-lg font-bold text-destructive">{formatCurrency((summary?.totalOperatingCost || 0) + (summary?.totalMaintenanceCost || 0))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">💵 صافي الربح</p>
                    <p className="text-lg font-bold text-success">{formatCurrency(summary?.netProfit || 0)}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 5: Revenue */}
            <TabsContent value="revenue" className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                تحليل الإيرادات
              </h3>
              <p className="text-muted-foreground">
                تحليل تفصيلي لمصادر الإيرادات والعقود
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FleetFinancialAnalysisNew;

