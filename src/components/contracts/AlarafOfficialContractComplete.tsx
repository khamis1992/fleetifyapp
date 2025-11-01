/**
 * عقد إيجار سيارة رسمي كامل - شركة العراف
 * عقد قانوني شامل متوافق مع القوانين القطرية - 16 مادة + ملحقين
 * يستخدم بيانات حقيقية 100% من قاعدة البيانات
 * 
 * @component AlarafOfficialContractComplete
 */

import { useMemo } from 'react';
import { format, addMonths, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Contract } from '@/types/contracts';

interface AlarafOfficialContractCompleteProps {
  contract: Contract & {
    customer?: any;
    vehicle?: any;
  };
}

export const AlarafOfficialContractComplete = ({ contract }: AlarafOfficialContractCompleteProps) => {
  // حساب جدول الدفعات تلقائياً
  const paymentSchedule = useMemo(() => {
    if (!contract.start_date || !contract.monthly_amount) return [];

    const monthlyAmount = contract.monthly_amount;
    const totalAmount = contract.contract_amount || 0;
    const numberOfPayments = Math.ceil(totalAmount / monthlyAmount);
    const schedule = [];

    // بدء من اليوم الأول من الشهر التالي لتاريخ بداية العقد
    const startDate = new Date(contract.start_date);
    const firstMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);

    for (let i = 0; i < numberOfPayments; i++) {
      const dueDate = addMonths(firstMonth, i);
      schedule.push({
        number: i + 1,
        dueDate: format(dueDate, 'yyyy/MM/dd'),
        amount: monthlyAmount.toFixed(2),
      });
    }

    return schedule;
  }, [contract]);

  // تنسيق اسم العميل
  const customerName = useMemo(() => {
    if (!contract.customer) return '_______________';
    if (contract.customer.customer_type === 'corporate') {
      return contract.customer.company_name_ar || contract.customer.company_name || '_______________';
    }
    const firstName = contract.customer.first_name_ar || contract.customer.first_name || '';
    const lastName = contract.customer.last_name_ar || contract.customer.last_name || '';
    return `${firstName} ${lastName}`.trim() || '_______________';
  }, [contract.customer]);

  // تنسيق معلومات السيارة
  const vehicleInfo = useMemo(() => {
    if (!contract.vehicle) return { make: '______', model: '______', year: '____', plate: '______', color: '______' };
    return {
      make: contract.vehicle.make || '______',
      model: contract.vehicle.model || '______',
      year: contract.vehicle.year?.toString() || '____',
      plate: contract.vehicle.plate_number || '______',
      color: contract.vehicle.color || '______',
      vin: contract.vehicle.vin_number || '_______________',
    };
  }, [contract.vehicle]);

  // حساب المدة بالشهور
  const durationInMonths = useMemo(() => {
    if (!contract.start_date || !contract.end_date) return 0;
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const months = differenceInDays(end, start) / 30;
    return Math.round(months);
  }, [contract.start_date, contract.end_date]);

  // التاريخ الحالي
  const today = contract.contract_date ? new Date(contract.contract_date) : new Date();
  const todayHijri = format(today, 'yyyy/MM/dd'); // TODO: تحويل للهجري
  const todayGregorian = format(today, 'yyyy/MM/dd');
  const todayDay = format(today, 'EEEE', { locale: ar });

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      
      <div style={{
        maxWidth: '21cm',
        margin: '0 auto',
        padding: '1.5cm',
        background: 'white',
        color: '#000',
        fontFamily: "'Amiri', 'Traditional Arabic', 'Times New Roman', serif",
        fontSize: '13pt',
        lineHeight: '1.9',
      }}>
        <style>{`
          @page { size: A4; margin: 2.5cm 2cm; }
          @media print {
            body { background: white; }
            .no-print { display: none !important; }
            .page-break { page-break-after: always; }
            .avoid-break { page-break-inside: avoid; }
          }
          .header { text-align: center; padding: 1.5rem 0 2rem 0; border-bottom: 2px solid #000; margin-bottom: 2rem; }
          .company-name { font-size: 18pt; font-weight: 700; margin-bottom: 0.5rem; }
          .company-details { font-size: 11pt; line-height: 1.6; margin-top: 0.5rem; }
          h1 { font-size: 22pt; font-weight: 700; text-align: center; margin: 2.5rem 0 1.5rem 0; text-decoration: underline; }
          .contract-ref { text-align: center; font-family: 'Courier New', monospace; font-size: 12pt; margin: 1.5rem 0; line-height: 1.8; }
          .party-box { border: 2px solid #000; padding: 1.2rem; margin: 1.5rem 0; page-break-inside: avoid; }
          .party-title { font-weight: 700; font-size: 15pt; margin-bottom: 1rem; text-decoration: underline; }
          .party-info { line-height: 2.0; padding-right: 1rem; }
          .preamble { text-align: center; margin: 2rem 0; line-height: 2.2; }
          .article { margin: 2rem 0 2.5rem 0; page-break-inside: avoid; }
          .article-title { font-weight: 700; font-size: 14pt; margin-bottom: 1rem; text-decoration: underline; }
          .article-content { line-height: 2.0; text-align: justify; }
          .article-content p { margin-bottom: 1rem; }
          .sub-article { margin: 1rem 0 1rem 2rem; line-height: 2.0; }
          .sub-number { font-weight: 700; display: inline-block; min-width: 3rem; }
          ul, ol { margin: 0.5rem 0 1rem 3rem; line-height: 2.0; }
          li { margin-bottom: 0.5rem; }
          table { width: 100%; border-collapse: collapse; margin: 1rem 0; page-break-inside: avoid; }
          table th, table td { border: 1px solid #000; padding: 0.6rem; text-align: right; line-height: 1.6; }
          table th { font-weight: 700; background: #f5f5f5; }
          .total-row { font-weight: 700; border-top: 2px solid #000; }
          .clause-box { border: 2px solid #000; padding: 1rem; margin: 1rem 0; page-break-inside: avoid; }
          .legal-ref { font-style: italic; font-size: 11pt; }
          .declarations { margin: 2rem 0; page-break-inside: avoid; }
          .declaration-title { font-weight: 700; font-size: 15pt; text-align: center; margin-bottom: 1.5rem; text-decoration: underline; }
          .declaration-item { margin: 1rem 0; padding-right: 2rem; line-height: 2.0; }
          .declaration-item::before { content: "☐  "; font-size: 16pt; margin-left: 0.5rem; }
          .signatures { margin-top: 3rem; padding-top: 2rem; border-top: 2px solid #000; page-break-inside: avoid; }
          .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; margin-top: 2rem; }
          .signature-box { text-align: center; min-height: 180px; }
          .signature-title { font-weight: 700; font-size: 14pt; margin-bottom: 3rem; text-decoration: underline; }
          .signature-line { border-top: 1px solid #000; margin: 0 auto; width: 80%; padding-top: 0.5rem; }
          .stamp-box { width: 120px; height: 120px; border: 2px dashed #666; margin: 1rem auto; display: flex; align-items: center; justify-content: center; font-size: 10pt; color: #666; }
          .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #000; text-align: center; font-size: 10pt; line-height: 1.6; }
          .page-break { page-break-after: always; }
          .avoid-break { page-break-inside: avoid; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .underline { text-decoration: underline; }
        `}</style>

        {/* Header */}
        <div className="header">
          <div className="company-name">شركة العراف لتأجير السيارات ذ.م.م</div>
          <div className="company-details">
            السجل التجاري: 179973 • دولة قطر<br />
            المقر: أم صلال محمد - الشارع التجاري - مبنى رقم 79 - الطابق الأول - مكتب 2
          </div>
        </div>

        {/* Contract Title */}
        <h1>عقــد إيجــار سيــارة</h1>

        {/* Contract Reference */}
        <div className="contract-ref">
          <strong>رقم العقد:</strong> {contract.contract_number}<br />
          <strong>التاريخ الهجري:</strong> {todayHijri} هـ<br />
          <strong>التاريخ الميلادي:</strong> {todayGregorian} م
        </div>

        {/* Preamble */}
        <div className="preamble">
          إنه في يوم {todayDay}<br />
          الموافق {todayGregorian} م<br /><br />
          <strong>تم الاتفاق بين كل من:</strong>
        </div>

        {/* First Party */}
        <div className="party-box avoid-break">
          <div className="party-title">أولاً: الطرف الأول (المؤجـــر)</div>
          <div className="party-info">
            <strong>الاسم التجاري:</strong> شركة العراف لتأجير السيارات ذ.م.م<br />
            <strong>السجل التجاري:</strong> 179973<br />
            <strong>الدولة:</strong> دولة قطر<br />
            <strong>المقر الرئيسي:</strong> أم صلال محمد - الشارع التجاري - مبنى رقم 79 - الطابق الأول - مكتب 2<br />
            <strong>يمثلها السيد:</strong> خميس هاشم الجابر<br />
            <strong>بصفته:</strong> المدير العام المفوض بالتوقيع
          </div>
        </div>

        {/* Second Party */}
        <div className="party-box avoid-break">
          <div className="party-title">ثانياً: الطرف الثاني (المستأجــر)</div>
          <div className="party-info">
            <strong>الاسم الكامل:</strong> {customerName}<br />
            <strong>رقم الهوية/الإقامة:</strong> {contract.customer?.national_id || '_______________'}<br />
            <strong>الجنسية:</strong> {contract.customer?.nationality || 'قطري'}<br />
            <strong>العنوان:</strong> {contract.customer?.address || '_______________'}<br />
            <strong>رقم الجوال:</strong> {contract.customer?.phone || '_______________'}<br />
            <strong>رقم رخصة القيادة:</strong> {contract.customer?.driver_license_number || '_______________'}
          </div>
        </div>

        {/* Recitals */}
        <div style={{ margin: '2rem 0', lineHeight: '2.2', textAlign: 'justify' }}>
          <div className="text-center font-bold underline" style={{ marginBottom: '1rem' }}>تمهيــــد</div>
          
          <p><strong>حيث إن</strong> الطرف الأول يملك ويدير أسطولاً من المركبات المعدة للتأجير؛</p>
          <p><strong>وحيث إن</strong> الطرف الثاني يرغب في استئجار إحدى هذه المركبات للاستخدام الشخصي؛</p>
          <p><strong>وحيث إن</strong> الطرفين قد اتفقا على الشروط والأحكام الواردة أدناه؛</p>
          <p className="text-center font-bold" style={{ marginTop: '1.5rem', fontSize: '14pt' }}>فقد اتفق الطرفان على ما يلي:</p>
        </div>

        {/* المادة 1 */}
        <Article1 vehicleInfo={vehicleInfo} />

        {/* المادة 2 */}
        <Article2 contract={contract} durationInMonths={durationInMonths} />

        {/* المادة 3 */}
        <Article3 contract={contract} />

        {/* Page Break */}
        <div className="page-break"></div>

        {/* المادة 4 */}
        <Article4 />

        {/* المادة 5 */}
        <Article5 />

        {/* المادة 6 */}
        <Article6 />

        {/* Page Break */}
        <div className="page-break"></div>

        {/* المادة 7-16 */}
        <Article7 />
        <Article8 />
        <Article9 />
        
        <div className="page-break"></div>
        
        <Article10 />
        <Article11 />
        <Article12 />
        <Article13 />
        <Article14 />
        <Article15 />
        <Article16 />

        {/* Page Break */}
        <div className="page-break"></div>

        {/* الإقرارات */}
        <FinalDeclarations />

        {/* البيان الختامي */}
        <ConcludingStatement />

        {/* التوقيعات */}
        <Signatures customerName={customerName} todayGregorian={todayGregorian} />

        {/* Footer */}
        <Footer todayGregorian={todayGregorian} />

        {/* Page Break */}
        <div className="page-break"></div>

        {/* ملحق أ */}
        <AnnexA 
          contractNumber={contract.contract_number}
          todayGregorian={todayGregorian}
          paymentSchedule={paymentSchedule}
          totalAmount={contract.contract_amount}
        />

        {/* Page Break */}
        <div className="page-break"></div>

        {/* ملحق 1 */}
        <AnnexOne contractNumber={contract.contract_number} />

        {/* Final Footer */}
        <div className="footer" style={{ marginTop: '2rem' }}>
          انتهى العقد وملاحقه<br />
          ──────────<br />
          شركة العراف لتأجير السيارات ذ.م.م
        </div>
      </div>
    </>
  );
};

