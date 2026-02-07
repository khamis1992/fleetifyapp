import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Wallet, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const InvoicesTab = ({
  invoices,
  onInvoiceClick,
  violations = [],
  customerName,
  customerPhone,
  customerIdNumber
}: {
  invoices: any[],
  onInvoiceClick: (invoice: any) => void,
  violations?: any[],
  customerName?: string,
  customerPhone?: string,
  customerIdNumber?: string
}) => {
  const totalOutstanding = useMemo(() => {
    return invoices
      .filter(inv => inv.payment_status !== 'paid')
      .reduce((sum, inv) => sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0);
  }, [invoices]);

  const outstandingInvoices = useMemo(() => {
    return invoices.filter(inv => inv.payment_status !== 'paid');
  }, [invoices]);

  const unpaidViolations = useMemo(() => {
    return violations.filter(v => v.payment_status !== 'paid' && v.status !== 'paid');
  }, [violations]);

  const totalViolationsAmount = useMemo(() => {
    return unpaidViolations.reduce((sum, v) => sum + (v.fine_amount || v.amount || 0), 0);
  }, [unpaidViolations]);

  const handlePrintOutstandingStatement = () => {
    const statementNumber = `STM-${Date.now().toString().slice(-8)}`;
    const currentDateAr = new Date().toLocaleDateString('ar-QA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const COMPANY_INFO = {
      name_ar: 'شركة العراف لتأجير السيارات',
      name_en: 'AL-ARAF CAR RENTAL L.L.C',
      logo: '/receipts/logo.png',
      address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
      phone: '31411919',
      email: 'info@alaraf.qa',
      cr: '146832',
    };

    const totalDue = totalOutstanding + totalViolationsAmount;
    
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>كشف المستحقات المالية - ${statementNumber}</title>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <style>
          @page { size: A4; margin: 15mm 20mm 20mm 20mm; }
          @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            body { margin: 0; padding: 0; }
            .statement-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 20px 30px !important; border: none !important; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Traditional Arabic', 'Times New Roman', 'Arial', serif; font-size: 14px; line-height: 1.8; color: #000; background: #fff; margin: 0; padding: 20px; direction: rtl; }
          .statement-container { max-width: 210mm; margin: 0 auto; padding: 20px 30px; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px double #1e3a5f; padding-bottom: 15px; margin-bottom: 15px; }
          .company-ar { flex: 1; text-align: right; }
          .company-ar h1 { color: #1e3a5f; margin: 0; font-size: 20px; font-weight: bold; }
          .company-ar p { color: #000; margin: 2px 0; font-size: 11px; }
          .logo-container { flex: 0 0 130px; text-align: center; padding: 0 15px; }
          .logo-container img { max-height: 70px; max-width: 120px; }
          .company-en { flex: 1; text-align: left; }
          .company-en h1 { color: #1e3a5f; margin: 0; font-size: 14px; font-weight: bold; }
          .company-en p { color: #000; margin: 2px 0; font-size: 10px; }
          .address-bar { text-align: center; color: #000; font-size: 10px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #ccc; }
          .ref-date { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; color: #000; }
          .subject-box { background: #1e3a5f; color: #fff; padding: 15px 20px; margin-bottom: 20px; font-size: 18px; text-align: center; font-weight: bold; border: 2px solid #1e3a5f; }
          .warning-text { border: 1px solid #1e3a5f; padding: 12px 20px; margin-bottom: 25px; text-align: center; color: #1e3a5f; font-size: 14px; }
          .info-box { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; border-right: 4px solid #1e3a5f; }
          .info-row { display: flex; justify-content: flex-start; gap: 15px; padding: 5px 0; border-bottom: 1px dotted #ddd; }
          .info-row:last-child { border-bottom: none; }
          .info-label { font-weight: bold; color: #1e3a5f; min-width: 100px; }
          .section-title { font-size: 16px; font-weight: bold; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin: 25px 0 15px 0; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid #1e3a5f; }
          th { background: #1e3a5f; color: white; padding: 10px 8px; text-align: right; font-size: 12px; font-weight: bold; border: 1px solid #1e3a5f; }
          td { padding: 8px; border: 1px solid #ccc; font-size: 12px; }
          tr:nth-child(even) { background: #f9f9f9; }
          .amount-cell { font-weight: bold; color: #c53030; }
          .status-overdue { background: #fed7d7; color: #c53030; padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: bold; }
          .status-pending { background: #feebc8; color: #c05621; padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: bold; }
          .grand-total { border: 3px double #1e3a5f; padding: 20px; margin: 25px 0; text-align: center; }
          .grand-total .label { font-size: 14px; margin-bottom: 8px; color: #1e3a5f; font-weight: bold; }
          .grand-total .amount { font-size: 26px; font-weight: bold; color: #1e3a5f; }
          .payment-notice { border: 1px solid #1e3a5f; padding: 15px 20px; margin: 25px 0; }
          .payment-notice h4 { color: #1e3a5f; margin-bottom: 10px; font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
          .payment-notice p { color: #333; font-size: 13px; margin: 5px 0; padding-right: 15px; }
          .signature-section { margin-top: 40px; padding-top: 20px; border-top: 2px solid #1e3a5f; }
          .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
          .signature-box { text-align: center; width: 180px; }
          .sign-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; font-size: 12px; color: #666; }
          .stamp-area { text-align: center; }
          .stamp-placeholder { display: inline-block; width: 80px; height: 80px; border: 2px dashed #ccc; border-radius: 50%; line-height: 80px; color: #999; font-size: 11px; }
          .footer { text-align: center; color: #000; font-size: 10px; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <div class="statement-container">
          <div class="header">
            <div class="company-ar">
              <h1>${COMPANY_INFO.name_ar}</h1>
              <p>ذ.م.م</p>
              <p>س.ت: ${COMPANY_INFO.cr}</p>
            </div>
            <div class="logo-container">
              <img src="${COMPANY_INFO.logo}" alt="شعار الشركة" onerror="this.style.display='none'" />
            </div>
            <div class="company-en" dir="ltr">
              <h1>${COMPANY_INFO.name_en}</h1>
              <p>C.R: ${COMPANY_INFO.cr}</p>
            </div>
          </div>
          <div class="address-bar">
            ${COMPANY_INFO.address}<br/>
            هاتف: ${COMPANY_INFO.phone} | البريد الإلكتروني: ${COMPANY_INFO.email}
          </div>
          <div class="ref-date">
            <div><strong>رقم الكشف:</strong> ${statementNumber}</div>
            <div><strong>التاريخ:</strong> ${currentDateAr}</div>
          </div>
          <div class="subject-box">كشف المستحقات المالية</div>
          <div class="warning-text">نحيطكم علماً بأن الكشف أدناه يوضح المستحقات المالية المترتبة عليكم، ونأمل منكم التكرم بسدادها في أقرب وقت ممكن.</div>
          <div class="info-box">
            <div class="info-row"><span class="info-label">اسم العميل:</span><span>${customerName || 'غير محدد'}</span></div>
            ${customerIdNumber ? `<div class="info-row"><span class="info-label">رقم الهوية:</span><span>${customerIdNumber}</span></div>` : ''}
            ${customerPhone ? `<div class="info-row"><span class="info-label">رقم الهاتف:</span><span>${customerPhone}</span></div>` : ''}
          </div>
          ${outstandingInvoices.length > 0 ? `
          <div class="section-title">أولاً: الفواتير المستحقة (${outstandingInvoices.length})</div>
          <table>
            <thead><tr><th style="width: 35px;">م</th><th>رقم الفاتورة</th><th>التاريخ</th><th>تاريخ الاستحقاق</th><th>المبلغ الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead>
            <tbody>
              ${outstandingInvoices.map((invoice, index) => {
                const outstanding = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
                const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date();
                return `<tr><td style="text-align: center;">${index + 1}</td><td>${invoice.invoice_number || 'INV-' + (invoice.id?.substring(0, 8) || '-')}</td><td>${invoice.invoice_date ? format(new Date(invoice.invoice_date), 'dd/MM/yyyy') : '-'}</td><td>${invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : '-'}</td><td>${(invoice.total_amount || 0).toLocaleString()} ر.ق</td><td>${(invoice.paid_amount || 0).toLocaleString()} ر.ق</td><td class="amount-cell">${outstanding.toLocaleString()} ر.ق</td><td style="text-align: center;"><span class="${isOverdue ? 'status-overdue' : 'status-pending'}">${isOverdue ? 'متأخر' : 'مستحق'}</span></td></tr>`;
              }).join('')}
            </tbody>
            <tfoot><tr style="background: #1e3a5f; color: white;"><td colspan="6" style="text-align: left; font-weight: bold; border-color: #1e3a5f;">إجمالي الفواتير المستحقة</td><td colspan="2" style="font-weight: bold; font-size: 14px; border-color: #1e3a5f;">${totalOutstanding.toLocaleString()} ر.ق</td></tr></tfoot>
          </table>` : ''}
          ${unpaidViolations.length > 0 ? `
          <div class="section-title">ثانياً: المخالفات المرورية غير المسددة (${unpaidViolations.length})</div>
          <table>
            <thead><tr><th style="width: 35px;">م</th><th>رقم المخالفة</th><th>تاريخ المخالفة</th><th>نوع المخالفة</th><th>رقم اللوحة</th><th>المبلغ</th></tr></thead>
            <tbody>
              ${unpaidViolations.map((violation, index) => `<tr><td style="text-align: center;">${index + 1}</td><td>${violation.violation_number || violation.ticket_number || '-'}</td><td>${violation.violation_date ? format(new Date(violation.violation_date), 'dd/MM/yyyy') : '-'}</td><td>${violation.violation_type || violation.description || '-'}</td><td>${violation.plate_number || '-'}</td><td class="amount-cell">${(violation.fine_amount || violation.amount || 0).toLocaleString()} ر.ق</td></tr>`).join('')}
            </tbody>
            <tfoot><tr style="background: #1e3a5f; color: white;"><td colspan="5" style="text-align: left; font-weight: bold; border-color: #1e3a5f;">إجمالي المخالفات المرورية</td><td style="font-weight: bold; font-size: 14px; border-color: #1e3a5f;">${totalViolationsAmount.toLocaleString()} ر.ق</td></tr></tfoot>
          </table>` : ''}
          <div class="grand-total"><div class="label">إجمالي المبلغ المستحق</div><div class="amount">${totalDue.toLocaleString()} ر.ق</div></div>
          <div class="payment-notice"><h4>طرق السداد المتاحة:</h4><p>1. الدفع نقداً في مقر الشركة</p><p>2. التحويل البنكي</p><p>3. الدفع عبر البطاقة الائتمانية</p><p style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;"><strong>للاستفسار والسداد يرجى التواصل على الرقم: ${COMPANY_INFO.phone}</strong></p></div>
          <div class="signature-section"><div class="signatures"><div class="signature-box"><div class="sign-line">توقيع العميل</div></div><div class="stamp-area"><div class="stamp-placeholder">الختم</div></div><div class="signature-box"><p style="font-weight: bold; color: #1e3a5f;">${COMPANY_INFO.name_ar}</p><div class="sign-line">التوقيع</div></div></div></div>
          <div class="footer">${COMPANY_INFO.address}<br/>هاتف: ${COMPANY_INFO.phone} | البريد: ${COMPANY_INFO.email}</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  const hasOutstandingItems = outstandingInvoices.length > 0 || unpaidViolations.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-teal-900">الفواتير</h4>
            <p className="text-xs text-teal-600/70">{invoices.length} فاتورة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasOutstandingItems && (
            <Button
              variant="outline"
              className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              onClick={handlePrintOutstandingStatement}
            >
              <Printer className="w-4 h-4" />
              طباعة كشف المستحقات
            </Button>
          )}
          {totalOutstanding > 0 && (
            <Badge className="bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg font-medium">
              مستحق: {totalOutstanding.toLocaleString()} ر.ق
            </Badge>
          )}
        </div>
      </div>

      {invoices.length > 0 ? (
        <div className="space-y-3">
          {invoices.map((invoice, index) => {
            const outstanding = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
            const isPaid = invoice.payment_status === 'paid';
            const isOverdue = !isPaid && invoice.due_date && new Date(invoice.due_date) < new Date();

            return (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md backdrop-blur-sm",
                  isPaid
                    ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 hover:border-emerald-300"
                    : isOverdue
                    ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 hover:border-red-300"
                    : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 hover:border-amber-300"
                )}
                onClick={() => onInvoiceClick(invoice)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    isPaid
                      ? "bg-emerald-100 text-emerald-600"
                      : isOverdue
                      ? "bg-red-100 text-red-600"
                      : "bg-amber-100 text-amber-600"
                  )}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{invoice.invoice_number || `INV-${invoice.id.substring(0, 8)}`}</p>
                    <p className="text-xs text-slate-600">
                      {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'dd/MM/yyyy') : invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : '-'}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={cn(
                    "font-bold",
                    isPaid ? "text-emerald-600" : isOverdue ? "text-red-600" : "text-amber-600"
                  )}>
                    {invoice.total_amount?.toLocaleString()} ر.ق
                  </p>
                  <Badge className={cn(
                    "text-[10px] px-2 py-0.5 rounded-md font-medium border",
                    isPaid
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : isOverdue
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-amber-100 text-amber-700 border-amber-200"
                  )}>
                    {isPaid ? 'مسدد' : isOverdue ? 'متأخر' : 'مستحق'}
                  </Badge>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-12 text-center border border-teal-100">
          <Wallet className="w-12 h-12 text-teal-300 mx-auto mb-3" />
          <p className="text-teal-600 font-medium">لا توجد فواتير لهذا العميل</p>
        </div>
      )}
    </motion.div>
  );
};

export default InvoicesTab;
