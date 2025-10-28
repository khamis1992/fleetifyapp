import { useState } from "react"
import { PageCustomizer } from "@/components/PageCustomizer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Calendar, TrendingUp, DollarSign, PieChart, Eye, BarChart3 } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useBalanceSheet, useIncomeStatement } from "@/hooks/useFinancialAnalysis"
import { CostCenterReports } from "@/components/finance/CostCenterReports"
import { CashFlowReport } from "@/components/finance/CashFlowReport"
import { PayablesReport } from "@/components/finance/PayablesReport"
import { ReceivablesReport } from "@/components/finance/ReceivablesReport"
import { PayrollReportsPanel } from "@/components/finance/PayrollReportsPanel"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { exportToHTML } from "@/hooks/useFinancialReportsExport"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { EnhancedFinancialReportsViewer } from "@/components/finance/EnhancedFinancialReportsViewer"
import { HelpIcon } from '@/components/help/HelpIcon';

const Reports = () => {
  const [activeTab, setActiveTab] = useState("balance-sheet")
  const { data: balanceSheetData, isLoading: balanceLoading } = useBalanceSheet()
  const { data: incomeStatementData, isLoading: incomeLoading } = useIncomeStatement()
  const { formatCurrency } = useCurrencyFormatter()

  // Export functions for balance sheet and income statement
  const handleExportBalanceSheet = () => {
    if (!balanceSheetData) return

    const tableContent = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
        <div>
          <h3 style="font-size: 18px; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">الأصول</h3>
          <table style="width: 100%;">
            <tbody>
              ${balanceSheetData.assets?.map((account: any) => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd;">${account.account_name_translated || account.account_name}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: left;">${formatCurrency(Number(account.current_balance))}</td>
                </tr>
              `).join('') || ''}
              <tr style="background-color: #f5f5f5; font-weight: bold;">
                <td style="padding: 12px; border-top: 2px solid #333;">إجمالي الأصول</td>
                <td style="padding: 12px; border-top: 2px solid #333; text-align: left;">
                  ${formatCurrency(balanceSheetData.assets?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0) || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div>
          <h3 style="font-size: 18px; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">الخصوم وحقوق الملكية</h3>
          <table style="width: 100%;">
            <tbody>
              <tr style="background-color: #f8f9fa;">
                <td colspan="2" style="padding: 8px; font-weight: bold;">الخصوم</td>
              </tr>
              ${balanceSheetData.liabilities?.map((account: any) => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; padding-left: 20px;">${account.account_name_translated || account.account_name}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: left;">${formatCurrency(Number(account.current_balance))}</td>
                </tr>
              `).join('') || ''}
              <tr style="background-color: #f8f9fa;">
                <td colspan="2" style="padding: 8px; font-weight: bold;">حقوق الملكية</td>
              </tr>
              ${balanceSheetData.equity?.map((account: any) => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; padding-left: 20px;">${account.account_name_translated || account.account_name}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: left;">${formatCurrency(Number(account.current_balance))}</td>
                </tr>
              `).join('') || ''}
              <tr style="background-color: #f5f5f5; font-weight: bold;">
                <td style="padding: 12px; border-top: 2px solid #333;">إجمالي الخصوم وحقوق الملكية</td>
                <td style="padding: 12px; border-top: 2px solid #333; text-align: left;">
                  ${formatCurrency(
                    (balanceSheetData.liabilities?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0) || 0) +
                    (balanceSheetData.equity?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0) || 0)
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `

    exportToHTML(tableContent, "الميزانية العمومية", "اسم الشركة")
  }

  const handleExportIncomeStatement = () => {
    if (!incomeStatementData) return

    const tableContent = `
      <table style="max-width: 600px; margin: 0 auto;">
        <tbody>
          <tr style="background-color: #f8f9fa;">
            <td colspan="2" style="padding: 12px; font-weight: bold; font-size: 16px;">الإيرادات</td>
          </tr>
          ${incomeStatementData.revenue?.map((account: any) => `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; padding-left: 20px;">${account.account_name_translated || account.account_name}</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left; color: #22c55e;">${formatCurrency(Number(account.current_balance))}</td>
            </tr>
          `).join('') || ''}
          <tr style="border-bottom: 2px solid #333;">
            <td style="padding: 12px; font-weight: bold;">إجمالي الإيرادات</td>
            <td style="padding: 12px; font-weight: bold; text-align: left; color: #22c55e;">
              ${formatCurrency(incomeStatementData.revenue?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0) || 0)}
            </td>
          </tr>
          
          <tr style="background-color: #f8f9fa;">
            <td colspan="2" style="padding: 12px; font-weight: bold; font-size: 16px;">المصروفات</td>
          </tr>
          ${incomeStatementData.expenses?.map((account: any) => `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; padding-left: 20px;">${account.account_name_translated || account.account_name}</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left; color: #ef4444;">${formatCurrency(Number(account.current_balance))}</td>
            </tr>
          `).join('') || ''}
          <tr style="border-bottom: 2px solid #333;">
            <td style="padding: 12px; font-weight: bold;">إجمالي المصروفات</td>
            <td style="padding: 12px; font-weight: bold; text-align: left; color: #ef4444;">
              ${formatCurrency(incomeStatementData.expenses?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0) || 0)}
            </td>
          </tr>
          
          <tr style="border-top: 4px solid #333; background-color: #f0f9ff;">
            <td style="padding: 15px; font-weight: bold; font-size: 18px;">صافي الربح (الخسارة)</td>
            <td style="padding: 15px; font-weight: bold; font-size: 18px; text-align: left;">
              ${formatCurrency(
                (incomeStatementData.revenue?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0) || 0) -
                (incomeStatementData.expenses?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0) || 0)
              )}
            </td>
          </tr>
        </tbody>
      </table>
    `

    exportToHTML(tableContent, "قائمة الدخل", "اسم الشركة")
  }

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">التقارير المالية</h1>
              <HelpIcon topic="accountTypes" />
            </div>
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
            <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-GB')}</p>
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="enhanced">التقارير المحسّنة</TabsTrigger>
          <TabsTrigger value="payroll">الرواتب</TabsTrigger>
          <TabsTrigger value="cost-centers">مراكز التكلفة</TabsTrigger>
          <TabsTrigger value="receivables">المدينة</TabsTrigger>
          <TabsTrigger value="payables">الدائنة</TabsTrigger>
          <TabsTrigger value="cash-flow">التدفقات النقدية</TabsTrigger>
          <TabsTrigger value="income-statement">قائمة الدخل</TabsTrigger>
          <TabsTrigger value="balance-sheet">الميزانية</TabsTrigger>
        </TabsList>

        <TabsContent value="enhanced" className="space-y-6">
          <EnhancedFinancialReportsViewer />
        </TabsContent>


        <TabsContent value="balance-sheet" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    الميزانية العمومية
                  </CardTitle>
                  <CardDescription>
                    عرض الأصول والخصوم وحقوق الملكية كما في {new Date().toLocaleDateString('en-GB')}
                  </CardDescription>
                </div>
                <Button onClick={handleExportBalanceSheet} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  تحميل التقرير
                </Button>
              </div>
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
                            <TableCell className="font-medium">{account.account_name_translated || account.account_name}</TableCell>
                            <TableCell className="text-right">{Number(account.current_balance).toFixed(2)} ر.ق</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 font-bold">
                          <TableCell>إجمالي الأصول</TableCell>
                          <TableCell className="text-right">
                            {balanceSheetData?.assets?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0).toFixed(2) || '0.00'} ر.ق
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
                            <TableCell className="pl-4">{account.account_name_translated || account.account_name}</TableCell>
                            <TableCell className="text-right">{Number(account.current_balance).toFixed(2)} ر.ق</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50">
                          <TableCell className="font-semibold" colSpan={2}>حقوق الملكية</TableCell>
                        </TableRow>
                        {balanceSheetData?.equity?.map((account: any) => (
                          <TableRow key={account.id}>
                            <TableCell className="pl-4">{account.account_name_translated || account.account_name}</TableCell>
                            <TableCell className="text-right">{Number(account.current_balance).toFixed(2)} ر.ق</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 font-bold">
                          <TableCell>إجمالي الخصوم وحقوق الملكية</TableCell>
                          <TableCell className="text-right">
                            {(
                              (balanceSheetData?.liabilities?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0) || 0) +
                              (balanceSheetData?.equity?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0) || 0)
                            ).toFixed(2)} ر.ق
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    قائمة الدخل
                  </CardTitle>
                  <CardDescription>
                    عرض الإيرادات والمصروفات للفترة المنتهية في {new Date().toLocaleDateString('en-GB')}
                  </CardDescription>
                </div>
                <Button onClick={handleExportIncomeStatement} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  تحميل التقرير
                </Button>
              </div>
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
                          <TableCell className="pl-4">{account.account_name_translated || account.account_name}</TableCell>
                          <TableCell className="text-right text-green-600">{Number(account.current_balance).toFixed(2)} ر.ق</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-b-2">
                        <TableCell className="font-bold">إجمالي الإيرادات</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {incomeStatementData?.revenue?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0).toFixed(2) || '0.00'} ر.ق
                        </TableCell>
                      </TableRow>

                      <TableRow className="bg-muted/50">
                        <TableCell className="font-semibold" colSpan={2}>المصروفات</TableCell>
                      </TableRow>
                      {incomeStatementData?.expenses?.map((account: any) => (
                        <TableRow key={account.id}>
                          <TableCell className="pl-4">{account.account_name_translated || account.account_name}</TableCell>
                          <TableCell className="text-right text-red-600">{Number(account.current_balance).toFixed(2)} ر.ق</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-b-2">
                        <TableCell className="font-bold">إجمالي المصروفات</TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {incomeStatementData?.expenses?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0).toFixed(2) || '0.00'} ر.ق
                        </TableCell>
                      </TableRow>

                      <TableRow className="border-t-4 border-primary bg-primary/5">
                        <TableCell className="font-bold text-lg">صافي الربح (الخسارة)</TableCell>
                        <TableCell className="text-right font-bold text-lg">
                          {(
                            (incomeStatementData?.revenue?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0) || 0) -
                            (incomeStatementData?.expenses?.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0) || 0)
                          ).toFixed(2)} ر.ق
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash-flow" className="space-y-6">
          <CashFlowReport companyName="اسم الشركة" />
        </TabsContent>

        <TabsContent value="payables" className="space-y-6">
          <PayablesReport companyName="اسم الشركة" />
        </TabsContent>

        <TabsContent value="receivables" className="space-y-6">
          <ReceivablesReport companyName="اسم الشركة" />
        </TabsContent>

        <TabsContent value="cost-centers" className="space-y-6">
          <CostCenterReports />
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6">
          <PayrollReportsPanel />
        </TabsContent>
      </Tabs>
    </div>
    </PageCustomizer>
  )
}

export default Reports