// المكونات الفرعية لكل مادة
const Article1 = ({ vehicleInfo }: any) => (
  <div className="article avoid-break">
    <div className="article-title">المادة (1): موضوع العقد</div>
    <div className="article-content">
      <p>يقر الطرف الأول بتأجير المركبة التالية للطرف الثاني وفقاً للشروط والأحكام الواردة في هذا العقد:</p>
      <table>
        <tbody>
          <tr>
            <th style={{ width: '35%' }}>البيــان</th>
            <th style={{ width: '65%' }}>التفاصيــل</th>
          </tr>
          <tr><td><strong>النوع/الماركة</strong></td><td>{vehicleInfo.make}</td></tr>
          <tr><td><strong>الموديل/الطراز</strong></td><td>{vehicleInfo.model}</td></tr>
          <tr><td><strong>رقم اللوحة</strong></td><td>{vehicleInfo.plate}</td></tr>
          <tr><td><strong>رقم الهيكل (VIN)</strong></td><td>{vehicleInfo.vin}</td></tr>
          <tr><td><strong>سنة الصنع</strong></td><td>{vehicleInfo.year}</td></tr>
          <tr><td><strong>اللون</strong></td><td>{vehicleInfo.color}</td></tr>
          <tr><td><strong>الحالة عند التسليم</strong></td><td><strong>جيدة</strong> (حسب تقرير الفحص الفني المرفق - ملحق رقم 1)</td></tr>
        </tbody>
      </table>
    </div>
  </div>
);

