import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import html2pdf from "html2pdf.js";

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

export function InvoicePreviewDialog({ open, onOpenChange, invoice }: InvoicePreviewDialogProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  
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

  const downloadInvoiceHTML = () => {
    console.log('تحميل الفاتورة - بدء العملية');
    
    if (!invoice) {
      console.error('البيانات غير متوفرة');
      return;
    }

    const invoiceContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>فاتورة ${invoice.invoice_number}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: #333;
            direction: rtl;
            line-height: 1.6;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
          }
          .company-info {
            text-align: right;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
          }
          .invoice-title {
            font-size: 32px;
            font-weight: bold;
            color: #1f2937;
          }
          .invoice-number {
            font-size: 16px;
            color: #666;
            margin-top: 5px;
          }
          .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          .detail-section h4 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #1f2937;
          }
          .detail-section p {
            margin: 5px 0;
            font-size: 14px;
            line-height: 1.4;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .items-table th,
          .items-table td {
            padding: 12px;
            text-align: right;
            border-bottom: 1px solid #ddd;
          }
          .items-table th {
            background: #f8f9fa;
            font-weight: bold;
            color: #1f2937;
          }
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
          }
          .totals-table {
            width: 300px;
          }
          .totals-table tr td {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .totals-table tr:last-child td {
            border-bottom: 2px solid #333;
            font-weight: bold;
            font-size: 18px;
          }
          .phone-ltr {
            direction: ltr;
            display: inline-block;
          }
          .terms-notes {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
          .terms-notes h4 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #1f2937;
          }
          .terms-notes p {
            font-size: 14px;
            line-height: 1.6;
            color: #666;
          }
          @media print {
            body { 
              margin: 0; 
              padding: 0; 
              font-size: 12pt;
            }
            .invoice-container { 
              margin: 0; 
              padding: 20px; 
              box-shadow: none;
            }
            .header {
              margin-bottom: 20px;
              padding-bottom: 15px;
            }
            .invoice-details {
              margin-bottom: 20px;
              gap: 20px;
            }
            .items-table {
              margin-bottom: 20px;
            }
            .items-table th,
            .items-table td {
              padding: 8px;
            }
            .totals-section {
              margin-bottom: 20px;
            }
            .terms-notes {
              margin-top: 20px;
              padding-top: 15px;
            }
            @page {
              margin: 1cm;
              size: A4;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-info">
              <div class="company-name">شركة النقل المتطورة</div>
              <div>الكويت، حولي</div>
              <div>هاتف: <span class="phone-ltr">+965 12345678</span></div>
              <div>info@transport.com</div>
            </div>
            <div>
              <div class="invoice-title">فاتورة ${getTypeLabel(invoice.invoice_type)}</div>
              <div class="invoice-number">رقم الفاتورة: ${invoice.invoice_number}</div>
            </div>
          </div>

          <div class="invoice-details">
            <div class="detail-section">
              <h4>معلومات الفاتورة</h4>
              <p><strong>التاريخ:</strong> ${new Date(invoice.invoice_date).toLocaleDateString('en-GB')}</p>
              <p><strong>تاريخ الاستحقاق:</strong> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-GB') : 'غير محدد'}</p>
              <p><strong>العملة:</strong> ${invoice.currency || 'KWD'}</p>
            </div>
            
            <div class="detail-section">
              <h4>من</h4>
              <p><strong>شركة النقل المتطورة</strong></p>
              <p>الكويت، حولي</p>
              <p>هاتف: <span class="phone-ltr">+965 12345678</span></p>
              <p>info@transport.com</p>
            </div>

            <div class="detail-section">
              <h4>إلى</h4>
              <p><strong>العميل</strong></p>
              <p>العنوان غير متوفر</p>
              <p>الهاتف غير متوفر</p>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>الوصف</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الضريبة</th>
                <th>المجموع</th>
              </tr>
            </thead>
            <tbody>
              ${sampleItems.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit_price.toFixed(3)} د.ك</td>
                  <td>${item.tax_rate}%</td>
                  <td>${item.total.toFixed(3)} د.ك</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td>المجموع الفرعي:</td>
                <td>${(invoice.subtotal || 225.5).toFixed(3)} د.ك</td>
              </tr>
              <tr>
                <td>الضريبة:</td>
                <td>${(invoice.tax_amount || 11.275).toFixed(3)} د.ك</td>
              </tr>
              <tr>
                <td>الخصم:</td>
                <td>-${(invoice.discount_amount || 0).toFixed(3)} د.ك</td>
              </tr>
              <tr>
                <td><strong>المجموع الإجمالي:</strong></td>
                <td><strong>${invoice.total_amount.toFixed(3)} د.ك</strong></td>
              </tr>
            </table>
          </div>

          ${(invoice.terms || invoice.notes) ? `
            <div class="terms-notes">
              ${invoice.terms ? `
                <h4>شروط الدفع</h4>
                <p>${invoice.terms}</p>
              ` : ''}
              ${invoice.notes ? `
                <h4>ملاحظات</h4>
                <p>${invoice.notes}</p>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;

    try {
      // Create a blob with the HTML content
      const blob = new Blob([invoiceContent], { type: 'text/html;charset=utf-8' });
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `فاتورة_${invoice.invoice_number}.html`;
      
      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      URL.revokeObjectURL(url);
      
      console.log('تم تحميل الفاتورة بنجاح');
    } catch (error) {
      console.error('خطأ في تحميل الفاتورة:', error);
      alert('حدث خطأ أثناء تحميل الفاتورة. يرجى المحاولة مرة أخرى.');
    }
  };

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
              <Button variant="outline" size="sm" onClick={downloadInvoiceHTML}>
                <Download className="h-4 w-4 mr-2" />
                تحميل الفاتورة
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
                    <p><span className="font-medium">التاريخ:</span> {new Date(invoice.invoice_date).toLocaleDateString('en-GB')}</p>
                    <p><span className="font-medium">تاريخ الاستحقاق:</span> {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-GB') : 'غير محدد'}</p>
                    <p><span className="font-medium">العملة:</span> {invoice.currency || 'KWD'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">من</h4>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">شركة النقل المتطورة</p>
                    <p>الكويت، حولي</p>
                    <p>هاتف: <span dir="ltr">+965 12345678</span></p>
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