import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PieChart, TrendingUp, BarChart3, Calculator, DollarSign, Percent, Target, Calendar, Activity } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useFinancialAnalysis, useBalanceSheet, useIncomeStatement } from "@/hooks/useFinancialAnalysis"
import { useAdvancedFinancialAnalytics } from "@/hooks/useAdvancedFinancialAnalytics"
import { CostCenterReports } from "@/components/finance/CostCenterReports"
import { HelpIcon } from '@/components/help/HelpIcon';

const FinancialAnalysis = () => {
  const { data: analysisData, isLoading, error } = useFinancialAnalysis()
  const { data: balanceSheetData } = useBalanceSheet()
  const { data: incomeStatementData } = useIncomeStatement()
  const { data: advancedAnalytics, isLoading: advancedLoading } = useAdvancedFinancialAnalytics()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-destructive">
        حدث خطأ في تحميل البيانات
      </div>
    )
  }

  const ratioCategories = [
    {
      category: "نسب السيولة",
      ratios: analysisData?.ratios.filter(r => 
        r.name === "نسبة التداول" || r.name === "النسبة السريعة"
      ) || []
    },
    {
      category: "نسب الربحية", 
      ratios: analysisData?.ratios.filter(r => 
        r.name.includes("الربح") || r.name.includes("العائد")
      ) || []
    },
    {
      category: "نسب المديونية",
      ratios: analysisData?.ratios.filter(r => 
        r.name.includes("الدين")
      ) || []
    }
  ]

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
      default: return <TrendingUp className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">التحليل المالي</h1>
              <HelpIcon topic="accountTypes" />
            </div>
            <p className="text-muted-foreground">تحليل الأداء المالي والمؤشرات والنسب</p>
          </div>
        </div>
        <Button onClick={() => window.location.reload()}>
          تحديث التحليل
        </Button>
      </div>

      {/* Analysis Tabs */}
      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="trends">الاتجاهات</TabsTrigger>
          <TabsTrigger value="performance">الأداء</TabsTrigger>
          <TabsTrigger value="budget">مقارنة الميزانية</TabsTrigger>
          <TabsTrigger value="analytics">التحليل المتقدم</TabsTrigger>
          <TabsTrigger value="cost-centers">مراكز التكلفة</TabsTrigger>
          <TabsTrigger value="forecast">التنبؤات</TabsTrigger>
          <TabsTrigger value="ratios">النسب المالية</TabsTrigger>
        </TabsList>

        <TabsContent value="ratios" className="space-y-6">
          <div className="grid gap-6">
            {ratioCategories.map((category, index) => (
              <Card key={index} dir="rtl">
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
                        <div className="text-2xl font-bold text-primary mb-2">
                          {ratio.percentage 
                            ? `${ratio.value.toFixed(2)}%` 
                            : ratio.value.toFixed(2)
                          }
                        </div>
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
          <Card dir="rtl">
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
                {analysisData?.trends.map((trend, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{trend.name}</span>
                      {getTrendIcon(trend.trend)}
                    </div>
                    <div className="text-lg font-bold">{trend.current.toFixed(3)} د.ك</div>
                    <div className="text-xs text-muted-foreground">
                      السابق: {trend.previous.toFixed(3)} د.ك
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
          <Card dir="rtl">
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
                        <span className="font-bold">{analysisData?.incomeStatement.revenue.toFixed(3) || '0.000'} د.ك</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">إجمالي المصروفات</span>
                        <span className="font-bold">{analysisData?.incomeStatement.expenses.toFixed(3) || '0.000'} د.ك</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">الربح الصافي</span>
                        <span className={`font-bold ${(analysisData?.incomeStatement.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {analysisData?.incomeStatement.netIncome.toFixed(3) || '0.000'} د.ك
                        </span>
                      </div>
                    </div>
                  </div>
                
                  <div className="space-y-4">
                    <h3 className="font-semibold">المؤشرات الرئيسية</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">هامش الربح الصافي</span>
                        <span className="font-bold">
                          {analysisData?.ratios.find(r => r.name === "هامش الربح الصافي")?.value.toFixed(2) || '0.00'}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">العائد على الأصول</span>
                        <span className="font-bold">
                          {analysisData?.ratios.find(r => r.name === "العائد على الأصول")?.value.toFixed(2) || '0.00'}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">العائد على حقوق الملكية</span>
                        <span className="font-bold">
                          {analysisData?.ratios.find(r => r.name === "العائد على حقوق الملكية")?.value.toFixed(2) || '0.00'}%
                        </span>
                      </div>
                    </div>
                  </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <Card dir="rtl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                مقارنة الميزانية مع الأداء الفعلي
              </CardTitle>
              <CardDescription>
                مقارنة الأداء المالي الفعلي مع الميزانية المعتمدة للعام الحالي
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisData?.budgetComparison ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Revenue Comparison */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      الإيرادات
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">الميزانية المعتمدة</span>
                        <span className="font-bold">{analysisData.budgetComparison.budgetedRevenue.toFixed(3)} د.ك</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">الإيرادات الفعلية</span>
                        <span className="font-bold">{analysisData.budgetComparison.actualRevenue.toFixed(3)} د.ك</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">الانحراف</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${analysisData.budgetComparison.revenueVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {analysisData.budgetComparison.revenueVariance.toFixed(3)} د.ك
                          </span>
                          <Badge variant={analysisData.budgetComparison.revenueVariancePercentage >= 0 ? "default" : "destructive"}>
                            {analysisData.budgetComparison.revenueVariancePercentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <Progress 
                        value={Math.min(100, (analysisData.budgetComparison.actualRevenue / analysisData.budgetComparison.budgetedRevenue) * 100)} 
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Expenses Comparison */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      المصروفات
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">الميزانية المعتمدة</span>
                        <span className="font-bold">{analysisData.budgetComparison.budgetedExpenses.toFixed(3)} د.ك</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">المصروفات الفعلية</span>
                        <span className="font-bold">{analysisData.budgetComparison.actualExpenses.toFixed(3)} د.ك</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">الانحراف</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${analysisData.budgetComparison.expenseVariance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {analysisData.budgetComparison.expenseVariance.toFixed(3)} د.ك
                          </span>
                          <Badge variant={analysisData.budgetComparison.expenseVariancePercentage <= 0 ? "default" : "destructive"}>
                            {analysisData.budgetComparison.expenseVariancePercentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <Progress 
                        value={Math.min(100, (analysisData.budgetComparison.actualExpenses / analysisData.budgetComparison.budgetedExpenses) * 100)} 
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد ميزانية معتمدة</h3>
                  <p className="text-muted-foreground">
                    يجب إنشاء واعتماد ميزانية للعام الحالي لعرض المقارنات
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {advancedLoading ? (
            <div className="flex items-center justify-center h-48">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* Financial Health Score */}
              {advancedAnalytics?.financialHealthScore && (
                <Card dir="rtl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      نقاط الصحة المالية
                    </CardTitle>
                    <CardDescription>
                      تقييم شامل للوضع المالي للشركة
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-center space-y-4">
                        <div className="text-4xl font-bold text-primary">
                          {advancedAnalytics.financialHealthScore.score.toFixed(0)}
                        </div>
                         <Badge 
                           variant={
                             advancedAnalytics.financialHealthScore.score >= 80 ? 'default' :
                             advancedAnalytics.financialHealthScore.score >= 60 ? 'secondary' :
                             advancedAnalytics.financialHealthScore.score >= 40 ? 'outline' :
                             'destructive'
                           }
                           className="text-lg px-4 py-2"
                         >
                           {advancedAnalytics.financialHealthScore.score >= 80 ? 'ممتاز' :
                            advancedAnalytics.financialHealthScore.score >= 60 ? 'جيد' :
                            advancedAnalytics.financialHealthScore.score >= 40 ? 'متوسط' :
                            advancedAnalytics.financialHealthScore.score >= 20 ? 'ضعيف' : 'خطير'}
                         </Badge>
                      </div>
                      
                      <div className="space-y-3">
                         <div className="flex justify-between items-center">
                           <span className="text-sm">السيولة</span>
                           <span className="font-bold">{advancedAnalytics.financialHealthScore.factors.liquidityScore.toFixed(0)}</span>
                         </div>
                         <Progress value={advancedAnalytics.financialHealthScore.factors.liquidityScore} />
                         
                         <div className="flex justify-between items-center">
                           <span className="text-sm">الربحية</span>
                           <span className="font-bold">{advancedAnalytics.financialHealthScore.factors.profitabilityScore.toFixed(0)}</span>
                         </div>
                         <Progress value={advancedAnalytics.financialHealthScore.factors.profitabilityScore} />
                         
                         <div className="flex justify-between items-center">
                           <span className="text-sm">الكفاءة</span>
                           <span className="font-bold">{advancedAnalytics.financialHealthScore.factors.efficiencyScore.toFixed(0)}</span>
                         </div>
                         <Progress value={advancedAnalytics.financialHealthScore.factors.efficiencyScore} />
                         
                         <div className="flex justify-between items-center">
                           <span className="text-sm">الملاءة المالية</span>
                           <span className="font-bold">{advancedAnalytics.financialHealthScore.factors.solvencyScore.toFixed(0)}</span>
                         </div>
                         <Progress value={advancedAnalytics.financialHealthScore.factors.solvencyScore} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cash Flow Analysis */}
              {advancedAnalytics?.cashFlowAnalysis && (
                <Card dir="rtl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      تحليل التدفق النقدي
                    </CardTitle>
                    <CardDescription>
                      تحليل مصادر واستخدامات النقد
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 border rounded-lg text-center">
                        <div className="text-sm text-muted-foreground mb-1">التدفق التشغيلي</div>
                        <div className={`text-lg font-bold ${advancedAnalytics.cashFlowAnalysis.operatingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {advancedAnalytics.cashFlowAnalysis.operatingCashFlow.toFixed(3)} د.ك
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg text-center">
                        <div className="text-sm text-muted-foreground mb-1">التدفق الاستثماري</div>
                        <div className={`text-lg font-bold ${advancedAnalytics.cashFlowAnalysis.investingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {advancedAnalytics.cashFlowAnalysis.investingCashFlow.toFixed(3)} د.ك
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg text-center">
                        <div className="text-sm text-muted-foreground mb-1">التدفق التمويلي</div>
                        <div className={`text-lg font-bold ${advancedAnalytics.cashFlowAnalysis.financingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {advancedAnalytics.cashFlowAnalysis.financingCashFlow.toFixed(3)} د.ك
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg text-center bg-primary/5">
                        <div className="text-sm text-muted-foreground mb-1">صافي التدفق النقدي</div>
                        <div className={`text-lg font-bold ${advancedAnalytics.cashFlowAnalysis.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {advancedAnalytics.cashFlowAnalysis.netCashFlow.toFixed(3)} د.ك
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cost Center Performance */}
              {advancedAnalytics?.costCenterPerformance && advancedAnalytics.costCenterPerformance.length > 0 && (
                <Card dir="rtl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      أداء مراكز التكلفة
                    </CardTitle>
                    <CardDescription>
                      تحليل الأداء والكفاءة لكل مركز تكلفة
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {advancedAnalytics.costCenterPerformance.map((center, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-semibold">{center.centerName}</h3>
                             <Badge variant={center.variancePercentage <= 10 ? "default" : center.variancePercentage <= 20 ? "secondary" : "destructive"}>
                               {center.variancePercentage.toFixed(1)}% انحراف
                             </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">الميزانية المعتمدة</div>
                              <div className="font-bold">{center.budgetAmount.toFixed(3)} د.ك</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">الإنفاق الفعلي</div>
                              <div className="font-bold">{center.actualAmount.toFixed(3)} د.ك</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">الانحراف</div>
                              <div className={`font-bold ${center.variance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {center.variance.toFixed(3)} د.ك ({center.variancePercentage.toFixed(1)}%)
                              </div>
                            </div>
                          </div>
                          
                           <div className="mt-3">
                             <Progress value={Math.min(100, (center.actualAmount / center.budgetAmount) * 100)} className="h-2" />
                           </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="cost-centers" className="space-y-6">
          <CostCenterReports />
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <Card dir="rtl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                التنبؤات المالية
              </CardTitle>
              <CardDescription>
                توقعات الأداء المالي للفترات القادمة بناءً على البيانات التاريخية
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisData?.forecast && analysisData.forecast.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {analysisData.forecast.map((forecast, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{forecast.period}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(forecast.confidence * 100)}% ثقة
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">الإيرادات المتوقعة</span>
                          <span className="font-bold text-green-600">
                            {forecast.revenue.toFixed(3)} د.ك
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">المصروفات المتوقعة</span>
                          <span className="font-bold text-red-600">
                            {forecast.expenses.toFixed(3)} د.ك
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm font-medium">الربح المتوقع</span>
                          <span className={`font-bold ${forecast.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {forecast.netIncome.toFixed(3)} د.ك
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex items-center gap-2">
                          <Activity className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            مؤشر الثقة: {Math.round(forecast.confidence * 100)}%
                          </span>
                        </div>
                        <Progress value={forecast.confidence * 100} className="h-2 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">بيانات غير كافية للتنبؤ</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    يحتاج النظام إلى بيانات تاريخية أكثر لإنشاء تنبؤات مالية دقيقة
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Historical Comparison */}
          {analysisData?.historicalComparison && (
            <Card dir="rtl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  المقارنة التاريخية
                </CardTitle>
                <CardDescription>
                  مقارنة الأداء مع العام السابق
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analysisData.historicalComparison.map((comparison, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-3">{comparison.metric}</h3>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">العام الحالي</span>
                          <span className="font-bold">
                            {comparison.currentYear.toFixed(3)} د.ك
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">العام السابق</span>
                          <span className="font-bold">
                            {comparison.previousYear.toFixed(3)} د.ك
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm font-medium">التغيير</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${comparison.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {comparison.change.toFixed(3)} د.ك
                            </span>
                            <Badge variant={comparison.changePercentage >= 0 ? "default" : "destructive"}>
                              {comparison.changePercentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Financial Analysis content is displayed in tabs above */}
    </div>
  )
}

export default FinancialAnalysis