import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building, Plus, Calculator, TrendingDown, Settings } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

const FixedAssets = () => {
  const assetCategories = [
    {
      title: "المباني والإنشاءات",
      description: "إدارة المباني والمنشآت العقارية",
      icon: Building,
      count: 0,
      totalValue: 0
    },
    {
      title: "المعدات والآلات",
      description: "إدارة المعدات الصناعية والآلات",
      icon: Settings,
      count: 0,
      totalValue: 0
    },
    {
      title: "الأثاث والتجهيزات",
      description: "إدارة الأثاث والتجهيزات المكتبية",
      icon: Building,
      count: 0,
      totalValue: 0
    },
    {
      title: "المركبات والنقل",
      description: "إدارة أسطول المركبات ووسائل النقل",
      icon: Building,
      count: 0,
      totalValue: 0
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
            <BreadcrumbPage>الأصول الثابتة</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl text-white">
            <Building className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">الأصول الثابتة</h1>
            <p className="text-muted-foreground">إدارة الأصول والإهلاك والصيانة</p>
          </div>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          أصل جديد
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الأصول</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">أصل ثابت</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">القيمة الإجمالية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.000 د.ك</div>
            <p className="text-xs text-muted-foreground">قيمة الشراء</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الإهلاك المتراكم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">0.000 د.ك</div>
            <p className="text-xs text-muted-foreground">إهلاك تراكمي</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">القيمة الدفترية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">0.000 د.ك</div>
            <p className="text-xs text-muted-foreground">القيمة الحالية</p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Categories */}
      <Card>
        <CardHeader>
          <CardTitle>فئات الأصول الثابتة</CardTitle>
          <CardDescription>
            إدارة الأصول حسب الفئة مع تتبع الإهلاك
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assetCategories.map((category, index) => (
              <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <category.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{category.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {category.description}
                      </p>
                      <div className="flex gap-4 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {category.count} أصل
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {category.totalValue.toFixed(3)} د.ك
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" disabled>
                    عرض
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Depreciation Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            نظرة عامة على الإهلاك
          </CardTitle>
          <CardDescription>
            تتبع مصروفات الإهلاك والجداول الزمنية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">الإهلاك الشهري</span>
              </div>
              <div className="text-lg font-bold">0.000 د.ك</div>
              <p className="text-xs text-muted-foreground">متوسط شهري</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm">الإهلاك السنوي</span>
              </div>
              <div className="text-lg font-bold">0.000 د.ك</div>
              <p className="text-xs text-muted-foreground">إجمالي سنوي</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-sm">معدل الإهلاك</span>
              </div>
              <div className="text-lg font-bold">0%</div>
              <p className="text-xs text-muted-foreground">متوسط المعدل</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Under Development Notice */}
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">نظام الأصول الثابتة قيد التطوير</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              نعمل حالياً على تطوير نظام إدارة الأصول الثابتة المتكامل مع حساب الإهلاك التلقائي وجداول الصيانة.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FixedAssets