/**
 * توليد كشف المستندات المرفوعة مع دمج صور المستندات
 */

import { COMPANY_INFO, generateRefNumber, formatDateAr, extractHtmlBody } from './shared';
import { getOfficialLetterStyles } from './styles';
import { generateOfficialHeader, generateSignatureSection } from './templates';
import type { DocumentsListData } from './types';

/**
 * توليد كشف المستندات المرفوعة مع دمج صور المستندات
 */
export function generateDocumentsListHtml(data: DocumentsListData): string {
  const refNumber = generateRefNumber();
  const currentDate = formatDateAr();
  
  // تصفية المستندات المرفقة التي لها روابط أو محتوى HTML
  const attachedDocs = data.documents.filter(d => d.status === 'مرفق' && (d.url || d.htmlContent));

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كشف بالمستندات المرفوعة - ${COMPANY_INFO.name_ar}</title>
  <style>
    ${getOfficialLetterStyles()}
    
    /* ========== أنماط طباعة A4 محسّنة ========== */
    @page {
      size: A4;
      margin: 15mm 15mm 20mm 15mm;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      html, body {
        width: 210mm !important;
        margin: 0 !important;
        padding: 0 !important;
        font-size: 11pt !important;
      }
      
      .letter-container {
        width: 100% !important;
        max-width: 180mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }
      
      .document-section {
        page-break-before: always !important;
        break-before: page !important;
        page-break-inside: auto !important;
        margin-top: 0 !important;
        padding-top: 10mm !important;
      }
      
      .document-title {
        page-break-after: avoid !important;
      }
      
      .html-document-content {
        page-break-inside: auto !important;
      }
      
      .html-document-content .letter-container {
        page-break-inside: auto !important;
      }
      
      .no-break {
        page-break-inside: avoid !important;
      }
      
      /* إخفاء عناصر التحكم */
      .no-print {
        display: none !important;
      }
      
      /* تحسين الجداول للطباعة */
      table {
        width: 100% !important;
        font-size: 10pt !important;
      }
      
      th, td {
        padding: 6px 8px !important;
      }
      
      /* تحسين الصور */
      img {
        max-width: 100% !important;
        height: auto !important;
        page-break-inside: avoid !important;
      }
    }
    
    /* ========== أنماط عرض المستندات ========== */
    .document-section {
      page-break-before: always !important;
      break-before: page !important;
      margin-top: 0;
      padding-top: 20px;
    }
    
    .document-title {
      background: #1e3a5f;
      color: white;
      padding: 12px 20px;
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 15px;
      border-radius: 5px;
      page-break-after: avoid;
      break-after: avoid;
    }
    
    .document-image {
      width: 100%;
      max-width: 100%;
      height: auto;
      border: 1px solid #ddd;
      margin: 10px 0;
      display: block;
    }
    
    .document-frame {
      width: 100%;
      min-height: 500px;
      border: 1px solid #ddd;
    }
    
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    
    /* صفحة عنوان المستند - تصميم احترافي */
    .document-title-page {
      page-break-before: always;
      break-before: page;
      page-break-after: always;
      break-after: page;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: #fff;
      color: #1e3a5f;
      text-align: center;
      padding: 40px;
      position: relative;
      overflow: hidden;
    }
    
    /* إطار الصفحة */
    .document-title-page::before {
      content: '';
      position: absolute;
      top: 15mm;
      left: 15mm;
      right: 15mm;
      bottom: 15mm;
      border: 3px double #1e3a5f;
      pointer-events: none;
    }
    
    /* الشريط العلوي */
    .document-title-page::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 25mm;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
    }
    
    .document-title-page .doc-number {
      font-size: 150pt;
      font-weight: bold;
      color: #f0f4f8;
      position: absolute;
      bottom: 20mm;
      left: 20mm;
      z-index: 0;
      line-height: 1;
      font-family: 'Arial Black', sans-serif;
    }
    
    .document-title-page .doc-info {
      position: relative;
      z-index: 1;
      margin-top: 30mm;
    }
    
    .document-title-page .doc-label {
      font-size: 14pt;
      color: #666;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 15px;
    }
    
    .document-title-page h1 {
      font-size: 28pt;
      font-weight: bold;
      margin: 0 0 30px 0;
      color: #1e3a5f;
      border-bottom: 3px solid #1e3a5f;
      padding-bottom: 20px;
      display: inline-block;
    }
    
    .document-title-page .doc-name {
      font-size: 22pt;
      color: #333;
      font-weight: 600;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white;
      padding: 20px 50px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(30, 58, 95, 0.3);
    }
    
    .document-title-page .company-watermark {
      position: absolute;
      bottom: 25mm;
      right: 25mm;
      font-size: 10pt;
      color: #999;
      text-align: left;
    }
    
    .document-title-page .company-watermark img {
      height: 40px;
      opacity: 0.5;
      margin-bottom: 5px;
    }
    
    @media print {
      .document-title-page {
        page-break-before: always !important;
        break-before: page !important;
        page-break-after: always !important;
        break-after: page !important;
        min-height: 270mm !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .document-title-page::after {
        background: #1e3a5f !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .document-title-page .doc-name {
        background: #1e3a5f !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    
    /* محتوى المستند */
    .document-content-page {
      page-break-before: auto;
      padding: 20px 0;
    }
    
    /* ========== أنماط محتوى HTML المضمّن ========== */
    .html-document-content {
      background: #fff;
      border: 1px solid #e0e0e0;
      padding: 15px;
      margin: 0;
      font-size: 11pt;
      line-height: 1.6;
    }
    
    .html-document-content .letter-container {
      max-width: 100% !important;
      padding: 10px !important;
      margin: 0 !important;
      border: none !important;
      box-shadow: none !important;
    }
    
    .html-document-content .header {
      border-bottom: 2px solid #1e3a5f;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    
    .html-document-content table {
      width: 100%;
      font-size: 10pt;
      margin: 10px 0;
    }
    
    .html-document-content th,
    .html-document-content td {
      padding: 6px 8px;
    }
    
    .html-document-content .summary {
      margin: 15px 0;
      padding: 12px;
    }
    
    .html-document-content .signature-section {
      margin-top: 15px;
    }
    
    .html-document-content .footer {
      margin-top: 10px;
      padding-top: 5px;
      font-size: 8pt;
    }
  </style>
</head>
<body>
  <div class="letter-container">
    ${generateOfficialHeader(refNumber, currentDate)}
    
    <!-- معلومات الدعوى -->
    <div class="subject-box">
      <strong>كشف بالمستندات المرفوعة</strong>
    </div>
    
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">عنوان الدعوى:</span>
        <span>${data.caseTitle}</span>
      </div>
      <div class="info-row">
        <span class="info-label">المدعى عليه:</span>
        <span>${data.customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">المبلغ المطالب به:</span>
        <span>${data.amount.toLocaleString('en-US')} ريال قطري</span>
      </div>
    </div>
    
    <!-- جدول المستندات -->
    <table>
      <thead>
        <tr>
          <th style="width: 50px;">م</th>
          <th>اسم المستند</th>
        </tr>
      </thead>
      <tbody>
        ${data.documents.filter(d => d.status === 'مرفق').map((doc, i) => `
          <tr>
            <td style="text-align: center;">${i + 1}</td>
            <td>${doc.name}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="content" style="text-align: center; margin: 20px 0;">
      <p><strong>إجمالي المستندات المرفقة:</strong> ${data.documents.filter(d => d.status === 'مرفق').length}</p>
    </div>
    
    ${generateSignatureSection()}
  </div>
  
  <!-- ==================== المستندات المرفقة ==================== -->
  
  ${attachedDocs.map((doc, index) => `
    <!-- صفحة العنوان -->
    <div class="document-title-page">
      <div class="doc-number">${index + 1}</div>
      <div class="doc-info">
        <div class="doc-label">حافظة المستندات القانونية</div>
        <h1>المستند رقم ${index + 1}</h1>
        <div class="doc-name">${doc.name}</div>
      </div>
      <div class="company-watermark">
        <img src="/receipts/logo.png" alt="" onerror="this.style.display='none'" />
        <div>${COMPANY_INFO.name_ar}</div>
      </div>
    </div>
    
    <!-- محتوى المستند -->
    <div class="letter-container document-section document-content-page">
      <div class="document-title">
        ${doc.name}
      </div>
      ${doc.type === 'pdf' ? `
        <div id="pdf-container-${index}" style="width: 100%;"></div>
        <script>
          (function() {
            // تحميل pdf.js من CDN
            if (!window.pdfjsLib) {
              var script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
              script.onload = function() {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                renderAllPages${index}();
              };
              document.head.appendChild(script);
            } else {
              renderAllPages${index}();
            }
            
            function renderAllPages${index}() {
              var container = document.getElementById('pdf-container-${index}');
              pdfjsLib.getDocument('${doc.url}').promise.then(function(pdf) {
                var totalPages = pdf.numPages;
                
                // إذا كان المستند صفحتين أو أقل، نعرضهم في صفحة واحدة (مثل البطاقة الشخصية)
                var keepTogether = totalPages <= 2;
                
                // عرض جميع الصفحات
                for (var pageNum = 1; pageNum <= totalPages; pageNum++) {
                  (function(pageNumber) {
                    pdf.getPage(pageNumber).then(function(page) {
                      var scale = keepTogether ? 1.5 : 2;
                      var viewport = page.getViewport({ scale: scale });
                      
                      // إنشاء div لكل صفحة
                      var pageDiv = document.createElement('div');
                      pageDiv.style.marginBottom = '15px';
                      // فقط إضافة page-break إذا كان أكثر من صفحتين
                      if (!keepTogether && pageNumber < totalPages) {
                        pageDiv.style.pageBreakAfter = 'always';
                      }
                      
                      // إنشاء canvas لكل صفحة
                      var canvas = document.createElement('canvas');
                      canvas.style.width = keepTogether ? '90%' : '100%';
                      canvas.style.display = 'block';
                      canvas.style.margin = '0 auto';
                      canvas.style.border = '1px solid #ddd';
                      canvas.height = viewport.height;
                      canvas.width = viewport.width;
                      
                      var context = canvas.getContext('2d');
                      page.render({ canvasContext: context, viewport: viewport });
                      
                      pageDiv.appendChild(canvas);
                      
                      // إضافة رقم الصفحة فقط إذا كان أكثر من صفحتين
                      if (!keepTogether) {
                        var pageLabel = document.createElement('p');
                        pageLabel.style.textAlign = 'center';
                        pageLabel.style.color = '#666';
                        pageLabel.style.fontSize = '11px';
                        pageLabel.style.margin = '5px 0';
                        pageLabel.textContent = 'صفحة ' + pageNumber + ' من ' + totalPages;
                        pageDiv.appendChild(pageLabel);
                      }
                      
                      container.appendChild(pageDiv);
                    });
                  })(pageNum);
                }
              }).catch(function(error) {
                console.error('Error loading PDF:', error);
                container.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">تعذر تحميل ملف PDF</p>';
              });
            }
          })();
        </script>
      ` : doc.type === 'html' && doc.htmlContent ? `
        <div class="html-document-content" style="width: 100%; border: 1px solid #ddd; padding: 15px; background: #fff;">
          ${extractHtmlBody(doc.htmlContent)}
        </div>
      ` : doc.type === 'html' ? `
        <div style="text-align: center; padding: 40px; color: #666;">
          <p>محتوى المستند غير متوفر للعرض المباشر</p>
          <p style="font-size: 12px;">يرجى توليد المستند أولاً</p>
        </div>
      ` : `
        <img src="${doc.url}" alt="${doc.name}" class="document-image" 
             onerror="this.onerror=null; this.src=''; this.alt='تعذر تحميل الصورة';" />
      `}
    </div>
  `).join('')}
  
  ${data.claimsStatementHtml ? `
    <!-- كشف المطالبات المالية -->
    <div class="letter-container document-section">
      <div class="document-title">
        كشف المطالبات المالية
      </div>
      ${data.claimsStatementHtml}
    </div>
  ` : ''}

</body>
</html>
  `;
}
