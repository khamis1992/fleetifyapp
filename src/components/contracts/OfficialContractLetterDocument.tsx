import React, { useMemo } from 'react';
import type { Contract } from '@/types/contracts';
import type { PaymentSchedule } from '@/types/payment-schedules';
import type { VehicleInspection } from '@/hooks/useVehicleInspections';

type OfficialContractLetterDocumentProps = {
  contract: Contract & {
    customer?: any;
    vehicle?: any;
  };
  paymentSchedules?: PaymentSchedule[];
  checkInInspection?: VehicleInspection | null;
  checkOutInspection?: VehicleInspection | null;
};

const COMPANY = {
  nameAr: 'العراف لتأجير السيارات',
  legalNameAr: 'شركة العراف لتأجير السيارات ذ.م.م',
  nameEn: 'Alaraf Car Rental',
  cr: '146832',
  logo: '/receipts/logo.png',
  address: 'أم صلال محمد - الشارع التجاري - مبنى 79 - الطابق الأول - مكتب 2',
  phone: '+974 66070076',
  email: 'khamis-1992@hotmail.com',
  signatory: 'خميس هاشم الجبر',
  signatoryTitle: 'المخول بالتوقيع',
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ar-QA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

const formatCurrency = (value?: number | null) => {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ر.ق`;
};

const valueOrDash = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const formatPaymentStatus = (status?: string | null) => {
  const labels: Record<string, string> = {
    pending: 'مستحق',
    overdue: 'متأخر',
    paid: 'مسدد',
    partially_paid: 'مسدد جزئياً',
    cancelled: 'ملغي',
  };
  return labels[status || ''] || '-';
};

const uniquePhotoUrls = (...groups: Array<string[] | undefined>) => (
  Array.from(new Set(groups.flatMap((group) => group || []).filter(Boolean)))
);

const getCustomerName = (customer: any) => {
  if (!customer) return '-';
  if (customer.customer_type === 'corporate') {
    return customer.company_name_ar || customer.company_name || customer.name || '-';
  }
  return [
    customer.first_name_ar || customer.first_name,
    customer.last_name_ar || customer.last_name,
  ].filter(Boolean).join(' ') || customer.full_name || customer.name || '-';
};

const getVehicleName = (vehicle: any) => {
  if (!vehicle) return '-';
  return [
    vehicle.make,
    vehicle.model,
    vehicle.year,
  ].filter(Boolean).join(' ') || vehicle.vehicle_name || '-';
};

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <tr>
    <th>{label}</th>
    <td>{value}</td>
  </tr>
);

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="legal-list">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="contract-letter-section">
    <h3>{title}</h3>
    {children}
  </section>
);

export const OfficialContractLetterDocument: React.FC<OfficialContractLetterDocumentProps> = ({
  contract,
  paymentSchedules = [],
  checkInInspection = null,
  checkOutInspection = null,
}) => {
  const customer = contract.customer || {};
  const vehicle = contract.vehicle || {};
  const customerName = useMemo(() => getCustomerName(customer), [customer]);
  const vehicleName = useMemo(() => getVehicleName(vehicle), [vehicle]);
  const issueDate = contract.contract_date || contract.created_at || new Date().toISOString();
  const contractNumber = contract.contract_number || contract.id || '-';
  const inspectionItems = [
    { item: 'الهيكل الخارجي', status: '☐ مقبول', notes: '____________' },
    { item: 'المحرك', status: '☐ مقبول', notes: '____________' },
    { item: 'ناقل الحركة (الجير)', status: '☐ مقبول', notes: '____________' },
    { item: 'الإطارات (الكفرات)', status: '☐ مقبول', notes: '____________' },
    { item: 'الفرامل (المكابح)', status: '☐ مقبول', notes: '____________' },
    { item: 'نظام التعليق', status: '☐ مقبول', notes: '____________' },
    { item: 'الإضاءة (الأنوار)', status: '☐ مقبول', notes: '____________' },
    { item: 'المقصورة الداخلية', status: '☐ مقبول', notes: '____________' },
    { item: 'مستوى الوقود', status: '☐ ممتلئ ☐ نصف ☐ ربع', notes: '____________' },
    { item: 'درجة النظافة العامة', status: '☐ مقبول', notes: '____________' },
    { item: 'قراءة عداد المسافات (كم)', status: '___________________________ كم', notes: '____________' },
  ];

  const financialRows = [
    { label: 'قيمة العقد الإجمالية', value: formatCurrency(contract.contract_amount) },
    { label: 'القسط الشهري', value: formatCurrency(contract.monthly_amount) },
    { label: 'مبلغ التأمين', value: formatCurrency((contract as any).deposit_amount || (contract as any).security_deposit) },
    { label: 'طريقة الدفع', value: valueOrDash((contract as any).payment_method) },
  ];
  const monthlyRentText = contract.monthly_amount ? formatCurrency(contract.monthly_amount) : '(     ) ريال قطري';
  const depositText = formatCurrency((contract as any).deposit_amount || (contract as any).security_deposit || 8000);
  const inspectionPhotos = uniquePhotoUrls(checkInInspection?.photo_urls, checkOutInspection?.photo_urls);

  return (
    <article className="official-contract-letter" dir="rtl">
      <style>{`
        .official-contract-letter {
          width: 100%;
          max-width: 180mm;
          margin: 0 auto;
          padding: 12mm 14mm;
          background: #fff;
          color: #000;
          font-family: "Times New Roman (Headings CS)", "Times New Roman", serif;
          font-size: 11.5pt;
          line-height: 1.75;
        }

        .official-contract-letter * {
          box-sizing: border-box;
        }

        .official-contract-letter .header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 150px minmax(0, 1fr);
          align-items: start;
          gap: 18px;
          width: 100%;
          border-bottom: 3px double #1e3a5f;
          padding-bottom: 12px;
          margin-bottom: 10px;
        }

        .official-contract-letter .company-ar {
          text-align: right;
        }

        .official-contract-letter .company-ar h1 {
          color: #1e3a5f;
          margin: 0;
          font-size: 17px;
          font-weight: bold;
          line-height: 1.35;
        }

        .official-contract-letter .company-ar p,
        .official-contract-letter .company-en p {
          color: #000;
          margin: 2px 0;
          font-size: 10.5px;
          line-height: 1.45;
        }

        .official-contract-letter .logo-container {
          text-align: center;
          padding-top: 2px;
        }

        .official-contract-letter .logo-container img {
          max-height: 78px;
          max-width: 148px;
          width: auto;
          height: auto;
          display: inline-block;
        }

        .official-contract-letter .company-en {
          text-align: left;
        }

        .official-contract-letter .company-en h1 {
          color: #1e3a5f;
          margin: 0;
          font-size: 13px;
          font-weight: bold;
          line-height: 1.35;
        }

        .official-contract-letter .address-bar {
          text-align: center;
          color: #000;
          font-size: 10.5px;
          line-height: 1.65;
          margin-bottom: 12px;
          padding-bottom: 9px;
          border-bottom: 1px solid #ccc;
        }

        .official-contract-letter .ref-date {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          width: 100%;
          margin-bottom: 12px;
          font-size: 11.5px;
          color: #000;
        }

        .official-contract-letter .ref-date > div:first-child {
          float: none;
        }

        .official-contract-letter .ref-date > div:last-child {
          float: none;
          text-align: left;
        }

        .official-contract-letter .subject-box {
          background: #1e3a5f;
          color: #fff;
          padding: 9px 14px;
          margin-bottom: 14px;
          font-size: 16px;
          font-weight: bold;
          text-align: center;
          letter-spacing: 0;
        }

        .official-contract-letter .intro {
          margin: 10px 0;
          text-align: justify;
          text-align-last: auto;
          line-height: 1.85;
        }

        .official-contract-letter .contract-letter-section {
          margin: 14px 0;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .official-contract-letter .contract-letter-section h3 {
          color: #fff;
          background: #1e3a5f;
          font-size: 13.5px;
          margin: 0 0 8px;
          padding: 6px 10px;
          border-bottom: none;
          font-weight: bold;
          line-height: 1.45;
        }

        .official-contract-letter .official-table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0 12px;
          font-size: 10.5px;
          table-layout: fixed;
        }

        .official-contract-letter .official-table th,
        .official-contract-letter .official-table td {
          border: 1px solid #333;
          padding: 6px 7px;
          text-align: right;
          vertical-align: top;
          word-wrap: break-word;
          overflow-wrap: break-word;
          line-height: 1.55;
        }

        .official-contract-letter .official-table th {
          background: #1e3a5f;
          color: white;
          font-weight: bold;
          width: 28%;
        }

        .official-contract-letter .official-table tr:nth-child(even) td {
          background: #f9f9f9;
        }

        .official-contract-letter .legal-list {
          margin: 6px 0 0;
          padding: 0 16px 0 0;
          text-align: justify;
          line-height: 1.75;
        }

        .official-contract-letter .legal-list li {
          margin: 4px 0;
          padding-right: 2px;
        }

        .official-contract-letter .clause-body p {
          margin: 5px 0;
          text-align: justify;
          text-indent: 0;
          line-height: 1.85;
        }

        .official-contract-letter .clause-body strong {
          color: #000;
        }

        .official-contract-letter .penalty-table th {
          width: auto;
          text-align: center;
        }

        .official-contract-letter .penalty-table td:first-child,
        .official-contract-letter .penalty-table td:last-child {
          text-align: center;
        }

        .official-contract-letter .summary-line {
          background: #f5f5f5;
          border-right: 4px solid #1e3a5f;
          padding: 8px 10px;
          margin: 10px 0;
          font-weight: bold;
          line-height: 1.65;
        }

        .official-contract-letter .appendix-note-title {
          margin: 10px 0 5px;
          font-weight: bold;
        }

        .official-contract-letter .inspection-result-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin: 8px 0 12px;
        }

        .official-contract-letter .inspection-result-card {
          border: 1px solid #333;
          padding: 8px;
          min-height: 74px;
          line-height: 1.6;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .official-contract-letter .inspection-result-card strong {
          display: block;
          color: #1e3a5f;
          margin-bottom: 4px;
        }

        .official-contract-letter .attachment-photo-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 8px;
        }

        .official-contract-letter .attachment-photo {
          border: 1px solid #333;
          min-height: 88px;
          padding: 4px;
          text-align: center;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .official-contract-letter .attachment-photo img {
          width: 100%;
          height: 82px;
          object-fit: cover;
          display: block;
        }

        .official-contract-letter .empty-attachment-box {
          border: 1px dashed #777;
          padding: 12px;
          color: #444;
          text-align: center;
          font-size: 10.5px;
        }

        .official-contract-letter .signature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 14px;
          page-break-inside: avoid;
        }

        .official-contract-letter .signature-card {
          border: 1px solid #333;
          min-height: 190px;
          padding: 10px;
          text-align: center;
          line-height: 1.65;
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }

        .official-contract-letter .signature-line {
          border-top: 1px solid #1e3a5f;
          margin: 22px auto 5px;
          width: 75%;
          padding-top: 5px;
          color: #000;
        }

        .official-contract-letter .signature-assets {
          display: flex;
          align-items: center;
          justify-content: space-around;
          gap: 12px;
          margin: 8px auto 6px;
          width: 86%;
        }

        .official-contract-letter .signature-assets img {
          object-fit: contain;
          display: block;
        }

        .official-contract-letter .signature-assets .stamp-image {
          width: 72px;
          height: 72px;
          transform: rotate(-5deg);
        }

        .official-contract-letter .signature-assets .signature-image {
          width: 92px;
          height: 38px;
        }

        .official-contract-letter .signatory-meta {
          margin-top: auto;
        }

        .official-contract-letter .footer {
          margin-top: 12px;
          padding-top: 7px;
          border-top: 1px solid #ccc;
          text-align: center;
          font-size: 9px;
          color: #000;
          line-height: 1.55;
        }

        @media print {
          @page {
            size: A4;
            margin: 15mm 20mm 20mm 20mm;
          }

          .official-contract-letter {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 8mm 10mm !important;
            border: none !important;
            box-shadow: none !important;
          }

          .official-contract-letter .contract-letter-section,
          .official-contract-letter .signature-grid,
          .official-contract-letter table,
          .official-contract-letter tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="header">
        <div className="company-ar">
          <h1>{COMPANY.nameAr}</h1>
          <p>ذ.م.م</p>
          <p>السجل التجاري: {COMPANY.cr}</p>
        </div>

        <div className="logo-container">
          <img src={COMPANY.logo} alt="شعار الشركة" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
        </div>

        <div className="company-en" dir="ltr">
          <h1>{COMPANY.nameEn}</h1>
          <p>L.L.C</p>
          <p>C.R: {COMPANY.cr}</p>
        </div>
      </div>

      <div className="address-bar">
        {COMPANY.address}<br />
        هاتف: {COMPANY.phone} | البريد الإلكتروني: {COMPANY.email}
      </div>

      <div className="ref-date">
        <div><strong>رقم العقد:</strong> {contractNumber}</div>
        <div><strong>تاريخ الإصدار:</strong> {formatDate(issueDate)}</div>
      </div>

      <div className="subject-box">عقد إيجار مركبة</div>

      <p className="intro">
        إنه في التاريخ الموضح أعلاه تم الاتفاق بين {COMPANY.legalNameAr} بصفتها الطرف الأول
        وبين السيد/السادة <strong>{customerName}</strong> بصفتهم الطرف الثاني، على تأجير المركبة
        الموضحة بياناتها أدناه وفق الشروط والأحكام المبينة في هذا العقد.
      </p>

      <Section title="الديباجة">
        <div className="clause-body">
          <p>
            بموجب هذا العقد، اتفق الطرفان بإرادتهما الحرة على إبرام عقد إيجار مركبة، وذلك بعد أن أقر الطرف
            الثاني بأهليته القانونية الكاملة، وقدرته المالية على الوفاء بجميع التزاماته.
          </p>
          <p>
            وحيث إن الطرفين يدركان أن المركبة المؤجرة تعتبر أمانة في يد المستأجر بموجب المادة 362 من قانون
            العقوبات القطري رقم 11 لسنة 2004، وأن أي اختلاس أو تبديد أو امتناع عن إرجاعها يشكل جريمة خيانة
            أمانة يعاقب عليها بالحبس والغرامة؛ وأقر الطرف الثاني باستلام المركبة محل العقد بحالة فنية جيدة بعد
            فحصها، وقبوله بجميع الشروط والأحكام الواردة أدناه التزاماً نافذاً.
          </p>
          <p>وتعتبر الديباجة والملحقات جزءاً لا يتجزأ من هذا العقد ولها ذات الحجية القانونية.</p>
        </div>
      </Section>

      <Section title="أولاً: بيانات الطرفين">
        <table className="official-table">
          <tbody>
            <DetailRow label="الطرف الأول" value={COMPANY.legalNameAr} />
            <DetailRow label="السجل التجاري" value={COMPANY.cr} />
            <DetailRow label="العنوان" value={COMPANY.address} />
            <DetailRow label="الطرف الثاني" value={customerName} />
            <DetailRow label="رقم الهوية / السجل" value={valueOrDash(customer.national_id || customer.qid || customer.license_number)} />
            <DetailRow label="رقم الهاتف" value={valueOrDash(customer.phone || customer.mobile || customer.phone_number)} />
            <DetailRow label="البريد الإلكتروني" value={valueOrDash(customer.email)} />
          </tbody>
        </table>
      </Section>

      <Section title="ثانياً: بيانات المركبة">
        <table className="official-table">
          <tbody>
            <DetailRow label="المركبة" value={vehicleName} />
            <DetailRow label="رقم اللوحة" value={valueOrDash(vehicle.plate_number || vehicle.license_plate)} />
            <DetailRow label="رقم الهيكل" value={valueOrDash(vehicle.vin || vehicle.vin_number)} />
            <DetailRow label="اللون" value={valueOrDash(vehicle.color)} />
            <DetailRow label="قراءة العداد" value={valueOrDash((contract as any).odometer_reading || vehicle.current_mileage)} />
          </tbody>
        </table>
      </Section>

      <Section title="ثالثاً: مدة العقد والقيمة المالية">
        <table className="official-table">
          <tbody>
            <DetailRow label="تاريخ بداية العقد" value={formatDate(contract.start_date)} />
            <DetailRow label="تاريخ نهاية العقد" value={formatDate(contract.end_date)} />
            {financialRows.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </tbody>
        </table>
        <div className="summary-line">
          يلتزم الطرف الثاني بسداد الأجرة والمبالغ المستحقة في مواعيدها، وتعد جميع المبالغ بعملة الريال القطري.
        </div>
      </Section>

      <Section title="المادة (1): التمهيد والتفسير">
        <div className="clause-body">
          <p>1.1 تعتبر الديباجة أعلاه جزءاً لا يتجزأ من هذا العقد وتُقرأ معه كوحدة واحدة.</p>
          <p>
            1.2 يُفسر هذا العقد وفقاً لأحكامه وشروطه، وفي حالة الغموض أو التعارض، تُطبق أحكام القانون المدني
            القطري رقم 22 لسنة 2004 وقانون العقوبات القطري رقم 11 لسنة 2004.
          </p>
        </div>
      </Section>

      <Section title="المادة (2): موضوع العقد والمركبة">
        <div className="clause-body">
          <p>يلتزم المؤجر بتمكين المستأجر من الانتفاع بالمركبة الموصوفة أدناه طوال مدة العقد مقابل الأجرة المحددة.</p>
          <p>يعد تقرير الفحص الفني والصور المرفقة (الملحق رقم 1) جزءاً أساسياً من العقد.</p>
        </div>
      </Section>

      <Section title="المادة (3): مدة الإيجار">
        <div className="clause-body">
          <p>مدة هذا العقد تبدأ اعتباراً من تاريخ النفاذ المذكور في بداية هذا العقد.</p>
          <p>
            ينتهي العقد بانتهاء مدته أو بإعادة المركبة مع تسوية جميع المستحقات المالية. كما لا يجوز للطرف الثاني
            أن ينهي العقد قبل انتهاء مدته إلا بموافقة كتابية من الطرف الأول.
          </p>
          <p>
            لا يحق للطرف الثاني الاحتفاظ بالمركبة بعد انتهاء المدة تحت أي ظرف من الظروف، ويجب عليه إرجاعها
            فوراً وإلا اعتبر ذلك جريمة خيانة أمانة بموجب المادة 362 من قانون العقوبات القطري.
          </p>
        </div>
      </Section>

      <Section title="المادة (4): الأجرة والالتزامات المالية">
        <div className="clause-body">
          <p>
            قيمة الإيجار الشهري {monthlyRentText}، تُدفع مقدماً في بداية كل شهر عن طريق التحويل البنكي إلى حساب
            المؤجر. يلتزم الطرف الثاني بسداد كامل دفعات الإيجار المحددة شهرياً وبصورة منتظمة ولا يجوز له خصم أي
            مبلغ منها مقابل رسوم أو ضرائب أو غير ذلك وفقاً لجدول الدفعات المرفق بهذا العقد (الملحق أ).
          </p>
          <p>يلتزم الطرف الثاني بسداد كل دفعة في تاريخ استحقاقها المحدد بالجدول، نقداً أو بالتحويل البنكي إلى حساب الطرف الأول.</p>
          <p>في حال التأخير في السداد، يلتزم المستأجر بدفع:</p>
          <BulletList
            items={[
              '120 ريالاً قطرياً عن كل يوم تأخير بعد مضي تاريخ الاستحقاق.',
              '250 ريالاً قطرياً رسوماً إدارية ثابتة.',
              'تُحتسب غرامة التأخير من اليوم التالي لتاريخ الاستحقاق وحتى تاريخ السداد الفعلي.',
              'يحق للطرف الأول فرض الغرامة لمدة أقصاها ثلاثون (30) يوماً، وبعد ذلك يحق له إنهاء العقد واسترداد المركبة واتخاذ الإجراءات القانونية اللازمة.',
            ]}
          />
          <p>
            إقرار من الطرف الثاني: يقر الطرف الثاني ويوافق على أن غرامة التأخير المذكورة أعلاه هي تقدير عادل
            ومعقول للضرر الذي يلحق بالطرف الأول نتيجة التأخير، وأنه قد قبلها بكامل إرادته ورضاه.
          </p>
          <p>يحق للمؤجر حجز مبلغ التأمين كاملاً دون حاجة لإثبات إذا تأخر المستأجر عن السداد، أو لحقت بالمركبة أضرار، أو أخل المستأجر بأي شرط من شروط العقد.</p>
        </div>
      </Section>

      <Section title="المادة (5): المخالفات والعقوبات">
        <div className="clause-body">
          <p>
            في حال تخلف الطرف الثاني عن سداد أي من الدفعات الشهرية المستحقة لأي سبب كان تطبق عليه دون حاجة إلى
            إعذار أو إنذار من قبل الطرف الأول غرامة تأخير حسب الكشف المرفق عن كل يوم تأخير من تاريخ الاستحقاق
            حتى تاريخ سداد المتأخرات، وتدفع المتأخرات مع الغرامات على حد سواء.
          </p>
        </div>
        <table className="official-table penalty-table">
          <thead>
            <tr>
              <th>المخالفة</th>
              <th>الجزاء</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>تأخير سداد الأجرة</td><td>120 ريال/يوم + 250 ريال رسوم إدارية</td></tr>
            <tr><td>استخدام المركبة في أغراض غير مصرح بها</td><td>5,000 ريال + الفسخ الفوري</td></tr>
            <tr><td>تأخير إرجاع المركبة بعد انتهاء العقد</td><td>200 ريال/يوم</td></tr>
            <tr><td>الامتناع عن تسليم المركبة عند الطلب</td><td>5,000 ريال + مساءلة جنائية</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="المادة (6): فسخ العقد">
        <div className="clause-body">
          <p>يحق للمؤجر فسخ العقد فوراً ودون إشعار إذا:</p>
          <BulletList
            items={[
              'استُخدمت المركبة في أغراض غير مشروعة.',
              'أجر المستأجر المركبة للغير دون إذن خطي.',
              'تأخر المستأجر عن السداد أكثر من ثلاثة أيام.',
              'أفلس المستأجر أو فقد أهليته القانونية.',
              'في حال فسخ المستأجر للعقد دون سبب مشروع، يلتزم بدفع تعويض يعادل قيمة إيجار شهرين.',
            ]}
          />
        </div>
      </Section>

      <Section title="المادة (7): مبلغ التأمين (ضمان الالتزام)">
        <div className="clause-body">
          <p>
            يلتزم الطرف الثاني عند التوقيع على هذا العقد أن يسلم الطرف الأول قيمة {depositText} كتأمين نقدي
            لضمان الوفاء بالتزاماته بموجب هذا العقد.
          </p>
          <p>يغطي مبلغ التأمين كافة الالتزامات المالية المترتبة على المستأجر، بما في ذلك:</p>
          <BulletList
            items={[
              'أي مبالغ مستحقة غير مدفوعة، مثل الأقساط والغرامات والمخالفات.',
              'الشرط الجزائي المنصوص عليه في العقد.',
              'التعويضات عن الأضرار أو الهلاك أو الحجز.',
              'أي مبالغ أخرى مترتبة بموجب هذا العقد.',
              'يحق للمؤجر تحصيل أو حجز مبلغ التأمين مباشرة متى أخل المستأجر بأي من التزاماته، ويعد هذا الشرط إقراراً خطياً من المستأجر بعدم الاعتراض.',
            ]}
          />
        </div>
      </Section>

      <Section title="المادة (8): سلطة السحب">
        <div className="clause-body">
          <p>يحق للمؤجر استرداد المركبة دون إذن قضائي أو إنذار مسبق في الحالات التالية:</p>
          <BulletList
            items={[
              'انتهاء مدة العقد.',
              'فسخ العقد لأي سبب.',
              'تأخر المستأجر عن السداد أكثر من ثلاثة أيام.',
              'للمؤجر دخول أي مكان توجد فيه المركبة لاستردادها، وله الحق في الاستعانة بالشرطة عند الحاجة.',
              'الامتناع عن تسليم المركبة يعد جريمة إخفاء ممتلكات، ويحق للمؤجر المطالبة بتعويض قدره 10,000 ريال قطري.',
            ]}
          />
        </div>
      </Section>

      <Section title="المادة (9): التأمين والمسؤولية">
        <div className="clause-body">
          <BulletList
            items={[
              'يلتزم المؤجر بالتأمين الشامل على المركبة طوال فترة العقد.',
              'يتحمل المستأجر قيمة التحمل المنصوص عليها في وثيقة التأمين.',
              'في حال الهلاك الكلي أو فقد المركبة بسبب إهمال المستأجر، يلتزم بدفع قيمتها السوقية.',
              'يلتزم المؤجر بتجديد استمارة المركبة طوال فترة العقد.',
            ]}
          />
        </div>
      </Section>

      <Section title="المادة (10): استرداد المركبة">
        <div className="clause-body">
          <BulletList
            items={[
              'يتم فحص المركبة عند الإرجاع بحضور الطرفين.',
              'يحق للمؤجر خصم قيمة الإصلاحات من مبلغ التأمين عند وجود أضرار تتجاوز الاستهلاك الطبيعي.',
            ]}
          />
        </div>
      </Section>

      <Section title="المادة (11): التعويضات والشرط الجزائي">
        <div className="clause-body">
          <p>يلتزم المستأجر بتعويض المؤجر عن أي أضرار مباشرة أو غير مباشرة تلحق بالمركبة أو بالمؤجر نتيجة استعماله غير السليم أو إهماله.</p>
          <p>في حال فقدان المركبة أو هلاكها الكلي بسبب المستأجر، يلتزم بدفع قيمتها السوقية بتاريخ الواقعة مضافاً إليها كافة المصاريف والتكاليف التي تكبدها المؤجر.</p>
          <p>إذا تم حجز المركبة من قبل السلطات بسبب مخالفات تعود للمستأجر، فإنه يلتزم بدفع غرامة يومية مقدارها 100 ريال قطري عن كل يوم حجز، وجميع تكاليف ورسوم الإفراج.</p>
          <p>
            الشرط الجزائي: اتفق الطرفان صراحة على أنه في حال إخلال المستأجر بأي من التزاماته التعاقدية أو امتناعه
            عن إعادة المركبة في الموعد المحدد، أو تأخره عن السداد، أو استخدامه المركبة في أغراض غير مصرح بها،
            يلتزم بدفع مبلغ جزائي 10,000 ريال قطري، وذلك دون حاجة لإثبات الضرر، تطبيقاً لأحكام المادة 265 من
            القانون المدني القطري.
          </p>
          <p>
            يقر المستأجر بأن قيمة الشرط الجزائي محددة باعتبار أن الأضرار التي قد تلحق بالمؤجر يصعب تقديرها بدقة،
            وأن هذا التقدير يمثل تعويضاً عادلاً ومسبقاً.
          </p>
          <p>
            لا يخل الاتفاق على الشرط الجزائي بحق المؤجر في المطالبة بتعويضات إضافية إذا تجاوز الضرر الفعلي قيمة
            الشرط الجزائي، وذلك وفقاً لنص المادة 267 من القانون المدني القطري.
          </p>
        </div>
      </Section>

      <Section title="المادة (12): التنفيذ المباشر والتنازل عن الحقوق">
        <div className="clause-body">
          <p>يجوز للمؤجر تنفيذ حقوقه فوراً دون حاجة إلى إنذار أو حكم قضائي، ويلتزم المستأجر بالتعاون الفوري، وإلا عُد ممتنعاً عن تنفيذ التزام قانوني.</p>
          <p>يتنازل الطرف الثاني عن الاعتراض على أي إجراء يتخذه المؤجر لتنفيذ هذا العقد، وعن الطعن في تقدير التعويضات التي تحددها الشركة، وعن المطالبة بأي تعويضات غير مباشرة أو معنوية.</p>
          <p>يلتزم المستأجر بدفع جميع المصاريف القضائية وأتعاب المحاماة الخاصة بالمؤجر في حال حدوث أي نزاع قضائي، أياً كانت نتيجته.</p>
        </div>
      </Section>

      <Section title="المادة (13): خيار الشراء">
        <div className="clause-body">
          <p>
            بموجب هذا العقد إذا رغب الطرف الثاني في شراء المركبة بنهاية مدة العقد يجب أن يخطر الطرف الأول كتابياً
            برغبته بشراء المركبة المبين بيانها أعلاه محل العقد، ويحق للطرف الثاني الانتفاع بهذا العرض فقط مع نهاية العقد.
          </p>
        </div>
      </Section>

      <Section title="المادة (14): الإخلال من قبل الطرف الثاني">
        <div className="clause-body">
          <p>إن أي من الأفعال التالية تشكل حدث إخلال من قبل الطرف الثاني:</p>
          <BulletList
            items={[
              'الإخفاق في سداد أي من الدفعات الإيجارية أو أي مبلغ مستحق بموجب هذا العقد في مواعيد استحقاقها.',
              'خرق الطرف الثاني لأي من التزاماته الأخرى غير المالية المفروضة بموجب هذا العقد.',
              'إفلاس أو إعسار الطرف الثاني.',
              'هجر أو ترك المركبة.',
              'مغادرة أو ترحيل الطرف الثاني من البلاد بصورة نهائية.',
              'عدم التزام المستأجر بدفع كل مخالفة مرورية مرتكبة أثناء حيازته السيارة خلال 30 يوماً من تاريخ ارتكابها.',
            ]}
          />
        </div>
      </Section>

      <Section title="المادة (15): عواقب الإخلال">
        <div className="clause-body">
          <p>في حال وقوع حدث الإخلال من قبل الطرف الثاني يحق للطرف الأول دون حاجة إلى إعذار أو إنذار أو حكم محكمة:</p>
          <BulletList
            items={[
              'إنهاء العقد وسحب السيارة بواسطة أحد موظفي الشركة فوراً، مع التزام الطرف الثاني بدفع القيمة الإيجارية المستحقة وتعويض الطرف الأول مقابل إنهاء العقد بغرامة 5,000 ريال قطري، ولا يحق للطرف الثاني المطالبة بأي مبالغ مدفوعة قبل إنهاء العقد.',
              'سحب السيارة بواسطة موظفي الشركة عن طريق نسخة المفتاح الموجودة لدى الشركة، ويلتزم الطرف الثاني بتسليم نسخته للطرف الأول أو تحمل قيمتها.',
              'يقر الطرف الثاني بعدم مسؤولية الشركة عن أي أغراض أو مبالغ داخل السيارة عند سحبها، ويتنازل عن أي مطالبات قانونية تتعلق بالأغراض الشخصية المتبقية في السيارة في حالة استردادها نتيجة لعدم الدفع أو خرق العقد.',
              'سداد جميع الأقساط الإيجارية المستحقة حتى تاريخ الإنهاء.',
              'سداد جميع الغرامات والمخالفات المترتبة.',
              'تعويض الطرف الأول عن الفترة المتبقية من العقد بمبلغ يعادل قيمة قسطين إيجاريين شهريين.',
            ]}
          />
        </div>
      </Section>

      <Section title="المادة (16): الإنهاء المبكر">
        <div className="clause-body">
          <p>
            لا يجوز للطرف الثاني سداد قيمة العقد وإنهاؤه قبل تاريخ الانتهاء إلا وفق جدول السداد وبعد إخطار الطرف الأول
            قبلها بشهر لأخذ الموافقة.
          </p>
          <p>إذا رغب الطرف الثاني في إنهاء هذا العقد قبل انقضاء مدته، يجب عليه:</p>
          <BulletList
            items={[
              'إخطار الطرف الأول كتابياً قبل ثلاثين (30) يوماً على الأقل.',
              'تسليم المركبة للطرف الأول بحالة جيدة.',
              'سداد جميع المستحقات المالية من أقساط وغرامات ومخالفات.',
              'دفع تعويض جزائي مقطوع للطرف الأول قدره 3,000 ريال قطري، بما يعادل قسطين إيجاريين شهريين.',
              'يُخصم من مبلغ التأمين أي مستحقات أخرى أو تكاليف إصلاح أضرار بالمركبة، ويُسترد الباقي للطرف الثاني.',
              'لا يحق للطرف الثاني إنهاء العقد من جانب واحد دون موافقة الطرف الأول، وإلا اعتبر ذلك إخلالاً جوهرياً.',
            ]}
          />
        </div>
      </Section>

      <Section title="المادة (17): التنفيذ المباشر والاستخدام الشخصي">
        <div className="clause-body">
          <p>
            اتفق الطرفان صراحة على أن هذا العقد، متى تم توثيقه لدى كاتب العدل بوزارة العدل في دولة قطر، يعد سنداً
            تنفيذياً بالمعنى الوارد في قانون المرافعات المدنية والتجارية، ويحق للطرف الأول في حالة إخلال الطرف الثاني
            بأي من التزاماته أن يباشر التنفيذ المباشر لدى إدارة التنفيذ بالمحاكم القطرية دون حاجة لرفع دعوى موضوعية.
          </p>
          <p>يتعهد الطرف الثاني بأنه سيقود المركبة بنفسه ولمنفعته الشخصية فقط، ولن يسمح لأي شخص آخر بقيادتها أو استعمالها طوال مدة العقد إلا بموافقة خطية مسبقة من الطرف الأول.</p>
          <p>يُحظر تماماً على الطرف الثاني:</p>
          <BulletList
            items={[
              'تأجير المركبة من الباطن.',
              'استخدامها لأغراض تجارية مثل التاكسي أو التوصيل.',
              'نقلها خارج حدود دولة قطر دون موافقة خطية مسبقة.',
              'رهنها أو التصرف فيها بأي شكل.',
              'في حالة مخالفة أي من البنود أعلاه، يحق للطرف الأول إنهاء العقد فوراً دون إنذار أو تعويض، واسترداد المركبة، واتخاذ الإجراءات الجنائية اللازمة.',
            ]}
          />
        </div>
      </Section>

      <Section title="المادة (18): أحكام عامة">
        <div className="clause-body">
          <p>القانون الحاكم والاختصاص القضائي: يخضع هذا العقد من جميع النواحي للقوانين المطبقة في دولة قطر، ويوافق الطرفان على الاختصاص القضائي أمام محاكم دولة قطر.</p>
          <p>يجوز أن تكون جميع الاتصالات أو الإشعارات أو المراسلات المقدمة بموجب هذا العقد عبر الواتساب أو البريد الإلكتروني أو الرسائل النصية.</p>
          <p>التنازل: لا يجوز التنازل عن هذا العقد أو الحقوق الممنوحة بموجبه أو بيعها أو تأجيرها أو نقلها كلياً أو جزئياً بواسطة الطرف الثاني دون موافقة خطية مسبقة من الطرف الأول.</p>
          <p>القابلية للفصل: إذا تم اعتبار أي حكم أو بند من هذا العقد غير قابل للتنفيذ، فإن ذلك لا يؤثر على صلاحية أو قابلية تنفيذ البنود والأحكام المتبقية.</p>
          <p>الاتفاق بمجمله: يشكل هذا العقد الاتفاق الكامل بين الطرفين ويحل محل أي تفاهمات سابقة أو معاصرة، سواء كانت مكتوبة أو شفهية.</p>
          <p>يتحمل الطرف الثاني كافة المخالفات المرورية التي تقع خلال مدة الإيجار ويجب تسويتها خلال 30 يوماً كحد أقصى من تاريخ وقوع المخالفة، وبالعدم يحق للطرف الأول إنهاء العقد وتحميله قيمة المخالفات.</p>
          <p>يلتزم الطرف الثاني بجميع أعمال الصيانة الدورية وغير الدورية والإصلاح وإجراء الفحص الفني للمركبة المؤجرة في مواعيدها وضمان اجتيازها للفحص الفني طوال مدة هذا العقد.</p>
          <p>يقر الطرف الثاني بأنه وحده المسؤول عن هلاك المركبة سواء كان هلاكاً كلياً أو جزئياً الناتج عن إهماله أو تقصيره ولو كان بسبب الغير، ويتعهد بدفع تكلفة هذا الهلاك.</p>
          <p>لا يجوز تعديل أي بند إلا بموافقة خطية من الطرفين، وفي حال وجود تعارض بين البنود يُفسر العقد بما يحقق مصلحة المؤجر.</p>
        </div>
      </Section>

      <Section title="المادة (19): الإجراءات القانونية">
        <div className="clause-body">
          <p>في حالة الإخلال، يحق للطرف الأول اتخاذ جميع الإجراءات القانونية اللازمة، بما في ذلك:</p>
          <p><strong>أ) الإجراءات الجنائية:</strong></p>
          <BulletList
            items={[
              'تقديم بلاغ جنائي ضد الطرف الثاني لدى الجهات المختصة بتهمة خيانة الأمانة بموجب المادة 362 من قانون العقوبات القطري.',
              'طلب منع الطرف الثاني من السفر حتى استرداد المركبة وتسوية جميع المستحقات.',
              'طلب الحجز الاحتياطي على الطرف الثاني إذا لزم الأمر.',
              'المطالبة بتطبيق العقوبة الجنائية من حبس وغرامة.',
            ]}
          />
          <p><strong>ب) الإجراءات المدنية:</strong></p>
          <BulletList
            items={[
              'رفع دعوى مدنية للمطالبة بالتعويضات المالية.',
              'طلب الحجز التحفظي على أموال الطرف الثاني.',
            ]}
          />
        </div>
      </Section>

      <Section title="المادة (20): إقرار نهائي">
        <div className="clause-body">
          <p>أقر أنا الطرف الثاني (المستأجر) بما يلي:</p>
          <BulletList
            items={[
              'قرأت هذا العقد بالكامل وفهمت جميع بنوده وشروطه فهماً تاماً.',
              'أدرك تماماً أن المركبة المؤجرة هي أمانة في يدي بموجب المادة 362 من قانون العقوبات القطري.',
              'أعلم يقيناً أن أي اختلاس أو تبديد أو امتناع عن إرجاع المركبة يشكل جريمة جنائية يعاقب عليها بالحبس والغرامة.',
              'أوافق على حق الطرف الأول في اتخاذ الإجراءات الجنائية ضدي في حالة إخلالي بأي من التزاماتي.',
              'وقعت على هذا العقد بكامل إرادتي وحريتي ورضاي، دون أي إكراه أو ضغط أو تضليل.',
              'أقر وأوافق صراحة على حق الطرف الأول في اتخاذ الإجراءات الجنائية المذكورة أعلاه، وأتنازل عن أي اعتراض على ذلك.',
            ]}
          />
          <p>واشهاداً لذلك، تم توقيع هذا العقد من قبل الأطراف من نسختين متطابقتين لكل طرف نسخة للعمل بموجبها.</p>
        </div>
      </Section>

      <Section title="ملحق (أ): جدول الدفعات الشهرية المستحقة">
        <table className="official-table">
          <thead>
            <tr>
              <th>م</th>
              <th>تاريخ الاستحقاق</th>
              <th>قيمة القسط</th>
              <th>حالة السداد</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {paymentSchedules.length > 0 ? (
              paymentSchedules.map((schedule, index) => (
                <tr key={schedule.id || `${schedule.due_date}-${index}`}>
                  <td>{schedule.installment_number || index + 1}</td>
                  <td>{formatDate(schedule.due_date)}</td>
                  <td>{formatCurrency(schedule.amount)}</td>
                  <td>{formatPaymentStatus(schedule.status)}</td>
                  <td>{valueOrDash(schedule.notes || schedule.description)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>لم يتم إنشاء جدول دفعات لهذا العقد حتى تاريخ إصدار النسخة الرسمية.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="appendix-note-title">ملاحظات:</div>
        <BulletList
          items={[
            'يُدفع كل قسط في تاريخ استحقاقه المحدد أعلاه أو قبله؛',
            'التأخر عن الدفع يترتب عليه غرامات وفقاً للمادة (4) من العقد الأساسي؛',
          ]}
        />
      </Section>

      <Section title="ملحق (1): تقرير الفحص الفني للمركبة والصور المرفقة">
        <div className="appendix-note-title">معلومات المركبة:</div>
        <table className="official-table">
          <tbody>
            <DetailRow label="رقم اللوحة" value={vehicle.plate_number || vehicle.license_plate || '_____________________________'} />
            <DetailRow label="النوع والموديل" value={vehicleName !== '-' ? vehicleName : '_____________________________'} />
            <DetailRow label="رقم الهيكل (VIN)" value={vehicle.vin || vehicle.vin_number || '_____________________________'} />
            <DetailRow label="تاريخ الفحص" value="____/____/________" />
            <DetailRow label="الفاحص" value="_____________________________" />
          </tbody>
        </table>

        <div className="appendix-note-title">نتائج الفحص الفني:</div>
        <table className="official-table">
          <thead>
            <tr>
              <th>م</th>
              <th>العنصر المفحوص</th>
              <th>الحالة</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {inspectionItems.map((row, index) => (
              <tr key={row.item}>
                <td>{index + 1}</td>
                <td>{row.item}</td>
                <td>{row.status}</td>
                <td>{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="appendix-note-title">الصور المرفقة:</div>
        {inspectionPhotos.length > 0 ? (
          <div className="attachment-photo-grid">
            {inspectionPhotos.map((url, index) => (
              <div className="attachment-photo" key={`${url}-${index}`}>
                <img src={url} alt={`صورة فحص المركبة ${index + 1}`} />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-attachment-box">لا توجد صور فحص مرفقة على هذا العقد.</div>
        )}
      </Section>

      <Section title="التوقيعات واعتماد العقد">
        <p className="intro">
          أقر الطرفان بأنهما قرآ هذا العقد وفهما مضمونه والتزاماته، ووافقا عليه بكامل الإرادة والأهلية القانونية،
          ووقعا عليه للعمل بموجبه.
        </p>

        <div className="signature-grid">
          <div className="signature-card">
            <strong>الطرف الأول</strong>
            <div>{COMPANY.legalNameAr}</div>
            <div className="signature-line">التوقيع</div>
            <div className="signature-assets">
              <img className="stamp-image" src="/receipts/stamp.png" alt="ختم الشركة" />
              <img className="signature-image" src="/receipts/signature.png" alt="التوقيع" />
            </div>
            <div className="signatory-meta">
              <div>{COMPANY.signatory}</div>
              <small>{COMPANY.signatoryTitle}</small>
            </div>
          </div>
          <div className="signature-card">
            <strong>الطرف الثاني</strong>
            <div>{customerName}</div>
            <div className="signature-line">التوقيع</div>
            <div>التاريخ: {formatDate(issueDate)}</div>
          </div>
        </div>
      </Section>

      <div className="footer">
        {COMPANY.address}<br />
        هاتف: {COMPANY.phone} | البريد الإلكتروني: {COMPANY.email}
      </div>
    </article>
  );
};

export default OfficialContractLetterDocument;
