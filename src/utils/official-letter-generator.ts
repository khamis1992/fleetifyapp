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
  phone: '+974 3141 1919',
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
  contractNumber: string;
  contractStartDate: string;
  contractEndDate: string;
  invoices: {
    invoiceNumber: string;
    dueDate: string;
    totalAmount: number;
    paidAmount: number;
    daysLate: number;
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
    }
    
    body {
      font-family: 'Traditional Arabic', 'Times New Roman', 'Arial', serif;
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
      flex: 0 0 130px;
      text-align: center;
      padding: 0 15px;
    }
    
    .logo-container img {
      max-height: 70px;
      max-width: 120px;
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

    /* أنماط إضافية للجداول */
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
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 5px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    
    .info-label {
      font-weight: bold;
      color: #555;
    }

    .summary {
      margin-top: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white;
      border-radius: 8px;
    }
    
    .summary h3 {
      margin: 0 0 15px;
      font-size: 16pt;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }
    
    .summary-item {
      text-align: center;
      padding: 10px;
      background: rgba(255,255,255,0.1);
      border-radius: 5px;
    }
    
    .summary-value {
      font-size: 18pt;
      font-weight: bold;
    }
    
    .summary-label {
      font-size: 10pt;
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
 * توليد مذكرة شارحة للدعوى
 */
export function generateExplanatoryMemoHtml(data: {
  caseTitle: string;
  facts: string;
  claims: string;
  amount: number;
  amountInWords: string;
  defendantName: string;
  contractNumber: string;
}): string {
  const refNumber = generateRefNumber();
  const currentDate = formatDateAr();

  const body = `
أولاً: موضوع الدعوى
${data.caseTitle}

ثانياً: الوقائع
${data.facts}

ثالثاً: الأسانيد القانونية
استناداً إلى أحكام القانون المدني القطري، وعلى وجه الخصوص المواد المتعلقة بعقود الإيجار والالتزامات التعاقدية، فإن المدعى عليه ملزم بسداد المبالغ المستحقة.
كما أن الامتناع عن الوفاء بالالتزامات التعاقدية يعد إخلالاً جسيماً بالعقد يستوجب التعويض.

رابعاً: الطلبات
${data.claims}
  `.trim();

  return generateOfficialLetter({
    recipient: 'المحكمة المدنية الابتدائية',
    recipientGreeting: 'حفظها الله',
    subject: `مذكرة شارحة - ${data.caseTitle}`,
    body,
    refNumber,
    attachments: [
      'صورة من عقد الإيجار',
      'صورة من السجل التجاري',
      'شهادة IBAN',
      'كشف بالمطالبات المالية',
    ],
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
        <span>${data.nationalId || '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">رقم العقد:</span>
        <span>${data.contractNumber || '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">فترة العقد:</span>
        <span>${data.contractStartDate ? new Date(data.contractStartDate).toLocaleDateString('ar-QA') : '-'} إلى ${data.contractEndDate ? new Date(data.contractEndDate).toLocaleDateString('ar-QA') : '-'}</span>
      </div>
    </div>
    
    <!-- جدول الفواتير -->
    <div class="section">
      <div class="section-title">تفصيل الفواتير المتأخرة</div>
      <table>
        <thead>
          <tr>
            <th>م</th>
            <th>رقم الفاتورة</th>
            <th>تاريخ الاستحقاق</th>
            <th>أيام التأخير</th>
            <th>المبلغ الكلي</th>
            <th>المدفوع</th>
            <th>المتبقي</th>
          </tr>
        </thead>
        <tbody>
          ${data.invoices.map((inv, i) => {
            const remaining = inv.totalAmount - inv.paidAmount;
            return `
              <tr>
                <td>${i + 1}</td>
                <td>${inv.invoiceNumber || '-'}</td>
                <td>${new Date(inv.dueDate).toLocaleDateString('ar-QA')}</td>
                <td class="days-late">${inv.daysLate} يوم</td>
                <td>${inv.totalAmount.toLocaleString('ar-QA')} ر.ق</td>
                <td>${inv.paidAmount.toLocaleString('ar-QA')} ر.ق</td>
                <td class="amount">${remaining.toLocaleString('ar-QA')} ر.ق</td>
              </tr>
            `;
          }).join('')}
          <tr class="total-row">
            <td colspan="4">الإجمالي</td>
            <td>${data.invoices.reduce((s, i) => s + i.totalAmount, 0).toLocaleString('ar-QA')} ر.ق</td>
            <td>${data.invoices.reduce((s, i) => s + i.paidAmount, 0).toLocaleString('ar-QA')} ر.ق</td>
            <td class="amount">${data.totalOverdue.toLocaleString('ar-QA')} ر.ق</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- ملخص المطالبة -->
    <div class="summary">
      <h3>ملخص المطالبة</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-value">${data.invoices.length}</div>
          <div class="summary-label">عدد الفواتير المتأخرة</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${data.totalOverdue.toLocaleString('ar-QA')}</div>
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

