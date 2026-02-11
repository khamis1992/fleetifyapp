/**
 * Legal Document Generator
 * Generates legal complaint documents (مذكرة شارحة) for delinquent customers
 */

import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { DelinquentCustomer } from '@/hooks/useDelinquentCustomers';

export interface LegalDocumentData {
  customer: DelinquentCustomer;
  companyInfo: {
    name_ar: string;
    name_en: string;
    address: string;
    cr_number: string;
  };
  vehicleInfo: {
    plate: string;
    make?: string;
    model?: string;
    year?: number;
  };
  contractInfo: {
    contract_number: string;
    start_date: string;
    end_date?: string;
    monthly_rent: number;
    total_amount?: number;
    installments_count?: number;
    security_deposit?: number;
    duration_years?: number;
  };
  damages?: number;
  compensation?: number;
  additionalNotes?: string;
  breachDetails?: {
    unpaidMonthsDescription?: string;
    damagesDescription?: string;
  };
}

/**
 * تحويل الأيام إلى صيغة مناسبة (أشهر إذا كانت أكثر من 60 يوم)
 */
function formatDaysToReadable(days: number): string {
  if (days < 60) {
    return `${days} يوم`;
  }
  
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  
  // عرض الأشهر فقط بدون الأيام المتبقية
  if (months === 1) return 'شهر واحد';
  if (months === 2) return 'شهرين';
  if (months >= 3 && months <= 10) return `${months} أشهر`;
  return `${months} شهر`;
}

/**
 * Convert number to Arabic words
 */
function numberToArabicWords(num: number): string {
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشر', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  const thousands = ['', 'ألف', 'ألفان', 'ثلاثة آلاف', 'أربعة آلاف', 'خمسة آلاف', 'ستة آلاف', 'سبعة آلاف', 'ثمانية آلاف', 'تسعة آلاف'];
  const tenThousands = ['', 'عشرة آلاف', 'عشرون ألف', 'ثلاثون ألف', 'أربعون ألف', 'خمسون ألف', 'ستون ألف', 'سبعون ألف', 'ثمانون ألف', 'تسعون ألف'];
  
  if (num === 0) return 'صفر';
  
  // Simplified version - just format the number
  const formatted = num.toLocaleString('en-US');
  return `${formatted} ريال قطري`;
}

/**
 * Generate legal complaint document (مذكرة شارحة)
 */