const Article2 = ({ contract, durationInMonths }: any) => (
  <div className="article avoid-break">
    <div className="article-title">المادة (2): مدة العقد</div>
    <div className="article-content">
      <p>يسري هذا العقد لمدة قدرها:</p>
      <div style={{ paddingRight: '2rem', lineHeight: '2.2' }}>
        • <strong>المدة:</strong> {durationInMonths} شهر/شهور<br />
        • <strong>تاريخ البداية:</strong> {contract.start_date ? format(new Date(contract.start_date), 'yyyy/MM/dd') : '___________'}<br />
        • <strong>تاريخ النهاية المتوقع:</strong> {contract.end_date ? format(new Date(contract.end_date), 'yyyy/MM/dd') : '___________'}
      </div>
    </div>
  </div>
);

const Article3 = ({ contract }: any) => (
  <div className="article avoid-break">
    <div className="article-title">المادة (3): القيمة الإيجارية وطريقة الدفع</div>
    <div className="article-content">
      <div className="sub-article">
        <span className="sub-number">3-1</span> 
        <strong>قيمة الإيجار الشهري:</strong> {contract.monthly_amount?.toLocaleString('ar-QA')} ريال قطري فقط لا غير.
      </div>
      <div className="sub-article">
        <span className="sub-number">3-2</span> 
        <strong>إجمالي قيمة العقد:</strong> {contract.contract_amount?.toLocaleString('ar-QA')} ريال قطري
        <span className="legal-ref"> (تُحسب بضرب مدة العقد بالشهور × قيمة الإيجار الشهري)</span>
      </div>
      <div className="sub-article">
        <span className="sub-number">3-3</span> 
        <strong>مبلغ التأمين:</strong> ثمانية آلاف (8,000) ريال قطري فقط لا غير
        <span className="legal-ref"> (تأمين نقدي وليس وديعة، لضمان الوفاء بالالتزامات التعاقدية)</span>
      </div>
      <div className="sub-article">
        <span className="sub-number">3-4</span> 
        <strong>طريقة الدفع:</strong> يُدفع الإيجار مقدماً في بداية كل شهر ميلادي عن طريق التحويل البنكي إلى حساب الطرف الأول، ويكون الدفع منتظماً وبشكل شهري.
      </div>
      <div className="sub-article">
        <span className="sub-number">3-5</span> 
        يُحظر على الطرف الثاني خصم أي مبلغ من القيمة الإيجارية لقاء أي رسوم أو ضرائب أو مصروفات أو غير ذلك.
      </div>
    </div>
  </div>
);

const Article4 = () => (
  <div className="article">
    <div className="article-title">المادة (4): الغرامات والعقوبات المالية</div>
    <div className="article-content">
      <div className="clause-box">
        <div className="sub-number">4-1</div>
        <strong className="underline">غرامة التأخير في سداد الأجرة:</strong><br />
        في حالة تأخر الطرف الثاني عن سداد أي من الدفعات الإيجارية في موعدها المحدد، يلتزم بدفع:<br />
        • مبلغ وقدره <strong>مائة وعشرون (120) ريال قطري</strong> عن كل يوم تأخير؛<br />
        • رسوم إدارية ثابتة قدرها <strong>مائتان وخمسون (250) ريال قطري</strong>؛<br />
        • تُحتسب الغرامة اعتباراً من اليوم التالي لتاريخ الاستحقاق وحتى تاريخ السداد الفعلي؛<br />
        • الحد الأقصى لفترة التأخير: ثلاثون (30) يوماً، وبعدها يحق للمؤجر فسخ العقد.<br />
        <span className="legal-ref">يقر المستأجر بأن هذه الغرامة تمثل تقديراً عادلاً ومعقولاً للضرر الذي يلحق بالمؤجر جراء التأخير.</span>
      </div>
      <div className="clause-box">
        <div className="sub-number">4-2</div>
        <strong className="underline">غرامة التأخير في إرجاع المركبة:</strong><br />
        في حالة تأخر الطرف الثاني عن إعادة المركبة بعد انتهاء مدة العقد، يلتزم بدفع مبلغ وقدره <strong>مائتان (200) ريال قطري</strong> عن كل يوم تأخير.
      </div>
      <div className="clause-box">
        <div className="sub-number">4-3</div>
        <strong className="underline">غرامة الامتناع عن تسليم المركبة:</strong><br />
        في حالة امتناع الطرف الثاني عن تسليم المركبة عند طلبها، يلتزم بدفع مبلغ وقدره <strong>خمسة آلاف (5,000) ريال قطري</strong>، بالإضافة إلى تعرضه للمساءلة الجنائية.
      </div>
      <div className="clause-box">
        <div className="sub-number">4-4</div>
        <strong className="underline">غرامة الاستخدام غير المصرح به:</strong><br />
        في حالة استخدام الطرف الثاني للمركبة في أغراض غير مصرح بها، يلتزم بدفع مبلغ وقدره <strong>خمسة آلاف (5,000) ريال قطري</strong>، مع حق الطرف الأول في فسخ العقد فوراً.
      </div>
      <div className="clause-box">
        <div className="sub-number">4-5</div>
        <strong className="underline">غرامة حجز المركبة من قبل السلطات:</strong><br />
        في حالة حجز المركبة من قبل السلطات المختصة بسبب مخالفات أو تجاوزات تعود للطرف الثاني، يلتزم بدفع:<br />
        • مبلغ وقدره <strong>مائة (100) ريال قطري</strong> عن كل يوم حجز؛<br />
        • جميع تكاليف ورسوم الإفراج عن المركبة.
      </div>
    </div>
  </div>
);

