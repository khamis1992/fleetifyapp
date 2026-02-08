/**
 * توليد كشف المطالبات المالية
 */

import { COMPANY_INFO, generateRefNumber, formatDateAr, formatNumberEn, formatDateEn, formatPhoneNumber } from './shared';
import { getOfficialLetterStyles } from './styles';
import { generateOfficialHeader, generateSignatureSection } from './templates';
import type { ClaimsStatementData } from './types';

/**
 * توليد فاتورة فعلية مفصلة لكل فاتورة - بنفس تصميم PaymentReceipt المعتمد
 */
function generateActualInvoice(
  inv: ClaimsStatementData['invoices'][0],
  index: number,
  data: ClaimsStatementData
): string {
  const remaining = inv.totalAmount - inv.paidAmount;
  const penalty = inv.penalty || 0;
  const total = remaining + penalty;
  const invoiceDate = formatDateEn(inv.dueDate);
  
  return `
    <div class="invoice-page" style="page-break-before: always; page-break-inside: avoid;">
      <!-- حاوية الفاتورة بنفس تصميم سند القبض المعتمد -->
      <div class="invoice-container" style="
        font-family: 'Times New Roman (Headings CS)', 'Times New Roman', serif;
        background: white;
        width: 100%;
        margin: 0 auto;
        padding: 20px 25px;
        border: 3px double #1f2937;
        border-radius: 8px;
        box-sizing: border-box;
        direction: rtl;
      ">
        <!-- الترويسة -->
        <table style="width: 100%; border: none; border-bottom: 2px solid #1f2937; padding-bottom: 8px; margin-bottom: 10px;">
          <tr>
            <td style="border: none; width: 35%; text-align: right; vertical-align: top;">
              <div style="font-size: 13px; font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">${COMPANY_INFO.name_ar} <span style="font-size: 9px; font-weight: normal; color: #4b5563;">ذ.م.م</span></div>
              <div style="font-size: 10px; color: #374151; margin: 2px 0;">${COMPANY_INFO.cr}</div>
              <div style="font-size: 8px; color: #4b5563; margin: 1px 0;">أم صلال محمد – الشارع التجاري</div>
              <div style="font-size: 8px; color: #4b5563; margin: 1px 0;">مبنى (79) – الطابق الأول – مكتب (2)</div>
            </td>
            <td style="border: none; width: 30%; text-align: center; vertical-align: middle;">
              <img src="${COMPANY_INFO.logo}" alt="شعار الشركة" style="max-height: 65px; max-width: 120px; object-fit: contain;" onerror="this.style.display='none'" />
            </td>
            <td style="border: none; width: 35%; text-align: left; vertical-align: top;" dir="ltr">
              <div style="font-size: 13px; font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">Al-Araf Car Rental <span style="font-size: 9px; font-weight: normal; color: #4b5563;">L.L.C</span></div>
              <div style="font-size: 10px; color: #374151; margin: 2px 0;">C.R: 146832</div>
              <div style="font-size: 8px; color: #4b5563; margin: 1px 0;">Umm Salal Mohammed, Commercial St.</div>
              <div style="font-size: 8px; color: #4b5563; margin: 1px 0;">Bldg (79), 1st Floor, Office (2)</div>
            </td>
          </tr>
        </table>

        <!-- عنوان الفاتورة -->
        <div style="text-align: center; margin-bottom: 12px;">
          <div style="display: inline-block; padding: 5px 28px; border: 2px solid #1e3a8a; border-radius: 8px; background-color: #eff6ff;">
            <div style="font-size: 18px; font-weight: bold; color: #1e3a8a; margin: 0;">فاتورة مستحقة</div>
            <div style="font-size: 11px; font-weight: bold; color: #4b5563; letter-spacing: 2px; margin: 0;">DUE INVOICE</div>
          </div>
        </div>

        <!-- رقم الفاتورة والتاريخ -->
        <table style="width: 100%; border: none; margin-bottom: 8px;">
          <tr>
            <td style="border: none; text-align: right; width: 50%;">
              <span style="font-weight: bold; color: #dc2626; font-size: 13px;">رقم: No.</span>
              <span style="color: #dc2626; font-family: monospace; font-size: 15px; font-weight: bold; margin-right: 6px;">${inv.invoiceNumber || '-'}</span>
            </td>
            <td style="border: none; text-align: left; width: 50%;">
              <span style="font-weight: bold; color: #1f2937; font-size: 12px;">التاريخ: Date</span>
              <span style="border-bottom: 1px solid #9ca3af; padding: 0 10px; font-family: monospace; margin-right: 6px;">${invoiceDate}</span>
            </td>
          </tr>
        </table>
        
        <div style="font-size: 8px; color: #6b7280; text-align: center; margin-bottom: 8px;">مرفق رقم (${index + 1}) ضمن كشف المطالبات المالية</div>

        <!-- بيانات الفاتورة بنمط الخطوط المنقطة -->
        <div style="padding: 0 6px;">
          <table style="width: 100%; border: none; margin-bottom: 5px;">
            <tr>
              <td style="border: none; width: 100px; font-weight: bold; color: #1e3a8a; text-align: right; padding-left: 6px; vertical-align: middle; white-space: nowrap; font-size: 12px;">المستأجر/</td>
              <td style="border: none; border-bottom: 2px dotted #9ca3af; text-align: center; font-weight: bold; color: #1f2937; padding: 3px; font-size: 12px;">${data.customerName}</td>
              <td style="border: none; width: 80px; font-weight: bold; color: #6b7280; text-align: left; font-size: 9px; padding-right: 6px; vertical-align: middle; white-space: nowrap;" dir="ltr">Tenant</td>
            </tr>
          </table>

          <table style="width: 100%; border: none; margin-bottom: 5px;">
            <tr>
              <td style="border: none; width: 100px; font-weight: bold; color: #1e3a8a; text-align: right; padding-left: 6px; vertical-align: middle; white-space: nowrap; font-size: 12px;">رقم العقد/</td>
              <td style="border: none; border-bottom: 2px dotted #9ca3af; text-align: center; font-weight: bold; color: #1f2937; padding: 3px; font-size: 12px;">${data.contractNumber || '-'}</td>
              <td style="border: none; width: 80px; font-weight: bold; color: #6b7280; text-align: left; font-size: 9px; padding-right: 6px; vertical-align: middle; white-space: nowrap;" dir="ltr">Contract No.</td>
            </tr>
          </table>

          <table style="width: 100%; border: none; margin-bottom: 5px;">
            <tr>
              <td style="border: none; width: 100px; font-weight: bold; color: #1e3a8a; text-align: right; padding-left: 6px; vertical-align: middle; white-space: nowrap; font-size: 12px;">مبلغ وقدره/</td>
              <td style="border: none; border-bottom: 2px dotted #9ca3af; text-align: center; font-weight: bold; color: #1f2937; padding: 3px; font-size: 12px;">إيجار شهري مستحق</td>
              <td style="border: none; width: 80px; font-weight: bold; color: #6b7280; text-align: left; font-size: 9px; padding-right: 6px; vertical-align: middle; white-space: nowrap;" dir="ltr">The Sum of</td>
            </tr>
          </table>

          <!-- مربع المبلغ -->
          <div style="margin: 8px 6px;">
            <div style="display: inline-block; border: 2px solid #1f2937; border-radius: 4px; padding: 3px 14px; background-color: #f9fafb;">
              <span style="font-weight: bold; color: #4b5563; font-size: 12px;">QAR</span>
              <span style="font-size: 16px; font-weight: bold; font-family: monospace; margin-right: 6px; direction: ltr; unicode-bidi: embed;">${total.toFixed(2)}</span>
            </div>
          </div>

          <!-- تفاصيل المبالغ -->
          <div style="margin: 8px 6px; padding: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
            <table style="width: 100%; border: none;">
              <tr>
                <td style="border: none; width: 33%; text-align: center; padding: 4px;">
                  <div style="font-size: 9px; color: #64748b; margin-bottom: 2px;">المبلغ الإجمالي<br/><span style="font-size: 8px;">Total Amount</span></div>
                  <div style="font-size: 14px; font-weight: bold; color: #1e3a8a;">${inv.totalAmount.toFixed(2)} <span style="font-size: 9px;">QAR</span></div>
                </td>
                <td style="border: none; width: 33%; text-align: center; padding: 4px;">
                  <div style="font-size: 9px; color: #64748b; margin-bottom: 2px;">المبلغ المدفوع<br/><span style="font-size: 8px;">Paid Amount</span></div>
                  <div style="font-size: 14px; font-weight: bold; color: #16a34a;">${inv.paidAmount.toFixed(2)} <span style="font-size: 9px;">QAR</span></div>
                </td>
                <td style="border: none; width: 33%; text-align: center; padding: 4px;">
                  <div style="font-size: 9px; color: #64748b; margin-bottom: 2px;">المبلغ المتبقي<br/><span style="font-size: 8px;">Remaining</span></div>
                  <div style="font-size: 14px; font-weight: bold; color: ${remaining > 0 ? '#dc2626' : '#16a34a'};">${remaining.toFixed(2)} <span style="font-size: 9px;">QAR</span></div>
                </td>
              </tr>
            </table>
          </div>

          ${penalty > 0 ? `
          <div style="margin: 4px 6px; padding: 5px 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px;">
            <table style="width: 100%; border: none;">
              <tr>
                <td style="border: none; font-weight: bold; color: #dc2626; font-size: 11px;">غرامة التأخير (${inv.daysLate} يوم) <span style="font-size: 8px; color: #888; font-weight: normal;">Late Fee</span></td>
                <td style="border: none; text-align: left; direction: ltr; unicode-bidi: embed; font-weight: bold; color: #dc2626; font-size: 13px;">${penalty.toFixed(2)} QAR</td>
              </tr>
            </table>
          </div>
          ` : ''}

          <table style="width: 100%; border: none; margin: 6px 0;">
            <tr>
              <td style="border: none; width: 100px; font-weight: bold; color: #1e3a8a; text-align: right; padding-left: 6px; vertical-align: middle; white-space: nowrap; font-size: 12px;">وذلك عن/</td>
              <td style="border: none; border-bottom: 2px dotted #9ca3af; text-align: center; color: #1f2937; padding: 3px; font-size: 11px;">إيجار شهري - عقد رقم ${data.contractNumber || '-'} - مستحق بتاريخ ${invoiceDate}</td>
              <td style="border: none; width: 80px; font-weight: bold; color: #6b7280; text-align: left; font-size: 9px; padding-right: 6px; vertical-align: middle; white-space: nowrap;" dir="ltr">Being</td>
            </tr>
          </table>
        </div>

        <!-- التذييل - التوقيعات -->
        <table style="width: 100%; border: none; margin-top: 30px;">
          <tr>
            <td style="border: none; width: 33%; text-align: center; vertical-align: bottom; padding: 6px;">
              <div style="font-weight: bold; color: #1f2937; margin-bottom: 28px; font-size: 11px;">المستلم Receiver</div>
              <div style="border-top: 1px solid #9ca3af; width: 80%; margin: 0 auto; padding-top: 3px;">
                <span style="font-size: 8px; color: #6b7280;">التوقيع Signature</span>
              </div>
            </td>
            <td style="border: none; width: 33%; text-align: center; vertical-align: bottom; padding: 6px; position: relative;">
              <img src="/receipts/stamp.png" alt="ختم الشركة" style="width: 80px; height: 80px; object-fit: contain; transform: rotate(-10deg); opacity: 0.85; position: absolute; top: -25px; left: 50%; margin-left: -40px;" onerror="this.style.display='none'" />
              <div style="font-weight: bold; color: #1f2937; margin-bottom: 28px; font-size: 11px;">المحاسب Accountant</div>
              <div style="border-top: 1px solid #9ca3af; width: 80%; margin: 0 auto; padding-top: 3px;">
                <span style="font-size: 8px; color: #6b7280;">التوقيع Signature</span>
              </div>
            </td>
            <td style="border: none; width: 33%; text-align: center; vertical-align: bottom; padding: 6px;">
              <div style="font-weight: bold; color: #1e3a8a; font-size: 11px;">المدير العام General Manager</div>
              <div style="font-weight: bold; font-size: 12px; color: #1f2937; margin: 2px 0;">${COMPANY_INFO.authorized_signatory}</div>
              <img src="/receipts/signature.png" alt="التوقيع" style="width: 70px; height: 30px; object-fit: contain; margin: 4px auto;" onerror="this.style.display='none'" />
              <div style="border-top: 1px solid #9ca3af; width: 80%; margin: 0 auto; padding-top: 3px;">
                <span style="font-size: 8px; color: #6b7280;">التوقيع Signature</span>
              </div>
            </td>
          </tr>
        </table>

        <!-- تذييل الصفحة -->
        <div style="margin-top: 8px; text-align: center; font-size: 8px; color: #9ca3af;">
          Al-Araf Car Rental System - Generated Document
        </div>
      </div>
    </div>
  `;
}

