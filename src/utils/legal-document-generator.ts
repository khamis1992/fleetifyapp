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
    @page { size: A4; margin: 20mm; }
    body {
      font-family: 'Arial', 'Tahoma', sans-serif;
      font-size: 14px;
      line-height: 1.8;
      color: #333;
      background: #fff;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 210mm;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1e3a8a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .title {
      font-size: 22px;
      font-weight: bold;
      color: #1e3a8a;
      margin-bottom: 10px;
    }
    .date {
      color: #666;
      font-size: 12px;
    }
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #1e3a8a;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 5px;
      margin-bottom: 15px;
    }
    .party-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .party-label {
      font-weight: bold;
      color: #1e3a8a;
      margin-bottom: 8px;
    }
    .subject-box {
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      color: white;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 25px;
    }
    .claims-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .claims-table th {
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      color: white;
      padding: 12px;
      text-align: right;
      border: 1px solid #1e3a8a;
    }
    .claims-table td {
      padding: 10px;
      border: 1px solid #e2e8f0;
      text-align: right;
    }
    .claims-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .claims-table .total-row {
      background: #fef3c7 !important;
      font-weight: bold;
    }
    .amount {
      font-weight: bold;
      color: #dc2626;
      font-size: 16px;
    }
    .total-amount {
      font-size: 18px;
      color: #1e3a8a;
    }
    .legal-basis {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 15px;
    }
    .legal-article {
      margin-bottom: 10px;
      padding-right: 20px;
      position: relative;
    }
    .legal-article::before {
      content: "•";
      position: absolute;
      right: 0;
      color: #16a34a;
      font-weight: bold;
    }
    .requests-list {
      counter-reset: request-counter;
    }
    .request-item {
      counter-increment: request-counter;
      margin-bottom: 12px;
      padding-right: 30px;
      position: relative;
    }
    .request-item::before {
      content: counter(request-counter) ".";
      position: absolute;
      right: 0;
      font-weight: bold;
      color: #1e3a8a;
    }
    .signature-area {
      margin-top: 50px;
      text-align: center;
    }
    .signature-line {
      width: 250px;
      border-top: 1px solid #333;
      margin: 40px auto 10px;
    }
    .violations-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 15px;
      margin: 15px 0;
    }
    .violations-title {
      color: #dc2626;
      font-weight: bold;
      margin-bottom: 10px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">مذكرة شارحة مقدمة إلى عدالة المحكمة المدنية</div>
      <div class="date">التاريخ: ${today}</div>
    </div>

    <div class="section">
      <div class="party-box">
        <div class="party-label">مقدمة من:</div>
        <strong>${companyInfo.name_ar} – ذ.م.م</strong><br>
        المقر: ${companyInfo.address}<br>
        رقم السجل التجاري: ${companyInfo.cr_number}
      </div>

      <div class="party-box">
        <div class="party-label">ضــد:</div>
        <strong>السيد / ${customer.customer_name}</strong><br>
        ${customer.id_number ? `حامل البطاقة الشخصية رقم: ${customer.id_number}` : `رقم العميل: ${customer.customer_code}`}<br>
        ${customer.phone ? `رقم الهاتف: ${customer.phone}` : ''}
        ${customer.email ? `<br>البريد الإلكتروني: ${customer.email}` : ''}
      </div>
    </div>

    <div class="subject-box">
      الموضوع: مطالبة مالية ${customer.violations_count > 0 ? 'وتحويل الغرامات المرورية إلى الرقم الشخصي للمستأجر' : ''}
    </div>

    <div class="section">
      <div class="section-title">أولاً: الوقائع</div>
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

    <div class="section">
      <div class="section-title">ثانياً: المطالبات المالية المباشرة</div>
      <table class="claims-table">
        <thead>
          <tr>
            <th style="width: 60px;">البند</th>
            <th>البيان</th>
            <th style="width: 150px;">المبلغ (ر.ق)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">1</td>
            <td>غرامات تأخير في سداد الإيجار الشهري</td>
            <td class="amount">${latePenalty.toLocaleString('en-US')}</td>
          </tr>
          <tr>
            <td style="text-align: center;">2</td>
            <td>إيجار متأخر غير مسدد</td>
            <td class="amount">${overdueRent.toLocaleString('en-US')}</td>
          </tr>
          <tr>
            <td style="text-align: center;">3</td>
            <td>تعويض عن الأضرار المادية والمعنوية التي لحقت بالشركة جراء الإخلال بالعقد</td>
            <td class="amount">${damagesAmount.toLocaleString('en-US')}</td>
          </tr>
          <tr class="total-row">
            <td colspan="2" style="text-align: left; font-weight: bold;">الإجمالي</td>
            <td class="total-amount">${totalClaim.toLocaleString('en-US')}</td>
          </tr>
        </tbody>
      </table>
      <p style="text-align: center; font-weight: bold; font-size: 16px; color: #1e3a8a;">
        (فقط ${totalClaim.toLocaleString('ar-QA')} ريال قطري لا غير)
      </p>
    </div>

    ${customer.violations_count > 0 ? `
    <div class="section">
      <div class="section-title">ثالثاً: الطلب المتعلق بالمخالفات المرورية</div>
      <div class="violations-box">
        <div class="violations-title">⚠️ المخالفات المرورية</div>
        <p>عدد المخالفات: <strong>${customer.violations_count}</strong> مخالفة</p>
        <p>قيمة المخالفات: <strong>${customer.violations_amount.toLocaleString('en-US')}</strong> ريال قطري</p>
      </div>
      <p>
        تلتمس الشركة من عدالتكم الموقرة عدم إدخال قيمة المخالفات المرورية ضمن المطالبة المالية، 
        والاكتفاء بإصدار أمر بتحويلها إلى الرقم الشخصي للمدعى عليه <strong>${customer.id_number || '(رقم البطاقة الشخصية)'}</strong> 
        لدى الإدارة العامة للمرور.
      </p>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">رابعاً: الأساس القانوني</div>
      <div class="legal-basis">
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
      </div>
    </div>

    <div class="section">
      <div class="section-title">خامساً: الطلبات</div>
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

    ${additionalNotes ? `
    <div class="section">
      <div class="section-title">ملاحظات إضافية</div>
      <p>${additionalNotes}</p>
    </div>
    ` : ''}

    <div class="signature-area">
      <p>وتفضلوا بقبول فائق الاحترام والتقدير،</p>
      <p><strong>عن ${companyInfo.name_ar} – ذ.م.م</strong></p>
      <div class="signature-line"></div>
      <p>التوقيع والختم</p>
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
  `;
}