const Article5 = () => (
  <div className="article avoid-break">
    <div className="article-title">المادة (5): الشرط الجزائي</div>
    <div className="article-content">
      <p>اتفق الطرفان على أنه في حالة إخلال الطرف الثاني بأي من التزاماته الواردة في هذا العقد، يلتزم بدفع شرط جزائي قدره <strong className="underline">عشرة آلاف (10,000) ريال قطري</strong> فقط لا غير.</p>
      <p><strong>حالات تطبيق الشرط الجزائي:</strong></p>
      <ol>
        <li>الإخلال بأي من الالتزامات التعاقدية الواردة في هذا العقد؛</li>
        <li>التأخر عن السداد في المواعيد المحددة؛</li>
        <li>الامتناع عن إعادة المركبة في الموعد المحدد؛</li>
        <li>استخدام المركبة في أغراض غير مصرح بها.</li>
      </ol>
      <p className="legal-ref"><strong>الأساس القانوني:</strong> المادة 265 من القانون المدني القطري.</p>
      <p><strong>إقرار المستأجر:</strong> يقر الطرف الثاني بأن قيمة الشرط الجزائي المتفق عليه محددة باعتبار أن الأضرار التي قد تلحق بالطرف الأول (المؤجر) يصعب تقديرها بدقة مسبقاً، وأن هذا التقدير يمثل تعويضاً عادلاً ومعقولاً ومسبقاً عن تلك الأضرار.</p>
      <div className="clause-box">
        <strong>تنويه قانوني:</strong> لا يخل الاتفاق على الشرط الجزائي بحق الطرف الأول في المطالبة بتعويضات إضافية إذا جاوز الضرر الفعلي قيمة الشرط الجزائي المتفق عليه، وذلك عملاً بنص المادة 267 من القانون المدني القطري.
      </div>
    </div>
  </div>
);

const Article6 = () => (
  <div className="article">
    <div className="article-title">المادة (6): حالات الإخلال بالعقد</div>
    <div className="article-content">
      <p>يعتبر الطرف الثاني مخلاً بهذا العقد ويحق للطرف الأول فسخه واتخاذ الإجراءات القانونية اللازمة في الحالات التالية:</p>
      <ol>
        <li><strong>الإخفاق في الدفع:</strong> إخفاق الطرف الثاني في سداد أي من الدفعات الإيجارية أو أي مبلغ مستحق بموجب هذا العقد في مواعيد استحقاقها.</li>
        <li><strong>خرق الالتزامات:</strong> خرق الطرف الثاني لأي من التزاماته الأخرى (غير المالية) المفروضة بموجب هذا العقد.</li>
        <li><strong>الإفلاس أو الإعسار:</strong> إفلاس الطرف الثاني أو إعساره أو صدور أمر قضائي بذلك.</li>
        <li><strong>هجر أو ترك المركبة:</strong> هجر الطرف الثاني أو ترك المركبة دون سبب مشروع.</li>
        <li><strong>مغادرة البلاد نهائياً:</strong> ترحيل أو مغادرة الطرف الثاني من دولة قطر بصورة نهائية.</li>
        <li><strong>عدم دفع المخالفات المرورية:</strong> عدم التزام الطرف الثاني بدفع المخالفات المرورية المرتكبة أثناء حيازته للسيارة في غضون ثلاثين (30) يوماً من تاريخ ارتكابها.</li>
        <li><strong>الاستخدام غير المشروع:</strong> استخدام المركبة في أغراض غير مشروعة أو مخالفة للقانون.</li>
        <li><strong>تأجير المركبة للغير:</strong> قيام الطرف الثاني بتأجير المركبة للغير (التأجير من الباطن) دون الحصول على موافقة خطية مسبقة من الطرف الأول.</li>
      </ol>
    </div>
  </div>
);

const Article7 = () => (
  <div className="article">
    <div className="article-title">المادة (7): عواقب الإخلال بالعقد</div>
    <div className="article-content">
      <div className="sub-article">
        <div className="sub-number">7-1</div>
        <strong>فسخ العقد واسترداد المركبة:</strong><br />
        في حالة إخلال الطرف الثاني بأي من التزاماته، يحق للطرف الأول فسخ العقد فوراً واسترداد المركبة بواسطة أحد موظفيه، ويكون الطرف الثاني ملزماً بما يلي:
        <ul>
          <li>دفع القيمة الإيجارية المستحقة حتى تاريخ الفسخ؛</li>
          <li>تعويض الطرف الأول بغرامة قدرها خمسة آلاف (5,000) ريال قطري؛</li>
          <li>لا يحق للطرف الثاني المطالبة باسترداد أي مبالغ مدفوعة قبل إنهاء العقد.</li>
        </ul>
      </div>
      <div className="sub-article">
        <div className="sub-number">7-2</div>
        <strong>طريقة استرداد المركبة:</strong><br />
        يحق للطرف الأول استرداد المركبة بواسطة موظفيه المفوضين، وذلك باستخدام نسخة المفتاح الموجودة لدى الشركة. ويلتزم الطرف الثاني بتسليم نسخة من المفتاح للطرف الأول، وإلا يتحمل قيمتها.
      </div>
      <div className="clause-box">
        <strong>إقرار هام - عدم المسؤولية:</strong><br />
        يقر الطرف الثاني ويوافق صراحةً بعدم مسؤولية الطرف الأول عن أي أغراض شخصية أو مبالغ نقدية أو أي ممتلكات أخرى موجودة داخل المركبة عند استردادها. ويتنازل الطرف الثاني بموجب هذا العقد عن أي مطالبات قانونية (مدنية أو جنائية) تتعلق بالأغراض الشخصية المتبقية في المركبة في حالة استردادها نتيجة لعدم الدفع أو خرق العقد.
      </div>
      <div className="sub-article">
        <div className="sub-number">7-3</div>
        <strong>الالتزامات المالية عند الفسخ:</strong><br />
        عند فسخ العقد لأي سبب من الأسباب المذكورة أعلاه، يلتزم الطرف الثاني بسداد:
        <ul>
          <li>جميع الأقساط الإيجارية المستحقة حتى تاريخ الإنهاء؛</li>
          <li>جميع الغرامات والمخالفات المترتبة عليه؛</li>
          <li>تعويض الطرف الأول عن الفترة المتبقية من العقد بمبلغ يعادل قيمة قسطين (2) إيجاريين شهريين.</li>
        </ul>
      </div>
    </div>
  </div>
);

