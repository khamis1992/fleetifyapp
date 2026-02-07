/**
 * توليد حافظة المستندات الموحدة
 */

import { COMPANY_INFO, generateRefNumber, formatDateAr, formatNumberEn } from './shared';
import { generateSignatureSection } from './templates';
import type { DocumentPortfolioData } from './types';

/**
 * توليد حافظة المستندات الموحدة - ملف HTML واحد يحتوي على جميع المستندات
 */
export function generateDocumentPortfolioHtml(data: DocumentPortfolioData): string {
  const refNumber = generateRefNumber();
  const currentDate = formatDateAr();
  
  // بناء قائمة المستندات المتاحة
  const documentsList: { title: string; pageNum: number }[] = [];
  let pageNum = 2;
  
  if (data.contractImageUrl) {
    documentsList.push({ title: 'عقد الإيجار', pageNum: pageNum++ });
  }
  if (data.claimsStatementHtml) {
    documentsList.push({ title: 'كشف المطالبات المالية', pageNum: pageNum++ });
  }
  if (data.criminalComplaintHtml) {
    documentsList.push({ title: 'بلاغ سرقة المركبة', pageNum: pageNum++ });
  }
  if (data.violationsTransferHtml) {
    documentsList.push({ title: 'طلب تحويل المخالفات', pageNum: pageNum++ });
  }
  if (data.ibanImageUrl) {
    documentsList.push({ title: 'شهادة IBAN', pageNum: pageNum++ });
  }
  if (data.commercialRegisterUrl) {
    documentsList.push({ title: 'السجل التجاري', pageNum: pageNum++ });
  }

  // استخراج الأنماط ومحتوى body من كشف المطالبات
  let claimsStyles = '';
  let claimsBody = '';
  
  if (data.claimsStatementHtml) {
    const styleMatches = data.claimsStatementHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    claimsStyles = styleMatches.map(s => {
      return s.replace(/<style[^>]*>/i, '<style>').replace(/body\s*\{/g, '.claims-content {');
    }).join('\n');
    
    const bodyMatch = data.claimsStatementHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    claimsBody = bodyMatch ? bodyMatch[1] : data.claimsStatementHtml;
  }

  // استخراج الأنماط ومحتوى body من بلاغ سرقة المركبة
  let complaintStyles = '';
  let complaintBody = '';
  
  if (data.criminalComplaintHtml) {
    const styleMatches = data.criminalComplaintHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    complaintStyles = styleMatches.map(s => {
      return s.replace(/<style[^>]*>/i, '<style>').replace(/body\s*\{/g, '.complaint-content {');
    }).join('\n');
    
    const bodyMatch = data.criminalComplaintHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    complaintBody = bodyMatch ? bodyMatch[1] : data.criminalComplaintHtml;
  }

  // استخراج الأنماط ومحتوى body من طلب تحويل المخالفات
  let violationsTransferStyles = '';
  let violationsTransferBody = '';
  
  if (data.violationsTransferHtml) {
    const styleMatches = data.violationsTransferHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    violationsTransferStyles = styleMatches.map(s => {
      return s.replace(/<style[^>]*>/i, '<style>').replace(/body\s*\{/g, '.violations-transfer-content {');
    }).join('\n');
    
    const bodyMatch = data.violationsTransferHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    violationsTransferBody = bodyMatch ? bodyMatch[1] : data.violationsTransferHtml;
  }

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>حافظة مستندات - ${data.customerName}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 20mm 20mm 20mm;
    }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page-break { page-break-before: always; }
      body { margin: 0; padding: 0; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Traditional Arabic', 'Times New Roman', 'Arial', serif;
      direction: rtl;
      background: #fff;
      color: #000;
      line-height: 1.8;
      font-size: 14px;
    }
    
    /* صفحة الغلاف */
    .cover-page {
      padding: 20px 30px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px double #1e3a5f;
      padding-bottom: 15px;
      margin-bottom: 15px;
    }
    .company-ar h1 { color: #1e3a5f; margin: 0; font-size: 20px; }
    .company-ar p { color: #000; margin: 2px 0; font-size: 11px; }
    .logo-container { flex: 0 0 180px; text-align: center; padding: 0 15px; }
    .logo-container img { max-height: 140px; max-width: 240px; width: auto; height: auto; }
    .company-en { text-align: left; }
    .company-en h1 { color: #1e3a5f; margin: 0; font-size: 14px; }
    .company-en p { color: #000; margin: 2px 0; font-size: 11px; }
    .address-bar {
      background: #f0f4f8;
      padding: 8px 15px;
      text-align: center;
      font-size: 11px;
      color: #333;
      margin-bottom: 20px;
      border: 1px solid #d0d7de;
    }
    .portfolio-title {
      text-align: center;
      margin: 30px 0;
    }
    .portfolio-title h1 {
      font-size: 28px;
      padding: 15px 40px;
      border: 3px solid #1e3a5f;
      display: inline-block;
    }
    .portfolio-title h2 {
      font-size: 18px;
      color: #1e3a5f;
      margin-top: 15px;
    }
    .ref-bar {
      display: flex;
      justify-content: space-between;
      background: #1e3a5f;
      color: white;
      padding: 10px 20px;
      margin: 20px 0;
    }
    .case-info {
      background: #f8fafc;
      border: 1px solid #d0d7de;
      padding: 20px;
      margin: 15px 0;
    }
    .case-info-header {
      background: #1e3a5f;
      color: white;
      padding: 8px 15px;
      margin: -20px -20px 15px -20px;
      font-weight: bold;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .info-item label { display: block; font-size: 11px; color: #666; }
    .info-item span { font-size: 14px; font-weight: 600; }
    .index-section { margin-top: 25px; }
    .index-section h3 {
      font-size: 14px;
      color: #1e3a5f;
      border-bottom: 2px solid #1e3a5f;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    .index-table { width: 100%; border-collapse: collapse; }
    .index-table th {
      background: #1e3a5f;
      color: white;
      padding: 10px;
      text-align: right;
    }
    .index-table td {
      padding: 10px;
      border-bottom: 1px solid #ddd;
    }
    .index-table tr:nth-child(even) { background: #f8f8f8; }
    .signature-area {
      margin-top: auto;
      padding-top: 30px;
      display: flex;
      justify-content: space-between;
    }
    .signature-box { text-align: center; }
    .signature-line { width: 150px; border-top: 1px solid #000; margin-bottom: 5px; }
    .stamp-box {
      width: 90px;
      height: 90px;
      border: 2px dashed #999;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      font-size: 10px;
    }
    
    /* صفحات المستندات */
    .doc-page {
      padding: 20px 30px;
    }
    .doc-header {
      background: #1e3a5f;
      color: white;
      padding: 15px 25px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .doc-header h2 { margin: 0; font-size: 18px; }
    .doc-number {
      background: rgba(255,255,255,0.2);
      padding: 5px 15px;
      font-size: 12px;
    }
    .doc-content {
      border: 1px solid #ddd;
      min-height: 500px;
    }
    .doc-content img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    }
    .claims-content {
      padding: 20px;
    }
    .complaint-content {
      padding: 20px;
    }
    .violations-transfer-content {
      padding: 20px;
    }
  </style>
  ${claimsStyles}
  ${complaintStyles}
  ${violationsTransferStyles}
</head>
<body>
  <!-- صفحة الغلاف -->
  <div class="cover-page">
    <div class="header">
      <div class="company-ar">
        <h1>${COMPANY_INFO.name_ar}</h1>
        <p>ذ.م.م</p>
        <p>${COMPANY_INFO.cr}</p>
      </div>
      <div class="logo-container">
        <img src="${COMPANY_INFO.logo}" alt="شعار الشركة" onerror="this.style.display='none'" />
      </div>
      <div class="company-en" dir="ltr">
        <h1>${COMPANY_INFO.name_en}</h1>
        <p>C.R: 146832</p>
      </div>
    </div>
    
    <div class="address-bar">
      ${COMPANY_INFO.address}<br/>
      هاتف: ${COMPANY_INFO.phone} | البريد الإلكتروني: ${COMPANY_INFO.email}
    </div>
    
    <div class="portfolio-title">
      <h1>حافظة مستندات</h1>
      <h2>${data.caseTitle || 'قضية مطالبة مالية'}</h2>
    </div>
    
    <div class="ref-bar">
      <div><strong>الرقم المرجعي:</strong> ${refNumber}</div>
      <div><strong>التاريخ:</strong> ${currentDate}</div>
    </div>
    
    <div class="case-info">
      <div class="case-info-header">بيانات الدعوى</div>
      <div class="info-grid">
        <div class="info-item">
          <label>المدعى عليه</label>
          <span>${data.customerName}</span>
        </div>
        <div class="info-item">
          <label>رقم العقد</label>
          <span>${data.contractNumber}</span>
        </div>
        <div class="info-item">
          <label>المبلغ المطالب به</label>
          <span style="direction: ltr; unicode-bidi: embed;">${formatNumberEn(data.totalAmount)} ر.ق</span>
        </div>
        <div class="info-item">
          <label>عدد المستندات</label>
          <span>${documentsList.length} مستند</span>
        </div>
      </div>
    </div>
    
    <div class="index-section">
      <h3>فهرس المستندات</h3>
      <table class="index-table">
        <thead>
          <tr>
            <th style="width: 50px;">م</th>
            <th>المستند</th>
            <th style="width: 80px;">الصفحة</th>
          </tr>
        </thead>
        <tbody>
          ${documentsList.map((doc, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${doc.title}</td>
              <td>${doc.pageNum}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    ${generateSignatureSection()}
  </div>
  
  ${data.contractImageUrl ? `
  <!-- عقد الإيجار -->
  <div class="page-break"></div>
  <div class="doc-page">
    <div class="doc-header">
      <h2>عقد الإيجار</h2>
      <span class="doc-number">مستند رقم 1</span>
    </div>
    <div class="doc-content">
      <img src="${data.contractImageUrl}" alt="عقد الإيجار" />
    </div>
  </div>
  ` : ''}
  
  ${data.claimsStatementHtml ? `
  <!-- كشف المطالبات المالية -->
  <div class="page-break"></div>
  <div class="doc-page">
    <div class="doc-header">
      <h2>كشف المطالبات المالية</h2>
      <span class="doc-number">مستند رقم ${data.contractImageUrl ? '2' : '1'}</span>
    </div>
    <div class="doc-content claims-content">
      ${claimsBody}
    </div>
  </div>
  ` : ''}
  
  ${data.criminalComplaintHtml ? `
  <!-- بلاغ سرقة المركبة -->
  <div class="page-break"></div>
  <div class="doc-page">
    <div class="doc-header">
      <h2>بلاغ سرقة المركبة</h2>
      <span class="doc-number">مستند رقم ${[data.contractImageUrl, data.claimsStatementHtml].filter(Boolean).length + 1}</span>
    </div>
    <div class="doc-content complaint-content">
      ${complaintBody}
    </div>
  </div>
  ` : ''}
  
  ${data.violationsTransferHtml ? `
  <!-- طلب تحويل المخالفات -->
  <div class="page-break"></div>
  <div class="doc-page">
    <div class="doc-header">
      <h2>طلب تحويل المخالفات المرورية</h2>
      <span class="doc-number">مستند رقم ${[data.contractImageUrl, data.claimsStatementHtml, data.criminalComplaintHtml].filter(Boolean).length + 1}</span>
    </div>
    <div class="doc-content violations-transfer-content">
      ${violationsTransferBody}
    </div>
  </div>
  ` : ''}
  
  ${data.ibanImageUrl ? `
  <!-- شهادة IBAN -->
  <div class="page-break"></div>
  <div class="doc-page">
    <div class="doc-header">
      <h2>شهادة IBAN</h2>
      <span class="doc-number">مستند رقم ${[data.contractImageUrl, data.claimsStatementHtml, data.criminalComplaintHtml, data.violationsTransferHtml].filter(Boolean).length + 1}</span>
    </div>
    <div class="doc-content">
      <img src="${data.ibanImageUrl}" alt="شهادة IBAN" />
    </div>
  </div>
  ` : ''}
  
  ${data.commercialRegisterUrl ? `
  <!-- السجل التجاري -->
  <div class="page-break"></div>
  <div class="doc-page">
    <div class="doc-header">
      <h2>السجل التجاري</h2>
      <span class="doc-number">مستند رقم ${[data.contractImageUrl, data.claimsStatementHtml, data.criminalComplaintHtml, data.violationsTransferHtml, data.ibanImageUrl].filter(Boolean).length + 1}</span>
    </div>
    <div class="doc-content">
      <img src="${data.commercialRegisterUrl}" alt="السجل التجاري" />
    </div>
  </div>
  ` : ''}
</body>
</html>
  `;
}
