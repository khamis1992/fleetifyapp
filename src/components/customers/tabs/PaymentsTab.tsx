import { motion } from 'framer-motion';
import { CreditCard, Plus, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { NavigateFunction } from 'react-router-dom';

const PaymentsTab = ({ payments, navigate, onAddPayment, customerName, customerPhone, customerIdNumber }: { 
  payments: any[], 
  navigate: NavigateFunction, 
  onAddPayment: () => void, 
  customerName?: string,
  customerPhone?: string,
  customerIdNumber?: string 
}) => {
  
  const handlePrintPayments = () => {
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const completedPayments = payments.filter(p => p.payment_status === 'completed');
    const completedAmount = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const receiptNumber = `RCP-${Date.now().toString().slice(-8)}`;
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
      authorized_signatory: 'شركة العراف لتأجير السيارات',
      authorized_title: '',
    };
    
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>إيصال سداد رسمي - ${receiptNumber}</title>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <style>
          @page { size: A4; margin: 15mm 20mm 20mm 20mm; }
          @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            body { margin: 0; padding: 0; }
            .receipt-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 20px 30px !important; border: none !important; box-shadow: none !important; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Traditional Arabic', 'Times New Roman', 'Arial', serif; font-size: 14px; line-height: 1.8; color: #000; background: #fff; margin: 0; padding: 20px; direction: rtl; }
          .receipt-container { max-width: 210mm; margin: 0 auto; padding: 20px 30px; background: #fff; }
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
          .subject-box { background: #1e3a5f; color: #fff; padding: 12px 15px; margin-bottom: 20px; font-size: 16px; text-align: center; font-weight: bold; }
          .info-box { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; border-right: 4px solid #1e3a5f; }
          .info-row { display: flex; justify-content: flex-start; gap: 15px; padding: 5px 0; border-bottom: 1px dotted #ddd; }
          .info-row:last-child { border-bottom: none; }
          .info-label { font-weight: bold; color: #1e3a5f; min-width: 100px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid #1e3a5f; }
          th { background: #1e3a5f; color: white; padding: 12px 10px; text-align: right; font-size: 13px; font-weight: bold; border: 1px solid #1e3a5f; }
          td { padding: 10px; border: 1px solid #ccc; font-size: 13px; }
          tr:nth-child(even) { background: #f9f9f9; }
          .amount-cell { font-weight: bold; color: #1e3a5f; }
          .status-completed { background: #d4edda; color: #155724; padding: 4px 10px; border-radius: 3px; font-size: 11px; font-weight: bold; border: 1px solid #c3e6cb; }
          .status-pending { background: #fff3cd; color: #856404; padding: 4px 10px; border-radius: 3px; font-size: 11px; font-weight: bold; border: 1px solid #ffc107; }
          .totals-section { margin: 20px 0; border: 2px solid #1e3a5f; border-radius: 5px; overflow: hidden; }
          .totals-row { display: flex; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid #ddd; }
          .totals-row:last-child { border-bottom: none; background: #1e3a5f; color: white; }
          .totals-row:last-child .totals-value { color: white; }
          .totals-label { font-weight: bold; }
          .totals-value { font-weight: bold; font-size: 16px; color: #1e3a5f; }
          .signature-section { margin-top: 40px; padding-top: 20px; border-top: 2px solid #1e3a5f; }
          .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
          .signature-box { text-align: center; width: 180px; }
          .signatory { text-align: center; }
          .signatory .company-name { font-weight: bold; color: #1e3a5f; font-size: 14px; margin-bottom: 5px; }
          .sign-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; font-size: 12px; color: #666; }
          .stamp-area { text-align: center; }
          .stamp-placeholder { display: inline-block; width: 100px; height: 100px; border: 2px dashed #ccc; border-radius: 50%; line-height: 100px; color: #999; font-size: 12px; }
          .footer { text-align: center; color: #000; font-size: 10px; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; }
          .legal-notice { text-align: center; font-size: 11px; color: #666; margin-top: 20px; padding: 10px; background: #f9f9f9; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <div class="company-ar"><h1>${COMPANY_INFO.name_ar}</h1><p>ذ.م.م</p><p>س.ت: ${COMPANY_INFO.cr}</p></div>
            <div class="logo-container"><img src="${COMPANY_INFO.logo}" alt="شعار الشركة" onerror="this.style.display='none'" /></div>
            <div class="company-en" dir="ltr"><h1>${COMPANY_INFO.name_en}</h1><p>C.R: ${COMPANY_INFO.cr}</p></div>
          </div>
          <div class="address-bar">${COMPANY_INFO.address}<br/>هاتف: ${COMPANY_INFO.phone} | البريد الإلكتروني: ${COMPANY_INFO.email}</div>
          <div class="ref-date"><div><strong>رقم الإيصال:</strong> ${receiptNumber}</div><div><strong>التاريخ:</strong> ${currentDateAr}</div></div>
          <div class="subject-box">إيصال سداد رسمي</div>
          <div class="info-box">
            <div class="info-row"><span class="info-label">اسم العميل:</span><span>${customerName || 'غير محدد'}</span></div>
            ${customerIdNumber ? `<div class="info-row"><span class="info-label">رقم الهوية:</span><span>${customerIdNumber}</span></div>` : ''}
            ${customerPhone ? `<div class="info-row"><span class="info-label">رقم الهاتف:</span><span>${customerPhone}</span></div>` : ''}
          </div>
          <table>
            <thead><tr><th style="width: 40px;">م</th><th>رقم الدفعة</th><th>تاريخ السداد</th><th>المبلغ</th><th>طريقة الدفع</th><th>الحالة</th></tr></thead>
            <tbody>
              ${payments.map((payment, index) => `<tr><td style="text-align: center;">${index + 1}</td><td>${payment.payment_number || payment.id?.substring(0, 8) || '-'}</td><td>${payment.payment_date ? format(new Date(payment.payment_date), 'dd/MM/yyyy') : '-'}</td><td class="amount-cell">${payment.amount?.toLocaleString() || 0} ر.ق</td><td>${payment.payment_method || '-'}</td><td style="text-align: center;"><span class="${payment.payment_status === 'completed' ? 'status-completed' : 'status-pending'}">${payment.payment_status === 'completed' ? 'مسدد' : 'معلق'}</span></td></tr>`).join('')}
            </tbody>
          </table>
          <div class="totals-section">
            <div class="totals-row"><span class="totals-label">عدد العمليات:</span><span class="totals-value">${payments.length} عملية</span></div>
            <div class="totals-row"><span class="totals-label">العمليات المكتملة:</span><span class="totals-value">${completedPayments.length} عملية</span></div>
            <div class="totals-row"><span class="totals-label">إجمالي المبلغ المسدد:</span><span class="totals-value">${completedAmount.toLocaleString()} ر.ق</span></div>
          </div>
          <div class="signature-section">
            <div class="signatures">
              <div class="signature-box"><div class="sign-line">توقيع المستلم</div></div>
              <div class="stamp-area"><div class="stamp-placeholder">الختم</div></div>
              <div class="signatory"><p class="company-name">${COMPANY_INFO.name_ar}</p><div class="sign-line">التوقيع</div></div>
            </div>
            <div class="legal-notice">هذا الإيصال وثيقة رسمية تثبت استلام المبالغ المذكورة أعلاه.<br>يرجى الاحتفاظ بهذا الإيصال للرجوع إليه عند الحاجة.</div>
          </div>
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
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-teal-900">سجل المدفوعات</h4>
            <p className="text-xs text-teal-600/70">{payments.length} عملية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {payments.length > 0 && (
            <Button
              variant="outline"
              className="gap-2 border-teal-200 text-teal-600 hover:bg-teal-50 hover:border-teal-300"
              onClick={handlePrintPayments}
            >
              <Printer className="w-4 h-4" />
              طباعة الإيصال
            </Button>
          )}
          <Button
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white gap-2 shadow-teal-500/20"
            onClick={onAddPayment}
          >
            <Plus className="w-4 h-4" />
            تسجيل دفعة
          </Button>
        </div>
      </div>

      {payments.length > 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-teal-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-bold text-teal-900">رقم الدفعة</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-teal-900">تاريخ السداد</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-teal-900">المبلغ</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-teal-900">الطريقة</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-teal-900">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-50">
              {payments.slice(0, 5).map((payment, index) => (
                <motion.tr
                  key={payment.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-teal-50/30 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-slate-900">#{payment.payment_number || payment.id.substring(0, 8)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {payment.payment_date ? format(new Date(payment.payment_date), 'dd/MM/yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-emerald-600">{payment.amount?.toLocaleString()} ر.ق</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{payment.payment_method || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn(
                      "text-xs px-3 py-1 rounded-md font-medium border",
                      payment.payment_status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    )}>
                      {payment.payment_status === 'completed' ? 'مكتمل' : 'معلق'}
                    </Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-12 text-center border border-teal-100">
          <CreditCard className="w-12 h-12 text-teal-300 mx-auto mb-3" />
          <p className="text-teal-600 font-medium">لا توجد مدفوعات مسجلة</p>
        </div>
      )}
    </motion.div>
  );
};

export default PaymentsTab;