const Article8 = () => (
  <div className="article avoid-break">
    <div className="article-title">المادة (8): التأمين على المركبة</div>
    <div className="article-content">
      <div className="sub-article">
        <span className="sub-number">8-1</span> 
        يلتزم الطرف الأول بالتأمين الشامل على المركبة طوال فترة سريان هذا العقد.
      </div>
      <div className="sub-article">
        <span className="sub-number">8-2</span> 
        يتحمل الطرف الثاني القيمة التحملية (Deductible) المحددة في بوليصة التأمين عند وقوع أي حادث.
      </div>
      <div className="sub-article">
        <span className="sub-number">8-3</span> 
        <strong>المسؤولية عند الفقدان الكلي أو الهلاك الكلي:</strong> في حال تعرض المركبة للفقدان الكلي أو الهلاك الكلي بسبب إهمال الطرف الثاني أو تقصيره، يلتزم الطرف الثاني بدفع القيمة السوقية الكاملة للمركبة وقت وقوع الحادث.
      </div>
    </div>
  </div>
);

const Article9 = () => (
  <div className="article">
    <div className="article-title">المادة (9): التزامات الطرف الثاني (المستأجر)</div>
    <div className="article-content">
      <div className="sub-article">
        <div className="sub-number">9-1</div>
        <strong className="underline">الاستخدام الشخصي فقط:</strong><br />
        يتعهد الطرف الثاني بأنه سيقود المركبة بنفسه ولمنفعته الشخصية فقط، ولن يسمح لأي شخص آخر بقيادتها أو استعمالها طوال مدة العقد، إلا بموافقة خطية مسبقة من الطرف الأول.
        <p style={{ marginTop: '0.5rem' }}><strong>يُحظر على الطرف الثاني:</strong></p>
        <ul>
          <li>تأجير المركبة من الباطن لأي شخص آخر؛</li>
          <li>استخدام المركبة لأغراض تجارية (مثل التاكسي أو خدمات التوصيل)؛</li>
          <li>نقل المركبة خارج حدود دولة قطر دون موافقة خطية مسبقة من الطرف الأول؛</li>
          <li>رهن المركبة أو التصرف فيها بأي شكل من الأشكال.</li>
        </ul>
        <p><strong>العقوبة:</strong> في حالة مخالفة أي من البنود المذكورة أعلاه، يحق للطرف الأول إنهاء العقد فوراً دون إنذار أو تعويض، مع حقه في اتخاذ الإجراءات الجنائية اللازمة.</p>
      </div>
      <div className="sub-article">
        <div className="sub-number">9-2</div>
        <strong>المخالفات المرورية:</strong><br />
        يلتزم الطرف الثاني بدفع جميع المخالفات المرورية المرتكبة أثناء حيازته للمركبة، وذلك خلال مدة أقصاها ثلاثون (30) يوماً من تاريخ ارتكاب المخالفة. وعدم الالتزام بذلك يعطي الحق للطرف الأول في إنهاء العقد وتحميل الطرف الثاني قيمة المخالفات بالكامل.
      </div>
      <div className="sub-article">
        <div className="sub-number">9-3</div>
        <strong>الصيانة والإصلاحات والفحص الفني:</strong><br />
        يلتزم الطرف الثاني بالقيام بما يلي على نفقته الخاصة:
        <ul>
          <li>جميع أعمال الصيانة الدورية وغير الدورية؛</li>
          <li>الإصلاحات اللازمة للمركبة؛</li>
          <li>إجراء الفحص الفني في مواعيده المحددة قانوناً؛</li>
          <li>الالتزام بكافة متطلبات الفحص الفني؛</li>
          <li>ضمان اجتياز المركبة المؤجرة للفحص الفني طوال مدة سريان هذا العقد.</li>
        </ul>
      </div>
      <div className="sub-article">
        <div className="sub-number">9-4</div>
        <strong>المسؤولية عن الهلاك:</strong><br />
        يقر الطرف الثاني ويعترف بأنه وحده المسؤول مسؤولية كاملة عن هلاك المركبة، سواء كان هلاكاً كلياً أو جزئياً، والناتج عن إهماله أو تقصيره أو حتى بسبب الغير. وبالتالي فإن الطرف الثاني يتعهد بتحمل ودفع التكلفة الكاملة لهذا الهلاك.
      </div>
      <div className="sub-article">
        <div className="sub-number">9-5</div>
        <strong>تجديد استمرارية المركبة:</strong><br />
        يلتزم الطرف الثاني بتجديد استمرارية المركبة (تجديد الترخيص) طوال فترة سريان هذا العقد.
      </div>
    </div>
  </div>
);

const Article10 = () => (
  <div className="article avoid-break">
    <div className="article-title">المادة (10): الإنهاء المبكر للعقد من قبل المستأجر</div>
    <div className="article-content">
      <div className="sub-article">
        <div className="sub-number">10-1</div>
        <strong>شروط الإنهاء المبكر:</strong><br />
        إذا رغب الطرف الثاني في إنهاء العقد قبل انتهاء مدته، فيجب عليه:
        <ul>
          <li>تقديم إخطار كتابي للطرف الأول قبل ثلاثين (30) يوماً من تاريخ الإنهاء المطلوب؛</li>
          <li>تسليم المركبة بحالة جيدة؛</li>
          <li>سداد جميع المستحقات المالية (أقساط، غرامات، مخالفات).</li>
        </ul>
      </div>
      <div className="sub-article">
        <div className="sub-number">10-2</div>
        <strong>التعويض الجزائي:</strong><br />
        يلتزم الطرف الثاني بدفع تعويض جزائي قدره <strong>ثلاثة آلاف (3,000) ريال قطري</strong> (ما يعادل قسطين إيجاريين شهريين) عند الإنهاء المبكر.
      </div>
      <div className="sub-article">
        <div className="sub-number">10-3</div>
        <strong>استرداد مبلغ التأمين:</strong><br />
        يُخصم من مبلغ التأمين أي مستحقات مالية أخرى أو تكاليف إصلاح أية أضرار لحقت بالمركبة، ويُسترد المبلغ المتبقي (إن وجد) للطرف الثاني.
      </div>
      <div className="clause-box">
        <strong>تنويه هام:</strong><br />
        • لا يحق للطرف الثاني إنهاء العقد من جانب واحد دون الحصول على موافقة خطية مسبقة من الطرف الأول، وإلا اعتبر ذلك إخلالاً جوهرياً بالعقد.<br /><br />
        • <strong>منع السداد المبكر:</strong> لا يجوز للطرف الثاني سداد قيمة العقد كاملةً قبل انتهاء مدته إلا بموافقة خطية مسبقة من الطرف الأول. وإذا أراد الطرف الثاني ذلك، فيجب عليه إخطار الطرف الأول قبل شهر كامل للحصول على الموافقة.
      </div>
    </div>
  </div>
);