export function generateLegalComplaint(data: LegalDocumentData): string {
  const { customer, companyInfo, vehicleInfo, contractInfo, damages = 0, additionalNotes } = data;
  
  const today = format(new Date(), 'dd/MM/yyyy', { locale: ar });
  
  // Calculate totals
  const latePenalty = customer.late_penalty || 0;
  const overdueRent = customer.overdue_amount || 0;
  const damagesAmount = damages || (customer.total_debt * 0.3); // Default 30% for damages if not specified
  const totalClaim = latePenalty + overdueRent + damagesAmount;
  
  const document = `
مذكرة شارحة مقدمة إلى عدالة المحكمة المدنية

التاريخ: ${today}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

مقدمة من:

${companyInfo.name_ar} – ذ.م.م
المقر: ${companyInfo.address}
رقم السجل التجاري: ${companyInfo.cr_number}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ضــد:

السيد / ${customer.customer_name}
${customer.id_number ? `حامل البطاقة الشخصية رقم ${customer.id_number}` : 'رقم العميل: ' + customer.customer_code}
${customer.phone ? `رقم الهاتف: ${customer.phone}` : ''}
${customer.email ? `البريد الإلكتروني: ${customer.email}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

الموضوع: مطالبة مالية وتحويل الغرامات المرورية إلى الرقم الشخصي للمستأجر

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

أولاً: الوقائع

أبرمت الشركة عقد إيجار مركبة رقم (${contractInfo.contract_number}) بتاريخ ${contractInfo.start_date} مع المدعى عليه، التزم بموجبه بدفع الإيجار الشهري البالغ (${contractInfo.monthly_rent.toLocaleString('en-US')}) ريال قطري والمحافظة على المركبة رقم (${vehicleInfo.plate})${vehicleInfo.make ? ` من نوع ${vehicleInfo.make}` : ''}${vehicleInfo.model ? ` ${vehicleInfo.model}` : ''}${vehicleInfo.year ? ` موديل ${vehicleInfo.year}` : ''} وسداد جميع الالتزامات المترتبة على استخدامها.

إلا أن المدعى عليه أخلَّ بهذه الالتزامات إخلالًا واضحًا، إذ تأخر في سداد الإيجارات لمدة (${formatDaysToReadable(customer.days_overdue)})، ${customer.violations_count > 0 ? `وسُجلت على المركبة (${customer.violations_count}) مخالفة مرورية بقيمة إجمالية (${customer.violations_amount.toLocaleString('en-US')}) ريال قطري ناتجة عن استخدامه الشخصي،` : ''} ورفض تسليم المركبة وسداد المستحقات دون مبرر مشروع.

${customer.violations_count > 0 ? `
ونظرًا لأن المخالفات المرورية تصدر باسم مالك المركبة (الشركة) بحكم النظام، فإن الشركة لا تطلب من عدالتكم الموقرة إلزام المدعى عليه بسداد قيمتها نقدًا، وإنما تلتمس تحويل هذه المخالفات رسميًا على رقمه الشخصي باعتباره السائق والمستخدم الفعلي للمركبة وقت وقوعها، وذلك استنادًا إلى سجلات المخالفات الصادرة من الإدارة العامة للمرور.
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ثانياً: المطالبات المالية المباشرة

┌─────────────────────────────────────────────────────────────────┐
│ البند │ البيان                                      │ المبلغ (ر.ق) │
├───────┼─────────────────────────────────────────────┼──────────────┤
│   1   │ غرامات تأخير حسب ما هو منصوص عليه في العقد  │ ${latePenalty.toLocaleString('en-US').padStart(12, ' ')} │
│   2   │ إيجار متأخر غير مسدد                        │ ${overdueRent.toLocaleString('en-US').padStart(12, ' ')} │
│   3   │ تعويض عن الأضرار المادية والمعنوية          │ ${damagesAmount.toLocaleString('en-US').padStart(12, ' ')} │
├───────┼─────────────────────────────────────────────┼──────────────┤
│       │ الإجمالي                                    │ ${totalClaim.toLocaleString('en-US').padStart(12, ' ')} │
└─────────────────────────────────────────────────────────────────┘

الإجمالي: ${totalClaim.toLocaleString('en-US')} ريال قطري
(${numberToArabicWords(totalClaim)})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${customer.violations_count > 0 ? `
ثالثاً: الطلب المتعلق بالمخالفات المرورية

تلتمس الشركة من عدالتكم الموقرة عدم إدخال قيمة المخالفات المرورية ضمن المطالبة المالية، والاكتفاء بإصدار أمر بتحويلها إلى الرقم الشخصي للمدعى عليه ${customer.id_number || '(رقم البطاقة الشخصية)'} لدى الإدارة العامة للمرور، وذلك لتجنب تحميل الشركة ما لا يلزمها به القانون، إذ أن المخالفات ناتجة عن تصرفات المستأجر لا عن مالك المركبة.

عدد المخالفات: ${customer.violations_count} مخالفة
قيمة المخالفات: ${customer.violations_amount.toLocaleString('en-US')} ريال قطري

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}
رابعاً: الأساس القانوني

تستند هذه الدعوى إلى أحكام القانون المدني القطري، ولا سيما المواد:

• المادة (171): العقد شريعة المتعاقدين، ولا يجوز نقضه أو تعديله إلا باتفاق الطرفين أو للأسباب التي يقرها القانون.

• المادة (263): يلتزم المدين بتعويض الضرر الناتج عن إخلاله بالتزامه.

• المادة (589): يلتزم المستأجر بالمحافظة على العين المؤجرة وردها بالحالة التي تسلمها بها.

• المادة (267): يقدر التعويض بقدر الضرر المباشر المتوقع عادة وقت التعاقد.

وبناءً عليه، فإن المطالبات المالية الواردة أعلاه هي عن التزامات تعاقدية مباشرة، في حين أن الغرامات المرورية ينبغي أن تُحوّل إداريًا إلى المستأجر.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

خامساً: الطلبات

تلتمس الشركة من عدالتكم الموقرة ما يلي:

1. إلزام المدعى عليه بسداد المبلغ الإجمالي وقدره (${totalClaim.toLocaleString('en-US')} ريال قطري).
${customer.violations_count > 0 ? `
2. إصدار أمر بتحويل جميع المخالفات المرورية المسجلة على المركبة خلال فترة الإيجار إلى الرقم الشخصي للمدعى عليه ${customer.id_number || '(رقم البطاقة الشخصية)'}.
3. بيان إجمالي قيمة المخالفات المرورية المسجلة على المركبة وقدرها (${customer.violations_amount.toLocaleString('en-US')} ريال قطري).
4. تحميل المدعى عليه رسوم الدعوى والمصاريف وأتعاب المحاماة.
` : `3. تحميل المدعى عليه رسوم الدعوى والمصاريف وأتعاب المحاماة.`}

${additionalNotes ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ملاحظات إضافية:
${additionalNotes}
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

وتفضلوا بقبول فائق الاحترام والتقدير،

عن ${companyInfo.name_ar} – ذ.م.م




_______________________________
التوقيع والختم

`;

  return document.trim();
}

/**
 * Generate HTML version of the legal complaint for printing
 * Professional formal legal document style - matching claims statement design
 * Updated to match new legal memo template structure
 */
export function generateLegalComplaintHTML(data: LegalDocumentData): string {
  const { customer, companyInfo, vehicleInfo, contractInfo, damages = 0, compensation = 10000, additionalNotes, breachDetails } = data;
  
  const today = format(new Date(), 'dd/MM/yyyy');
  const currentDate = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  // Generate reference number
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  const refNumber = `ALR/${year}/${month}/${random}`;
  
  // Calculate totals
  const latePenalty = customer.late_penalty || 0;
  const overdueRent = customer.overdue_amount || 0;
  const compensationAmount = compensation || 10000;
  const totalClaim = latePenalty + overdueRent + compensationAmount;
  
  // Contract details
  const securityDeposit = contractInfo.security_deposit || 0;
  const contractDuration = contractInfo.duration_years || 3;
  const lateFeePerDay = 120; // غرامة التأخير اليومية

  // Company info constants
  const COMPANY_INFO = {
    name_ar: companyInfo.name_ar || 'شركة العراف لتأجير السيارات',
    name_en: companyInfo.name_en || 'AL-ARAF CAR RENTAL L.L.C',
    logo: '/receipts/logo.png',
    address: companyInfo.address || 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
    phone: '31411919',
    email: 'info@alaraf.qa',
    cr: companyInfo.cr_number || '146832',
    authorized_signatory: 'خميس هاشم الجبر',
    authorized_title: 'المخول بالتوقيع',
  };

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>مذكرة شارحة - ${customer.customer_name}</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="shortcut icon" href="/favicon.ico" />
  <style>
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
      
      body {
        margin: 0;
        padding: 0;
      }
      
      .letter-container {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }
      
      .no-print {
        display: none !important;
      }
      
      /* منع تقسيم الجداول والعناصر المهمة */
      table {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      .content, .section, .info-section, .claims-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      thead {
        display: table-header-group !important;
      }
      
      tfoot {
        display: table-footer-group !important;
      }
    }
    
    body {
      font-family: 'Times New Roman (Headings CS)', 'Times New Roman', serif;
      font-size: 14px;
      line-height: 1.8;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 20px;
      direction: rtl;
    }
    
    .letter-container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px 30px;
      background: #fff;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px double #1e3a5f;
      padding-bottom: 15px;
      margin-bottom: 15px;
    }
    
    .company-ar {
      flex: 1;
      text-align: right;
    }
    
    .company-ar h1 {
      color: #1e3a5f;
      margin: 0;
      font-size: 20px;
      font-weight: bold;
    }
    
    .company-ar p {
      color: #000;
      margin: 2px 0;
      font-size: 11px;
    }
    
    .logo-container {
      flex: 0 0 180px;
      text-align: center;
      padding: 0 15px;
    }
    
    .logo-container img {
      max-height: 140px;
      max-width: 240px;
      width: auto;
      height: auto;
    }
    
    .company-en {
      flex: 1;
      text-align: left;
    }
    
    .company-en h1 {
      color: #1e3a5f;
      margin: 0;
      font-size: 14px;
      font-weight: bold;
    }
    
    .company-en p {
      color: #000;
      margin: 2px 0;
      font-size: 10px;
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
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 13px;
      color: #000;
    }
    
    .subject-box {
      background: #1e3a5f;
      color: #fff;
      padding: 10px 15px;
      margin-bottom: 20px;
      font-size: 14px;
      text-align: center;
    }
    
    .info-box {
      background: #f5f5f5;
      padding: 10px 15px;
      margin-bottom: 15px;
      border-radius: 5px;
      border-right: 4px solid #1e3a5f;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    
    .info-label {
      font-weight: bold;
      color: #555;
      min-width: 100px;
    }
    
    .content {
      text-align: justify;
      margin-bottom: 25px;
      font-size: 14px;
      color: #000;
      padding: 15px;
      background: #fafafa;
      border: 1px solid #e0e0e0;
    }
    
    .content p {
      margin: 10px 0;
      line-height: 2;
    }
    
    .section {
      margin: 20px 0;
    }
    
    .section-title {
      font-weight: bold;
      color: #1e3a5f;
      font-size: 16px;
      margin-bottom: 10px;
      text-decoration: underline;
    }
    
    .section-content {
      padding: 15px;
      background: #fafafa;
      border: 1px solid #e0e0e0;
    }
    
    .section-content p {
      margin: 10px 0;
      line-height: 2;
      text-align: justify;
    }

    /* Table styles */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 12px;
    }
    
    th, td {
      border: 1px solid #333;
      padding: 10px 8px;
      text-align: right;
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
      text-align: left;
      direction: ltr;
    }
    
    .total-row {
      background: #1e3a5f !important;
      color: white;
      font-weight: bold;
    }
    
    .total-row td {
      border-color: #1e3a5f;
    }
    
    .center {
      text-align: center;
    }
    
    /* Legal Articles */
    .legal-article {
      margin-bottom: 12px;
      padding-right: 20px;
      position: relative;
    }
    .legal-article::before {
      content: "•";
      position: absolute;
      right: 0;
      font-weight: bold;
      color: #1e3a5f;
    }
    
    /* Requests List */
    .requests-list {
      counter-reset: request;
    }
    .request-item {
      margin-bottom: 10px;
      padding-right: 25px;
      position: relative;
    }
    .request-item::before {
      content: counter(request) ".";
      counter-increment: request;
      position: absolute;
      right: 0;
      font-weight: bold;
      color: #1e3a5f;
    }
    
    .closing {
      text-align: center;
      margin: 25px 0;
      font-size: 14px;
      color: #000;
    }
    
    .signature-section {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .stamp-area {
      text-align: center;
      width: 120px;
    }
    
    .stamp-circle {
      width: 100px;
      height: 100px;
      border: 2px dashed #999;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
    }
    
    .stamp-circle span {
      color: #666;
      font-size: 10px;
    }
    
    .signatory {
      text-align: center;
      flex: 1;
    }
    
    .signatory .company-name {
      color: #1e3a5f;
      font-weight: bold;
      font-size: 15px;
      margin-bottom: 35px;
    }
    
    .signatory .line {
      border-top: 2px solid #1e3a5f;
      width: 200px;
      margin: 0 auto;
      padding-top: 8px;
    }
    
    .signatory .name {
      font-size: 15px;
      font-weight: bold;
      color: #000;
      margin: 0;
    }
    
    .signatory .title {
      font-size: 12px;
      color: #000;
      margin-top: 3px;
    }
    
    .sign-area {
      text-align: center;
      width: 120px;
    }
    
    .sign-line {
      width: 100px;
      height: 50px;
      border-bottom: 2px solid #999;
      margin: 0 auto 8px auto;
    }
    
    .sign-area span {
      color: #666;
      font-size: 10px;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 9px;
      color: #000;
    }
  </style>
</head>
<body>
  <div class="letter-container">
    
    <!-- الترويسة -->
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
    
    <!-- العنوان -->
    <div class="address-bar">
      ${COMPANY_INFO.address}<br/>
      هاتف: ${COMPANY_INFO.phone} | البريد الإلكتروني: ${COMPANY_INFO.email}
    </div>
    
    <!-- التاريخ والرقم المرجعي -->
    <div class="ref-date">
      <div><strong>الرقم المرجعي:</strong> ${refNumber}</div>
      <div><strong>التاريخ:</strong> ${currentDate}</div>
    </div>

    <!-- الموضوع -->
    <div class="subject-box">
      <strong>مذكرة شارحة مقدمة إلى محكمة الاستثمار</strong><br>
      <span style="font-size: 12px;">في دعوى مطالبة مالية وتعويضات عقدية - إخلال بالتزامات عقد إيجار مركبة</span>
    </div>
    
    <!-- معلومات الأطراف -->
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">المدعية:</span>
        <span>${COMPANY_INFO.name_ar} – ذ.م.م</span>
      </div>
      <div class="info-row">
        <span class="info-label">المدعى عليه:</span>
        <span>${customer.customer_name}</span>
      </div>
      ${customer.id_number ? `
      <div class="info-row">
        <span class="info-label">رقم الهوية:</span>
        <span>${customer.id_number}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">رقم العقد:</span>
        <span>${contractInfo.contract_number}</span>
      </div>
      <div class="info-row">
        <span class="info-label">الموضوع:</span>
        <span>مطالبة مالية ${customer.violations_count > 0 ? 'وتحويل الغرامات المرورية' : ''}</span>
      </div>
    </div>

    <!-- Section 1: Facts -->
    <div class="section">
      <div class="section-title">أولاً: الوقائع</div>
      <div class="section-content">
        <p>
          أبرمت الشركة عقد إيجار مركبة رقم <strong>(${contractInfo.contract_number})</strong> بتاريخ <strong>${contractInfo.start_date}</strong> مع المدعى عليه
          ${contractInfo.end_date ? ` ولمدة <strong>(${contractDuration})</strong> سنوات تنتهي بتاريخ <strong>${contractInfo.end_date}</strong>` : ''}، 
          التزم بموجبه بدفع الإيجار الشهري البالغ <strong>(${contractInfo.monthly_rent.toLocaleString('en-US')})</strong> ريال قطري 
          ${contractInfo.total_amount ? `بإجمالي مبلغ تعاقدي قدره <strong>(${contractInfo.total_amount.toLocaleString('en-US')})</strong> ريال قطري` : ''}
          ${contractInfo.installments_count ? ` على <strong>(${contractInfo.installments_count})</strong> قسط` : ''}
          ${securityDeposit > 0 ? ` مع إيداع وديعة ضمان قدرها <strong>(${securityDeposit.toLocaleString('en-US')})</strong> ريال قطري` : ''}،
          والمحافظة على المركبة رقم <strong>(${vehicleInfo.plate})</strong>
          ${vehicleInfo.make ? ` من نوع <strong>${vehicleInfo.make}</strong>` : ''}
          ${vehicleInfo.model ? ` <strong>${vehicleInfo.model}</strong>` : ''}
          ${vehicleInfo.year ? ` موديل <strong>${vehicleInfo.year}</strong>` : ''}
          وسداد جميع الالتزامات المترتبة على استخدامها، مع الالتزام بغرامة تأخير قدرها <strong>(${lateFeePerDay})</strong> ريال قطري عن كل يوم تأخير.
        </p>
        <p>
          إلا أن المدعى عليه أخلَّ بهذه الالتزامات إخلالًا واضحًا وجسيمًا، إذ تأخر في سداد الإيجارات المستحقة لمدة 
          <strong>(${formatDaysToReadable(customer.days_overdue)})</strong>
          ${breachDetails?.unpaidMonthsDescription ? ` (${breachDetails.unpaidMonthsDescription})` : ''}،
          ${customer.violations_count > 0 ? `وسُجلت على المركبة <strong>(${customer.violations_count})</strong> مخالفة مرورية بقيمة إجمالية <strong>(${customer.violations_amount.toLocaleString('en-US')})</strong> ريال قطري ناتجة عن استخدامه الشخصي،` : ''}
          ${breachDetails?.damagesDescription ? `كما تسبب في أضرار بالمركبة (${breachDetails.damagesDescription})،` : ''}
          ورفض تسليم المركبة وسداد المستحقات دون مبرر مشروع.
        </p>
        ${customer.violations_count > 0 ? `
        <p>
          ونظرًا لأن المخالفات المرورية تصدر باسم مالك المركبة (الشركة) بحكم النظام، فإن الشركة لا تطلب من عدالتكم الموقرة إلزام المدعى عليه بسداد قيمتها نقدًا بشكل أساسي، 
          وإنما تلتمس تحويل هذه المخالفات رسميًا على رقمه الشخصي <strong>${customer.id_number || ''}</strong> باعتباره السائق والمستخدم الفعلي للمركبة وقت وقوعها، 
          وذلك استنادًا إلى سجلات المخالفات الصادرة من الإدارة العامة للمرور.
          وفي حال تعذر تحويل المخالفات إدارياً، تلتمس الشركة احتياطياً إلزام المدعى عليه بسداد قيمتها كاملة.
        </p>
        ` : ''}
      </div>
    </div>

    <!-- Section 2: Financial Claims -->
    <div class="section">
      <div class="section-title">ثانياً: المطالبات المالية المباشرة</div>
      <table>
        <thead>
          <tr>
            <th style="width: 50px;">البند</th>
            <th>البيان</th>
            <th style="width: 130px;">المبلغ (ر.ق)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="center">1</td>
            <td>إيجار متأخر غير مسدد</td>
            <td class="amount">${overdueRent.toLocaleString('en-US')}</td>
          </tr>
          <tr>
            <td class="center">2</td>
            <td>غرامات تأخير في سداد الإيجار الشهري بواقع (${lateFeePerDay}) ريال قطري عن كل يوم تأخير × (${customer.days_overdue}) يوم، حسب ما هو منصوص عليه في العقد</td>
            <td class="amount">${latePenalty.toLocaleString('en-US')}</td>
          </tr>
          <tr>
            <td class="center">3</td>
            <td>تعويض عن الأضرار المادية والمعنوية والحرمان من الانتفاع</td>
            <td class="amount">${compensationAmount.toLocaleString('en-US')}</td>
          </tr>
          <tr class="total-row">
            <td colspan="2" style="text-align: left; font-weight: bold;">الإجمالي المطالب به</td>
            <td class="amount" style="font-size: 15px; color: white;">${totalClaim.toLocaleString('en-US')}</td>
          </tr>
        </tbody>
      </table>
      ${securityDeposit > 0 ? `
      <p style="margin-top: 10px; font-size: 12px; color: #666;">
        <strong>ملاحظة:</strong> تحتفظ الشركة بحقها في المقاصة بين وديعة الضمان البالغة (${securityDeposit.toLocaleString('en-US')}) ريال قطري والمبالغ المستحقة.
      </p>
      ` : ''}
    </div>

    ${customer.violations_count > 0 ? `
    <!-- Section 3: Traffic Violations -->
    <div class="section">
      <div class="section-title" style="color: #d32f2f;">ثالثاً: الطلب المتعلق بالمخالفات المرورية</div>
      <div class="section-content">
        <p>
          تلتمس الشركة من عدالتكم الموقرة عدم إدخال قيمة المخالفات المرورية ضمن المطالبة المالية، 
          والاكتفاء بإصدار أمر بتحويلها إلى الرقم الشخصي للمدعى عليه <strong>${customer.id_number || '(رقم البطاقة الشخصية)'}</strong> 
          لدى الإدارة العامة للمرور، وذلك لتجنب تحميل الشركة ما لا يلزمها به القانون، إذ أن المخالفات ناتجة عن تصرفات المستأجر لا عن مالك المركبة.
        </p>
        <p>
          <strong>عدد المخالفات:</strong> ${customer.violations_count} مخالفة<br>
          <strong>قيمة المخالفات:</strong> ${customer.violations_amount.toLocaleString('en-US')} ريال قطري
        </p>
      </div>
    </div>
    ` : ''}

    <!-- Section: Legal Basis -->
    <div class="section">
      <div class="section-title">${customer.violations_count > 0 ? 'رابعاً' : 'ثالثاً'}: الأساس القانوني</div>
      <div class="section-content">
        <p>تستند هذه الدعوى إلى أحكام <strong>القانون المدني القطري رقم 22 لسنة 2004</strong>، ولا سيما المواد:</p>
        <div class="legal-article">
          <strong>المادة (171):</strong> العقد شريعة المتعاقدين، ولا يجوز نقضه أو تعديله إلا باتفاق الطرفين أو للأسباب التي يقرها القانون.
        </div>
        <div class="legal-article">
          <strong>المادة (263):</strong> يلتزم المدين بتعويض الضرر الناتج عن إخلاله بالتزامه.
        </div>
        <div class="legal-article">
          <strong>المادة (266):</strong> إذا لم يقم المدين بتنفيذ التزامه التعاقدي جاز للدائن أن يطلب فسخ العقد مع التعويض إن كان له مقتضى.
        </div>
        <div class="legal-article">
          <strong>المادة (267):</strong> يقدر التعويض بقدر الضرر المباشر المتوقع عادة وقت التعاقد.
        </div>
        <div class="legal-article">
          <strong>المادة (589):</strong> يلتزم المستأجر بالمحافظة على العين المؤجرة وردها بالحالة التي تسلمها بها.
        </div>
        <p style="margin-top: 15px; padding: 10px; background: #f0f4f8; border-radius: 5px;">
          <strong>المبدأ القضائي:</strong> الإخلال بالالتزامات العقدية يوجب التعويض متى ثبت الضرر وتوافرت العلاقة السببية.
        </p>
        <p>
          وبناءً عليه، فإن المطالبات المالية الواردة أعلاه هي عن التزامات تعاقدية مباشرة، 
          ${customer.violations_count > 0 ? 'في حين أن الغرامات المرورية ينبغي أن تُحوّل إداريًا إلى المستأجر أو يُلزم بسدادها احتياطياً.' : ''}
        </p>
      </div>
    </div>

    <!-- Section: Requests -->
    <div class="section">
      <div class="section-title">${customer.violations_count > 0 ? 'خامساً' : 'رابعاً'}: الطلبات</div>
      <div class="section-content">
        <p>تلتمس الشركة من عدالتكم الموقرة ما يلي:</p>
        <div class="requests-list">
          <div class="request-item">
            إلزام المدعى عليه بسداد المبلغ الإجمالي وقدره <strong>(${totalClaim.toLocaleString('en-US')} ريال قطري)</strong>.
          </div>
          <div class="request-item">
            فسخ عقد الإيجار رقم <strong>(${contractInfo.contract_number})</strong> لإخلال المدعى عليه بالتزاماته التعاقدية.
          </div>
          ${customer.violations_count > 0 ? `
          <div class="request-item">
            <strong>طلب أصلي:</strong> إصدار أمر بتحويل جميع المخالفات المرورية المسجلة على المركبة خلال فترة الإيجار إلى الرقم الشخصي للمدعى عليه <strong>${customer.id_number || '(رقم البطاقة الشخصية)'}</strong>، مع بيان إجمالي قيمة المخالفات وقدرها <strong>(${customer.violations_amount.toLocaleString('en-US')} ريال قطري)</strong>.
          </div>
          <div class="request-item">
            <strong>طلب احتياطي:</strong> في حال تعذر تحويل المخالفات، إلزام المدعى عليه بسداد قيمتها كاملة وقدرها <strong>(${customer.violations_amount.toLocaleString('en-US')} ريال قطري)</strong>.
          </div>
          ` : ''}
          <div class="request-item">
            تعويض عن الحرمان من الانتفاع بالمركبة وفق أجر المثل وقدره <strong>(10,000 ريال قطري)</strong>.
          </div>
          ${securityDeposit > 0 ? `
          <div class="request-item">
            تثبيت حق الشركة في المقاصة بين وديعة الضمان البالغة <strong>(${securityDeposit.toLocaleString('en-US')} ريال قطري)</strong> والمبالغ المستحقة.
          </div>
          ` : ''}
          <div class="request-item">
            تحميل المدعى عليه رسوم الدعوى والمصاريف وأتعاب المحاماة.
          </div>
        </div>
      </div>
    </div>

    ${additionalNotes ? `
    <!-- Additional Notes -->
    <div class="section">
      <div class="section-title">ملاحظات إضافية</div>
      <div class="section-content">
        <p>${additionalNotes}</p>
      </div>
    </div>
    ` : ''}

    <!-- الختام -->
    <div class="closing">
      <p>وتفضلوا بقبول فائق الاحترام والتقدير،،،</p>
    </div>
    
    <!-- التوقيع والختم -->
    <table style="width: 100%; margin-top: 15px; border: none; page-break-inside: avoid;">
      <tr>
        <td style="width: 50%; text-align: center; vertical-align: bottom; border: none; padding: 10px;">
          <!-- الختم -->
          <img src="/receipts/stamp.png" alt="ختم الشركة" 
               style="width: 130px; height: 130px; object-fit: contain; transform: rotate(-5deg);"
               onerror="this.style.display='none'" />
        </td>
        <td style="width: 50%; text-align: center; vertical-align: bottom; border: none; padding: 10px;">
          <!-- التوقيع ومعلومات الموقع -->
          <p style="color: #1e3a5f; font-weight: bold; font-size: 15px; margin: 0 0 10px 0;">${COMPANY_INFO.name_ar}</p>
          <img src="/receipts/signature.png" alt="التوقيع" 
               style="width: 120px; height: 50px; object-fit: contain; display: block; margin: 0 auto 10px auto;"
               onerror="this.style.display='none'" />
          <div style="border-top: 2px solid #1e3a5f; padding-top: 8px; min-width: 200px;">
            <p style="font-size: 14px; font-weight: bold; color: #000; margin: 0;">${COMPANY_INFO.authorized_signatory}</p>
            <p style="font-size: 11px; color: #555; margin: 3px 0 0 0;">${COMPANY_INFO.authorized_title}</p>
          </div>
        </td>
      </tr>
    </table>
    
    <!-- الذيل -->
    <div class="footer">
      ${COMPANY_INFO.address}<br/>
      هاتف: ${COMPANY_INFO.phone} | البريد: ${COMPANY_INFO.email}
    </div>

  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
  `;
}

