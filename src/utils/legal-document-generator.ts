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
    monthly_rent: number;
  };
  damages?: number;
  additionalNotes?: string;
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
  const formatted = num.toLocaleString('ar-QA');
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

إلا أن المدعى عليه أخلَّ بهذه الالتزامات إخلالًا واضحًا، إذ تأخر في سداد الإيجارات لمدة (${customer.months_unpaid}) شهر، بإجمالي (${customer.days_overdue}) يوم تأخير، ${customer.violations_count > 0 ? `وسُجلت على المركبة (${customer.violations_count}) مخالفة مرورية بقيمة إجمالية (${customer.violations_amount.toLocaleString('en-US')}) ريال قطري ناتجة عن استخدامه الشخصي،` : ''} ورفض تسليم المركبة وسداد المستحقات دون مبرر مشروع.

${customer.violations_count > 0 ? `
ونظرًا لأن المخالفات المرورية تصدر باسم مالك المركبة (الشركة) بحكم النظام، فإن الشركة لا تطلب من عدالتكم الموقرة إلزام المدعى عليه بسداد قيمتها نقدًا، وإنما تلتمس تحويل هذه المخالفات رسميًا على رقمه الشخصي باعتباره السائق والمستخدم الفعلي للمركبة وقت وقوعها، وذلك استنادًا إلى سجلات المخالفات الصادرة من الإدارة العامة للمرور.
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ثانياً: المطالبات المالية المباشرة

┌─────────────────────────────────────────────────────────────────┐
│ البند │ البيان                                      │ المبلغ (ر.ق) │
├───────┼─────────────────────────────────────────────┼──────────────┤
│   1   │ غرامات تأخير في سداد الإيجار الشهري         │ ${latePenalty.toLocaleString('en-US').padStart(12, ' ')} │
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
` : ''}
3. تحميل المدعى عليه رسوم الدعوى والمصاريف وأتعاب المحاماة.

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
 * Professional formal legal document style
 */
