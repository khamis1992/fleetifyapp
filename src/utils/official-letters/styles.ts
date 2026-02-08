/**
 * أنماط CSS الموحدة للكتب الرسمية
 */

/**
 * توليد أنماط CSS الموحدة للكتب الرسمية
 */
export function getOfficialLetterStyles(): string {
  return `
    @page {
      size: A4;
      margin: 15mm 20mm 20mm 20mm;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        overflow: visible !important;
      }
      
      .letter-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 10mm !important;
        border: none !important;
        box-shadow: none !important;
        overflow: visible !important;
      }
      
      .no-print {
        display: none !important;
      }
      
      p, div, span, td, th, li {
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }
      
      table {
        width: 100% !important;
        table-layout: fixed !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      tr {
        page-break-inside: avoid !important;
        page-break-after: auto !important;
        break-inside: avoid !important;
      }
      
      thead {
        display: table-header-group !important;
      }
      
      tfoot {
        display: table-footer-group !important;
      }
      
      /* منع تقسيم العناصر المهمة */
      .content, .section, .info-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      /* ضمان أن الجداول الكبيرة تبدأ في صفحة جديدة */
      table.large-table {
        page-break-before: always !important;
        break-before: always !important;
      }
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Times New Roman (Headings CS)', 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.8;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 15px;
      direction: rtl;
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
    }
    
    .letter-container {
      width: 100%;
      max-width: 180mm;
      margin: 0 auto;
      padding: 15px 20px;
      background: #fff;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    .header {
      width: 100%;
      border-bottom: 3px double #1e3a5f;
      padding-bottom: 15px;
      margin-bottom: 15px;
      overflow: hidden;
    }
    
    .header::after {
      content: "";
      display: table;
      clear: both;
    }
    
    .company-ar {
      float: right;
      width: 35%;
      text-align: right;
    }
    
    .company-ar h1 {
      color: #1e3a5f;
      margin: 0;
      font-size: 16px;
      font-weight: bold;
    }
    
    .company-ar p {
      color: #000;
      margin: 2px 0;
      font-size: 10px;
    }
    
    .logo-container {
      float: right;
      width: 25%;
      text-align: center;
      padding: 0 10px;
    }
    
    .logo-container img {
      max-height: 120px;
      max-width: 200px;
      width: auto;
      height: auto;
    }
    
    .company-en {
      float: left;
      width: 35%;
      text-align: left;
    }
    
    .company-en h1 {
      color: #1e3a5f;
      margin: 0;
      font-size: 12px;
      font-weight: bold;
    }
    
    .company-en p {
      color: #000;
      margin: 2px 0;
      font-size: 9px;
    }
    
    .address-bar {
      text-align: center;
      color: #000;
      font-size: 10px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ccc;
    }
    
    .ref-date {
      width: 100%;
      margin-bottom: 20px;
      font-size: 12px;
      color: #000;
      overflow: hidden;
    }
    
    .ref-date::after {
      content: "";
      display: table;
      clear: both;
    }
    
    .ref-date > div:first-child {
      float: right;
    }
    
    .ref-date > div:last-child {
      float: left;
    }
    
    .recipient-box {
      margin-bottom: 15px;
      padding: 12px 15px;
      border-right: 4px solid #1e3a5f;
      background: #f5f5f5;
    }
    
    .recipient-box p {
      margin: 0;
      font-size: 15px;
      color: #000;
    }
    
    .recipient-box .greeting {
      margin-top: 5px;
      font-size: 13px;
    }
    
    .salutation {
      margin: 20px 0 10px 0;
      font-size: 15px;
      color: #000;
    }
    
    .subject-box {
      background: #1e3a5f;
      color: #fff;
      padding: 10px 15px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    
    .intro {
      margin-bottom: 15px;
      font-size: 14px;
      color: #000;
    }
    
    .content {
      text-align: justify;
      margin-bottom: 20px;
      font-size: 12pt;
      color: #000;
      padding: 12px;
      background: #fafafa;
      border: 1px solid #e0e0e0;
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }
    
    .content p {
      margin: 10px 0;
      line-height: 2;
    }
    
    .attachments {
      margin-bottom: 20px;
      background: #fffbeb;
      padding: 12px 15px;
      border: 1px solid #fcd34d;
    }
    
    .attachments strong {
      color: #92400e;
      font-size: 13px;
    }
    
    .attachments ul {
      margin: 8px 0 0 0;
      padding-right: 20px;
      color: #000;
    }
    
    .attachments li {
      margin: 4px 0;
    }
    
    .closing {
      text-align: center;
      margin: 15px 0;
      font-size: 14px;
      color: #000;
      page-break-inside: avoid;
    }
    
    .signature-section {
      margin-top: 20px;
      width: 100%;
      overflow: hidden;
      page-break-inside: avoid;
    }
    
    .signature-section::after {
      content: "";
      display: table;
      clear: both;
    }
    
    .stamp-area {
      float: left;
      text-align: center;
      width: 100px;
    }
    
    .stamp-circle {
      width: 80px;
      height: 80px;
      border: 2px dashed #999;
      border-radius: 50%;
      display: table-cell;
      vertical-align: middle;
      text-align: center;
    }
    
    .stamp-circle span {
      color: #666;
      font-size: 9px;
    }
    
    .signatory {
      float: right;
      text-align: center;
      width: 200px;
    }
    
    .signatory .company-name {
      color: #1e3a5f;
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 30px;
    }
    
    .signatory .line {
      border-top: 2px solid #1e3a5f;
      width: 180px;
      margin: 0 auto;
      padding-top: 8px;
    }
    
    .signatory .name {
      font-size: 14px;
      font-weight: bold;
      color: #000;
      margin: 0;
    }
    
    .signatory .title {
      font-size: 11px;
      color: #000;
      margin-top: 3px;
    }
    
    .sign-area {
      float: left;
      text-align: center;
      width: 100px;
      margin-left: 20px;
    }
    
    .sign-line {
      width: 80px;
      height: 40px;
      border-bottom: 2px solid #999;
      margin: 0 auto 8px auto;
    }
    
    .sign-area span {
      color: #666;
      font-size: 9px;
    }
    
    .footer {
      margin-top: 10px;
      padding-top: 5px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 9px;
      color: #000;
      page-break-inside: avoid;
    }

    /* أنماط إضافية للجداول */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 11px;
      table-layout: fixed;
    }
    
    th, td {
      border: 1px solid #333;
      padding: 8px 6px;
      text-align: right;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    th {
      background: #1e3a5f;
      color: white;
      font-weight: bold;
    }
    
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    
    .amount {
      font-weight: bold;
      color: #d32f2f;
    }
    
    .total-row {
      background: #1e3a5f !important;
      color: white;
      font-weight: bold;
    }
    
    .total-row td {
      border-color: #1e3a5f;
    }
    
    .days-late {
      color: #d32f2f;
      font-weight: bold;
    }

    .info-box {
      background: #f5f5f5;
      padding: 12px;
      margin-bottom: 15px;
      border-radius: 5px;
    }
    
    .info-row {
      margin-bottom: 6px;
      overflow: hidden;
    }
    
    .info-row::after {
      content: "";
      display: table;
      clear: both;
    }
    
    .info-label {
      font-weight: bold;
      color: #555;
      float: right;
      width: 120px;
    }
    
    .info-row > span:last-child {
      float: right;
      margin-right: 10px;
    }

    .summary {
      margin-top: 25px;
      padding: 15px;
      background: #1e3a5f;
      color: white;
      border-radius: 8px;
    }
    
    .summary h3 {
      margin: 0 0 12px;
      font-size: 14pt;
    }
    
    .summary-grid {
      width: 100%;
      overflow: hidden;
    }
    
    .summary-grid::after {
      content: "";
      display: table;
      clear: both;
    }
    
    .summary-item {
      float: right;
      width: 30%;
      text-align: center;
      padding: 8px;
      margin: 0 1.5%;
      background: rgba(255,255,255,0.1);
      border-radius: 5px;
    }
    
    .summary-value {
      font-size: 16pt;
      font-weight: bold;
    }
    
    .summary-label {
      font-size: 9pt;
      opacity: 0.9;
    }

    .section {
      margin: 20px 0;
    }
    
    .section-title {
      font-weight: bold;
      color: #1e3a5f;
      font-size: 16pt;
      margin-bottom: 10px;
    }

    .attached {
      color: green;
      font-weight: bold;
    }
    
    .not-attached {
      color: red;
    }
  `;
}
