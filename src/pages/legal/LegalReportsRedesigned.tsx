/**
 * صفحة البلاغات القانونية - تصميم SaaS احترافي
 * Legal Reports Page - Professional SaaS Design
 *
 * Generates legal reports for late payment customers (30+ days overdue)
 * Groups customers into batches of 4 per report automatically
 *
 * @component LegalReportsRedesigned
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
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
  Printer,
  HelpCircle,
  Scale,
  ChevronDown,
  ChevronUp,
  FileWarning,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { HelpIcon } from '@/components/help/HelpIcon';
import { financialHelpContent } from '@/data/helpContent';
import { cn } from '@/lib/utils';

interface LegalReport {
  id: string;
  report_number: string;
  customers: any[];
  total_amount: number;
  created_date: string;
  status: 'draft' | 'ready' | 'submitted';
}

export const LegalReportsRedesigned: React.FC = () => {
  const { data: lateCustomers, isLoading } = useLatePaymentCustomers();
  const [reports, setReports] = useState<LegalReport[]>([]);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

  // Toggle report expansion
  const toggleReport = (reportId: string) => {
    setExpandedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

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
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Cairo', sans-serif;
            direction: rtl;
            padding: 40px;
            line-height: 1.6;
            background: #f8fafc;
            color: #1e293b;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #dc2626;
          }
          .header h1 {
            color: #dc2626;
            font-size: 28px;
            margin: 0 0 10px 0;
            font-weight: 700;
          }
          .header p {
            color: #64748b;
            font-size: 14px;
            margin: 5px 0;
          }
          .report-badge {
            display: inline-block;
            background: #fef2f2;
            color: #dc2626;
            padding: 8px 20px;
            border-radius: 8px;
            font-weight: 600;
            margin-top: 10px;
          }
          .report-info {
            margin-bottom: 30px;
            background: #f1f5f9;
            padding: 20px;
            border-radius: 12px;
          }
          .report-info table {
            width: 100%;
          }
          .report-info td {
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
          }
          .report-info tr:last-child td {
            border-bottom: none;
          }
          .report-info td:first-child {
            font-weight: 600;
            color: #475569;
            width: 180px;
          }
          .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #1e293b;
            margin: 30px 0 15px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          .customers-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .customers-table th {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            padding: 14px;
            text-align: right;
            font-weight: 600;
          }
          .customers-table th:first-child {
            border-radius: 0 8px 0 0;
          }
          .customers-table th:last-child {
            border-radius: 8px 0 0 0;
          }
          .customers-table td {
            padding: 14px;
            border-bottom: 1px solid #e2e8f0;
            text-align: right;
          }
          .customers-table tr:last-child td {
            border-bottom: none;
          }
          .customers-table tr:nth-child(even) {
            background: #f8fafc;
          }
          .badge-danger {
            background: #fef2f2;
            color: #dc2626;
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 13px;
          }
          .customer-details {
            margin-bottom: 40px;
            page-break-inside: avoid;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
          }
          .customer-header {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            padding: 15px 20px;
            font-weight: 600;
            font-size: 16px;
          }
          .details-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            padding: 20px;
          }
          .detail-item {
            display: flex;
            flex-direction: column;
          }
          .detail-label {
            font-weight: 600;
            color: #64748b;
            font-size: 13px;
            margin-bottom: 5px;
          }
          .detail-value {
            color: #1e293b;
            font-size: 15px;
            font-weight: 500;
          }
          .detail-value.amount {
            color: #dc2626;
            font-weight: 700;
            font-size: 16px;
          }
          .summary {
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            padding: 25px;
            border-radius: 12px;
            margin-top: 30px;
            border: 1px solid #fecaca;
          }
          .summary h3 {
            margin-top: 0;
            margin-bottom: 15px;
            color: #dc2626;
            font-size: 18px;
          }
          .summary table {
            width: 100%;
          }
          .summary td {
            padding: 10px;
            border-bottom: 1px solid #fecaca;
          }
          .summary tr:last-child td {
            border-bottom: none;
          }
          .summary td:first-child {
            font-weight: 600;
          }
          .summary td:last-child {
            font-weight: 700;
            color: #dc2626;
            font-size: 16px;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 13px;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>بلاغ قانوني</h1>
            <p>تأخر عن سداد الإيجار الشهري</p>
            <div class="report-badge">${report.report_number}</div>
          </div>

          <div class="report-info">
            <table>
              <tr>
                <td>تاريخ الإصدار:</td>
                <td>${format(new Date(report.created_date), 'dd MMMM yyyy', { locale: ar })}</td>
              </tr>
              <tr>
                <td>عدد المخالفين:</td>
                <td><strong>${report.customers.length} عميل</strong></td>
              </tr>
              <tr>
                <td>إجمالي المبالغ المستحقة:</td>
                <td><strong style="color: #dc2626; font-size: 18px;">${formatCurrency(report.total_amount)}</strong></td>
              </tr>
            </table>
          </div>

          <div class="section-title">ملخص المخالفين</div>
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
                  <td><strong>${index + 1}</strong></td>
                  <td>${customer.customer_name}</td>
                  <td><span class="badge-danger">${customer.contract_number}</span></td>
                  <td><span class="badge-danger">${customer.days_overdue} يوم</span></td>
                  <td><strong style="color: #dc2626;">${formatCurrency(customer.total_outstanding)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">التفاصيل المالية لكل عميل</div>
          ${report.customers.map((customer, index) => `
            <div class="customer-details">
              <div class="customer-header">العميل ${index + 1}: ${customer.customer_name}</div>
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
                  <span class="detail-value amount">${formatCurrency(customer.total_outstanding)}</span>
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
                <td>إجمالي المبالغ المستحقة:</td>
                <td>${formatCurrency(report.total_amount)}</td>
              </tr>
              <tr>
                <td>إجمالي الغرامات:</td>
                <td>${formatCurrency(report.customers.reduce((sum, c) => sum + c.total_fines, 0))}</td>
              </tr>
              <tr>
                <td>متوسط أيام التأخير:</td>
                <td>${Math.round(report.customers.reduce((sum, c) => sum + c.days_overdue, 0) / report.customers.length)} يوم</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>تم إنشاء هذا البلاغ تلقائياً بواسطة نظام Fleetify</p>
            <p>${format(new Date(), 'dd MMMM yyyy - HH:mm', { locale: ar })}</p>
          </div>

          <div class="no-print" style="text-align: center; margin-top: 30px;">
            <button onclick="window.print()" style="padding: 12px 40px; font-size: 16px; cursor: pointer; background: #dc2626; color: white; border: none; border-radius: 8px; font-weight: 600;">طباعة البلاغ</button>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Calculate statistics
  const totalViolators = reports.reduce((sum, r) => sum + r.customers.length, 0);
  const totalAmounts = reports.reduce((sum, r) => sum + r.total_amount, 0);

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">البلاغات القانونية</h1>
                <HelpIcon
                  title={financialHelpContent.legalReports.title}
                  content={financialHelpContent.legalReports.content}
                  examples={financialHelpContent.legalReports.examples}
                  size="md"
                />
              </div>
              <p className="text-sm text-slate-500 mt-1">
                بلاغات تجمع 4 عملاء متأخرين لكل بلاغ (بعد 30 يوم من التأخير)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Reports */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-rose-50 text-rose-700 border-rose-200">
                بلاغ
              </Badge>
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-4">{reports.length}</p>
            <p className="text-sm text-slate-500 mt-1">إجمالي البلاغات الجاهزة</p>
          </motion.div>

          {/* Total Violators */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                <Users className="w-6 h-6 text-white" />
              </div>
              <Badge variant="outline" className="border-amber-200 text-amber-700">
                عميل
              </Badge>
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-4">{totalViolators}</p>
            <p className="text-sm text-slate-500 mt-1">إجمالي المخالفين</p>
          </motion.div>

          {/* Total Amounts */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-6 hover:shadow-xl transition-all shadow-lg shadow-rose-200"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-white/30">
                مبالغ
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white mt-4">{formatCurrency(totalAmounts)}</p>
            <p className="text-sm text-rose-100 mt-1">إجمالي المبالغ المستحقة</p>
          </motion.div>
        </div>

        {/* Info Alert */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Alert className="bg-sky-50 border-sky-200">
            <ShieldAlert className="h-4 w-4 text-sky-600" />
            <AlertDescription className="text-sky-700">
              <strong>ملاحظة:</strong> يتم تجميع العملاء المتأخرين تلقائياً في بلاغات، كل بلاغ يحتوي على 4 عملاء كحد أقصى.
              يتم إنشاء البلاغات فقط للعملاء الذين تجاوزت متأخراتهم 30 يوماً.
            </AlertDescription>
          </Alert>
        </motion.div>

        {/* Reports List */}
        {reports.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {reports.map((report, index) => {
                const isExpanded = expandedReports.has(report.id);
                const maxDays = Math.max(...report.customers.map(c => c.days_overdue));

                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all"
                  >
                    {/* Report Header */}
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center shadow-lg">
                            <FileWarning className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-bold text-slate-900">{report.report_number}</h3>
                              <Badge className={cn(
                                "bg-slate-100 text-slate-700 border-slate-300"
                              )}>
                                #{index + 1}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                              {report.customers.length} عملاء • {formatCurrency(report.total_amount)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintReport(report)}
                            className="rounded-xl gap-2"
                          >
                            <Printer className="w-4 h-4" />
                            طباعة
                          </Button>
                          <Button
                            onClick={() => handlePrintReport(report)}
                            className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 rounded-xl gap-2 shadow-lg shadow-rose-200"
                          >
                            <Download className="w-4 h-4" />
                            تحميل البلاغ
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleReport(report.id)}
                            className="rounded-xl"
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </Button>
                        </div>
                      </div>

                      {/* Severity Indicator */}
                      <div className="mt-4 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(maxDays / 180) * 100}%` }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                            className={cn(
                              "h-full rounded-full",
                              maxDays > 90 ? "bg-rose-500" :
                              maxDays > 60 ? "bg-orange-500" :
                              maxDays > 30 ? "bg-amber-500" :
                              "bg-emerald-500"
                            )}
                          />
                        </div>
                        <span className={cn(
                          "text-xs font-semibold px-2 py-1 rounded-full",
                          maxDays > 90 ? "bg-rose-100 text-rose-700" :
                          maxDays > 60 ? "bg-orange-100 text-orange-700" :
                          maxDays > 30 ? "bg-amber-100 text-amber-700" :
                          "bg-emerald-100 text-emerald-700"
                        )}>
                          حتى {maxDays} يوم تأخير
                        </span>
                      </div>
                    </div>

                    {/* Expandable Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-slate-100"
                        >
                          <div className="p-6">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12">#</TableHead>
                                  <TableHead>اسم العميل</TableHead>
                                  <TableHead>رقم العقد</TableHead>
                                  <TableHead>أيام التأخير</TableHead>
                                  <TableHead>الأشهر غير المدفوعة</TableHead>
                                  <TableHead className="text-left">المبلغ المستحق</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {report.customers.map((customer, idx) => (
                                  <TableRow key={customer.customer_id}>
                                    <TableCell className="font-medium text-slate-500">{idx + 1}</TableCell>
                                    <TableCell className="font-semibold text-slate-900">{customer.customer_name}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="font-mono text-xs">
                                        {customer.contract_number}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={cn(
                                        "font-semibold",
                                        customer.days_overdue > 90 ? "bg-rose-100 text-rose-700 border-rose-300" :
                                        customer.days_overdue > 60 ? "bg-orange-100 text-orange-700 border-orange-300" :
                                        "bg-amber-100 text-amber-700 border-amber-300"
                                      )}>
                                        {customer.days_overdue} يوم
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge className="bg-rose-100 text-rose-700 border-rose-300 font-semibold">
                                        {customer.unpaid_months} شهر
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="font-bold text-rose-600 text-left">
                                      {formatCurrency(customer.total_outstanding)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert className="bg-slate-50 border-slate-200">
              <FileText className="h-4 w-4 text-slate-400" />
              <AlertDescription className="text-slate-600">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Scale className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-lg font-semibold text-slate-900 mb-2">لا توجد بلاغات جاهزة حالياً</p>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    يتم إنشاء البلاغات تلقائياً للعملاء المتأخرين عن الدفع لمدة 30 يوم أو أكثر.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LegalReportsRedesigned;