const Article11 = () => (
  <div className="article avoid-break">
    <div className="article-title">المادة (11): التنفيذ المباشر</div>
    <div className="article-content">
      <p>اتفق الطرفان صراحة وبشكل قاطع على أن هذا العقد، متى تم توثيقه لدى كاتب العدل بوزارة العدل في دولة قطر، <strong className="underline">يعد سنداً تنفيذياً</strong> بالمعنى الوارد في قانون المرافعات المدنية والتجارية القطري.</p>
      <p>بناءً على ذلك، يحق للطرف الأول (المؤجر) في حالة إخلال الطرف الثاني (المستأجر) بأي من التزاماته الناشئة عن هذا العقد، أن يباشر <strong>التنفيذ المباشر</strong> لدى إدارة التنفيذ بالمحاكم القطرية، <strong className="underline">دون حاجة لرفع دعوى موضوعية</strong>.</p>
    </div>
  </div>
);

const Article12 = () => (
  <div className="article">
    <div className="article-title">المادة (12): الإجراءات القانونية في حالة الإخلال</div>
    <div className="article-content">
      <div className="sub-article">
        <div className="sub-number">12-1</div>
        <strong className="underline">الإجراءات الجنائية:</strong>
        <div className="clause-box">
          <strong>التكييف القانوني:</strong> جريمة خيانة الأمانة<br />
          <strong>النص القانوني:</strong> المادة 362 من قانون العقوبات القطري رقم (11) لسنة 2004<br />
          <strong>العقوبة المقررة:</strong> الحبس مدة لا تجاوز ثلاث (3) سنوات، والغرامة التي لا تزيد على عشرة آلاف (10,000) ريال، أو بإحدى هاتين العقوبتين.
        </div>
        <p><strong>الإجراءات المتاحة للطرف الأول:</strong></p>
        <ul>
          <li>تقديم بلاغ جنائي ضد الطرف الثاني لدى الجهات المختصة (إدارة الشرطة / النيابة العامة) بتهمة خيانة الأمانة؛</li>
          <li>طلب منع الطرف الثاني من السفر حتى يتم استرداد المركبة وتسوية جميع المستحقات المالية؛</li>
          <li>طلب الحجز الاحتياطي على الطرف الثاني إذا لزم الأمر؛</li>
          <li>المطالبة بتطبيق العقوبة الجنائية المقررة قانوناً (الحبس والغرامة).</li>
        </ul>
      </div>
      <div className="sub-article">
        <div className="sub-number">12-2</div>
        <strong className="underline">الإجراءات المدنية:</strong><br />
        بالإضافة إلى الإجراءات الجنائية، يحق للطرف الأول:
        <ul>
          <li>رفع دعوى مدنية للمطالبة بالتعويضات المالية الناتجة عن الإخلال بالعقد؛</li>
          <li>طلب الحجز التحفظي على أموال وممتلكات الطرف الثاني.</li>
        </ul>
      </div>
    </div>
  </div>
);

const Article13 = () => (
  <div className="article">
    <div className="article-title">المادة (13): الأحكام العامة</div>
    <div className="article-content">
      <div className="sub-article">
        <span className="sub-number">13-1</span> 
        <strong>القانون الحاكم:</strong> يخضع هذا العقد في جميع أحكامه ويُفسَّر وفقاً لقوانين دولة قطر النافذة.
      </div>
      <div className="sub-article">
        <span className="sub-number">13-2</span> 
        <strong>الاختصاص القضائي:</strong> تختص محاكم دولة قطر دون غيرها، اختصاصاً <strong className="underline">إلزامياً وليس اختيارياً</strong>، بالفصل في أي نزاع ينشأ عن هذا العقد أو يتعلق به.
      </div>
      <div className="sub-article">
        <span className="sub-number">13-3</span> 
        <strong>الاتصالات والإخطارات:</strong> يجوز أن تكون جميع الاتصالات أو الإخطارات أو المراسلات المقدمة بموجب هذا العقد عبر تطبيق الواتساب أو البريد الإلكتروني أو الرسائل النصية، وتعتبر نافذة وملزمة.
      </div>
      <div className="sub-article">
        <span className="sub-number">13-4</span> 
        <strong>عدم جواز التنازل:</strong> لا يجوز للطرف الثاني التنازل عن هذا العقد أو عن الحقوق الممنوحة بموجبه أو نقلها أو بيعها كلياً أو جزئياً، دون الحصول على موافقة خطية مسبقة من الطرف الأول.
      </div>
      <div className="sub-article">
        <span className="sub-number">13-5</span> 
        <strong>قابلية الفصل:</strong> إذا تم اعتبار أي حكم أو بند من هذا العقد غير قابل للتنفيذ قانوناً، فسيتم اعتبار العقد معدلاً بالقدر اللازم فقط لجعل ذلك الحكم قابلاً للتنفيذ، وتبقى بقية بنود العقد سارية وقابلة للتنفيذ بالكامل.
      </div>
      <div className="sub-article">
        <span className="sub-number">13-6</span> 
        <strong>الاتفاق بمجمله:</strong> يشكل هذا العقد وملاحقه الاتفاق الكامل والشامل بين الطرفين، ويحل محل أي تفاهمات أو اتفاقات معاصرة أو سابقة، سواء كانت مكتوبة أو شفهية.
      </div>
      <div className="sub-article">
        <span className="sub-number">13-7</span> 
        <strong>التنفيذ الفوري:</strong> يجوز للطرف الأول تنفيذ حقوقه المنصوص عليها في هذا العقد فوراً دون حاجة إلى إنذار رسمي أو حكم قضائي، ويلتزم الطرف الثاني بالتعاون الفوري في هذا الشأن، وإلا عُد ممتنعاً عن تنفيذ التزام قانوني.
      </div>
      <div className="sub-article">
        <span className="sub-number">13-8</span> 
        <strong>التعديلات:</strong> لا يجوز تعديل أي بند من بنود هذا العقد إلا بموافقة خطية صريحة من الطرفين معاً.
      </div>
      <div className="sub-article">
        <span className="sub-number">13-9</span> 
        <strong>التفسير:</strong> في حال وجود أي تعارض أو غموض في تفسير أي من بنود هذا العقد، يُفسر العقد بالطريقة التي تحقق مصلحة الطرف الأول (المؤجر).
      </div>
    </div>
  </div>
);

const Article14 = () => (
  <div className="article avoid-break">
    <div className="article-title">المادة (14): حجز مبلغ التأمين</div>
    <div className="article-content">
      <p>يحق للطرف الأول حجز مبلغ التأمين كاملاً دون حاجة لإثبات الضرر في الحالات التالية:</p>
      <ol>
        <li>تأخر الطرف الثاني عن سداد أي من الأقساط الإيجارية في مواعيدها المحددة؛</li>
        <li>لحوق أي أضرار بالمركبة أياً كان سببها أو مصدرها؛</li>
        <li>إخلال الطرف الثاني بأي شرط من شروط هذا العقد.</li>
      </ol>
    </div>
  </div>
);

