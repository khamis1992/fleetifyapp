import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Download, Calendar } from "lucide-react"
import { useCashFlowReport, exportToHTML } from "@/hooks/useFinancialReportsExport"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"

interface CashFlowReportProps {
  startDate?: string
  endDate?: string
  companyName?: string
}

export const CashFlowReport = ({ startDate, endDate, companyName }: CashFlowReportProps) => {
  const { data: cashFlowData, isLoading } = useCashFlowReport(startDate, endDate)
  const { formatCurrency, currency } = useCurrencyFormatter()

  const handleExportHTML = () => {
    if (!cashFlowData) return

    const tableContent = `
      <table>
        <thead>
          <tr>
            <th>النشاط</th>
            <th>المبلغ (${currency})</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background-color: #f8f9fa;">
            <td colspan="2"><strong>الأنشطة التشغيلية</strong></td>
          </tr>
          ${cashFlowData.operating_activities.map(item => `
            <tr>
              <td>${item.name}</td>
              <td class="${item.amount >= 0 ? 'positive' : 'negative'}">${formatCurrency(item.amount)}</td>
            </tr>
          `).join('')}
          
          <tr style="background-color: #f8f9fa;">
            <td colspan="2"><strong>الأنشطة الاستثمارية</strong></td>
          </tr>
          ${cashFlowData.investing_activities.map(item => `
            <tr>
              <td>${item.name}</td>
              <td class="${item.amount >= 0 ? 'positive' : 'negative'}">${formatCurrency(item.amount)}</td>
            </tr>
          `).join('')}
          
          <tr style="background-color: #f8f9fa;">
            <td colspan="2"><strong>الأنشطة التمويلية</strong></td>
          </tr>
          ${cashFlowData.financing_activities.map(item => `
            <tr>
              <td>${item.name}</td>
              <td class="${item.amount >= 0 ? 'positive' : 'negative'}">${formatCurrency(item.amount)}</td>
            </tr>
          `).join('')}
          
          <tr class="total-row">
            <td><strong>صافي التدفق النقدي</strong></td>
            <td class="${cashFlowData.net_cash_flow >= 0 ? 'positive' : 'negative'}">
              <strong>${formatCurrency(cashFlowData.net_cash_flow)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
    `

    exportToHTML(tableContent, "قائمة التدفقات النقدية", companyName)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner />
      </div>
    )
  }

  if (!cashFlowData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">لا توجد بيانات متاحة للتدفقات النقدية</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              قائمة التدفقات النقدية
            </CardTitle>
            <CardDescription>
              التدفقات النقدية للفترة من {startDate} إلى {endDate}
            </CardDescription>
          </div>
          <Button onClick={handleExportHTML} size="sm">
            <Download className="h-4 w-4 mr-2" />
            تحميل التقرير
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>النشاط</TableHead>
              <TableHead className="text-right">المبلغ ({currency})</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-muted/50">
              <TableCell className="font-semibold" colSpan={2}>الأنشطة التشغيلية</TableCell>
            </TableRow>
            {cashFlowData.operating_activities.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="pl-4">{item.name}</TableCell>
                <TableCell className={`text-right ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(item.amount)}
                </TableCell>
              </TableRow>
            ))}

            <TableRow className="bg-muted/50">
              <TableCell className="font-semibold" colSpan={2}>الأنشطة الاستثمارية</TableCell>
            </TableRow>
            {cashFlowData.investing_activities.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="pl-4">{item.name}</TableCell>
                <TableCell className={`text-right ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(item.amount)}
                </TableCell>
              </TableRow>
            ))}

            <TableRow className="bg-muted/50">
              <TableCell className="font-semibold" colSpan={2}>الأنشطة التمويلية</TableCell>
            </TableRow>
            {cashFlowData.financing_activities.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="pl-4">{item.name}</TableCell>
                <TableCell className={`text-right ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(item.amount)}
                </TableCell>
              </TableRow>
            ))}

            <TableRow className="border-t-4 border-primary bg-primary/5">
              <TableCell className="font-bold text-lg">صافي التدفق النقدي</TableCell>
              <TableCell className={`text-right font-bold text-lg ${cashFlowData.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(cashFlowData.net_cash_flow)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}