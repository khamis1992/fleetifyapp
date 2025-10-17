import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLatePaymentCustomers } from '@/hooks/usePaymentLegalIntegration';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Download, 
  AlertTriangle,
  Users,
  Calendar,
  DollarSign,
  Printer
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { HelpIcon } from '@/components/help/HelpIcon';
import { financialHelpContent } from '@/data/helpContent';

interface LegalReport {
  id: string;
  report_number: string;
  customers: any[];
  total_amount: number;
  created_date: string;
  status: 'draft' | 'ready' | 'submitted';
}

export const LegalReports: React.FC = () => {
  const { data: lateCustomers, isLoading } = useLatePaymentCustomers();
  const [reports, setReports] = useState<LegalReport[]>([]);

  // Automatically group customers into reports of 4
  useEffect(() => {
    if (!lateCustomers) return;

    // Filter customers with 30+ days overdue
    const eligibleCustomers = lateCustomers.filter(c => c.days_overdue >= 30);

    if (eligibleCustomers.length === 0) {
      setReports([]);
      return;
    }

    // Group into batches of 4
    const groupedReports: LegalReport[] = [];
    for (let i = 0; i < eligibleCustomers.length; i += 4) {
      const batch = eligibleCustomers.slice(i, i + 4);
      const totalAmount = batch.reduce((sum, c) => sum + c.total_outstanding, 0);
      
      groupedReports.push({
        id: `report-${i / 4 + 1}`,
        report_number: `RPT-${String(i / 4 + 1).padStart(4, '0')}`,
        customers: batch,
        total_amount: totalAmount,
        created_date: new Date().toISOString(),
        status: 'ready',
      });
    }

    setReports(groupedReports);
  }, [lateCustomers]);

  const handlePrintReport = (report: LegalReport) => {
    // Create a printable HTML document
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>بلاغ قانوني - ${report.report_number}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            direction: rtl;
            padding: 40px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #333;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #333;
            margin: 0;
          }
          .header p {
            color: #666;
            margin: 5px 0;
          }
          .report-info {
            margin-bottom: 30px;
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
          }
          .report-info table {
            width: 100%;
          }
          .report-info td {
            padding: 8px;
          }
          .report-info td:first-child {
            font-weight: bold;
            width: 150px;
          }
          .customers-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .customers-table th,
          .customers-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: right;
          }
          .customers-table th {
            background-color: #333;
            color: white;
            font-weight: bold;
          }
          .customers-table tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .customer-details {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          .customer-details h3 {
            background: #333;
            color: white;
            padding: 10px;
            margin: 0;
          }
          .customer-details .details-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            padding: 20px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .detail-item {
            display: flex;
            flex-direction: column;
          }
          .detail-label {
            font-weight: bold;
            color: #666;
            font-size: 0.9em;
            margin-bottom: 5px;
          }
          .detail-value {
            color: #333;
            font-size: 1.1em;
          }
          .summary {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
          }
          .summary h3 {
            margin-top: 0;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #333;
            text-align: center;
            color: #666;
          }
          @media print {
            body {
              padding: 20px;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>بلاغ قانوني</h1>
          <p>تأخر عن سداد الإيجار الشهري</p>
        </div>

        <div class="report-info">
          <table>
            <tr>
              <td>رقم البلاغ:</td>
              <td><strong>${report.report_number}</strong></td>
            </tr>
            <tr>
              <td>تاريخ الإصدار:</td>
              <td>${format(new Date(report.created_date), 'dd MMMM yyyy', { locale: ar })}</td>
            </tr>
            <tr>
              <td>عدد المخالفين:</td>
              <td>${report.customers.length} عميل</td>
            </tr>
            <tr>
              <td>إجمالي المبالغ المستحقة:</td>
              <td><strong>${formatCurrency(report.total_amount)}</strong></td>
            </tr>
          </table>
        </div>

        <h2>ملخص المخالفين</h2>
        <table class="customers-table">
          <thead>
            <tr>
              <th>#</th>
              <th>اسم العميل</th>
              <th>رقم العقد</th>
              <th>أيام التأخير</th>
              <th>المبلغ المستحق</th>
            </tr>
          </thead>
          <tbody>
            ${report.customers.map((customer, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${customer.customer_name}</td>
                <td>${customer.contract_number}</td>
                <td>${customer.days_overdue} يوم</td>
                <td>${formatCurrency(customer.total_outstanding)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>التفاصيل المالية لكل عميل</h2>
        ${report.customers.map((customer, index) => `
          <div class="customer-details">
            <h3>العميل ${index + 1}: ${customer.customer_name}</h3>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">رقم العقد</span>
                <span class="detail-value">${customer.contract_number}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">رقم المركبة</span>
                <span class="detail-value">${customer.vehicle_plate || 'غير متوفر'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">الإيجار الشهري</span>
                <span class="detail-value">${formatCurrency(customer.monthly_rent)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">عدد الأشهر غير المدفوعة</span>
                <span class="detail-value">${customer.unpaid_months} شهر</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">إجمالي المبلغ المستحق</span>
                <span class="detail-value" style="color: #dc2626; font-weight: bold;">${formatCurrency(customer.total_outstanding)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">الغرامات المتراكمة</span>
                <span class="detail-value">${formatCurrency(customer.total_fines)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">أيام التأخير</span>
                <span class="detail-value">${customer.days_overdue} يوم</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">آخر دفعة</span>
                <span class="detail-value">${customer.last_payment_date ? format(new Date(customer.last_payment_date), 'dd MMM yyyy', { locale: ar }) : 'لا يوجد'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">رقم الهاتف</span>
                <span class="detail-value">${customer.customer_phone || 'غير متوفر'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">البريد الإلكتروني</span>
                <span class="detail-value">${customer.customer_email || 'غير متوفر'}</span>
              </div>
            </div>
          </div>
        `).join('')}

        <div class="summary">
          <h3>الملخص المالي الإجمالي</h3>
          <table>
            <tr>
              <td><strong>إجمالي المبالغ المستحقة:</strong></td>
              <td><strong style="color: #dc2626;">${formatCurrency(report.total_amount)}</strong></td>
            </tr>
            <tr>
              <td><strong>إجمالي الغرامات:</strong></td>
              <td><strong>${formatCurrency(report.customers.reduce((sum, c) => sum + c.total_fines, 0))}</strong></td>
            </tr>
            <tr>
              <td><strong>متوسط أيام التأخير:</strong></td>
              <td><strong>${Math.round(report.customers.reduce((sum, c) => sum + c.days_overdue, 0) / report.customers.length)} يوم</strong></td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <p>تم إنشاء هذا البلاغ تلقائياً بواسطة نظام Fleetify</p>
          <p>${format(new Date(), 'dd MMMM yyyy - HH:mm', { locale: ar })}</p>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">طباعة</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
             <div>
               <div className="flex items-center gap-2">
                 <CardTitle className="text-2xl">البلاغات القانونية</CardTitle>
                 <HelpIcon
                   title={financialHelpContent.legalReports.title}
                   content={financialHelpContent.legalReports.content}
                   examples={financialHelpContent.legalReports.examples}
                   size="md"
                 />
               </div>
              <CardDescription className="text-base mt-1">
                بلاغات تجمع 4 عملاء متأخرين لكل بلاغ (بعد 30 يوم من التأخير)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي البلاغات</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">
              بلاغ جاهز للتقديم
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المخالفين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.reduce((sum, r) => sum + r.customers.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              عميل متأخر
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبالغ</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(reports.reduce((sum, r) => sum + r.total_amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              مبالغ مستحقة
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة البلاغات</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{report.report_number}</CardTitle>
                        <CardDescription>
                          {report.customers.length} عملاء • {formatCurrency(report.total_amount)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintReport(report)}
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          طباعة
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handlePrintReport(report)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          تحميل
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>اسم العميل</TableHead>
                            <TableHead>رقم العقد</TableHead>
                            <TableHead>أيام التأخير</TableHead>
                            <TableHead>الأشهر غير المدفوعة</TableHead>
                            <TableHead>المبلغ المستحق</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.customers.map((customer, index) => (
                            <TableRow key={customer.customer_id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">{customer.customer_name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{customer.contract_number}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive">{customer.days_overdue} يوم</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive">{customer.unpaid_months} شهر</Badge>
                              </TableCell>
                              <TableCell className="font-bold text-destructive">
                                {formatCurrency(customer.total_outstanding)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                لا توجد بلاغات جاهزة حالياً. يتم إنشاء البلاغات تلقائياً للعملاء المتأخرين عن الدفع لمدة 30 يوم أو أكثر.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>ملاحظة:</strong> يتم تجميع العملاء المتأخرين تلقائياً في بلاغات، كل بلاغ يحتوي على 4 عملاء كحد أقصى.
          يتم إنشاء البلاغات فقط للعملاء الذين تجاوزت متأخراتهم 30 يوماً.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default LegalReports;

