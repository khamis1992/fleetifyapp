/**
 * توليد كشف المطالبات المالية
 */

import { COMPANY_INFO, generateRefNumber, formatDateAr, formatNumberEn, formatDateEn, formatPhoneNumber } from './shared';
import { getOfficialLetterStyles } from './styles';
import { generateOfficialHeader, generateSignatureSection } from './templates';
import type { ClaimsStatementData } from './types';

/**
 * توليد كشف المطالبات المالية
 */
export function generateClaimsStatementHtml(data: ClaimsStatementData): string {
  const refNumber = generateRefNumber();
  const currentDate = formatDateAr();

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كشف المطالبات المالية - ${COMPANY_INFO.name_ar}</title>
  <style>${getOfficialLetterStyles()}</style>
</head>
<body>
  <div class="letter-container">
    ${generateOfficialHeader(refNumber, currentDate)}
    
    <!-- العنوان -->
    <div class="subject-box">
      <strong>كشف المطالبات المالية</strong>
    </div>
    
    <!-- كشف الحساب - ملخص المديونية -->
    <div style="background: linear-gradient(135deg, #1a5490 0%, #2196F3 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <h3 style="margin: 0 0 15px 0; font-size: 18px; text-align: center; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 10px;">
        كشف حساب المديونية المترصدة
      </h3>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
        <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 6px; border-right: 3px solid #FFD700;">
          <div style="font-size: 11px; opacity: 0.9; margin-bottom: 5px;">إجمالي المديونية</div>
          <div style="font-size: 22px; font-weight: bold; direction: ltr; unicode-bidi: embed;">${formatNumberEn(data.totalOverdue)} ر.ق</div>
        </div>
        <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 6px; border-right: 3px solid #FFD700;">
          <div style="font-size: 11px; opacity: 0.9; margin-bottom: 5px;">عدد الفواتير المستحقة</div>
          <div style="font-size: 22px; font-weight: bold;">${data.invoices.length} فاتورة</div>
        </div>
        ${data.violations && data.violations.length > 0 ? `
        <div style="background: rgba(211, 47, 47, 0.3); padding: 12px; border-radius: 6px; border-right: 3px solid #d32f2f;">
          <div style="font-size: 11px; opacity: 0.9; margin-bottom: 5px;">عدد المخالفات المرورية</div>
          <div style="font-size: 22px; font-weight: bold;">${data.violations.length} مخالفة</div>
        </div>
        <div style="background: rgba(211, 47, 47, 0.3); padding: 12px; border-radius: 6px; border-right: 3px solid #d32f2f;">
          <div style="font-size: 11px; opacity: 0.9; margin-bottom: 5px;">إجمالي غرامات المخالفات</div>
          <div style="font-size: 22px; font-weight: bold; direction: ltr; unicode-bidi: embed;">${formatNumberEn(data.violations.reduce((s, v) => s + v.fineAmount, 0))} ر.ق</div>
        </div>
        ` : ''}
      </div>
    </div>
    
    <!-- معلومات المدعى عليه -->
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">المدعى عليه:</span>
        <span>${data.customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">رقم الهوية:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${data.nationalId || '-'}</span>
      </div>
      ${data.phone ? `
      <div class="info-row">
        <span class="info-label">رقم الجوال:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${formatPhoneNumber(data.phone)}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">رقم العقد:</span>
        <span>${data.contractNumber || '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">فترة العقد:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${formatDateEn(data.contractStartDate)} - ${formatDateEn(data.contractEndDate)}</span>
      </div>
    </div>
    
    <!-- ملاحظة هامة -->
    <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="background: #ffc107; color: #000; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">!</div>
        <div>
          <strong style="color: #856404; display: block; margin-bottom: 5px;">ملاحظة هامة:</strong>
          <span style="color: #856404; font-size: 11px;">
            يُرفق مع هذا الكشف جميع الفواتير المفصلة الواردة أدناه بصيغة PDF، والثابت بها مبالغ المديونية المستحقة.
          </span>
        </div>
      </div>
    </div>
    
    <!-- جدول الفواتير -->
    ${data.invoices.length > 0 ? `
    <div class="section">
      <div class="section-title">تفصيل الفواتير المستحقة (مرفق نسخة PDF لكل فاتورة)</div>
      <table>
        <thead>
          <tr>
            <th>م</th>
            <th>رقم الفاتورة</th>
            <th>تاريخ الاستحقاق</th>
            <th>مبلغ الإيجار</th>
            <th style="text-align: center;">الغرامة<br><small style="font-weight: normal; font-size: 7pt; display: block; text-align: center;">(حسب ما هو منصوص في العقد)</small></th>
            <th>المدفوع</th>
            <th>المتبقي</th>
            <th>الإجمالي</th>
            <th style="text-align: center;">حالة الإرفاق</th>
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
                <td class="amount" style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(total)}</td>
                <td style="text-align: center;">
                  <span style="background: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: bold;">✓ مرفق</span>
                </td>
              </tr>
            `;
          }).join('')}
          <tr class="total-row">
            <td colspan="3">المجموع</td>
            <td style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(data.invoices.reduce((s, i) => s + i.totalAmount, 0))}</td>
            <td style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(data.invoices.reduce((s, i) => s + (i.penalty || 0), 0))}</td>
            <td style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(data.invoices.reduce((s, i) => s + i.paidAmount, 0))}</td>
            <td style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(data.invoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0))}</td>
            <td class="amount" style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(data.invoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount) + (i.penalty || 0), 0))} ر.ق</td>
            <td style="text-align: center; background: #4caf50; color: white; font-weight: bold;">${data.invoices.length} فاتورة</td>
          </tr>
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <!-- جدول المخالفات المرورية -->
    ${data.violations && data.violations.length > 0 ? `
    <div class="section">
      <div class="section-title" style="color: #d32f2f;">المخالفات المرورية غير المسددة</div>
      <table>
        <thead>
          <tr style="background: #d32f2f;">
            <th>م</th>
            <th>رقم المخالفة</th>
            <th>تاريخ المخالفة</th>
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
              <td class="amount" style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(v.fineAmount)}</td>
            </tr>
          `).join('')}
          <tr class="total-row" style="background: #d32f2f !important; color: #fff !important;">
            <td colspan="5" style="color: #fff !important;">إجمالي المخالفات المرورية</td>
            <td class="amount" style="color: #fff !important; direction: ltr; unicode-bidi: embed;">${formatNumberEn(data.violations.reduce((s, v) => s + v.fineAmount, 0))} ر.ق</td>
          </tr>
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <!-- ملخص المطالبة -->
    <div class="summary">
      <h3>ملخص المطالبة الكلي</h3>
      <div class="summary-grid" style="${data.violations && data.violations.length > 0 ? 'grid-template-columns: repeat(4, 1fr);' : ''}">
        ${data.invoices.length > 0 ? `
        <div class="summary-item">
          <div class="summary-value">${data.invoices.length}</div>
          <div class="summary-label">عدد الفواتير المستحقة</div>
        </div>
        ` : ''}
        ${data.violations && data.violations.length > 0 ? `
        <div class="summary-item" style="background: rgba(211, 47, 47, 0.3);">
          <div class="summary-value">${data.violations.length}</div>
          <div class="summary-label">عدد المخالفات المرورية</div>
        </div>
        ` : ''}
        <div class="summary-item">
          <div class="summary-value" style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(data.totalOverdue)}</div>
          <div class="summary-label">إجمالي المبالغ المستحقة (ر.ق)</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${data.amountInWords.split(' ').slice(0, 3).join(' ')}</div>
          <div class="summary-label">المبلغ كتابةً</div>
        </div>
      </div>
    </div>
    
    ${generateSignatureSection()}
  </div>
</body>
</html>
  `;
}
