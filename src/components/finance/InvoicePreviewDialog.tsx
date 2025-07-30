import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Download, Mail, Printer } from "lucide-react";

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

export function InvoicePreviewDialog({ open, onOpenChange, invoice }: InvoicePreviewDialogProps) {
  if (!invoice) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'مدفوعة';
      case 'pending': return 'معلقة';
      case 'overdue': return 'متأخرة';
      case 'cancelled': return 'ملغاة';
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sales': return 'مبيعات';
      case 'purchase': return 'مشتريات';
      case 'service': return 'خدمات';
      default: return type;
    }
  };

  // Sample items for preview (in real app, these would come from invoice_items table)
  const sampleItems = [
    {
      id: 1,
      description: 'خدمة استشارية',
      quantity: 2,
      unit_price: 150.000,
      tax_rate: 5,
      total: 315.000
    },
    {
      id: 2,
      description: 'رسوم إدارية',
      quantity: 1,
      unit_price: 75.500,
      tax_rate: 5,
      total: 79.275
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              معاينة الفاتورة #{invoice.invoice_number}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                تحميل PDF
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                إرسال بالإيميل
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                طباعة
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">فاتورة {getTypeLabel(invoice.invoice_type)}</CardTitle>
                  <p className="text-muted-foreground">رقم الفاتورة: {invoice.invoice_number}</p>
                </div>
                <Badge className={getStatusColor(invoice.status)}>
                  {getStatusLabel(invoice.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">معلومات الفاتورة</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">التاريخ:</span> {new Date(invoice.invoice_date).toLocaleDateString('ar-SA')}</p>
                    <p><span className="font-medium">تاريخ الاستحقاق:</span> {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('ar-SA') : 'غير محدد'}</p>
                    <p><span className="font-medium">العملة:</span> {invoice.currency || 'KWD'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">من</h4>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">شركة النقل المتطورة</p>
                    <p>الكويت، حولي</p>
                    <p>هاتف: +965 12345678</p>
                    <p>info@transport.com</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">إلى</h4>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">العميل</p>
                    <p>العنوان غير متوفر</p>
                    <p>الهاتف غير متوفر</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle>أصناف الفاتورة</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الوصف</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right">سعر الوحدة</TableHead>
                    <TableHead className="text-right">الضريبة</TableHead>
                    <TableHead className="text-right">المجموع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit_price.toFixed(3)} د.ك</TableCell>
                      <TableCell>{item.tax_rate}%</TableCell>
                      <TableCell>{item.total.toFixed(3)} د.ك</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Invoice Totals */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي:</span>
                    <span>{(invoice.subtotal || 225.5).toFixed(3)} د.ك</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الضريبة:</span>
                    <span>{(invoice.tax_amount || 11.275).toFixed(3)} د.ك</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الخصم:</span>
                    <span>-{(invoice.discount_amount || 0).toFixed(3)} د.ك</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>المجموع الإجمالي:</span>
                    <span>{invoice.total_amount.toFixed(3)} د.ك</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Notes */}
          {(invoice.terms || invoice.notes) && (
            <Card>
              <CardContent className="pt-6">
                {invoice.terms && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">شروط الدفع</h4>
                    <p className="text-sm text-muted-foreground">{invoice.terms}</p>
                  </div>
                )}
                {invoice.notes && (
                  <div>
                    <h4 className="font-semibold mb-2">ملاحظات</h4>
                    <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}