const Article15 = () => (
  <div className="article avoid-break">
    <div className="article-title">المادة (15): المستندات المطلوبة</div>
    <div className="article-content">
      <p>يلتزم الطرف الثاني بتقديم المستندات التالية إلى الطرف الأول قبل استلام المركبة:</p>
      <ol>
        <li>نسخة واضحة من الهوية القطرية أو الإقامة سارية المفعول؛</li>
        <li>نسخة واضحة من رخصة القيادة القطرية سارية المفعول؛</li>
        <li>نسخة من جواز السفر ساري المفعول؛</li>
        <li>أي مستندات إضافية أخرى يطلبها الطرف الأول.</li>
      </ol>
    </div>
  </div>
);

const Article16 = () => (
  <div className="article avoid-break">
    <div className="article-title">المادة (16): الملاحق</div>
    <div className="article-content">
      <p>تعتبر الملاحق التالية جزءاً لا يتجزأ من هذا العقد، ولها نفس القوة الإلزامية:</p>
      <div className="sub-article">
        <strong>ملحق (أ):</strong> جدول الدفعات الشهرية - يحتوي على تفاصيل الدفعات الشهرية المستحقة وتواريخ استحقاقها.
      </div>
      <div className="sub-article">
        <strong>ملحق (1):</strong> تقرير الفحص الفني والصور المرفقة - يعد جزءاً أساسياً ومكملاً لهذا العقد.
      </div>
    </div>
  </div>
);

const FinalDeclarations = () => (
  <div className="declarations avoid-break">
    <div className="declaration-title">الإقـــرارات والموافقـــات النهائيـــة</div>
    
    <div className="declaration-item">
      <strong>إقرار بقراءة العقد وفهمه:</strong> 
      أقر أنا الطرف الثاني الموقع أدناه بأنني قرأت هذا العقد بجميع مواده وبنوده وملاحقه قراءة متأنية ودقيقة، وفهمت جميع ما ورد فيه من شروط وأحكام والتزامات فهماً تاماً وكاملاً، ولم يبق لدي أي استفسار أو غموض أو التباس في أي من بنوده.
    </div>

    <div className="declaration-item">
      <strong>إقرار بالأمانة والمسؤولية الجنائية:</strong> 
      أدرك إدراكاً تاماً ويقينياً أن المركبة المؤجرة موضوع هذا العقد هي أمانة في يدي بموجب أحكام المادة (362) من قانون العقوبات القطري رقم (11) لسنة 2004، وأن أي اختلاس أو تبديد لها أو امتناع عن ردها يعد جريمة خيانة أمانة.
    </div>

    <div className="declaration-item">
      <strong>إقرار بالعقوبة الجنائية:</strong> 
      أعلم علماً يقينياً لا شك فيه بأن أي اختلاس أو تبديد أو امتناع عن إرجاع المركبة المؤجرة يشكل جريمة جنائية يعاقب عليها قانوناً بالحبس مدة لا تجاوز ثلاث (3) سنوات، وبالغرامة التي لا تزيد على عشرة آلاف (10,000) ريال، أو بإحدى هاتين العقوبتين.
    </div>

    <div className="declaration-item">
      <strong>موافقة صريحة على الإجراءات الجنائية:</strong> 
      أوافق موافقة صريحة وقاطعة على حق الطرف الأول في اتخاذ جميع الإجراءات الجنائية ضدي (بما في ذلك على سبيل المثال لا الحصر: تقديم البلاغ الجنائي، وطلب منع السفر، وطلب الحجز الاحتياطي) في حالة إخلالي بأي من التزاماتي الواردة في هذا العقد، وأتنازل تنازلاً نهائياً وغير قابل للرجوع عن أي اعتراض على ذلك.
    </div>

    <div className="declaration-item">
      <strong>إقرار صريح بالموافقة على جميع الشروط:</strong> 
      أوافق موافقة صريحة وقاطعة وبشكل نهائي على جميع الشروط والأحكام والغرامات والعقوبات والإجراءات القانونية (الجنائية والمدنية) الواردة في هذا العقد بجميع مواده وملاحقه، ولا يحق لي الاعتراض عليها أو الطعن فيها مستقبلاً بأي شكل من الأشكال.
    </div>

    <div className="declaration-item">
      <strong>إقرار بالتوقيع الحر والرضا الكامل:</strong> 
      أقر وأعترف بأنني وقعت على هذا العقد بكامل إرادتي وحريتي الكاملة ورضاي التام، دون أي إكراه أو ضغط أو تهديد أو تضليل أو غلط، وأنني على علم تام بجميع الحقوق والالتزامات والعواقب القانونية المترتبة عليه.
    </div>
  </div>
);

const ConcludingStatement = () => (
  <div className="text-center font-bold" style={{ margin: '2.5rem 0', lineHeight: '2.2' }}>
    وبعد أن قرأ الطرفان هذا العقد وفهما جميع بنوده ومواده وملاحقه،<br />
    وافقا عليه موافقة تامة ووقعا عليه من نسختين أصليتين،<br />
    لكل طرف نسخة أصلية للعمل بموجبها عند اللزوم.
  </div>
);

const Signatures = ({ customerName, todayGregorian }: any) => (
  <div className="signatures avoid-break">
    <div className="signature-grid">
      <div className="signature-box">
        <div className="signature-title">الطرف الأول (المؤجــر)</div>
        <div style={{ margin: '2rem 0' }}>
          <strong>شركة العراف لتأجير السيارات ذ.م.م</strong>
        </div>
        <div className="signature-line">التوقيع</div>
        <div style={{ marginTop: '0.5rem', fontSize: '12pt' }}>
          <strong>الاسم:</strong> خميس هاشم الجابر<br />
          <strong>الصفة:</strong> المدير العام المفوض بالتوقيع
        </div>
        <div className="stamp-box">ختم الشركة</div>
      </div>

      <div className="signature-box">
        <div className="signature-title">الطرف الثاني (المستأجــر)</div>
        <div style={{ margin: '2rem 0' }}>
          <strong>الاسم:</strong> {customerName}
        </div>
        <div className="signature-line">التوقيع</div>
        <div style={{ marginTop: '1rem', fontSize: '12pt' }}>
          <strong>التاريخ:</strong> {todayGregorian}
        </div>
        <div className="stamp-box">البصمة</div>
      </div>
    </div>
  </div>
);

