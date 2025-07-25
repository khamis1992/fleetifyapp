import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Target, Plus, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

const Budgets = () => {
  const budgetCategories = [
    {
      title: "مصروفات التشغيل",
      budget: 50000,
      actual: 35000,
      percentage: 70,
      variance: -15000,
      color: "text-green-600"
    },
    {
      title: "إيرادات المبيعات",
      budget: 100000,
      actual: 85000,
      percentage: 85,
      variance: -15000,
      color: "text-yellow-600"
    },
    {
      title: "مصروفات التسويق",
      budget: 20000,
      actual: 25000,
      percentage: 125,
      variance: 5000,
      color: "text-red-600"
    },
    {
      title: "مصروفات الموظفين",
      budget: 80000,
      actual: 78000,
      percentage: 97.5,
      variance: -2000,
      color: "text-green-600"
    }
  ]

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
            <BreadcrumbPage>الموازنات</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl text-white">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">الموازنات</h1>
            <p className="text-muted-foreground">إعداد ومتابعة الموازنات التخطيطية</p>
          </div>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          موازنة جديدة
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الموازنة الإجمالية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">250.000 د.ك</div>
            <p className="text-xs text-muted-foreground">لهذا العام</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">المنفق الفعلي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">223.000 د.ك</div>
            <p className="text-xs text-muted-foreground">حتى الآن</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">نسبة التنفيذ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">89.2%</div>
            <p className="text-xs text-muted-foreground">من الموازنة</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الانحراف</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">-27.000 د.ك</div>
            <p className="text-xs text-muted-foreground">توفير</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Performance */}
      <Card>
        <CardHeader>
          <CardTitle>أداء الموازنة حسب الفئة</CardTitle>
          <CardDescription>
            مقارنة المخطط مع الفعلي لكل فئة موازنة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {budgetCategories.map((category, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{category.title}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-muted-foreground">
                        المخطط: {category.budget.toLocaleString()} د.ك
                      </span>
                      <span className="text-sm text-muted-foreground">
                        الفعلي: {category.actual.toLocaleString()} د.ك
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${category.color}`}>
                      {category.percentage}%
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      {category.variance < 0 ? (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      )}
                      <span className={category.variance < 0 ? "text-green-600" : "text-red-600"}>
                        {Math.abs(category.variance).toLocaleString()} د.ك
                      </span>
                    </div>
                  </div>
                </div>
                <Progress 
                  value={Math.min(category.percentage, 100)} 
                  className="h-2"
                />
                {category.percentage > 100 && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>تجاوز الموازنة المحددة</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Budget Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>الجدول الزمني للموازنة</CardTitle>
          <CardDescription>
            توزيع الموازنة على مدار العام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">الربع الأول</div>
                <div className="text-lg font-bold">75.000 د.ك</div>
                <div className="text-xs text-green-600">مكتمل</div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">الربع الثاني</div>
                <div className="text-lg font-bold">62.500 د.ك</div>
                <div className="text-xs text-blue-600">جاري</div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">المتبقي</div>
                <div className="text-lg font-bold">112.500 د.ك</div>
                <div className="text-xs text-gray-600">مخطط</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Under Development Notice */}
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">نظام الموازنات قيد التطوير</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              نعمل حالياً على تطوير نظام الموازنات المتكامل مع إمكانيات التخطيط والمتابعة والتحليل التفصيلي.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Budgets