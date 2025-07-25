import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Calendar, TrendingUp, DollarSign, PieChart } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

const Reports = () => {
  const reportTypes = [
    {
      title: "الميزانية العمومية",
      description: "عرض الأصول والخصوم وحقوق الملكية",
      icon: TrendingUp,
      color: "bg-gradient-to-br from-blue-500 to-blue-600"
    },
    {
      title: "قائمة الدخل",
      description: "عرض الإيرادات والمصروفات وصافي الربح",
      icon: DollarSign,
      color: "bg-gradient-to-br from-green-500 to-green-600"
    },
    {
      title: "قائمة التدفقات النقدية",
      description: "تتبع التدفقات النقدية الداخلة والخارجة",
      icon: Calendar,
      color: "bg-gradient-to-br from-purple-500 to-purple-600"
    },
    {
      title: "تقرير الأرباح والخسائر",
      description: "تحليل تفصيلي للأرباح والخسائر",
      icon: PieChart,
      color: "bg-gradient-to-br from-orange-500 to-orange-600"
    },
    {
      title: "تقرير الحسابات الدائنة",
      description: "عرض المبالغ المستحقة للموردين",
      icon: FileText,
      color: "bg-gradient-to-br from-red-500 to-red-600"
    },
    {
      title: "تقرير الحسابات المدينة",
      description: "عرض المبالغ المستحقة من العملاء",
      icon: FileText,
      color: "bg-gradient-to-br from-teal-500 to-teal-600"
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
            <BreadcrumbPage>التقارير المالية</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">التقارير المالية</h1>
            <p className="text-muted-foreground">الميزانية العمومية وقائمة الدخل والتقارير التحليلية</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">التقارير المتاحة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportTypes.length}</div>
            <p className="text-xs text-muted-foreground">نوع تقرير</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">آخر تحديث</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">اليوم</div>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('ar-KW')}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الفترة المشمولة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">هذا الشهر</div>
            <p className="text-xs text-muted-foreground">يمكن تخصيصها</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTypes.map((report, index) => (
          <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <div className={`w-12 h-12 rounded-xl ${report.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <report.icon className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-lg">{report.title}</CardTitle>
              <CardDescription className="text-sm">
                {report.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" disabled>
                <Calendar className="h-4 w-4 mr-2" />
                عرض التقرير
              </Button>
              <Button variant="outline" className="w-full" disabled>
                <Download className="h-4 w-4 mr-2" />
                تحميل PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Under Development Notice */}
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">التقارير المالية قيد التطوير</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              نعمل حالياً على تطوير نظام التقارير المالية المتكامل. ستتمكن قريباً من إنشاء وتخصيص جميع التقارير المالية الأساسية.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Reports