/**
 * توليد كشف المطالبات المالية
 */
export function generateClaimsStatementHtml(data: ClaimsStatementData): string {
  const refNumber = generateRefNumber();
  const currentDate = formatDateAr();
  
  // حساب المجاميع
  const totalRent = data.invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPenalties = data.invoices.reduce((s, i) => s + (i.penalty || 0), 0);
  const totalPaid = data.invoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalRemaining = data.invoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);
  const totalWithPenalties = data.invoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount) + (i.penalty || 0), 0);
  const violationsTotal = data.violations ? data.violations.reduce((s, v) => s + v.fineAmount, 0) : 0;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كشف المطالبات المالية - ${COMPANY_INFO.name_ar}</title>
  <style>
    ${getOfficialLetterStyles()}
    
    /* أنماط الطباعة للفواتير المرفقة */
    @media print {
      .invoice-page {
        page-break-before: always !important;
        page-break-inside: avoid !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .invoice-page .invoice-container {
        border: 3px double #1f2937 !important;
        width: 100% !important;
        max-width: 100% !important;
        padding: 30px !important;
      }
    }
    
    /* أنماط خاصة بكشف المطالبات */
    .claims-summary-box {
      border: 2px solid #1e3a5f;
      margin: 20px 0;
      page-break-inside: avoid;
    }
    .claims-summary-header {
      background: #1e3a5f;
      color: #fff;
      padding: 10px 15px;
      font-size: 14px;
      font-weight: bold;
      text-align: center;
    }
    .claims-summary-body {
      padding: 0;
    }
    .claims-summary-row {
      display: table;
      width: 100%;
      border-bottom: 1px solid #eee;
    }
    .claims-summary-row:last-child {
      border-bottom: none;
    }
    .claims-summary-cell {
      display: table-cell;
      width: 50%;
      padding: 12px 15px;
      vertical-align: middle;
      border-left: 1px solid #eee;
    }
    .claims-summary-cell:last-child {
      border-left: none;
    }
    .claims-cell-label {
      font-size: 10px;
      color: #777;
      margin-bottom: 3px;
    }
    .claims-cell-value {
      font-size: 18px;
      font-weight: bold;
      color: #1e3a5f;
    }
    .claims-cell-value.danger {
      color: #c62828;
    }
    
    .customer-info-table {
      width: 100%;
      border: 1px solid #ddd;
      margin: 15px 0;
      border-collapse: collapse;
    }
    .customer-info-table td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      font-size: 11px;
    }
    .customer-info-table .label-cell {
      background: #f5f7fa;
      font-weight: bold;
      color: #555;
      width: 120px;
    }
    
    .note-box {
      border: 1px solid #1e3a5f;
      background: #f5f7fa;
      padding: 12px 15px;
      margin: 15px 0;
      font-size: 11px;
      page-break-inside: avoid;
    }
    .note-box strong {
      color: #1e3a5f;
    }
    
    .invoices-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 10px;
    }
    .invoices-table th {
      background: #1e3a5f;
      color: white;
      padding: 8px 5px;
      text-align: center;
      font-size: 10px;
      font-weight: bold;
      border: 1px solid #1e3a5f;
    }
    .invoices-table td {
      padding: 7px 5px;
      text-align: center;
      border: 1px solid #ddd;
      font-size: 10px;
    }
    .invoices-table tr:nth-child(even) {
      background: #f9fafb;
    }
    .invoices-table .total-row td {
      background: #1e3a5f;
      color: white;
      font-weight: bold;
      border-color: #1e3a5f;
      font-size: 11px;
    }
    
    .violations-table th {
      background: #8b0000 !important;
      border-color: #8b0000 !important;
    }
    .violations-table .total-row td {
      background: #8b0000 !important;
      border-color: #8b0000 !important;
    }
    
    .grand-total-box {
      border: 2px solid #1e3a5f;
      margin: 20px 0;
      page-break-inside: avoid;
    }
    .grand-total-header {
      background: #1e3a5f;
      color: white;
      padding: 10px 15px;
      font-size: 13px;
      font-weight: bold;
      text-align: center;
    }
    .grand-total-body {
      padding: 0;
    }
    .grand-total-row {
      display: table;
      width: 100%;
      border-bottom: 1px solid #eee;
    }
    .grand-total-row:last-child {
      border-bottom: none;
    }
    .grand-total-label {
      display: table-cell;
      width: 60%;
      padding: 10px 15px;
      font-weight: bold;
      font-size: 12px;
      vertical-align: middle;
    }
    .grand-total-value {
      display: table-cell;
      width: 40%;
      padding: 10px 15px;
      text-align: left;
      direction: ltr;
      unicode-bidi: embed;
      font-size: 14px;
      font-weight: bold;
      vertical-align: middle;
    }
    .grand-total-final {
      background: #1e3a5f;
    }
    .grand-total-final .grand-total-label,
    .grand-total-final .grand-total-value {
      color: white;
      font-size: 14px;
    }
    .grand-total-final .grand-total-value {
      font-size: 18px;
    }
    .grand-total-words {
      background: #f5f7fa;
      padding: 10px 15px;
      font-size: 11px;
      text-align: center;
      border-top: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="letter-container">
    ${generateOfficialHeader(refNumber, currentDate)}
    
    <!-- العنوان -->
    <div class="subject-box">
      <strong>كشف المطالبات المالية</strong>
    </div>
    
    <!-- ملخص المديونية -->
    <div class="claims-summary-box">
      <div class="claims-summary-header">ملخص المديونية المترصدة</div>
      <div class="claims-summary-body">
        <div class="claims-summary-row">
          <div class="claims-summary-cell">
            <div class="claims-cell-label">إجمالي المطالبة</div>
            <div class="claims-cell-value" style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(data.totalOverdue)} ر.ق</div>
          </div>
          <div class="claims-summary-cell">
            <div class="claims-cell-label">عدد الفواتير المستحقة</div>
            <div class="claims-cell-value">${data.invoices.length} فاتورة</div>
          </div>
        </div>
        ${data.violations && data.violations.length > 0 ? `
        <div class="claims-summary-row">
          <div class="claims-summary-cell">
            <div class="claims-cell-label">إجمالي غرامات المخالفات المرورية</div>
            <div class="claims-cell-value danger" style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(violationsTotal)} ر.ق</div>
          </div>
          <div class="claims-summary-cell">
            <div class="claims-cell-label">عدد المخالفات المرورية</div>
            <div class="claims-cell-value danger">${data.violations.length} مخالفة</div>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
    
    <!-- بيانات المدعى عليه -->
    <table class="customer-info-table">
      <tr>
        <td class="label-cell">المدعى عليه</td>
        <td>${data.customerName}</td>
        <td class="label-cell">رقم الهوية</td>
        <td style="direction: ltr; unicode-bidi: embed;">${data.nationalId || '-'}</td>
      </tr>
      <tr>
        <td class="label-cell">رقم العقد</td>
        <td>${data.contractNumber || '-'}</td>
        <td class="label-cell">رقم الجوال</td>
        <td style="direction: ltr; unicode-bidi: embed;">${data.phone ? formatPhoneNumber(data.phone) : '-'}</td>
      </tr>
      <tr>
        <td class="label-cell">فترة العقد</td>
        <td colspan="3" style="direction: ltr; unicode-bidi: embed;">${formatDateEn(data.contractStartDate)} - ${formatDateEn(data.contractEndDate)}</td>
      </tr>
    </table>
    
    <!-- جدول الفواتير المستحقة -->
    ${data.invoices.length > 0 ? `
    <div class="section">
      <div class="section-title" style="font-size: 13px; margin-bottom: 8px;">أولاً: تفصيل الفواتير المستحقة</div>
      <table class="invoices-table">
        <thead>
          <tr>
            <th style="width: 25px;">م</th>
            <th>رقم الفاتورة</th>
            <th>تاريخ الاستحقاق</th>
            <th>مبلغ الإيجار</th>
            <th>الغرامة</th>
            <th>المدفوع</th>
            <th>المتبقي</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${data.invoices.map((inv, i) => {
            const remaining = inv.totalAmount - inv.paidAmount;
            const penalty = inv.penalty || 0;
            const total = remaining + penalty;
            return `
              <tr>
                <td>${i + 1}</td>
                <td>${inv.invoiceNumber || '-'}</td>
                <td style="direction: ltr; unicode-bidi: embed;">${formatDateEn(inv.dueDate)}</td>
                <td style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(inv.totalAmount)}</td>
                <td style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(penalty)}</td>
                <td style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(inv.paidAmount)}</td>
                <td style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(remaining)}</td>
                <td style="direction: ltr; unicode-bidi: embed; font-weight: bold; color: #c62828;">${formatNumberEn(total)}</td>
              </tr>
            `;
          }).join('')}
          <tr class="total-row">
            <td colspan="3" style="text-align: right;">المجموع</td>
            <td style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(totalRent)}</td>
            <td style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(totalPenalties)}</td>
            <td style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(totalPaid)}</td>
            <td style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(totalRemaining)}</td>
            <td style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(totalWithPenalties)} ر.ق</td>
          </tr>
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <!-- جدول المخالفات المرورية -->
    ${data.violations && data.violations.length > 0 ? `
    <div class="section">
      <div class="section-title" style="font-size: 13px; margin-bottom: 8px; color: #8b0000;">ثانياً: المخالفات المرورية غير المسددة</div>
      <table class="invoices-table violations-table">
        <thead>
          <tr>
            <th style="width: 25px;">م</th>
            <th>رقم المخالفة</th>
            <th>التاريخ</th>
            <th>نوع المخالفة</th>
            <th>الموقع</th>
            <th>مبلغ الغرامة</th>
          </tr>
        </thead>
        <tbody>
          ${data.violations.map((v, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${v.violationNumber}</td>
              <td style="direction: ltr; unicode-bidi: embed;">${formatDateEn(v.violationDate)}</td>
              <td>${v.violationType}</td>
              <td>${v.location}</td>
              <td style="direction: ltr; unicode-bidi: embed; font-weight: bold; color: #c62828;">${formatNumberEn(v.fineAmount)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="5" style="text-align: right;">إجمالي المخالفات المرورية</td>
            <td style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(violationsTotal)} ر.ق</td>
          </tr>
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <!-- الإجمالي النهائي -->
    <div class="grand-total-box">
      <div class="grand-total-header">ملخص المطالبة الكلي</div>
      <div class="grand-total-body">
        ${data.invoices.length > 0 ? `
        <div class="grand-total-row">
          <div class="grand-total-label">إجمالي الإيجارات المتبقية (${data.invoices.length} فاتورة)</div>
          <div class="grand-total-value">${formatNumberEn(totalRemaining)} ر.ق</div>
        </div>
        ` : ''}
        ${totalPenalties > 0 ? `
        <div class="grand-total-row">
          <div class="grand-total-label">إجمالي غرامات التأخير</div>
          <div class="grand-total-value" style="color: #e65100;">${formatNumberEn(totalPenalties)} ر.ق</div>
        </div>
        ` : ''}
        ${data.violations && data.violations.length > 0 ? `
        <div class="grand-total-row">
          <div class="grand-total-label">إجمالي المخالفات المرورية (${data.violations.length} مخالفة)</div>
          <div class="grand-total-value" style="color: #c62828;">${formatNumberEn(violationsTotal)} ر.ق</div>
        </div>
        ` : ''}
        <div class="grand-total-row grand-total-final">
          <div class="grand-total-label">إجمالي المبالغ المستحقة</div>
          <div class="grand-total-value">${formatNumberEn(data.totalOverdue)} ر.ق</div>
        </div>
        ${data.amountInWords ? `
        <div class="grand-total-words">
          <strong>المبلغ كتابةً:</strong> ${data.amountInWords}
        </div>
        ` : ''}
      </div>
    </div>
    
    ${generateSignatureSection()}
  </div>
  
  <!-- ============================== -->
  <!-- الفواتير الفعلية المفصلة       -->
  <!-- ============================== -->
  ${data.invoices.map((inv, i) => generateActualInvoice(inv, i, data)).join('')}
  
</body>
</html>
  `;
}
