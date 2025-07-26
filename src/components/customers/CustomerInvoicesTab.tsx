import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCustomerInvoices, useCustomerInvoicesSummary } from "@/hooks/useCustomerInvoices";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FileText, Plus } from "lucide-react";

interface CustomerInvoicesTabProps {
  customerId: string;
  onCreateInvoice?: () => void;
}

export const CustomerInvoicesTab = ({ customerId, onCreateInvoice }: CustomerInvoicesTabProps) => {
  const { data: invoices, isLoading: invoicesLoading } = useCustomerInvoices(customerId);
  const { data: summary, isLoading: summaryLoading } = useCustomerInvoicesSummary(customerId);

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
      draft: "secondary",
      sent: "default",
      paid: "secondary",
      cancelled: "destructive"
    };
    
    const statusLabels: Record<string, string> = {
      draft: "مسودة",
      sent: "مرسلة", 
      paid: "مدفوعة",
      cancelled: "ملغاة"
    };

    return (
      <Badge variant={statusColors[status] || "default"}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const statusColors: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
      unpaid: "destructive",
      partially_paid: "default", 
      paid: "secondary",
      overdue: "destructive"
    };
    
    const statusLabels: Record<string, string> = {
      unpaid: "غير مدفوعة",
      partially_paid: "مدفوعة جزئياً",
      paid: "مدفوعة", 
      overdue: "متأخرة"
    };

    return (
      <Badge variant={statusColors[paymentStatus] || "default"}>
        {statusLabels[paymentStatus] || paymentStatus}
      </Badge>
    );
  };

  if (invoicesLoading || summaryLoading) {
    return <div className="text-center py-4">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الفواتير</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalInvoices}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المبلغ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">المبلغ المدفوع</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">المبلغ المستحق</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalOutstanding)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoices Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              فواتير العميل
            </CardTitle>
            <CardDescription>
              جميع فواتير العميل مرتبة حسب التاريخ
            </CardDescription>
          </div>
          {onCreateInvoice && (
            <Button onClick={onCreateInvoice} size="sm">
              <Plus className="h-4 w-4 ml-2" />
              إنشاء فاتورة جديدة
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!invoices || invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">لا توجد فواتير</h3>
              <p className="text-muted-foreground mb-4">
                لم يتم إنشاء أي فواتير لهذا العميل بعد
              </p>
              {onCreateInvoice && (
                <Button onClick={onCreateInvoice}>
                  <Plus className="h-4 w-4 ml-2" />
                  إنشاء أول فاتورة
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>حالة الدفع</TableHead>
                  <TableHead>المبلغ الإجمالي</TableHead>
                  <TableHead>المبلغ المدفوع</TableHead>
                  <TableHead>المبلغ المستحق</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.invoice_date), 'dd/MM/yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      {invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: ar }) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {invoice.invoice_type === 'customer' ? 'عميل' : 'مورد'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(invoice.payment_status)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(invoice.total_amount)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(invoice.paid_amount || 0)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(invoice.balance_due || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};