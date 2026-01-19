import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download, 
  Printer,
  Calendar,
  Hash,
  DollarSign,
  User,
  Building,
  Phone,
  Mail
} from "lucide-react";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import html2pdf from "html2pdf.js";

interface ProfessionalInvoiceTemplateProps {
  invoice: any;
  onPrint?: () => void;
  onDownload?: () => void;
  className?: string;
}

export function ProfessionalInvoiceTemplate({ 
  invoice, 
  onPrint,
  onDownload,
  className = "" 
}: ProfessionalInvoiceTemplateProps) {
  const { formatCurrency } = useCurrencyFormatter();
  const { currency: companyCurrency } = useCompanyCurrency();
  
  if (!invoice) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
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
      case 'rental': return 'إيجار';
      default: return type;
    }
  };

  // Sample items for preview (in real app, these would come from invoice_items table)
  const invoiceItems = invoice.items || [
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

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleDownload = async () => {
    if (onDownload) {
      onDownload();
      return;
    }

    const element = document.getElementById('invoice-template');
    if (!element) return;

    const opt = {
      margin: 10,
      filename: `فاتورة-${invoice.invoice_number}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to browser print
      handlePrint();
    }
  };

  return (
    <div id="invoice-template" className={`w-full max-w-4xl mx-auto bg-white ${className}`}>
      {/* Visual Indicator - NEW PROFESSIONAL DESIGN */}
      <div className="bg-gradient-to-r from-primary to-blue-600 text-white px-4 py-2 rounded-t-lg text-center font-semibold print:hidden mb-2">
        ✨ New Professional Invoice Design v2.0
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-end gap-2 mb-6 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          طباعة
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          تحميل PDF
        </Button>
      </div>

      {/* Invoice Header */}
      <Card className="border-0 shadow-none">
        <CardContent className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">فاتورة {getTypeLabel(invoice.invoice_type)}</h1>
                  <p className="text-muted-foreground">رقم الفاتورة: {invoice.invoice_number}</p>
                </div>
              </div>
              <Badge className={`${getStatusColor(invoice.status)} border`}>
                {getStatusLabel(invoice.status)}
              </Badge>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">فاتورة</div>
              <div className="text-muted-foreground">Invoice</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* From Section */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Building className="h-4 w-4" />
                من
              </h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">شركة النقل المتطورة</p>
                <p className="text-muted-foreground">الكويت، حولي</p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span dir="ltr">+965 12345678</span>
                </p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  info@transport.com
                </p>
              </div>
            </div>

            {/* To Section */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                إلى
              </h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {invoice.customer_name || 'العميل'}
                </p>
                <p className="text-muted-foreground">العنوان غير متوفر</p>
                <p className="text-muted-foreground">الهاتف غير متوفر</p>
              </div>
            </div>

            {/* Invoice Details */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                تفاصيل الفاتورة
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">التاريخ:</span>
                  <span>{new Date(invoice.invoice_date).toLocaleDateString('en-GB')}</span>
                </div>
                {invoice.due_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">تاريخ الاستحقاق:</span>
                    <span>{new Date(invoice.due_date).toLocaleDateString('en-GB')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">العملة:</span>
                  <span>{invoice.currency || companyCurrency}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="mb-8">
            <h3 className="font-semibold text-slate-900 mb-4">أصناف الفاتورة</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="text-right font-semibold">الوصف</TableHead>
                    <TableHead className="text-right font-semibold">الكمية</TableHead>
                    <TableHead className="text-right font-semibold">سعر الوحدة</TableHead>
                    <TableHead className="text-right font-semibold">الضريبة</TableHead>
                    <TableHead className="text-right font-semibold">المجموع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.unit_price, { currency: invoice.currency || companyCurrency })}</TableCell>
                      <TableCell>{item.tax_rate}%</TableCell>
                      <TableCell>{formatCurrency(item.total, { currency: invoice.currency || companyCurrency })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Invoice Totals */}
          <div className="mb-8">
            <div className="flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي:</span>
                  <span>{formatCurrency(invoice.subtotal || 225.5, { currency: invoice.currency || companyCurrency })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الضريبة:</span>
                  <span>{formatCurrency(invoice.tax_amount || 11.275, { currency: invoice.currency || companyCurrency })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الخصم:</span>
                  <span>-{formatCurrency(invoice.discount_amount || 0, { currency: invoice.currency || companyCurrency })}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>المجموع الإجمالي:</span>
                  <span>{formatCurrency(invoice.total_amount, { currency: invoice.currency || companyCurrency })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms and Notes */}
          {(invoice.terms || invoice.notes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {invoice.terms && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">شروط الدفع</h3>
                  <p className="text-sm text-muted-foreground">{invoice.terms}</p>
                </div>
              )}
              {invoice.notes && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">ملاحظات</h3>
                  <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground print:mt-8">
            <p>شكراً لثقتكم في خدماتنا</p>
            <p className="mt-1">This invoice was generated by Fleetify Financial System</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}