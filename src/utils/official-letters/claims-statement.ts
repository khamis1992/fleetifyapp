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
    
    <!-- جدول الفواتير -->
    ${data.invoices.length > 0 ? `
    <div class="section">
      <div class="section-title">تفصيل الفواتير المستحقة</div>
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
