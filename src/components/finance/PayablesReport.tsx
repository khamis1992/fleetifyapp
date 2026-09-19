import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Inbox } from "lucide-react"
import { usePayablesReport, exportToHTML } from "@/hooks/useFinancialReportsExport"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"

interface PayablesReportProps {
  companyName?: string
}

export const PayablesReport = ({ companyName }: PayablesReportProps) => {
const { data: payablesData, isLoading } = usePayablesReport()

  const { formatCurrency } = useCurrencyFormatter()

  const handleExportHTML = () => {
    if (!payablesData) return

    const tableContent = `
      <table>
        <thead>
          <tr>
            <th>اسم المورد</th>
            <th>المبلغ المستحق (ر.ق)</th>
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
              <td>${new Date(item.due_date).toLocaleDateString('ar-QA')}</td>
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
      <div className="dw-panel">
        <div className="dw-state" role="status">
          <LoadingSpinner />
          <p>جاري تحميل أرصدة الموردين…</p>
        </div>
      </div>
    )
  }

  if (!payablesData || payablesData.length === 0) {
    return (
      <div className="dw-panel">
        <div className="dw-state">
          <Inbox size={28} />
          <p>لا توجد حسابات دائنة مستحقة</p>
        </div>
      </div>
    )
  }

  const totalAmount = payablesData.reduce((sum, item) => sum + item.amount, 0)
  const overdueAmount = payablesData
    .filter(item => item.status === 'متأخر')
    .reduce((sum, item) => sum + item.amount, 0)

  return (
    <section className="dw-panel" aria-label="تقرير الحسابات الدائنة">
      <header className="dw-panel-heading">
        <div className="dw-panel-title">
          <span className="dw-section-number">01</span>
          <div>
            <h2>أرصدة الموردين المستحقة</h2>
            <p>المبالغ المستحقة للموردين كما في {new Date().toLocaleDateString('ar-QA')}</p>
          </div>
        </div>
        <Button onClick={handleExportHTML} size="sm" variant="outline">
          <Download className="h-4 w-4 mr-2" />
          تحميل التقرير
        </Button>
      </header>

      <div className="p-5 pt-0">
        <div className="dw-metrics cells-3" style={{ marginBottom: 20 }}>
          <div className="dw-metric dw-metric-accent">
            <div className="dw-metric-top">
              <span>إجمالي المبالغ المستحقة</span>
              <FileText size={19} />
            </div>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>
          <div className="dw-metric">
            <div className="dw-metric-top">
              <span>المبالغ المتأخرة</span>
              <FileText size={19} />
            </div>
            <strong>{formatCurrency(overdueAmount)}</strong>
          </div>
          <div className="dw-metric">
            <div className="dw-metric-top">
              <span>عدد الفواتير المستحقة</span>
              <FileText size={19} />
            </div>
            <strong>{payablesData.length}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
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
                  <TableCell>{new Date(item.due_date).toLocaleDateString('ar-QA')}</TableCell>
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
        </div>
      </div>
    </section>
  )
}
