import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Calendar, TrendingUp, DollarSign, PieChart, Eye, BarChart3 } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useBalanceSheet, useIncomeStatement } from "@/hooks/useFinancialAnalysis"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

const Reports = () => {
  const { data: balanceSheetData, isLoading: balanceLoading } = useBalanceSheet()
  const { data: incomeStatementData, isLoading: incomeLoading } = useIncomeStatement()

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
      available: false,
      key: "cash-flow"
    },
    {
      title: "تقرير الأرباح والخسائر",
      description: "تحليل تفصيلي للأرباح والخسائر",
      icon: PieChart,
      color: "bg-gradient-to-br from-orange-500 to-orange-600",
      available: false,
      key: "profit-loss"
    },
    {
      title: "تقرير الحسابات الدائنة",
      description: "عرض المبالغ المستحقة للموردين",
      icon: FileText,
      color: "bg-gradient-to-br from-red-500 to-red-600",
      available: false,
      key: "payables"
    },
    {
      title: "تقرير الحسابات المدينة",
      description: "عرض المبالغ المستحقة من العملاء",
      icon: FileText,
      color: "bg-gradient-to-br from-teal-500 to-teal-600",
      available: false,
      key: "receivables"
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

      {/* Financial Reports Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="balance-sheet">الميزانية العمومية</TabsTrigger>
          <TabsTrigger value="income-statement">قائمة الدخل</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportTypes.map((report, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:scale-105">
                <CardHeader className="pb-3">
                  <div className={`w-12 h-12 rounded-xl ${report.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <report.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <Badge variant={report.available ? "default" : "secondary"}>
                      {report.available ? "متوفر" : "قيد التطوير"}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {report.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" disabled={!report.available}>
                    <Eye className="h-4 w-4 mr-2" />
                    عرض التقرير
                  </Button>
                  <Button variant="outline" className="w-full" disabled={!report.available}>
                    <Download className="h-4 w-4 mr-2" />
                    تحميل PDF
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="balance-sheet" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                الميزانية العمومية
              </CardTitle>
              <CardDescription>
                عرض الأصول والخصوم وحقوق الملكية كما في {new Date().toLocaleDateString('ar-SA')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <div className="flex items-center justify-center h-32">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Assets */}
                  <div>
                    <h3 className="font-semibold mb-4 text-lg border-b pb-2">الأصول</h3>
                    <Table>
                      <TableBody>
                        {balanceSheetData?.assets?.map((account: any) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">{account.account_name}</TableCell>
                            <TableCell className="text-right">{Number(account.current_balance).toFixed(3)} د.ك</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 font-bold">
                          <TableCell>إجمالي الأصول</TableCell>
                          <TableCell className="text-right">
                            {balanceSheetData?.assets?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0).toFixed(3) || '0.000'} د.ك
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Liabilities and Equity */}
                  <div>
                    <h3 className="font-semibold mb-4 text-lg border-b pb-2">الخصوم وحقوق الملكية</h3>
                    <Table>
                      <TableBody>
                        <TableRow className="bg-muted/50">
                          <TableCell className="font-semibold" colSpan={2}>الخصوم</TableCell>
                        </TableRow>
                        {balanceSheetData?.liabilities?.map((account: any) => (
                          <TableRow key={account.id}>
                            <TableCell className="pl-4">{account.account_name}</TableCell>
                            <TableCell className="text-right">{Number(account.current_balance).toFixed(3)} د.ك</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50">
                          <TableCell className="font-semibold" colSpan={2}>حقوق الملكية</TableCell>
                        </TableRow>
                        {balanceSheetData?.equity?.map((account: any) => (
                          <TableRow key={account.id}>
                            <TableCell className="pl-4">{account.account_name}</TableCell>
                            <TableCell className="text-right">{Number(account.current_balance).toFixed(3)} د.ك</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 font-bold">
                          <TableCell>إجمالي الخصوم وحقوق الملكية</TableCell>
                          <TableCell className="text-right">
                            {(
                              (balanceSheetData?.liabilities?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0) || 0) +
                              (balanceSheetData?.equity?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0) || 0)
                            ).toFixed(3)} د.ك
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income-statement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                قائمة الدخل
              </CardTitle>
              <CardDescription>
                عرض الإيرادات والمصروفات للفترة المنتهية في {new Date().toLocaleDateString('ar-SA')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incomeLoading ? (
                <div className="flex items-center justify-center h-32">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="max-w-2xl">
                  <Table>
                    <TableBody>
                      <TableRow className="bg-muted/50">
                        <TableCell className="font-semibold" colSpan={2}>الإيرادات</TableCell>
                      </TableRow>
                      {incomeStatementData?.revenue?.map((account: any) => (
                        <TableRow key={account.id}>
                          <TableCell className="pl-4">{account.account_name}</TableCell>
                          <TableCell className="text-right text-green-600">{Number(account.current_balance).toFixed(3)} د.ك</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-b-2">
                        <TableCell className="font-bold">إجمالي الإيرادات</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {incomeStatementData?.revenue?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0).toFixed(3) || '0.000'} د.ك
                        </TableCell>
                      </TableRow>

                      <TableRow className="bg-muted/50">
                        <TableCell className="font-semibold" colSpan={2}>المصروفات</TableCell>
                      </TableRow>
                      {incomeStatementData?.expenses?.map((account: any) => (
                        <TableRow key={account.id}>
                          <TableCell className="pl-4">{account.account_name}</TableCell>
                          <TableCell className="text-right text-red-600">{Number(account.current_balance).toFixed(3)} د.ك</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-b-2">
                        <TableCell className="font-bold">إجمالي المصروفات</TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {incomeStatementData?.expenses?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0).toFixed(3) || '0.000'} د.ك
                        </TableCell>
                      </TableRow>

                      <TableRow className="border-t-4 border-primary bg-primary/5">
                        <TableCell className="font-bold text-lg">صافي الربح (الخسارة)</TableCell>
                        <TableCell className="text-right font-bold text-lg">
                          {(
                            (incomeStatementData?.revenue?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0) || 0) -
                            (incomeStatementData?.expenses?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0) || 0)
                          ).toFixed(3)} د.ك
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Reports