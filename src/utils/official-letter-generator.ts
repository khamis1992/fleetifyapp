/**
 * مولد الكتب الرسمية الموحد
 * يستخدم نفس التنسيق في جميع أنحاء التطبيق
 */

// معلومات الشركة (مطابقة لـ ZhipuAIService.ts)
const COMPANY_INFO = {
  name_ar: 'شركة العراف لتأجير السيارات',
  name_en: 'AL-ARAF CAR RENTAL L.L.C',
  logo: '/receipts/logo.png',
  address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
  phone: '31411919',
  email: 'info@alaraf.qa',
  cr: 'س.ت: 146832',
  authorized_signatory: 'أسامة أحمد البشرى',
  authorized_title: 'المخول بالتوقيع',
};

// توليد رقم مرجعي
function generateRefNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `ALR/${year}/${month}/${random}`;
}

// تنسيق التاريخ بالعربية
function formatDateAr(date: Date = new Date()): string {
  return date.toLocaleDateString('ar-QA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// واجهة بيانات الكتاب
export interface OfficialLetterData {
  recipient: string;
  recipientGreeting?: string;
  subject: string;
  body: string;
  attachments?: string[];
  refNumber?: string;
  date?: Date;
  documentType?: 'memo' | 'letter' | 'statement' | 'list';
}

// واجهة بيانات كشف المطالبات
export interface ClaimsStatementData {
  customerName: string;
  nationalId: string;
  phone?: string;
  contractNumber: string;
  contractStartDate: string;
  contractEndDate: string;
  invoices: {
    invoiceNumber: string;
    dueDate: string;
    totalAmount: number;
    paidAmount: number;
    daysLate: number;
    penalty?: number;
  }[];
  violations?: {
    violationNumber: string;
    violationDate: string;
    violationType: string;
    location: string;
    fineAmount: number;
  }[];
  totalOverdue: number;
  amountInWords: string;
  caseTitle?: string;
}

// واجهة بيانات كشف المستندات
export interface DocumentsListData {
  caseTitle: string;
  customerName: string;
  amount: number;
  documents: {
    name: string;
    status: 'مرفق' | 'غير مرفق';
  }[];
}

// واجهة بيانات بلاغ سرقة المركبة
export interface CriminalComplaintData {
  customerName: string;
  customerNationality?: string;
  customerId: string;
  customerMobile?: string;
  contractDate: string;
  contractEndDate: string;
  vehicleType: string;
  plateNumber: string;
  plateType?: string;
  manufactureYear?: string;
  chassisNumber?: string;
}

// واجهة بيانات طلب تحويل المخالفات
export interface ViolationsTransferData {
  customerName: string;
  customerId: string;
  customerMobile?: string;
  contractNumber: string;
  contractDate: string;
  contractEndDate: string;
  vehicleType: string;
  plateNumber: string;
  violations: {
    violationNumber: string;
    violationDate: string;
    violationType: string;
    location?: string;
    fineAmount: number;
  }[];
  totalFines: number;
}

/**
 * توليد أنماط CSS الموحدة للكتب الرسمية
 */
function getOfficialLetterStyles(): string {
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
      }
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Traditional Arabic', 'Times New Roman', 'Arial', serif;
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
      max-height: 60px;
      max-width: 100px;
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
      margin: 25px 0;
      font-size: 14px;
      color: #000;
    }
    
    .signature-section {
      margin-top: 40px;
      width: 100%;
      overflow: hidden;
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
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 9px;
      color: #000;
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

/**
 * توليد ترويسة الكتاب الرسمي
 */
function generateOfficialHeader(refNumber: string, currentDate: string): string {
  return `
    <!-- الترويسة -->
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
  `;
}

/**
 * توليد قسم التوقيع
 */
function generateSignatureSection(): string {
  return `
    <!-- الختام -->
    <div class="closing">
      <p>وتفضلوا بقبول فائق الاحترام والتقدير،،،</p>
    </div>
    
    <!-- التوقيع -->
    <div class="signature-section">
      <div class="stamp-area">
        <div class="stamp-circle">
          <span>مكان الختم</span>
        </div>
      </div>
      
      <div class="signatory">
        <p class="company-name">${COMPANY_INFO.name_ar}</p>
        <div class="line">
          <p class="name">${COMPANY_INFO.authorized_signatory}</p>
          <p class="title">${COMPANY_INFO.authorized_title}</p>
        </div>
      </div>
      
      <div class="sign-area">
        <div class="sign-line"></div>
        <span>التوقيع</span>
      </div>
    </div>
    
    <!-- الذيل -->
    <div class="footer">
      ${COMPANY_INFO.address}<br/>
      هاتف: ${COMPANY_INFO.phone} | البريد: ${COMPANY_INFO.email}
    </div>
  `;
}

/**
 * توليد كتاب رسمي موحد
 */
export function generateOfficialLetter(data: OfficialLetterData): string {
  const refNumber = data.refNumber || generateRefNumber();
  const currentDate = formatDateAr(data.date);

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كتاب رسمي - ${COMPANY_INFO.name_ar}</title>
  <style>${getOfficialLetterStyles()}</style>
</head>
<body>
  <div class="letter-container">
    ${generateOfficialHeader(refNumber, currentDate)}
    
    <!-- المرسل إليه -->
    <div class="recipient-box">
      <p><strong>إلى / </strong> ${data.recipient}</p>
      ${data.recipientGreeting ? `<p class="greeting">${data.recipientGreeting}</p>` : ''}
    </div>
    
    <!-- التحية -->
    <p class="salutation">السلام عليكم ورحمة الله وبركاته،</p>
    <p class="salutation" style="margin-top: 0;">تحية طيبة وبعد،،،</p>
    
    <!-- الموضوع -->
    <div class="subject-box">
      <strong>الموضوع: </strong>${data.subject}
    </div>
    
    <!-- المقدمة -->
    <p class="intro">
      نحن <strong>${COMPANY_INFO.name_ar}</strong>، نتقدم إليكم بهذا الكتاب الرسمي بخصوص الموضوع المذكور أعلاه، ونفيدكم بالآتي:
    </p>
    
    <!-- المحتوى -->
    <div class="content">
      ${data.body.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')}
    </div>
    
    ${data.attachments && data.attachments.length > 0 ? `
    <!-- المرفقات -->
    <div class="attachments">
      <strong>📎 المرفقات:</strong>
      <ul>
        ${data.attachments.map(att => `<li>${att}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    ${generateSignatureSection()}
  </div>
</body>
</html>
  `;
}

/**
 * واجهة بيانات المذكرة الشارحة الموسعة
 */
export interface ExplanatoryMemoData {
  caseTitle: string;
  facts: string;
  claims: string;
  amount: number;
  amountInWords: string;
  defendantName: string;
  contractNumber: string;
  hasViolations?: boolean;
  // بيانات إضافية للمذكرة المفصلة
  defendantIdNumber?: string;
  defendantPhone?: string;
  contractStartDate?: string;
  vehiclePlate?: string;
  vehicleInfo?: string;
  monthlyRent?: number;
  daysOverdue?: number;
  monthsUnpaid?: number;
  overdueRent?: number;
  latePenalty?: number;
  damages?: number;
  violationsCount?: number;
  violationsAmount?: number;
}

/**
 * توليد مذكرة شارحة للدعوى
 * النص مطابق للمذكرة المستخدمة في صفحة العملاء المتأخرين
 */
export function generateExplanatoryMemoHtml(data: ExplanatoryMemoData): string {
  const refNumber = generateRefNumber();
  const currentDate = formatDateAr();

  // حساب المبالغ
  const overdueRent = data.overdueRent || 0;
  const latePenalty = data.latePenalty || 0;
  const damagesAmount = data.damages || Math.round(data.amount * 0.3);
  const totalClaim = overdueRent + latePenalty + damagesAmount;
  const monthlyRent = data.monthlyRent || 0;
  const daysOverdue = data.daysOverdue || 0;
  const monthsUnpaid = data.monthsUnpaid || 0;
  const violationsCount = data.violationsCount || 0;
  const violationsAmount = data.violationsAmount || 0;
  const hasViolations = data.hasViolations || violationsCount > 0;

  // توليد نص الوقائع المفصل
  let factsText = `أبرمت الشركة عقد إيجار مركبة رقم (${data.contractNumber})${data.contractStartDate ? ` بتاريخ ${data.contractStartDate}` : ''} مع المدعى عليه، التزم بموجبه بدفع الإيجار الشهري${monthlyRent > 0 ? ` البالغ (${monthlyRent.toLocaleString('ar-QA')}) ريال قطري` : ''} والمحافظة على المركبة${data.vehiclePlate ? ` رقم (${data.vehiclePlate})` : ''}${data.vehicleInfo ? ` ${data.vehicleInfo}` : ''} وسداد جميع الالتزامات المترتبة على استخدامها.

إلا أن المدعى عليه أخلَّ بهذه الالتزامات إخلالاً واضحًا، إذ تأخر في سداد الإيجارات المستحقة${monthsUnpaid > 0 ? ` لمدة (${monthsUnpaid}) شهر` : ''}${daysOverdue > 0 ? `، بإجمالي (${daysOverdue}) يوم تأخير` : ''}${hasViolations ? `، وسُجلت على المركبة (${violationsCount}) مخالفة مرورية بقيمة إجمالية (${violationsAmount.toLocaleString('ar-QA')}) ريال قطري ناتجة عن استخدامه الشخصي` : ''}، ورفض تسليم المركبة وسداد المستحقات دون مبرر مشروع.`;

  if (hasViolations) {
    factsText += `

ونظرًا لأن المخالفات المرورية تصدر باسم مالك المركبة (الشركة) بحكم النظام، فإن الشركة لا تطلب من عدالتكم الموقرة إلزام المدعى عليه بسداد قيمتها نقدًا، وإنما تلتمس تحويل هذه المخالفات رسميًا على رقمه الشخصي باعتباره السائق والمستخدم الفعلي للمركبة وقت وقوعها، وذلك استنادًا إلى سجلات المخالفات الصادرة من الإدارة العامة للمرور.`;
  }

  // توليد جدول المطالبات المالية
  const claimsTable = `
┌─────────────────────────────────────────────────────────────────┐
│ البند │ البيان                                      │ المبلغ (ر.ق) │
├───────┼─────────────────────────────────────────────┼──────────────┤
│   1   │ غرامات تأخير في سداد الإيجار الشهري         │ ${latePenalty.toLocaleString('ar-QA').padStart(12, ' ')} │
│   2   │ إيجار متأخر غير مسدد                        │ ${overdueRent.toLocaleString('ar-QA').padStart(12, ' ')} │
│   3   │ تعويض عن الأضرار المادية والمعنوية          │ ${damagesAmount.toLocaleString('ar-QA').padStart(12, ' ')} │
├───────┼─────────────────────────────────────────────┼──────────────┤
│       │ الإجمالي                                    │ ${(totalClaim > 0 ? totalClaim : data.amount).toLocaleString('ar-QA').padStart(12, ' ')} │
└─────────────────────────────────────────────────────────────────┘`;

  // توليد نص الطلبات المفصل
  let requestsText = `1. إلزام المدعى عليه بسداد المبلغ الإجمالي وقدره (${(totalClaim > 0 ? totalClaim : data.amount).toLocaleString('ar-QA')} ريال قطري).`;
  
  if (hasViolations) {
    requestsText += `
2. إصدار أمر بتحويل جميع المخالفات المرورية المسجلة على المركبة خلال فترة الإيجار إلى الرقم الشخصي للمدعى عليه${data.defendantIdNumber ? ` (${data.defendantIdNumber})` : ''}.
3. تحميل المدعى عليه رسوم الدعوى والمصاريف وأتعاب المحاماة.`;
  } else {
    requestsText += `
2. تحميل المدعى عليه رسوم الدعوى والمصاريف وأتعاب المحاماة.`;
  }

  // توليد المحتوى الكامل للمذكرة
  let body = `
أولاً: الوقائع

${factsText}

ثانياً: المطالبات المالية المباشرة

${claimsTable}

الإجمالي: ${(totalClaim > 0 ? totalClaim : data.amount).toLocaleString('ar-QA')} ريال قطري
(${data.amountInWords})
`;

  if (hasViolations) {
    body += `
ثالثاً: الطلب المتعلق بالمخالفات المرورية

تلتمس الشركة من عدالتكم الموقرة عدم إدخال قيمة المخالفات المرورية ضمن المطالبة المالية، والاكتفاء بإصدار أمر بتحويلها إلى الرقم الشخصي للمدعى عليه${data.defendantIdNumber ? ` (${data.defendantIdNumber})` : ''} لدى الإدارة العامة للمرور، وذلك لتجنب تحميل الشركة ما لا يلزمها به القانون، إذ أن المخالفات ناتجة عن تصرفات المستأجر لا عن مالك المركبة.

عدد المخالفات: ${violationsCount} مخالفة
قيمة المخالفات: ${violationsAmount.toLocaleString('ar-QA')} ريال قطري

رابعاً: الأساس القانوني
`;
  } else {
    body += `
ثالثاً: الأساس القانوني
`;
  }

  body += `
تستند هذه الدعوى إلى أحكام القانون المدني القطري، ولا سيما المواد:

• المادة (171): العقد شريعة المتعاقدين، ولا يجوز نقضه أو تعديله إلا باتفاق الطرفين أو للأسباب التي يقرها القانون.

• المادة (263): يلتزم المدين بتعويض الضرر الناتج عن إخلاله بالتزامه.

• المادة (589): يلتزم المستأجر بالمحافظة على العين المؤجرة وردها بالحالة التي تسلمها بها.

• المادة (267): يقدر التعويض بقدر الضرر المباشر المتوقع عادة وقت التعاقد.

وبناءً عليه، فإن المطالبات المالية الواردة أعلاه هي عن التزامات تعاقدية مباشرة، في حين أن الغرامات المرورية ينبغي أن تُحوّل إداريًا إلى المستأجر.

${hasViolations ? 'خامساً' : 'رابعاً'}: الطلبات

تلتمس الشركة من عدالتكم الموقرة ما يلي:

${requestsText}
  `.trim();

  // تجهيز قائمة المرفقات
  const attachments = [
    'صورة من عقد الإيجار',
    'صورة من السجل التجاري',
    'شهادة IBAN',
    'كشف بالمطالبات المالية',
  ];
  
  // إضافة كشف المخالفات المرورية إن وجدت
  if (hasViolations) {
    attachments.push('كشف بالمخالفات المرورية');
  }

  return generateOfficialLetter({
    recipient: 'المحكمة المدنية الابتدائية',
    recipientGreeting: 'حفظها الله',
    subject: `مذكرة شارحة - مطالبة مالية${hasViolations ? ' وتحويل الغرامات المرورية إلى الرقم الشخصي للمستأجر' : ''}`,
    body,
    refNumber,
    attachments,
  });
}

/**
 * توليد كشف المستندات المرفوعة
 */
export function generateDocumentsListHtml(data: DocumentsListData): string {
  const refNumber = generateRefNumber();
  const currentDate = formatDateAr();

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كشف بالمستندات المرفوعة - ${COMPANY_INFO.name_ar}</title>
  <style>${getOfficialLetterStyles()}</style>
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
        <span>${data.amount.toLocaleString('ar-QA')} ريال قطري</span>
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>م</th>
          <th>اسم المستند</th>
          <th>الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${data.documents.map((doc, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${doc.name}</td>
            <td class="${doc.status === 'مرفق' ? 'attached' : 'not-attached'}">${doc.status}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="content" style="text-align: center;">
      <p><strong>إجمالي المستندات:</strong> ${data.documents.length}</p>
      <p><strong>المستندات المرفقة:</strong> ${data.documents.filter(d => d.status === 'مرفق').length}</p>
    </div>
    
    ${generateSignatureSection()}
  </div>
</body>
</html>
  `;
}

/**
 * تنسيق الأرقام بالإنجليزية
 */
function formatNumberEn(num: number): string {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * تنسيق التاريخ بالإنجليزية
 */
function formatDateEn(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * تنسيق رقم الهاتف (إزالة رمز الدولة والمسافات)
 */
function formatPhoneNumber(phone: string): string {
  if (!phone) return '-';
  // إزالة +974 أو 974 من البداية والمسافات
  return phone.replace(/^\+?974\s*/, '').replace(/\s+/g, '');
}

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

/**
 * فتح الكتاب في نافذة جديدة للطباعة
 */
export function openLetterForPrint(html: string): void {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
}

/**
 * واجهة بيانات حافظة المستندات
 */
export interface DocumentPortfolioData {
  caseTitle: string;
  customerName: string;
  contractNumber: string;
  caseNumber?: string;
  totalAmount: number;
  // المستندات المختلفة
  claimsStatementHtml?: string; // كشف المطالبات المالية - HTML كامل
  criminalComplaintHtml?: string; // بلاغ سرقة المركبة - HTML كامل
  violationsTransferHtml?: string; // طلب تحويل المخالفات - HTML كامل
  contractImageUrl?: string; // عقد الإيجار - رابط صورة
  ibanImageUrl?: string; // شهادة IBAN - رابط صورة
  commercialRegisterUrl?: string; // السجل التجاري - رابط صورة
}

/**
 * توليد طلب تحويل المخالفات المرورية
 */
export function generateViolationsTransferHtml(data: ViolationsTransferData): string {
  const refNumber = generateRefNumber();
  const currentDate = formatDateAr();

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>طلب تحويل مخالفات مرورية - ${COMPANY_INFO.name_ar}</title>
  <style>${getOfficialLetterStyles()}</style>
</head>
<body>
  <div class="letter-container">
    ${generateOfficialHeader(refNumber, currentDate)}
    
    <!-- المرسل إليه -->
    <div class="recipient-box">
      <p><strong>إلى / </strong> الإدارة العامة للمرور</p>
      <p style="margin-right: 40px;">قسم المخالفات المرورية</p>
      <p style="margin-right: 40px;">الدوحة - دولة قطر</p>
    </div>
    
    <!-- التحية -->
    <p class="salutation">السلام عليكم ورحمة الله وبركاته،</p>
    <p class="salutation" style="margin-top: 0;">تحية طيبة وبعد،،،</p>
    
    <!-- الموضوع -->
    <div class="subject-box">
      <strong>الموضوع: </strong>طلب تحويل مخالفات مرورية من مالك المركبة إلى المستأجر
    </div>
    
    <!-- المقدمة -->
    <div class="content">
      <p>
        نحن <strong>${COMPANY_INFO.name_ar}</strong>، نتقدم إلى سعادتكم بطلب تحويل المخالفات المرورية المسجلة على المركبة المملوكة لشركتنا إلى المستأجر الذي كان يقودها وقت ارتكاب المخالفات، وذلك استناداً إلى عقد الإيجار المبرم بيننا.
      </p>
    </div>
    
    <!-- بيانات المستأجر -->
    <div class="info-box">
      <div class="section-title">بيانات المستأجر (المسؤول عن المخالفات)</div>
      <div class="info-row">
        <span class="info-label">الاسم:</span>
        <span>${data.customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">رقم الهوية:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${data.customerId}</span>
      </div>
      ${data.customerMobile ? `
      <div class="info-row">
        <span class="info-label">رقم الجوال:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${data.customerMobile}</span>
      </div>
      ` : ''}
    </div>
    
    <!-- بيانات العقد والمركبة -->
    <div class="info-box">
      <div class="section-title">بيانات العقد والمركبة</div>
      <div class="info-row">
        <span class="info-label">رقم العقد:</span>
        <span>${data.contractNumber}</span>
      </div>
      <div class="info-row">
        <span class="info-label">فترة العقد:</span>
        <span>${data.contractDate} - ${data.contractEndDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">نوع المركبة:</span>
        <span>${data.vehicleType}</span>
      </div>
      <div class="info-row">
        <span class="info-label">رقم اللوحة:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${data.plateNumber}</span>
      </div>
    </div>
    
    <!-- جدول المخالفات -->
    <div class="section">
      <div class="section-title">المخالفات المطلوب تحويلها</div>
      <table>
        <thead>
          <tr>
            <th>م</th>
            <th>رقم المخالفة</th>
            <th>تاريخ المخالفة</th>
            <th>نوع المخالفة</th>
            <th>المبلغ (ر.ق)</th>
          </tr>
        </thead>
        <tbody>
          ${data.violations.map((v, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${v.violationNumber}</td>
              <td>${v.violationDate}</td>
              <td>${v.violationType}</td>
              <td style="direction: ltr; unicode-bidi: embed;">${v.fineAmount.toLocaleString('en-US')}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="4"><strong>إجمالي المخالفات</strong></td>
            <td style="direction: ltr; unicode-bidi: embed;"><strong>${data.totalFines.toLocaleString('en-US')} ر.ق</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- السند القانوني -->
    <div class="content">
      <p>
        <strong>السند القانوني:</strong> استناداً إلى المادة (3) من قانون المرور القطري رقم (19) لسنة 2007 والتي تنص على أن "مستعمل المركبة يكون مسؤولاً عن المخالفات التي ترتكب أثناء استعماله لها"، وحيث أن المخالفات المذكورة أعلاه قد ارتكبت خلال فترة الإيجار من قبل المستأجر المذكور، فإننا نطلب تحويل هذه المخالفات إلى اسمه.
      </p>
    </div>
    
    <!-- الطلب -->
    <div class="section">
      <div class="section-title">الطلب</div>
      <div class="content" style="margin-top: 0;">
        <p>
          نرجو من سعادتكم التكرم بالموافقة على تحويل المخالفات المرورية المذكورة أعلاه من سجل الشركة إلى سجل المستأجر المذكور، مع إرفاق نسخة من عقد الإيجار كإثبات.
        </p>
      </div>
    </div>
    
    <!-- المرفقات -->
    <div class="attachments">
      <strong>📎 المرفقات:</strong>
      <ul>
        <li>صورة من عقد الإيجار</li>
        <li>صورة من الهوية الشخصية للمستأجر</li>
        <li>كشف بالمخالفات المرورية</li>
      </ul>
    </div>
    
    ${generateSignatureSection()}
  </div>
</body>
</html>
  `;
}

/**
 * توليد بلاغ جنائي بواقعة امتناع عن تسليم مركبة
 */
export function generateCriminalComplaintHtml(data: CriminalComplaintData): string {
  const refNumber = generateRefNumber();
  const currentDate = formatDateAr();

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>بلاغ جنائي - ${COMPANY_INFO.name_ar}</title>
  <style>${getOfficialLetterStyles()}</style>
</head>
<body>
  <div class="letter-container">
    ${generateOfficialHeader(refNumber, currentDate)}
    
    <!-- المرسل إليه -->
    <div class="recipient-box">
      <p><strong>إلى / </strong> السيد / رئيس النيابة العامة</p>
      <p style="margin-right: 40px;">الدوحة - دولة قطر</p>
    </div>
    
    <!-- التحية -->
    <p class="salutation">السلام عليكم ورحمة الله وبركاته،</p>
    <p class="salutation" style="margin-top: 0;">تحية طيبة وبعد،،،</p>
    
    <!-- الموضوع -->
    <div class="subject-box">
      <strong>الموضوع: </strong>بلاغ جنائي بواقعة امتناع عن تسليم مركبة بعد انتهاء عقد الإيجار
    </div>
    
    <!-- بيانات المشكو في حقه -->
    <div class="info-box">
      <div class="section-title">بيانات المشكو في حقه</div>
      <div class="info-row">
        <span class="info-label">الاسم:</span>
        <span>${data.customerName}</span>
      </div>
      ${data.customerNationality ? `
      <div class="info-row">
        <span class="info-label">الجنسية:</span>
        <span>${data.customerNationality}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">رقم الهوية:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${data.customerId}</span>
      </div>
      ${data.customerMobile ? `
      <div class="info-row">
        <span class="info-label">رقم الجوال:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${data.customerMobile}</span>
      </div>
      ` : ''}
    </div>
    
    <!-- بيانات المركبة -->
    <div class="info-box">
      <div class="section-title">بيانات المركبة</div>
      <div class="info-row">
        <span class="info-label">نوع المركبة:</span>
        <span>${data.vehicleType}</span>
      </div>
      <div class="info-row">
        <span class="info-label">رقم اللوحة:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${data.plateNumber}</span>
      </div>
      ${data.plateType ? `
      <div class="info-row">
        <span class="info-label">نوع اللوحة:</span>
        <span>${data.plateType}</span>
      </div>
      ` : ''}
      ${data.manufactureYear ? `
      <div class="info-row">
        <span class="info-label">سنة الصنع:</span>
        <span>${data.manufactureYear}</span>
      </div>
      ` : ''}
      ${data.chassisNumber ? `
      <div class="info-row">
        <span class="info-label">رقم الشاسيه:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${data.chassisNumber}</span>
      </div>
      ` : ''}
    </div>
    
    <!-- الوقائع -->
    <div class="content">
      <p>
        نتقدم إلى سعادتكم بهذا البلاغ ضد الشخص المذكور أعلاه، حيث قام باستئجار مركبة من شركتنا بموجب عقد إيجار قانوني مؤرخ بتاريخ <strong>${data.contractDate}</strong>، وانتهت مدة العقد بتاريخ <strong>${data.contractEndDate}</strong>، إلا أنه امتنع عن تسليم المركبة رغم انتهاء العلاقة التعاقدية.
      </p>
      <p>
        ورغم محاولاتنا المتكررة للتواصل معه ومطالبته بإعادة المركبة بالطرق الودية والرسمية، فقد رفض تسليمها دون أي مسوغ قانوني، ولا تزال المركبة بحوزته حتى تاريخه، الأمر الذي يشكل تعدياً على حقوق الشركة وضرراً مادياً مباشراً.
      </p>
      <p>
        ويُعد هذا التصرف استيلاءً غير مشروع على مال مملوك للغير، وإساءة استعمال للثقة، واحتفاظاً بالمركبة دون وجه حق بعد انتهاء سبب الحيازة القانونية.
      </p>
    </div>
    
    <!-- السند القانوني -->
    <div class="section">
      <div class="section-title" style="background: #1e3a5f;">السند القانوني</div>
      <table>
        <thead>
          <tr>
            <th>القانون</th>
            <th>المادة</th>
            <th>التهمة</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>قانون العقوبات القطري</td>
            <td>المادة (321)</td>
            <td>جريمة خيانة الأمانة - الاستيلاء على مال منقول مملوك للغير</td>
          </tr>
          <tr>
            <td>قانون العقوبات القطري</td>
            <td>المادة (324)</td>
            <td>إساءة استعمال الأمانة - الاحتفاظ بالمركبة بعد انتهاء سبب الحيازة</td>
          </tr>
          <tr>
            <td>قانون العقوبات القطري</td>
            <td>المادة (333)</td>
            <td>الاستيلاء غير المشروع على مال منقول</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- الطلبات -->
    <div class="section">
      <div class="section-title">الطلبات</div>
      <ol style="margin: 15px 30px; line-height: 2;">
        <li>قيد البلاغ ضد المشكو في حقه بالوصف القانوني الصحيح</li>
        <li>إصدار أمر بضبط وإحضار المركبة</li>
        <li>اتخاذ الإجراءات الجزائية اللازمة بحق المتهم</li>
        <li>إلزام المتهم بإعادة المركبة وتعويض الشركة عن كافة الأضرار</li>
      </ol>
    </div>
    
    <!-- المرفقات -->
    <div class="attachments">
      <strong>📎 المرفقات:</strong>
      <ul>
        <li>صورة من عقد الإيجار</li>
        <li>صورة من البطاقة الشخصية للمستأجر</li>
        <li>ما يثبت المطالبة بإعادة المركبة (مراسلات / إشعارات)</li>
      </ul>
    </div>
    
    ${generateSignatureSection()}
  </div>
</body>
</html>
  `;
}

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
    // استخراج الأنماط
    const styleMatches = data.claimsStatementHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    claimsStyles = styleMatches.map(s => {
      // إضافة prefix للأنماط لتجنب التعارض
      return s.replace(/<style[^>]*>/i, '<style>').replace(/body\s*\{/g, '.claims-content {');
    }).join('\n');
    
    // استخراج محتوى body
    const bodyMatch = data.claimsStatementHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    claimsBody = bodyMatch ? bodyMatch[1] : data.claimsStatementHtml;
  }

  // استخراج الأنماط ومحتوى body من بلاغ سرقة المركبة
  let complaintStyles = '';
  let complaintBody = '';
  
  if (data.criminalComplaintHtml) {
    // استخراج الأنماط
    const styleMatches = data.criminalComplaintHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    complaintStyles = styleMatches.map(s => {
      return s.replace(/<style[^>]*>/i, '<style>').replace(/body\s*\{/g, '.complaint-content {');
    }).join('\n');
    
    // استخراج محتوى body
    const bodyMatch = data.criminalComplaintHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    complaintBody = bodyMatch ? bodyMatch[1] : data.criminalComplaintHtml;
  }

  // استخراج الأنماط ومحتوى body من طلب تحويل المخالفات
  let violationsTransferStyles = '';
  let violationsTransferBody = '';
  
  if (data.violationsTransferHtml) {
    // استخراج الأنماط
    const styleMatches = data.violationsTransferHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    violationsTransferStyles = styleMatches.map(s => {
      return s.replace(/<style[^>]*>/i, '<style>').replace(/body\s*\{/g, '.violations-transfer-content {');
    }).join('\n');
    
    // استخراج محتوى body
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
    .logo-container { flex: 0 0 130px; text-align: center; padding: 0 15px; }
    .logo-container img { max-height: 70px; max-width: 120px; }
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
    
    <div class="signature-area">
      <div class="signature-box">
        <div class="signature-line"></div>
        <p>${COMPANY_INFO.authorized_signatory}</p>
        <p style="color: #666; font-size: 11px;">${COMPANY_INFO.authorized_title}</p>
      </div>
      <div class="stamp-box">ختم الشركة</div>
    </div>
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

