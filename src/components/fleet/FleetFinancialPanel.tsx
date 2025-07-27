import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  PieChart,
  Calculator,
  CreditCard,
  Banknote,
  Target
} from "lucide-react"
import { useFleetAnalytics } from "@/hooks/useFleetAnalytics"
import { useVehicles } from "@/hooks/useVehicles"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export function FleetFinancialPanel() {
  const { data: analytics, isLoading: analyticsLoading } = useFleetAnalytics()
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles()

  // Calculate fleet values
  const totalFleetValue = vehicles?.reduce((sum, v) => sum + (v.purchase_cost || 0), 0) || 0
  const totalBookValue = vehicles?.reduce((sum, v) => sum + (v.book_value || v.purchase_cost || 0), 0) || 0
  const totalDepreciation = vehicles?.reduce((sum, v) => sum + (v.accumulated_depreciation || 0), 0) || 0
  const totalOperatingCosts = vehicles?.reduce((sum, v) => sum + (v.total_operating_cost || 0), 0) || 0

  // Calculate ROI
  const roi = totalFleetValue > 0 ? ((analytics?.totalRevenue || 0) / totalFleetValue) * 100 : 0

  // Calculate profitability
  const netProfit = (analytics?.totalRevenue || 0) - totalOperatingCosts - (analytics?.totalMaintenanceCost || 0)
  const profitMargin = analytics?.totalRevenue ? (netProfit / analytics.totalRevenue) * 100 : 0

  if (analyticsLoading || vehiclesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Financial Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">التحليل المالي للأسطول</h2>
          <p className="text-muted-foreground">
            تحليل شامل للأداء المالي والربحية
          </p>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيمة الأسطول</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalFleetValue.toFixed(3)} د.ك
            </div>
            <p className="text-xs text-muted-foreground">
              التكلفة الأصلية
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القيمة الدفترية</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalBookValue.toFixed(3)} د.ك
            </div>
            <p className="text-xs text-muted-foreground">
              بعد الاستهلاك
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics?.totalRevenue?.toFixed(3) || '0.000'} د.ك
            </div>
            <p className="text-xs text-muted-foreground">
              من العقود
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netProfit.toFixed(3)} د.ك
            </div>
            <p className="text-xs text-muted-foreground">
              هامش الربح: {profitMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Analysis Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">الأداء المالي</TabsTrigger>
          <TabsTrigger value="costs">التكاليف</TabsTrigger>
          <TabsTrigger value="depreciation">الاستهلاك</TabsTrigger>
          <TabsTrigger value="roi">العائد على الاستثمار</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  تحليل الإيرادات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">الإيرادات الإجمالية</span>
                  <Badge variant="secondary">
                    {analytics?.totalRevenue?.toFixed(3) || '0.000'} د.ك
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">الإيرادات الشهرية</span>
                  <Badge variant="secondary">
                    {analytics?.monthlyRevenue?.toFixed(3) || '0.000'} د.ك
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">متوسط السعر اليومي</span>
                  <Badge variant="secondary">
                    {analytics?.averageDailyRate?.toFixed(3) || '0.000'} د.ك
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">العقود النشطة</span>
                  <Badge variant="secondary">
                    {analytics?.activeContracts || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  مؤشرات الربحية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">هامش الربح</span>
                    <span className={`text-sm font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitMargin.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.abs(profitMargin)} 
                    className={`h-2 ${profitMargin >= 0 ? '' : 'bg-red-100'}`}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">العائد على الاستثمار</span>
                    <span className={`text-sm font-bold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {roi.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={Math.min(Math.abs(roi), 100)} className="h-2" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">معدل الاستخدام</span>
                  <Badge variant="outline">
                    {analytics?.averageUtilization?.toFixed(1) || '0.0'}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  تحليل التكاليف
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">تكاليف الصيانة الإجمالية</span>
                  <Badge variant="destructive">
                    {analytics?.totalMaintenanceCost?.toFixed(3) || '0.000'} د.ك
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">تكاليف الصيانة الشهرية</span>
                  <Badge variant="destructive">
                    {analytics?.monthlyMaintenanceCost?.toFixed(3) || '0.000'} د.ك
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">التكاليف التشغيلية</span>
                  <Badge variant="outline">
                    {totalOperatingCosts.toFixed(3)} د.ك
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  توزيع التكاليف
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>الصيانة</span>
                      <span>{((analytics?.totalMaintenanceCost || 0) / (totalOperatingCosts + (analytics?.totalMaintenanceCost || 0)) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={(analytics?.totalMaintenanceCost || 0) / (totalOperatingCosts + (analytics?.totalMaintenanceCost || 0)) * 100} 
                      className="h-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>التشغيل</span>
                      <span>{(totalOperatingCosts / (totalOperatingCosts + (analytics?.totalMaintenanceCost || 0)) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={totalOperatingCosts / (totalOperatingCosts + (analytics?.totalMaintenanceCost || 0)) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="depreciation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  تحليل الاستهلاك
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">الاستهلاك المتراكم</span>
                  <Badge variant="secondary">
                    {totalDepreciation.toFixed(3)} د.ك
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">نسبة الاستهلاك</span>
                  <Badge variant="outline">
                    {totalFleetValue > 0 ? ((totalDepreciation / totalFleetValue) * 100).toFixed(1) : '0.0'}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">القيمة المتبقية</span>
                  <Badge variant="default">
                    {(totalFleetValue - totalDepreciation).toFixed(3)} د.ك
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>تطور القيمة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>القيمة الأصلية</span>
                      <span>{totalFleetValue.toFixed(3)} د.ك</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>القيمة الحالية</span>
                      <span>{totalBookValue.toFixed(3)} د.ك</span>
                    </div>
                    <Progress 
                      value={totalFleetValue > 0 ? (totalBookValue / totalFleetValue) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roi" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  العائد على الاستثمار
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold text-primary">
                    {roi.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    العائد السنوي على الاستثمار
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>الاستثمار الأولي</span>
                    <span>{totalFleetValue.toFixed(3)} د.ك</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>إجمالي الإيرادات</span>
                    <span>{analytics?.totalRevenue?.toFixed(3) || '0.000'} د.ك</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span>صافي العائد</span>
                    <span className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {netProfit.toFixed(3)} د.ك
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>تحليل الأداء</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">كفاءة الاستخدام</span>
                    <Badge variant={analytics && analytics.averageUtilization > 70 ? "default" : "secondary"}>
                      {analytics?.averageUtilization?.toFixed(1) || '0.0'}%
                    </Badge>
                  </div>
                  <Progress value={analytics?.averageUtilization || 0} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">الربحية</span>
                    <Badge variant={profitMargin > 15 ? "default" : profitMargin > 5 ? "secondary" : "destructive"}>
                      {profitMargin.toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={Math.abs(profitMargin)} className="h-2" />
                </div>
                <div className="text-xs text-muted-foreground text-center mt-4">
                  {roi > 15 && "أداء ممتاز - استثمار مربح جداً"}
                  {roi > 10 && roi <= 15 && "أداء جيد - عائد مقبول على الاستثمار"}
                  {roi > 5 && roi <= 10 && "أداء متوسط - يحتاج لتحسين"}
                  {roi <= 5 && "أداء ضعيف - يحتاج لمراجعة الاستراتيجية"}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}