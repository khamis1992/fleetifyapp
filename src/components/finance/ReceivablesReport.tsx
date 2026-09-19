import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Inbox } from "lucide-react"
import { useReceivablesReport, exportToHTML } from "@/hooks/useFinancialReportsExport"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"

interface ReceivablesReportProps {
  companyName?: string
}

export const ReceivablesReport = ({ companyName }: ReceivablesReportProps) => {
const { data: receivablesData, isLoading } = useReceivablesReport()

  const { formatCurrency } = useCurrencyFormatter()

  const handleExportHTML = () => {
    if (!receivablesData) return

    const tableContent = `
      <table>
        <thead>
          <tr>
            <th>اسم العميل</th>
            <th>المبلغ المستحق (ر.ق)</th>
            <th>تاريخ الاستحقاق</th>
            <th>أيام التأخير</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${receivablesData.map(item => `
            <tr>
              <td>${item.customer_name}</td>
              <td>${formatCurrency(item.amount)}</td>
              <td>${new Date(item.due_date).toLocaleDateString('ar-QA')}</td>
              <td>${item.overdue_days}</td>
              <td style="color: ${item.status === 'متأخر' ? '#ef4444' : '#22c55e'}">${item.status}</td>
            </tr>
          `).join('')}

          <tr class="total-row">
            <td><strong>الإجمالي</strong></td>
            <td><strong>${formatCurrency(receivablesData.reduce((sum, item) => sum + item.amount, 0))}</strong></td>
            <td colspan="3"></td>
          </tr>
        </tbody>
      </table>
    `

    exportToHTML(tableContent, "تقرير الحسابات المدينة", companyName)
  }

  if (isLoading) {
    return (
      <div className="dw-panel">
        <div className="dw-state" role="status">
          <LoadingSpinner />
          <p>جاري تحميل أرصدة العملاء…</p>
        </div>
      </div>
    )
  }

  if (!receivablesData || receivablesData.length === 0) {
    return (
      <div className="dw-panel">
        <div className="dw-state">
          <Inbox size={28} />
          <p>لا توجد حسابات مدينة مستحقة</p>
        </div>
      </div>
    )
  }

  const totalAmount = receivablesData.reduce((sum, item) => sum + item.amount, 0)
  const overdueAmount = receivablesData
    .filter(item => item.status === 'متأخر')
    .reduce((sum, item) => sum + item.amount, 0)

  return (
    <section className="dw-panel" aria-label="تقرير الحسابات المدينة">
      <header className="dw-panel-heading">
        <div className="dw-panel-title">
          <span className="dw-section-number">01</span>
          <div>
            <h2>أرصدة العملاء المستحقة</h2>
            <p>المبالغ المستحقة من العملاء كما في {new Date().toLocaleDateString('ar-QA')}</p>
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
            <strong>{receivablesData.length}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم العميل</TableHead>
                <TableHead className="text-right">المبلغ المستحق</TableHead>
                <TableHead>تاريخ الاستحقاق</TableHead>
                <TableHead>أيام التأخير</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receivablesData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.customer_name}</TableCell>
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
