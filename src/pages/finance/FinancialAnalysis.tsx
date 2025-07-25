import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PieChart, TrendingUp, BarChart3, Calculator, DollarSign, Percent } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

const FinancialAnalysis = () => {
  const ratios = [
    {
      category: "نسب السيولة",
      ratios: [
        { name: "نسبة التداول", value: "0.00", description: "الأصول المتداولة / الخصوم المتداولة" },
        { name: "النسبة السريعة", value: "0.00", description: "الأصول السريعة / الخصوم المتداولة" },
        { name: "النسبة النقدية", value: "0.00", description: "النقد / الخصوم المتداولة" }
      ]
    },
    {
      category: "نسب الربحية",
      ratios: [
        { name: "هامش الربح الإجمالي", value: "0.00%", description: "الربح الإجمالي / المبيعات" },
        { name: "هامش الربح الصافي", value: "0.00%", description: "الربح الصافي / المبيعات" },
        { name: "العائد على الأصول", value: "0.00%", description: "الربح الصافي / إجمالي الأصول" }
      ]
    },
    {
      category: "نسب النشاط",
      ratios: [
        { name: "معدل دوران المخزون", value: "0.00", description: "تكلفة البضاعة المباعة / متوسط المخزون" },
        { name: "معدل دوران الحسابات المدينة", value: "0.00", description: "المبيعات الآجلة / متوسط الحسابات المدينة" },
        { name: "معدل دوران الأصول", value: "0.00", description: "المبيعات / متوسط الأصول" }
      ]
    }
  ]

  const trends = [
    { metric: "الإيرادات", current: "0.000", previous: "0.000", change: 0, trend: "stable" },
    { metric: "المصروفات", current: "0.000", previous: "0.000", change: 0, trend: "stable" },
    { metric: "الربح الصافي", current: "0.000", previous: "0.000", change: 0, trend: "stable" },
    { metric: "التدفق النقدي", current: "0.000", previous: "0.000", change: 0, trend: "stable" }
  ]

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
      default: return <TrendingUp className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/finance">النظام المالي</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>التحليل المالي</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl text-white">
            <PieChart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">التحليل المالي</h1>
            <p className="text-muted-foreground">تحليل الأداء المالي والمؤشرات والنسب</p>
          </div>
        </div>
        <Button disabled>
          تحديث التحليل
        </Button>
      </div>

      {/* Analysis Tabs */}
      <Tabs defaultValue="ratios" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ratios">النسب المالية</TabsTrigger>
          <TabsTrigger value="trends">الاتجاهات</TabsTrigger>
          <TabsTrigger value="performance">الأداء</TabsTrigger>
          <TabsTrigger value="forecast">التنبؤات</TabsTrigger>
        </TabsList>

        <TabsContent value="ratios" className="space-y-6">
          <div className="grid gap-6">
            {ratios.map((category, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    {category.category}
                  </CardTitle>
                  <CardDescription>
                    مؤشرات الأداء المالي في فئة {category.category}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {category.ratios.map((ratio, ratioIndex) => (
                      <div key={ratioIndex} className="p-4 border rounded-lg">
                        <div className="font-semibold text-sm mb-1">{ratio.name}</div>
                        <div className="text-2xl font-bold text-primary mb-2">{ratio.value}</div>
                        <div className="text-xs text-muted-foreground">{ratio.description}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                اتجاهات الأداء المالي
              </CardTitle>
              <CardDescription>
                مقارنة الأداء الحالي مع الفترات السابقة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {trends.map((trend, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{trend.metric}</span>
                      {getTrendIcon(trend.trend)}
                    </div>
                    <div className="text-lg font-bold">{trend.current} د.ك</div>
                    <div className="text-xs text-muted-foreground">
                      السابق: {trend.previous} د.ك
                    </div>
                    <div className={`text-xs mt-1 ${
                      trend.change > 0 ? 'text-green-600' : 
                      trend.change < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {trend.change === 0 ? 'لا تغيير' : 
                       trend.change > 0 ? `+${trend.change}%` : `${trend.change}%`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                تحليل الأداء
              </CardTitle>
              <CardDescription>
                مؤشرات الأداء الرئيسية والمقارنات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">الأداء المالي</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">إجمالي الإيرادات</span>
                      <span className="font-bold">0.000 د.ك</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">إجمالي المصروفات</span>
                      <span className="font-bold">0.000 د.ك</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">الربح الصافي</span>
                      <span className="font-bold text-green-600">0.000 د.ك</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold">المؤشرات الرئيسية</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">هامش الربح</span>
                      <span className="font-bold">0.00%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">معدل النمو</span>
                      <span className="font-bold">0.00%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">العائد على الاستثمار</span>
                      <span className="font-bold">0.00%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                التنبؤات المالية
              </CardTitle>
              <CardDescription>
                توقعات الأداء المالي للفترات القادمة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-primary/10 rounded-full">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">التنبؤات المالية</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  سيتم إضافة نماذج التنبؤ المالي المتقدمة مع إمكانيات التحليل التنبؤي والسيناريوهات المختلفة.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Under Development Notice */}
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <PieChart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">نظام التحليل المالي قيد التطوير</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              نعمل حالياً على تطوير نظام التحليل المالي المتقدم مع الرسوم البيانية التفاعلية والتقارير التحليلية الشاملة.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FinancialAnalysis