import { useState } from "react"
import { PageCustomizer } from "@/components/PageCustomizer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  BarChart3,
  FileBarChart,
  Clock,
  Filter,
  PieChart
} from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { CostCenterReports } from "@/components/finance/CostCenterReports"
import { PayablesReport } from "@/components/finance/PayablesReport"
import { ReceivablesReport } from "@/components/finance/ReceivablesReport"
import { PayrollReportsPanel } from "@/components/finance/PayrollReportsPanel"
import { TrialBalanceReport } from "@/components/finance/TrialBalanceReport"
import { IncomeStatementReport } from "@/components/finance/IncomeStatementReport"
import { BalanceSheetReport } from "@/components/finance/BalanceSheetReport"
import { CashFlowStatementReport } from "@/components/finance/CashFlowStatementReport"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { HelpIcon } from '@/components/help/HelpIcon'

const Reports = () => {
  const [activeTab, setActiveTab] = useState("trial-balance")

  const reportTypes = [
    {
      title: "الميزانية العمومية",
      description: "عرض الأصول والخصوم وحقوق الملكية",
      icon: BarChart3,
      color: "bg-gradient-to-br from-blue-500 to-blue-600",
      available: true,
      key: "balance-sheet"
    },
    {
      title: "قائمة الدخل",
      description: "عرض الإيرادات والمصروفات وصافي الربح",
      icon: TrendingUp,
      color: "bg-gradient-to-br from-green-500 to-green-600",
      available: true,
      key: "income-statement"
    },
    {
      title: "قائمة التدفقات النقدية",
      description: "تتبع التدفقات النقدية الداخلة والخارجة",
      icon: Calendar,
      color: "bg-gradient-to-br from-purple-500 to-purple-600",
      available: true,
      key: "cash-flow"
    },
    {
      title: "تقرير الأرباح والخسائر",
      description: "تحليل تفصيلي للأرباح والخسائر",
      icon: PieChart,
      color: "bg-gradient-to-br from-orange-500 to-orange-600",
      available: true,
      key: "profit-loss"
    },
    {
      title: "تقرير الحسابات الدائنة",
      description: "عرض المبالغ المستحقة للموردين",
      icon: FileText,
      color: "bg-gradient-to-br from-red-500 to-red-600",
      available: true,
      key: "payables"
    },
    {
      title: "تقرير الحسابات المدينة",
      description: "عرض المبالغ المستحقة من العملاء",
      icon: FileText,
      color: "bg-gradient-to-br from-teal-500 to-teal-600",
      available: true,
      key: "receivables"
    }
  ]

  return (
    <PageCustomizer
      pageId="reports-page"
      title="Financial Reports"
      titleAr="التقارير المالية"
    >
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
      <div className="mb-8 animate-slide-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-primary to-primary-dark rounded-xl text-white shadow-card">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">التقارير المالية</h1>
                <HelpIcon topic="accountTypes" />
              </div>
              <p className="text-muted-foreground">الميزانية العمومية وقائمة الدخل والتقارير التحليلية</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              تصفية
            </Button>
            <Button className="gap-2 bg-gradient-to-br from-primary to-primary-dark">
              <Download className="h-4 w-4" />
              تصدير
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 animate-slide-up stagger-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <FileBarChart className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="secondary" className="bg-success/10 text-success hover:bg-success/20">
                +12%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">التقارير المتاحة</p>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-foreground">{reportTypes.length}</h3>
              <span className="text-xs text-muted-foreground mb-1">نوع تقرير</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 animate-slide-up stagger-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-warning/10">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">محدث</span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">آخر تحديث</p>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-foreground">اليوم</h3>
              <span className="text-xs text-muted-foreground mb-1">{new Date().toLocaleDateString('ar-QA')}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 animate-slide-up stagger-3">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-success/10">
                <Clock className="h-5 w-5 text-success" />
              </div>
              <Button variant="link" className="text-xs font-medium text-primary p-0 h-auto hover:underline">
                تخصيص
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-1">الفترة المشمولة</p>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-foreground">هذا الشهر</h3>
              <span className="text-xs text-muted-foreground mb-1">نوفمبر 2025</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="trial-balance">ميزان المراجعة</TabsTrigger>
          <TabsTrigger value="income-statement-enhanced">قائمة الدخل</TabsTrigger>
          <TabsTrigger value="balance-sheet-enhanced">المركز المالي</TabsTrigger>
          <TabsTrigger value="cash-flow-enhanced">التدفقات النقدية</TabsTrigger>
          <TabsTrigger value="payroll">الرواتب</TabsTrigger>
          <TabsTrigger value="cost-centers">مراكز التكلفة</TabsTrigger>
          <TabsTrigger value="receivables">المدينة</TabsTrigger>
          <TabsTrigger value="payables">الدائنة</TabsTrigger>
        </TabsList>

        <TabsContent value="trial-balance" className="space-y-6">
          <TrialBalanceReport />
        </TabsContent>

        <TabsContent value="income-statement-enhanced" className="space-y-6">
          <IncomeStatementReport />
        </TabsContent>

        <TabsContent value="balance-sheet-enhanced" className="space-y-6">
          <BalanceSheetReport />
        </TabsContent>

        <TabsContent value="cash-flow-enhanced" className="space-y-6">
          <CashFlowStatementReport />
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6">
          <PayrollReportsPanel />
        </TabsContent>

        <TabsContent value="cost-centers" className="space-y-6">
          <CostCenterReports />
        </TabsContent>

        <TabsContent value="receivables" className="space-y-6">
          <ReceivablesReport companyName="اسم الشركة" />
        </TabsContent>

        <TabsContent value="payables" className="space-y-6">
          <PayablesReport companyName="اسم الشركة" />
        </TabsContent>
      </Tabs>
    </div>
    </PageCustomizer>
  )
}

export default Reports