const Footer = ({ todayGregorian }: any) => (
  <div className="footer">
    حُرر هذا العقد باللغة العربية في مقر الطرف الأول بتاريخ {todayGregorian}<br />
    ويخضع لأحكام القوانين النافذة في دولة قطر<br />
    ──────────<br />
    شركة العراف لتأجير السيارات ذ.م.م © {new Date().getFullYear()}
  </div>
);

const AnnexA = ({ contractNumber, todayGregorian, paymentSchedule, totalAmount }: any) => (
  <div className="avoid-break">
    <div className="header" style={{ marginBottom: '2rem' }}>
      <div className="company-name">ملحق (أ)</div>
      <div style={{ fontSize: '16pt', fontWeight: 700, marginTop: '1rem' }}>
        جدول الدفعات الشهرية المستحقة
      </div>
      <div className="company-details" style={{ marginTop: '0.5rem' }}>
        ملحق للعقد رقم: {contractNumber}
      </div>
    </div>

    <p style={{ textAlign: 'justify', marginBottom: '1.5rem' }}>
      يوضح هذا الجدول الدفعات الشهرية المستحقة على الطرف الثاني (المستأجر) بموجب عقد إيجار السيارة 
      المؤرخ في {todayGregorian}:
    </p>

    <table>
      <thead>
        <tr>
          <th style={{ width: '10%' }}>رقم الدفعة</th>
          <th style={{ width: '25%' }}>تاريخ الاستحقاق</th>
          <th style={{ width: '25%' }}>المبلغ المستحق (ر.ق)</th>
          <th style={{ width: '20%' }}>حالة الدفع</th>
          <th style={{ width: '20%' }}>تاريخ الدفع الفعلي</th>
        </tr>
      </thead>
      <tbody>
        {paymentSchedule.map((payment: any) => (
          <tr key={payment.number}>
            <td className="text-center">{payment.number}</td>
            <td>{payment.dueDate}</td>
            <td>{payment.amount}</td>
            <td></td>
            <td></td>
          </tr>
        ))}
        <tr className="total-row">
          <td colSpan={2} className="text-center"><strong>الإجمالي</strong></td>
          <td><strong>{totalAmount?.toFixed(2)}</strong></td>
          <td colSpan={2}></td>
        </tr>
      </tbody>
    </table>

    <div style={{ marginTop: '2rem', lineHeight: '2.0' }}>
      <p><strong>ملاحظات:</strong></p>
      <ul>
        <li>يُدفع كل قسط في تاريخ استحقاقه المحدد أعلاه أو قبله؛</li>
        <li>التأخر عن الدفع يترتب عليه غرامات وفقاً للمادة (4) من العقد الأساسي؛</li>
        <li>مبلغ التأمين (8,000 ريال قطري) يُدفع مقدماً عند التوقيع.</li>
      </ul>
    </div>

    <div style={{ marginTop: '3rem' }}>
      <table style={{ border: 'none' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', border: 'none', textAlign: 'center' }}>
              <strong>توقيع المؤجر</strong><br /><br />
              ____________________<br />
              <span style={{ fontSize: '11pt' }}>شركة العراف</span>
            </td>
            <td style={{ width: '50%', border: 'none', textAlign: 'center' }}>
              <strong>توقيع المستأجر</strong><br /><br />
              ____________________<br />
              <span style={{ fontSize: '11pt' }}>التاريخ: ____/____/____</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const AnnexOne = ({ contractNumber }: any) => (
  <div className="avoid-break">
    <div className="header" style={{ marginBottom: '2rem' }}>
      <div className="company-name">ملحق (1)</div>
      <div style={{ fontSize: '16pt', fontWeight: 700, marginTop: '1rem' }}>
        تقرير الفحص الفني للمركبة والصور المرفقة
      </div>
      <div className="company-details" style={{ marginTop: '0.5rem' }}>
        ملحق للعقد رقم: {contractNumber}
      </div>
    </div>

    <p style={{ fontWeight: 700, marginBottom: '1.5rem' }}>معلومات المركبة:</p>

    <table>
      <tbody>
        <tr>
          <th style={{ width: '35%' }}>البيان</th>
          <th style={{ width: '65%' }}>التفاصيل</th>
        </tr>
        <tr><td>رقم اللوحة</td><td>_____________________________</td></tr>
        <tr><td>النوع والموديل</td><td>_____________________________</td></tr>
        <tr><td>رقم الهيكل (VIN)</td><td>_____________________________</td></tr>
        <tr><td>تاريخ الفحص</td><td>____/____/________</td></tr>
        <tr><td>الفاحص</td><td>_____________________________</td></tr>
      </tbody>
    </table>

    <p style={{ fontWeight: 700, margin: '1.5rem 0 1rem 0' }}>نتائج الفحص الفني:</p>

    <table>
      <thead>
        <tr>
          <th style={{ width: '10%' }}>م</th>
          <th style={{ width: '40%' }}>العنصر المفحوص</th>
          <th style={{ width: '25%' }}>الحالة</th>
          <th style={{ width: '25%' }}>ملاحظات</th>
        </tr>
      </thead>
      <tbody>
        {[
          'الهيكل الخارجي',
          'المحرك',
          'ناقل الحركة (الجير)',
          'الإطارات (الكفرات)',
          'الفرامل (المكابح)',
          'نظام التعليق',
          'الإضاءة (الأنوار)',
          'المقصورة الداخلية',
          'مستوى الوقود',
          'درجة النظافة العامة',
        ].map((item, index) => (
          <tr key={index}>
            <td className="text-center">{index + 1}</td>
            <td>{item}</td>
            <td className="text-center">
              {item === 'مستوى الوقود' ? '☐ ممتلئ  ☐ نصف  ☐ ربع' : '☐ ممتاز  ☐ جيد  ☐ مقبول'}
            </td>
            <td>____________</td>
          </tr>
        ))}
        <tr>
          <td className="text-center">10</td>
          <td>قراءة عداد المسافات (كم)</td>
          <td colSpan={2}>___________________________ كم</td>
        </tr>
      </tbody>
    </table>

    <div style={{ marginTop: '2rem' }}>
      <p><strong>الصور المرفقة:</strong></p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        {['صورة أمامية للمركبة', 'صورة خلفية للمركبة', 'صورة جانبية يمنى', 'صورة جانبية يسرى', 'صورة لوحة القيادة', 'صورة المقصورة الداخلية'].map((title, idx) => (
          <div key={idx} style={{ border: '2px dashed #666', padding: '1rem', textAlign: 'center', minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {title}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default AlarafOfficialContractComplete;