export function generateLegalComplaintHTML(data: LegalDocumentData): string {
  const { customer, companyInfo, vehicleInfo, contractInfo, damages = 0, additionalNotes } = data;
  
  const today = format(new Date(), 'dd/MM/yyyy', { locale: ar });
  
  // Calculate totals
  const latePenalty = customer.late_penalty || 0;
  const overdueRent = customer.overdue_amount || 0;
  const damagesAmount = damages || Math.round(customer.total_debt * 0.3);
  const totalClaim = latePenalty + overdueRent + damagesAmount;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>مذكرة شارحة - ${customer.customer_name}</title>
  <style>
    @page { 
      size: A4; 
      margin: 25mm 20mm; 
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', 'Traditional Arabic', 'Arial', serif;
      font-size: 14px;
      line-height: 2;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 170mm;
      margin: 0 auto;
      padding: 0;
    }
    
    /* Header with Logo */
    .letterhead {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .company-info {
      text-align: right;
      flex: 1;
    }
    .company-name {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .company-name-en {
      font-size: 12px;
      color: #333;
      font-style: italic;
    }
    .company-details {
      font-size: 11px;
      color: #333;
      margin-top: 5px;
    }
    .logo-container {
      width: 100px;
      text-align: left;
    }
    .logo {
      max-width: 90px;
      max-height: 90px;
    }
    
    /* Document Title */
    .document-title {
      text-align: center;
      margin: 30px 0;
      padding: 15px 0;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
    }
    .document-title h1 {
      font-size: 22px;
      font-weight: bold;
      margin: 0 0 5px 0;
      letter-spacing: 2px;
    }
    .document-date {
      font-size: 12px;
      color: #333;
    }
    
    /* Parties Section */
    .parties {
      margin-bottom: 25px;
    }
    .party {
      margin-bottom: 20px;
      padding: 12px 15px;
      border: 1px solid #000;
    }
    .party-label {
      font-weight: bold;
      font-size: 14px;
      text-decoration: underline;
      margin-bottom: 8px;
    }
    .party-content {
      padding-right: 20px;
    }
    
    /* Subject */
    .subject {
      text-align: center;
      margin: 25px 0;
      padding: 12px;
      border: 2px solid #000;
      font-weight: bold;
      font-size: 15px;
    }
    
    /* Sections */
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 12px;
    }
    .section-content {
      text-align: justify;
      text-justify: inter-word;
    }
    
    /* Claims Table */
    .claims-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .claims-table th {
      background: #000;
      color: #fff;
      padding: 10px;
      text-align: center;
      border: 1px solid #000;
      font-weight: bold;
    }
    .claims-table td {
      padding: 10px;
      border: 1px solid #000;
      text-align: right;
    }
    .claims-table td.center {
      text-align: center;
    }
    .claims-table td.amount {
      text-align: left;
      font-weight: bold;
      direction: ltr;
    }
    .claims-table .total-row {
      background: #f0f0f0;
      font-weight: bold;
    }
    .claims-table .total-row td {
      border-top: 2px solid #000;
    }
    
    /* Total Box */
    .total-box {
      text-align: center;
      margin: 20px 0;
      padding: 10px;
      border: 1px solid #000;
      font-weight: bold;
      font-size: 14px;
    }
    
    /* Legal Articles */
    .legal-article {
      margin-bottom: 12px;
      padding-right: 20px;
      text-indent: -15px;
    }
    .legal-article::before {
      content: "•";
      margin-left: 10px;
      font-weight: bold;
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
    }
    
    /* Signature Area */
    .signature-section {
      margin-top: 50px;
      page-break-inside: avoid;
    }
    .closing {
      text-align: center;
      margin-bottom: 30px;
    }
    .signature-area {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
    }
    .signature-box {
      text-align: center;
      width: 45%;
    }
    .signature-line {
      border-top: 1px solid #000;
      margin-top: 50px;
      padding-top: 5px;
    }
    .stamp-area {
      width: 80px;
      height: 80px;
      border: 1px dashed #666;
      border-radius: 50%;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: #666;
    }
    
    /* Print styles */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section { page-break-inside: avoid; }
      .signature-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- Letterhead -->
    <div class="letterhead">
      <div class="company-info">
        <div class="company-name">${companyInfo.name_ar}</div>
        <div class="company-name-en">${companyInfo.name_en || 'AL-ARAF CAR RENTAL'}</div>
        <div class="company-details">
          ${companyInfo.address}<br>
          السجل التجاري: ${companyInfo.cr_number}
        </div>
      </div>
      <div class="logo-container">
        <img src="/receipts/logo.png" alt="Logo" class="logo" onerror="this.style.display='none'" />
      </div>
    </div>

    <!-- Document Title -->
    <div class="document-title">
      <h1>مذكرة شارحة مقدمة إلى عدالة المحكمة المدنية</h1>
      <div class="document-date">التاريخ: ${today}</div>
    </div>

    <!-- Parties -->
    <div class="parties">
      <div class="party">
        <div class="party-label">مقدمة من:</div>
        <div class="party-content">
          <strong>${companyInfo.name_ar} – ذ.م.م</strong><br>
          المقر: ${companyInfo.address}<br>
          رقم السجل التجاري: ${companyInfo.cr_number}
        </div>
      </div>

      <div class="party">
        <div class="party-label">ضــد:</div>
        <div class="party-content">
          <strong>السيد / ${customer.customer_name}</strong><br>
          ${customer.id_number ? `حامل البطاقة الشخصية رقم: ${customer.id_number}` : `رقم العميل: ${customer.customer_code}`}
          ${customer.phone ? `<br>رقم الهاتف: ${customer.phone}` : ''}
        </div>
      </div>
    </div>

    <!-- Subject -->
    <div class="subject">
      الموضوع: مطالبة مالية ${customer.violations_count > 0 ? 'وتحويل الغرامات المرورية إلى الرقم الشخصي للمستأجر' : ''}
    </div>

    <!-- Section 1: Facts -->
    <div class="section">
      <div class="section-title">أولاً: الوقائع</div>
      <div class="section-content">
        <p>
          أبرمت الشركة عقد إيجار مركبة رقم <strong>(${contractInfo.contract_number})</strong> بتاريخ <strong>${contractInfo.start_date}</strong> مع المدعى عليه، 
          التزم بموجبه بدفع الإيجار الشهري البالغ <strong>(${contractInfo.monthly_rent.toLocaleString('en-US')})</strong> ريال قطري 
          والمحافظة على المركبة رقم <strong>(${vehicleInfo.plate})</strong>
          ${vehicleInfo.make ? ` من نوع <strong>${vehicleInfo.make}</strong>` : ''}
          ${vehicleInfo.model ? ` <strong>${vehicleInfo.model}</strong>` : ''}
          ${vehicleInfo.year ? ` موديل <strong>${vehicleInfo.year}</strong>` : ''}
          وسداد جميع الالتزامات المترتبة على استخدامها.
        </p>
        <p>
          إلا أن المدعى عليه أخلَّ بهذه الالتزامات إخلالًا واضحًا، إذ تأخر في سداد الإيجارات لمدة 
          <strong>(${customer.months_unpaid})</strong> شهر، بإجمالي <strong>(${customer.days_overdue})</strong> يوم تأخير،
          ${customer.violations_count > 0 ? `وسُجلت على المركبة <strong>(${customer.violations_count})</strong> مخالفة مرورية بقيمة إجمالية <strong>(${customer.violations_amount.toLocaleString('en-US')})</strong> ريال قطري ناتجة عن استخدامه الشخصي،` : ''}
          ورفض تسليم المركبة وسداد المستحقات دون مبرر مشروع.
        </p>
        ${customer.violations_count > 0 ? `
        <p>
          ونظرًا لأن المخالفات المرورية تصدر باسم مالك المركبة (الشركة) بحكم النظام، فإن الشركة لا تطلب من عدالتكم الموقرة إلزام المدعى عليه بسداد قيمتها نقدًا، 
          وإنما تلتمس تحويل هذه المخالفات رسميًا على رقمه الشخصي باعتباره السائق والمستخدم الفعلي للمركبة وقت وقوعها.
        </p>
        ` : ''}
      </div>
    </div>

    <!-- Section 2: Financial Claims -->
    <div class="section">
      <div class="section-title">ثانياً: المطالبات المالية المباشرة</div>
      <table class="claims-table">
        <thead>
          <tr>
            <th style="width: 50px;">البند</th>
            <th>البيان</th>
            <th style="width: 130px;">المبلغ (ريال قطري)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="center">1</td>
            <td>غرامات تأخير في سداد الإيجار الشهري</td>
            <td class="amount">${latePenalty.toLocaleString('en-US')}</td>
          </tr>
          <tr>
            <td class="center">2</td>
            <td>إيجار متأخر غير مسدد</td>
            <td class="amount">${overdueRent.toLocaleString('en-US')}</td>
          </tr>
          <tr>
            <td class="center">3</td>
            <td>تعويض عن الأضرار المادية والمعنوية التي لحقت بالشركة جراء الإخلال بالعقد</td>
            <td class="amount">${damagesAmount.toLocaleString('en-US')}</td>
          </tr>
          <tr class="total-row">
            <td colspan="2" style="text-align: left; font-weight: bold;">الإجمالي</td>
            <td class="amount" style="font-size: 15px;">${totalClaim.toLocaleString('en-US')}</td>
          </tr>
        </tbody>
      </table>
      <div class="total-box">
        الإجمالي: <strong>${totalClaim.toLocaleString('en-US')}</strong> ريال قطري
        (فقط ${totalClaim.toLocaleString('ar-QA')} ريال قطري لا غير)
      </div>
    </div>

    ${customer.violations_count > 0 ? `
    <!-- Section 3: Traffic Violations -->
    <div class="section">
      <div class="section-title">ثالثاً: الطلب المتعلق بالمخالفات المرورية</div>
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
        <p>تستند هذه الدعوى إلى أحكام القانون المدني القطري، ولا سيما المواد:</p>
        <div class="legal-article">
          <strong>المادة (171):</strong> العقد شريعة المتعاقدين، ولا يجوز نقضه أو تعديله إلا باتفاق الطرفين أو للأسباب التي يقرها القانون.
        </div>
        <div class="legal-article">
          <strong>المادة (263):</strong> يلتزم المدين بتعويض الضرر الناتج عن إخلاله بالتزامه.
        </div>
        <div class="legal-article">
          <strong>المادة (589):</strong> يلتزم المستأجر بالمحافظة على العين المؤجرة وردها بالحالة التي تسلمها بها.
        </div>
        <div class="legal-article">
          <strong>المادة (267):</strong> يقدر التعويض بقدر الضرر المباشر المتوقع عادة وقت التعاقد.
        </div>
        <p>
          وبناءً عليه، فإن المطالبات المالية الواردة أعلاه هي عن التزامات تعاقدية مباشرة، 
          في حين أن الغرامات المرورية ينبغي أن تُحوّل إداريًا إلى المستأجر.
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
          ${customer.violations_count > 0 ? `
          <div class="request-item">
            إصدار أمر بتحويل جميع المخالفات المرورية المسجلة على المركبة خلال فترة الإيجار إلى الرقم الشخصي للمدعى عليه <strong>${customer.id_number || '(رقم البطاقة الشخصية)'}</strong>.
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

    <!-- Signature Section -->
    <div class="signature-section">
      <div class="closing">
        <p>وتفضلوا بقبول فائق الاحترام والتقدير،</p>
        <p><strong>عن ${companyInfo.name_ar} – ذ.م.م</strong></p>
      </div>
      
      <div class="signature-area">
        <div class="signature-box">
          <div class="stamp-area">الختم</div>
        </div>
        <div class="signature-box">
          <div class="signature-line">التوقيع المعتمد</div>
        </div>
      </div>
    </div>

  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
  `;
}

