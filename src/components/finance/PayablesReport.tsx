import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Badge } from "@/components/ui/badge"
import { Download, FileText } from "lucide-react"
import { usePayablesReport, exportToHTML } from "@/hooks/useFinancialReportsExport"
import { formatCurrency } from "@/lib/utils"

interface PayablesReportProps {
  companyName?: string
}

export const PayablesReport = ({ companyName }: PayablesReportProps) => {
  const { data: payablesData, isLoading } = usePayablesReport()

  const handleExportHTML = () => {
    if (!payablesData) return

    const tableContent = `
      <table>
        <thead>
          <tr>
            <th>اسم المورد</th>
            <th>المبلغ المستحق (د.ك)</th>
            <th>تاريخ الاستحقاق</th>
            <th>أيام التأخير</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${payablesData.map(item => `
            <tr>
              <td>${item.vendor_name}</td>
              <td>${formatCurrency(item.amount)}</td>
              <td>${new Date(item.due_date).toLocaleDateString('ar-SA')}</td>
              <td>${item.overdue_days}</td>
              <td style="color: ${item.status === 'متأخر' ? '#ef4444' : '#22c55e'}">${item.status}</td>
            </tr>
          `).join('')}
          
          <tr class="total-row">
            <td><strong>الإجمالي</strong></td>
            <td><strong>${formatCurrency(payablesData.reduce((sum, item) => sum + item.amount, 0))}</strong></td>
            <td colspan="3"></td>
          </tr>
        </tbody>
      </table>
    `

    exportToHTML(tableContent, "تقرير الحسابات الدائنة", companyName)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner />
      </div>
    )
  }

  if (!payablesData || payablesData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">لا توجد حسابات دائنة مستحقة</p>
        </CardContent>
      </Card>
    )
  }

  const totalAmount = payablesData.reduce((sum, item) => sum + item.amount, 0)
  const overdueAmount = payablesData
    .filter(item => item.status === 'متأخر')
    .reduce((sum, item) => sum + item.amount, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تقرير الحسابات الدائنة
            </CardTitle>
            <CardDescription>
              المبالغ المستحقة للموردين كما في {new Date().toLocaleDateString('ar-SA')}
            </CardDescription>
          </div>
          <Button onClick={handleExportHTML} size="sm">
            <Download className="h-4 w-4 mr-2" />
            تحميل التقرير
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
              <p className="text-xs text-muted-foreground">إجمالي المبالغ المستحقة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{formatCurrency(overdueAmount)}</div>
              <p className="text-xs text-muted-foreground">المبالغ المتأخرة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{payablesData.length}</div>
              <p className="text-xs text-muted-foreground">عدد الفواتير المستحقة</p>
            </CardContent>
          </Card>
        </div>

        {/* Payables Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المورد</TableHead>
              <TableHead className="text-right">المبلغ المستحق</TableHead>
              <TableHead>تاريخ الاستحقاق</TableHead>
              <TableHead>أيام التأخير</TableHead>
              <TableHead>الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payablesData.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.vendor_name}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                <TableCell>{new Date(item.due_date).toLocaleDateString('ar-SA')}</TableCell>
                <TableCell>{item.overdue_days}</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'متأخر' ? 'destructive' : 'default'}>
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 font-bold">
              <TableCell>الإجمالي</TableCell>
              <TableCell className="text-right">{formatCurrency(totalAmount)}</TableCell>
              <TableCell colSpan={3}></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}