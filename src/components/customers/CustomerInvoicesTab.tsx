import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useCustomerInvoices, useCustomerInvoicesSummary } from "@/hooks/useCustomerInvoices";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FileText, Plus } from "lucide-react";
import { PayInvoiceDialog } from "@/components/finance/PayInvoiceDialog";
import { InvoicePreviewDialog } from "@/components/finance/InvoicePreviewDialog";
import * as React from "react";
import { Eye, Edit, Trash2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCardNumber } from "@/components/ui/NumberDisplay";

interface CustomerInvoicesTabProps {
  customerId: string;
  onCreateInvoice?: () => void;
}

export const CustomerInvoicesTab = ({ customerId, onCreateInvoice }: CustomerInvoicesTabProps) => {
  const { data: invoices, isLoading: invoicesLoading } = useCustomerInvoices(customerId);
  const { data: summary, isLoading: summaryLoading } = useCustomerInvoicesSummary(customerId);
  const { formatCurrency } = useCurrencyFormatter();
  
  // Payment and preview dialog state
  const [selectedInvoice, setSelectedInvoice] = React.useState<any>(null);
  const [isPayDialogOpen, setIsPayDialogOpen] = React.useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = React.useState(false);

  // Handlers for invoice actions
  const handlePreview = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsPreviewDialogOpen(true);
  };

  const handlePay = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsPayDialogOpen(true);
  };

  const handleEdit = (invoice: any) => {
    // Edit functionality can be implemented later  
    console.log("Edit invoice:", invoice);
  };

  const handleDelete = (invoice: any) => {
    // Delete functionality can be implemented later
    console.log("Delete invoice:", invoice);
  };

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
              <StatCardNumber value={summary.totalInvoices} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المبلغ</CardTitle>
            </CardHeader>
            <CardContent>
              <StatCardNumber value={formatCurrency(summary.totalAmount)} className="inline" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">المبلغ المدفوع</CardTitle>
            </CardHeader>
            <CardContent>
              <StatCardNumber value={formatCurrency(summary.totalPaid)} className="inline text-green-600" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">المبلغ المستحق</CardTitle>
            </CardHeader>
            <CardContent>
              <StatCardNumber value={formatCurrency(summary.totalOutstanding)} className="inline text-red-600" />
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
            <div className="space-y-4">
              {invoices.map((invoice) => {
                const canPay = invoice.payment_status === 'unpaid' || invoice.payment_status === 'partially_paid';
                
                return (
                  <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        {/* Left side - Actions */}
                        <div className="flex items-center gap-2">
                          {/* Pay button - only show for unpaid/partial invoices */}
                          {canPay && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handlePay(invoice)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <DollarSign className="h-4 w-4 ml-1" />
                              دفع الآن
                            </Button>
                          )}
                          
                          {/* Action buttons */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(invoice)}
                            title="عرض الفاتورة"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(invoice)}
                            title="تعديل الفاتورة"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(invoice)}
                            title="حذف الفاتورة"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Right side - Invoice details */}
                        <div className="flex-1 space-y-2 mr-4">
                          <div className="flex items-center gap-3 justify-end">
                            {getPaymentStatusBadge(invoice.payment_status)}
                            <h3 className="font-semibold text-lg">فاتورة رقم {invoice.invoice_number}</h3>
                          </div>
                          
                          <div className="flex items-center gap-6 text-sm text-muted-foreground justify-end">
                            <span>تاريخ الإنشاء: {format(new Date(invoice.invoice_date || invoice.created_at), 'dd/MM/yyyy', { locale: ar })}</span>
                            {invoice.due_date && (
                              <span>تاريخ الاستحقاق: {format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: ar })}</span>
                            )}
                            <span className="font-semibold">{formatCurrency(invoice.total_amount)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      {selectedInvoice && (
        <PayInvoiceDialog
          open={isPayDialogOpen}
          onOpenChange={setIsPayDialogOpen}
          invoice={selectedInvoice}
          onPaymentCreated={() => {
            setIsPayDialogOpen(false);
            setSelectedInvoice(null);
          }}
        />
      )}

      {/* Invoice Preview Dialog - Using Professional Template */}
      {selectedInvoice && (
        <InvoicePreviewDialog
          open={isPreviewDialogOpen}
          onOpenChange={setIsPreviewDialogOpen}
          invoice={selectedInvoice}
        />
      )}
    </div>
  );
};