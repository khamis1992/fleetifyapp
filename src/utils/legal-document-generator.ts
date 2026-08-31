/**
 * Legal Document Generator
 * Generates legal complaint documents (مذكرة شارحة) for delinquent customers
 */

import { format } from 'date-fns';
import type { DelinquentCustomer } from '@/hooks/useDelinquentCustomers';
import { buildLegalMemoRequestSections } from './legal-memo-requests';

export interface LegalDocumentData {
  /** رقم الدعوى بعد القيد؛ يبقى فارغاً في مرحلة التجهيز */
  caseNumber?: string;
  filingDate?: string;
  /** مرجع ثابت محفوظ مع لقطة المذكرة؛ لا يُولد عشوائياً */
  documentReference?: string;
  customer: Pick<
    DelinquentCustomer,
    | 'customer_name'
    | 'customer_code'
    | 'id_number'
    | 'phone'
    | 'email'
    | 'days_overdue'
    | 'late_penalty'
    | 'overdue_amount'
    | 'violations_amount'
    | 'violations_count'
    | 'total_debt'
  > & {
    /** جنسية المدعى عليه كما هي مثبتة في النظام */
    nationality?: string | null;
    /** العنوان المتوفر في النظام أو العقد */
    address?: string | null;
  };
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
    vin?: string | null;
    color?: string | null;
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
    rent_due_day?: number;
  };
  contractClauses?: {
    payment?: string | null;
    return?: string | null;
    violations?: string | null;
  };
  /** أضرار ومصاريف ثابتة بفواتير وتقارير فقط — لا يوجد أي افتراض حسابي */
  damages?: number;
  additionalNotes?: string;
  breachDetails?: {
    unpaidMonthsDescription?: string;
    damagesDescription?: string;
  };
  /** فترة الفواتير المتأخرة الداخلة في المطالبة */
  unpaidPeriodFrom?: string;
  unpaidPeriodTo?: string;
  /** إجمالي قيمة الفواتير قبل الخصم */
  grossInvoicesTotal?: number;
  /** مجموع ما سدده المدعى عليه من تلك الفواتير */
  paidTotal?: number;
  /** سجل مطالبات السداد (الإشعارات) — لا يُذكر إلا ما هو مثبت بالنظام */
  reminders?: {
    count: number;
    lastSentDate: string | null;
    sendMethods: string[];
  };
  /** حالة حيازة المركبة وفق حالة المركبة المسجلة بالنظام */
  vehicleCustody?: VehicleCustody;
  /** تاريخ الاسترداد الفعلي للمركبة (موثق) */
  vehicleReturnedAt?: string | null;
  returnDocumented?: boolean;
  handoverInfo?: { date: string; documented: boolean };
  /**
   * مسار الإنهاء: موثق بإعمال شرط فاسخ أم فسخ قضائي.
   * يُرجع تلقائياً إلى الفسخ القضائي إذا نقص أي ركن من أدلة الإنهاء الموثق.
   */
  terminationPath?: 'natural_expiry' | 'documented' | 'judicial';
  terminationInfo?: {
    type: string;
    date: string;
    status: 'confirmed' | 'requires_judicial_proof';
  };
  terminationClause?: { number: string; text: string };
  noticeException?: {
    type: 'due_date_agreement' | 'written_refusal' | 'impossible_or_useless_performance';
    reason: string;
  };
  /** الإنذارات الكتابية الموثقة الوصول (legal_case_formal_notices) */
  formalNotices?: {
    noticeType: string;
    sentOn: string;
    deliveredOn: string | null;
    confirmed: boolean;
    proofDocumentId?: string | null;
    graceDays: number | null;
    methodLabel: string;
  }[];
  /** وديعة الضمان وقرار تطبيقها في التسوية */
  securityDeposit?: { amount: number; applyToSettlement: boolean };
  /** أجر المثل اليومي الموثق ومصدره (اختياري؛ غيابه يعني التقدير بالخبرة) */
  retentionRate?: { daily: number; sourceLabel: string; sourceRef: string };
  retentionClaim?: { days: number; amount: number; from: string | null; to: string | null };
  contractualCompensation?: {
    amount: number;
    clauseNumber: string;
    clauseText: string;
    method?: 'fixed' | 'daily' | 'monthly' | 'per_invoice';
    rate?: number;
    units?: number;
  };
  /** بنود مصاريف الأضرار المتحقق منها (تُفصَّل في الجدول) */
  damageCostItems?: { type: string; description: string; amount: number }[];
}

export type VehicleCustody =
  | 'with_defendant'
  | 'returned'
  | 'recovered_by_company'
  | 'authority_impounded'
  | 'lost'
  | 'unknown';

const REMINDER_METHOD_LABELS: Record<string, string> = {
  whatsapp: 'واتساب',
  sms: 'الرسائل النصية',
  email: 'البريد الإلكتروني',
};

function formatQar(value: number): string {
  return value.toLocaleString('en-US');
}

function damageCostLabel(type: string): string {
  switch (type) {
    case 'monetary_delay_damage':
      return 'ضرر التأخر في سداد الدين النقدي';
    case 'financing_burden_damage':
      return 'أعباء تمويلية وأقساط ترتبت بسبب التأخر في السداد';
    case 'operational_loss':
      return 'فوات الانتفاع وصافي الكسب خلال مدة الإصلاح بعد الاسترداد';
    default:
      return 'مصاريف وأضرار ثابتة';
  }
}

function toEnglishDigits(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';

  return String(value)
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderLegalRequestHtml(value: string): string {
  return escapeHtml(value)
    .replace(/^([^:]{2,12}:)/, '<strong>$1</strong>')
    .replace(/\(([^()]*)\)/g, '<strong>($1)</strong>')
    .replace(/<strong>\(268\)<\/strong>/g, '(268)')
    .replace(
      /(قيمة صافي الأجرة المستحقة حتى )(\d{2}\/\d{2}\/\d{4})/,
      '$1<strong>$2</strong>',
    );
}

function sanitizeLegalDocumentData(data: LegalDocumentData): LegalDocumentData {
  const text = (value: string | null | undefined) => value == null ? value : escapeHtml(value);
  return {
    ...data,
    caseNumber: text(data.caseNumber) || undefined,
    filingDate: text(data.filingDate) || undefined,
    documentReference: text(data.documentReference) || undefined,
    customer: {
      ...data.customer,
      customer_name: escapeHtml(data.customer.customer_name),
      customer_code: escapeHtml(data.customer.customer_code),
      id_number: escapeHtml(data.customer.id_number),
      phone: escapeHtml(data.customer.phone),
      email: escapeHtml(data.customer.email),
      nationality: text(data.customer.nationality),
      address: text(data.customer.address),
    },
    companyInfo: {
      ...data.companyInfo,
      name_ar: escapeHtml(data.companyInfo.name_ar),
      name_en: escapeHtml(data.companyInfo.name_en),
      address: escapeHtml(data.companyInfo.address),
      cr_number: escapeHtml(data.companyInfo.cr_number),
    },
    vehicleInfo: {
      ...data.vehicleInfo,
      plate: escapeHtml(data.vehicleInfo.plate),
      make: text(data.vehicleInfo.make) ?? undefined,
      model: text(data.vehicleInfo.model) ?? undefined,
      vin: text(data.vehicleInfo.vin),
      color: text(data.vehicleInfo.color),
    },
    contractInfo: {
      ...data.contractInfo,
      contract_number: escapeHtml(data.contractInfo.contract_number),
      start_date: escapeHtml(data.contractInfo.start_date),
      end_date: text(data.contractInfo.end_date) || undefined,
    },
    contractClauses: data.contractClauses ? {
      payment: text(data.contractClauses.payment),
      return: text(data.contractClauses.return),
      violations: text(data.contractClauses.violations),
    } : undefined,
    additionalNotes: text(data.additionalNotes) || undefined,
    breachDetails: data.breachDetails ? {
      unpaidMonthsDescription: text(data.breachDetails.unpaidMonthsDescription) || undefined,
      damagesDescription: text(data.breachDetails.damagesDescription) || undefined,
    } : undefined,
    terminationClause: data.terminationClause ? {
      number: escapeHtml(data.terminationClause.number),
      text: escapeHtml(data.terminationClause.text),
    } : undefined,
    noticeException: data.noticeException ? {
      ...data.noticeException,
      reason: escapeHtml(data.noticeException.reason),
    } : undefined,
    formalNotices: data.formalNotices?.map((notice) => ({
      ...notice,
      sentOn: escapeHtml(notice.sentOn),
      deliveredOn: text(notice.deliveredOn) ?? null,
      methodLabel: escapeHtml(notice.methodLabel),
    })),
    retentionRate: data.retentionRate ? {
      ...data.retentionRate,
      sourceLabel: escapeHtml(data.retentionRate.sourceLabel),
      sourceRef: escapeHtml(data.retentionRate.sourceRef),
    } : undefined,
    contractualCompensation: data.contractualCompensation ? {
      ...data.contractualCompensation,
      clauseNumber: escapeHtml(data.contractualCompensation.clauseNumber),
      clauseText: escapeHtml(data.contractualCompensation.clauseText),
    } : undefined,
    damageCostItems: data.damageCostItems?.map((item) => ({
      ...item,
      type: escapeHtml(item.type),
      description: escapeHtml(item.description),
    })),
  };
}

/**
 * Generate legal complaint document (مذكرة شارحة)
 */
export function generateLegalComplaint(data: LegalDocumentData): string {
  // توافق خلفي فقط: المصدر القانوني الوحيد هو قالب HTML أدناه. بهذه الإحالة
  // لا تستطيع أي شاشة قديمة إنتاج أساس قانوني أو أرقام تختلف عن المذكرة.
  return generateLegalComplaintHTML(data)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/tr>|<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Generate HTML version of the legal complaint for printing
 * Professional formal legal document style - matching claims statement design
 * Updated to match new legal memo template structure
 */
export function generateLegalComplaintHTML(data: LegalDocumentData): string {
  const memoRequests = buildLegalMemoRequestSections(data);
  data = sanitizeLegalDocumentData(data);
  const { customer, companyInfo, vehicleInfo, contractInfo, damages = 0, additionalNotes, breachDetails } = data;

  const filingDateValue = data.filingDate ? new Date(data.filingDate) : null;
  const memoDate = filingDateValue && !Number.isNaN(filingDateValue.getTime())
    ? filingDateValue
    : new Date();
  const today = format(memoDate, 'dd/MM/yyyy');
  const currentDate = today;

  const refNumber = data.documentReference || `DRAFT-${contractInfo.contract_number}`;

  // المكونات الموثقة فقط — لا توجد مبالغ ثابتة أو نسب افتراضية
  // لا يُعرض التعويض الاتفاقي ولا يدخل الإجمالي إلا إذا مرّ معه نص البند الموثق.
  const latePenalty = data.contractualCompensation
    ? Math.max(0, Number(data.contractualCompensation.amount) || 0)
    : 0;
  const overdueRent = customer.overdue_amount || 0;
  const violationsAmount = customer.violations_amount || 0;
  const documentedDamages = damages || 0;

  const paidTotal = data.paidTotal ?? 0;
  const grossInvoicesTotal = data.grossInvoicesTotal ?? 0;
  const hasDeductions = paidTotal > 0 && grossInvoicesTotal > 0;
  const retentionAmount = data.retentionClaim?.amount || 0;
  const totalClaim = overdueRent + latePenalty + violationsAmount + documentedDamages + retentionAmount;
  const monetaryDelayDamage = (data.damageCostItems || [])
    .filter((item) => item.type === 'monetary_delay_damage')
    .reduce((sum, item) => sum + item.amount, 0);
  const financingBurdenDamage = (data.damageCostItems || [])
    .filter((item) => item.type === 'financing_burden_damage')
    .reduce((sum, item) => sum + item.amount, 0);
  const operationalLoss = (data.damageCostItems || [])
    .filter((item) => item.type === 'operational_loss')
    .reduce((sum, item) => sum + item.amount, 0);
  const paymentDelayDamage = monetaryDelayDamage + financingBurdenDamage;
  const materialDamage = Math.max(
    0,
    documentedDamages - paymentDelayDamage - operationalLoss,
  );
  const contractualCompensationFormula = data.contractualCompensation?.method === 'fixed'
    && Number(data.contractualCompensation.rate) > 0
    ? `مبلغ ثابت قدره ${formatQar(Number(data.contractualCompensation.rate))} ريال قطري`
    : data.contractualCompensation?.method === 'monthly'
    && Number(data.contractualCompensation.rate) > 0
    && Number(data.contractualCompensation.units) > 0
    ? `${formatQar(Number(data.contractualCompensation.rate))} ريال × ${Number(data.contractualCompensation.units)} شهر استحقاق غير مسدد`
    : `وفق البند رقم (${data.contractualCompensation?.clauseNumber}) من العقد`;
  const contractualCompensationClauseText = data.contractualCompensation?.clauseText?.trim() || '';

  // وديعة الضمان: تُخصم فقط بقرار صريح، وبحد أقصى قيمة المطالبة
  const depositAmount = data.securityDeposit?.amount || 0;
  const depositApplied = data.securityDeposit?.applyToSettlement && depositAmount > 0
    ? Math.min(depositAmount, totalClaim)
    : 0;
  const netClaim = totalClaim - depositApplied;

  // مسار الإنهاء: الموثق لا يُعتمد إلا باكتمال أدلته؛ وإلا فسخ قضائي (آمن افتراضياً)
  const terminationNoticeDelivered = (data.formalNotices || []).some(
    (notice) => notice.noticeType === 'termination_notice'
      && notice.confirmed
      && Boolean(notice.deliveredOn)
      && Boolean(notice.proofDocumentId)
  );
  const naturalExpiryComplete = data.terminationPath === 'natural_expiry'
    && data.terminationInfo?.type === 'contract_expired'
    && data.terminationInfo.status === 'confirmed'
    && Boolean(data.terminationInfo.date);
  const documentedTerminationComplete = data.terminationPath === 'documented'
    && data.terminationInfo?.status === 'confirmed'
    && Boolean(data.terminationInfo.date)
    && Boolean(data.terminationClause)
    && terminationNoticeDelivered;
  const effectiveTerminationPath: 'natural_expiry' | 'documented' | 'judicial' = naturalExpiryComplete
    ? 'natural_expiry'
    : documentedTerminationComplete
      ? 'documented'
      : 'judicial';

  // الإنذارات الكتابية المؤكدة الوصول (دليل الإعذار المستندي)
  const deliveredNotices = (data.formalNotices || []).filter(
    (notice) => notice.confirmed && Boolean(notice.deliveredOn) && Boolean(notice.proofDocumentId)
  );

  const custody: VehicleCustody = data.vehicleCustody ?? 'unknown';
  const contractStartDate = toEnglishDigits(contractInfo.start_date);
  const contractEndDate = toEnglishDigits(contractInfo.end_date);

  const unpaidPeriodLabel = data.unpaidPeriodFrom && data.unpaidPeriodTo
    ? `من ${toEnglishDigits(data.unpaidPeriodFrom)} إلى ${toEnglishDigits(data.unpaidPeriodTo)}`
    : 'وفق كشف الحساب';
  const reminderMethods = (data.reminders?.sendMethods || [])
    .map((method) => REMINDER_METHOD_LABELS[method])
    .filter((label): label is string => Boolean(label))
    .filter((method, index, all) => all.indexOf(method) === index);
  const reminderCount = data.reminders?.count || 0;
  const reminderLastDate = data.reminders?.lastSentDate
    ? toEnglishDigits(format(new Date(data.reminders.lastSentDate), 'dd/MM/yyyy'))
    : null;

  // Company info constants
  const COMPANY_INFO = {
    name_ar: companyInfo.name_ar || 'شركة العراف لتأجير السيارات',
    name_en: companyInfo.name_en || 'AL-ARAF CAR RENTAL L.L.C',
    logo: '/receipts/logo.png',
    address: companyInfo.address || 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
    phone: '31411919',
    email: 'khamis-1992@hotmail.com',
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
  <link rel="icon" href="/uploads/7453c280-3175-4ccf-a73b-24921ec5990b.png" type="image/png" />
  <link rel="shortcut icon" href="/uploads/7453c280-3175-4ccf-a73b-24921ec5990b.png" type="image/png" />
  <link rel="apple-touch-icon" href="/uploads/7453c280-3175-4ccf-a73b-24921ec5990b.png" />
  <style>
    @page {
      size: A4;
      margin: 15mm 20mm 25mm 20mm;

      @bottom-center {
        content: "${COMPANY_INFO.address}\\A هاتف: ${COMPANY_INFO.phone} | البريد: ${COMPANY_INFO.email}";
        white-space: pre;
        width: 100%;
        padding-top: 3mm;
        border-top: 1px solid #ccc;
        font-family: 'Times New Roman', serif;
        font-size: 9px;
        line-height: 1.5;
        color: #000;
        text-align: center;
      }
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

      .footer {
        display: none !important;
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
      display: grid;
      grid-template-columns: minmax(105px, 125px) minmax(0, 1fr);
      column-gap: 12px;
      align-items: start;
      margin-bottom: 4px;
      line-height: 1.4;
    }

    .info-row > span:last-child {
      min-width: 0;
      text-align: right;
      overflow-wrap: anywhere;
    }
    
    .info-label {
      font-weight: bold;
      color: #555;
      min-width: 0;
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
    .request-item {
      margin-bottom: 10px;
      padding-right: 0;
      position: relative;
    }
    .request-item::before {
      display: none;
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
      <strong>مذكرة شارحة مقدمة إلى محكمة الاستثمار والتجارة الموقرة</strong><br>
      <span style="font-size: 12px;">الدائرة الابتدائية المختصة بعقود إيجار السيارات وخدمات الليموزين</span><br>
      <span style="font-size: 11px;">${effectiveTerminationPath === 'natural_expiry'
        ? 'طلب ثبوت انتهاء عقد إيجار مركبة'
        : effectiveTerminationPath === 'documented'
          ? 'طلب ثبوت انفساخ عقد إيجار مركبة'
          : 'طلب فسخ عقد إيجار مركبة'}</span>
    </div>

    <!-- معلومات الأطراف -->
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">المدعية:</span>
        <span>${COMPANY_INFO.name_ar} – ذ.م.م</span>
      </div>
      <div class="info-row">
        <span class="info-label">السجل التجاري:</span>
        <span>${COMPANY_INFO.cr}</span>
      </div>
      <div class="info-row">
        <span class="info-label">العنوان:</span>
        <span>${COMPANY_INFO.address}</span>
      </div>
      <div class="info-row">
        <span class="info-label">ويمثلها:</span>
        <span>${COMPANY_INFO.authorized_signatory} – ${COMPANY_INFO.authorized_title}</span>
      </div>
      <div class="info-row" style="margin-top: 8px; border-top: 1px solid #ccc; padding-top: 8px;">
        <span class="info-label">المدعى عليه:</span>
        <span>${customer.customer_name}</span>
      </div>
      ${customer.id_number ? `
      <div class="info-row">
        <span class="info-label">الرقم الشخصي:</span>
        <span>${customer.id_number}</span>
      </div>
      ` : ''}
      ${customer.nationality ? `
      <div class="info-row">
        <span class="info-label">الجنسية:</span>
        <span>${customer.nationality}</span>
      </div>
      ` : ''}
      ${customer.phone ? `
      <div class="info-row">
        <span class="info-label">رقم الهاتف:</span>
        <span>${customer.phone}</span>
      </div>
      ` : ''}
      ${customer.address ? `
      <div class="info-row">
        <span class="info-label">العنوان:</span>
        <span>${customer.address}</span>
      </div>
      ` : ''}
      <div class="info-row" style="margin-top: 8px; border-top: 1px solid #ccc; padding-top: 8px;">
        <span class="info-label">رقم عقد الإيجار:</span>
        <span>${contractInfo.contract_number}</span>
      </div>
      <div class="info-row">
        <span class="info-label">تاريخ بداية العقد:</span>
        <span>${contractStartDate}</span>
      </div>
      ${contractEndDate ? `
      <div class="info-row">
        <span class="info-label">تاريخ نهاية مدته الاتفاقية:</span>
        <span>${contractEndDate}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">الأجرة الشهرية:</span>
        <span>${formatQar(contractInfo.monthly_rent)} ريال قطري</span>
      </div>
      <div class="info-row">
        <span class="info-label">المركبة:</span>
        <span>${vehicleInfo.make || ''} ${vehicleInfo.model || ''}${vehicleInfo.year ? ` موديل ${vehicleInfo.year}` : ''}</span>
      </div>
      <div class="info-row">
        <span class="info-label">رقم اللوحة:</span>
        <span>${vehicleInfo.plate}</span>
      </div>
      ${vehicleInfo.vin ? `
      <div class="info-row">
        <span class="info-label">رقم الهيكل (VIN):</span>
        <span dir="ltr">${vehicleInfo.vin}</span>
      </div>
      ` : ''}
      ${vehicleInfo.color ? `
      <div class="info-row">
        <span class="info-label">اللون:</span>
        <span>${vehicleInfo.color}</span>
      </div>
      ` : ''}
    </div>

    <!-- Section: Jurisdiction -->
    <div class="section">
      <div class="section-title">أولاً: الاختصاص القضائي</div>
      <div class="section-content">
        <p>
          تختص محكمة الاستثمار والتجارة بنظر هذه الدعوى عملاً بالمادة (7) من قانون رقم (21) لسنة 2021 بإصدار قانون إنشاء محكمة الاستثمار والتجارة، باعتبار النزاع ناشئاً عن عقد تجاري يتعلق بتأجير مركبة، وينعقد الاختصاص المكاني لمحاكم دولة قطر وفقاً للعقد والقواعد المقررة قانوناً.
        </p>
      </div>
    </div>

    <!-- Section 1: Facts -->
    <div class="section">
      <div class="section-title">ثانياً: الوقائع</div>
      <div class="section-content">
        <p>
          1. أبرمت المدعية مع المدعى عليه عقد إيجار المركبة رقم <strong>(${contractInfo.contract_number})</strong> بتاريخ <strong>${contractStartDate}</strong>${contractEndDate ? `، لمدة تنتهي اتفاقًا بتاريخ <strong>${contractEndDate}</strong>` : ''}، وبأجرة شهرية مقدارها <strong>(${formatQar(contractInfo.monthly_rent)})</strong> ريال قطري، وذلك وفق عقد الإيجار المرفق.
        </p>
        <p>
          ${data.handoverInfo?.documented
            ? `2. تسلم المدعى عليه المركبة المبينة بياناتها أعلاه بموجب محضر التسليم المؤرخ <strong>${toEnglishDigits(data.handoverInfo.date)}</strong> والمرفق بحافظة المستندات، وانتفع بها تنفيذاً للعقد.`
            : '2. تتعلق العلاقة الإيجارية بالمركبة المبينة بياناتها أعلاه وفق عقد الإيجار المرفق، ولا تنسب هذه المذكرة واقعة تسليم فعلي ما لم يؤيدها محضر أو سجل مستقل.'}
        </p>
        <p>
          3. التزم المدعى عليه بموجب العقد بسداد الأجرة في مواعيد استحقاقها${data.contractClauses?.return ? '، ورد المركبة وفق البند المثبت بالعقد' : ''}${data.contractClauses?.violations ? '، وتحمل المخالفات وفق البند المثبت بالعقد' : ''}.
        </p>
        ${breachDetails?.unpaidMonthsDescription ? `
        <p>
          ${breachDetails.unpaidMonthsDescription}
        </p>
        ` : ''}
        <p>
          ${overdueRent > 0 ? '4.' : ''} إلا أن المدعى عليه أخل بالتزامه الأساسي بسداد الأجرة، إذ تخلف عن سداد الفواتير المستحقة${overdueRent > 0 ? ` عن الفترة <strong>${unpaidPeriodLabel}</strong>` : ''}${customer.violations_count > 0 ? `، كما ارتبت على استعماله للمركبة (${customer.violations_count}) مخالفة مرورية بقيمة إجمالية (${formatQar(violationsAmount)}) ريال قطري` : ''}.
        </p>
        ${overdueRent > 0 ? `
        <p>
          5. بلغ إجمالي قيمة الفواتير المستحقة خلال تلك الفترة مبلغ <strong>(${formatQar(hasDeductions ? grossInvoicesTotal : overdueRent + paidTotal)})</strong> ريال قطري${hasDeductions ? `، سدد المدعى عليه منه مبلغ <strong>(${formatQar(paidTotal)})</strong> ريال قطري` : ''}، ليصبح صافي الإيجارات غير المسددة مبلغ <strong>(${formatQar(overdueRent)})</strong> ريال قطري حتى تاريخ إعداد كشف المطالبة، وفق كشف الحساب والفواتير وإيصالات السداد المرفقة.
        </p>
        ${hasDeductions ? `
        <p>
          6. وقد روعي في احتساب المطالبة إثبات جميع المبالغ التي سبق سدادها، وعدم مطالبة المدعى عليه إلا بالرصيد المتبقي فعليًا في ذمته.
        </p>
        ` : ''}
        ` : ''}
        ${reminderCount > 0 ? `
        <p>
          7. أرسلت المدعية إلى المدعى عليه عدد <strong>(${reminderCount})</strong> من رسائل المتابعة بالسداد${reminderMethods.length > 0 ? ` عبر ${reminderMethods.join(' و')}` : ''}${reminderLastDate ? `، وكان آخرها بتاريخ <strong>${reminderLastDate}</strong>` : ''}، وذلك دون وصفها بإنذار رسمي ما لم يثبت وصول إنذار مستقل بالمستندات.
        </p>
        ` : ''}
        ${deliveredNotices.length > 0 ? `
        <p>
          ${deliveredNotices.map((notice, index) => {
            const sentDate = toEnglishDigits(format(new Date(notice.sentOn), 'dd/MM/yyyy'));
            const deliveredDate = notice.deliveredOn ? toEnglishDigits(format(new Date(notice.deliveredOn), 'dd/MM/yyyy')) : null;
            const graceText = notice.graceDays ? ` ومنحته مهلة (${notice.graceDays}) يومًا` : '';
            const typeLabel = notice.noticeType === 'termination_notice'
              ? 'إنذارًا كتابيًا بإنهاء العقد ورد المركبة'
              : notice.noticeType === 'vehicle_return_demand'
                ? 'إنذارًا كتابيًا بطلب رد المركبة'
                : 'مطالبة كتابية بالسداد';
            return `${index === 0 ? 'كما' : 'و'}وجهت المدعية إليه ${typeLabel} بتاريخ <strong>${sentDate}</strong> عبر ${notice.methodLabel}${deliveredDate ? `، وثبت وصوله إليه بتاريخ <strong>${deliveredDate}</strong>` : ''}${graceText}، إلا أنه لم ينفذ ما طُلب منه`;
          }).join('، ')}.
        </p>
        ` : ''}
        ${effectiveTerminationPath === 'natural_expiry' && data.terminationInfo ? `
        <p>
          ولما كانت مدة العقد المحددة قد انقضت بتاريخ <strong>${toEnglishDigits(data.terminationInfo.date)}</strong> دون ثبوت تجديدها أو امتدادها، فقد انتهت العلاقة الإيجارية بانقضاء مدتها.
        </p>
        ` : effectiveTerminationPath === 'documented' && data.terminationInfo ? `
        <p>
          ولما انقضت مهلة الإنذار دون سداد أو تسليم، أعملت المدعية الشرط الفاسخ الصريح الوارد في البند رقم <strong>(${data.terminationClause?.number})</strong> من العقد، فانفسخ العقد اعتباراً من تاريخ <strong>${toEnglishDigits(data.terminationInfo.date)}</strong> وفق مستند الإنهاء المرفق.
        </p>
        ` : ''}
        ${['returned', 'recovered_by_company'].includes(custody) ? `
        <p>
          ${data.returnDocumented ? 'وثبت من محضر الرد أو الاسترداد المرفق أن' : 'وتفيد بيانات ملف القضية، مع خضوع الواقعة للإثبات، أن'} المدعية استردت المركبة محل العقد${data.vehicleReturnedAt ? ` بتاريخ <strong>${toEnglishDigits(format(new Date(data.vehicleReturnedAt), 'dd/MM/yyyy'))}</strong>` : ''}، ومن ثم لا تطلب ردها مرة أخرى.
        </p>
        ` : ''}
        ${customer.violations_count > 0 ? `
        <p>
          ولما كانت تلك المخالفات قد وقعت خلال فترة حيازة المدعى عليه للمركبة وبسبب استعمالها، فإنه يكون ملزمًا بقيمتها وفقًا لشروط عقد الإيجار، مع طلب إلزامه ماليًا بها دون تعليق طلبات الدعوى على إجراء التحويل الإداري للمخالفات.
        </p>
        ` : ''}
        ${documentedDamages > 0 ? `
        <p>
          كما تكبدت المدعية مبلغ <strong>(${formatQar(documentedDamages)})</strong> ريال قطري مقابل مصاريف وأضرار ثابتة${breachDetails?.damagesDescription ? ` (${breachDetails.damagesDescription})` : ''}، وذلك وفق الفواتير والتقارير والصور المرفقة.
        </p>
        ` : ''}
        ${effectiveTerminationPath === 'natural_expiry' ? `
        <p>
          وبناءً على ما سبق، تلتمس المدعية ثبوت انتهاء عقد الإيجار بانقضاء مدته، مع ترتيب آثار الانتهاء من التاريخ الثابت بالعقد.
        </p>
        ` : effectiveTerminationPath === 'documented' ? `
        <p>
          وبناءً على ما سبق، تلتمس المدعية ثبوت انفساخ عقد الإيجار من تاريخ إعمالها للشرط الفاسخ الصريح، وعلى سبيل الاحتياط الحكم بفسخه قضائياً لإخلال المدعى عليه الجسيم بالتزاماته.
        </p>
        ` : data.noticeException ? `
        <p>
          وتتمسك المدعية بخضوع الإعذار للحالة الثابتة بالمستند المرفق، وهي: ${data.noticeException.reason}، مع ترك التكييف القانوني للمحكمة.
        </p>
        ` : deliveredNotices.length > 0 ? `
        <p>
          وقد سبقت مطالبة المدعى عليه كتابةً بالسداد أو الرد بموجب الإنذارات المثبت وصولها والمبينة أعلاه.
        </p>
        ` : ''}
      </div>
    </div>

    <!-- Section 2: Financial Claims -->
    <div class="section">
      <div class="section-title">ثالثاً: البيان الحسابي للمطالبة</div>
      <table>
        <thead>
          <tr>
            <th style="width: 45%;">البند</th>
            <th style="width: 30%;">الفترة أو المستند</th>
            <th style="width: 25%;">المبلغ بالريال القطري</th>
          </tr>
        </thead>
        <tbody>
          ${hasDeductions ? `
          <tr>
            <td>إجمالي الفواتير المستحقة عن فترة التخلف</td>
            <td>${unpaidPeriodLabel}</td>
            <td class="amount">${formatQar(grossInvoicesTotal)}</td>
          </tr>
          <tr>
            <td>يخصم: المبالغ المسددة</td>
            <td>وفق إيصالات السداد وكشف الحساب</td>
            <td class="amount">(${formatQar(paidTotal)})</td>
          </tr>
          <tr>
            <td><strong>صافي الإيجارات غير المسددة</strong></td>
            <td>حتى تاريخ إعداد كشف المطالبة</td>
            <td class="amount"><strong>${formatQar(overdueRent)}</strong></td>
          </tr>
          ` : `
          <tr>
            <td>الإيجارات المستحقة غير المسددة</td>
            <td>${unpaidPeriodLabel}</td>
            <td class="amount">${formatQar(overdueRent)}</td>
          </tr>
          `}
          ${latePenalty > 0 ? `
          <tr>
            <td>التعويض الاتفاقي المعروض للمراجعة القضائية</td>
            <td>${contractualCompensationFormula}${data.contractualCompensation?.method === 'monthly' ? ` — البند رقم (${data.contractualCompensation.clauseNumber})` : ''}</td>
            <td class="amount">${formatQar(latePenalty)}</td>
          </tr>
          ` : ''}
          ${customer.violations_count > 0 ? `
          <tr>
            <td>قيمة المخالفات المرورية (${customer.violations_count} مخالفة)</td>
            <td>وفق كشف المخالفات والمستخرج الرسمي من وزارة الداخلية</td>
            <td class="amount">${formatQar(violationsAmount)}</td>
          </tr>
          ` : ''}
          ${(data.damageCostItems && data.damageCostItems.length > 0) ? `
          ${data.damageCostItems.map((item) => `
          <tr>
            <td>${damageCostLabel(item.type)}: ${item.description}</td>
            <td>وفق الفواتير والتقارير المرفقة</td>
            <td class="amount">${formatQar(item.amount)}</td>
          </tr>
          `).join('')}
          ` : documentedDamages > 0 ? `
          <tr>
            <td>أضرار ومصاريف ثابتة (سحب/إصلاحات/فحص/نقل/تخزين)</td>
            <td>وفق الفواتير والتقارير المرفقة</td>
            <td class="amount">${formatQar(documentedDamages)}</td>
          </tr>
          ` : ''}
          ${data.retentionClaim && data.retentionClaim.amount > 0 ? `
          <tr>
            <td>تعويض احتباس المركبة حتى تاريخ إعداد المطالبة</td>
            <td>${data.retentionClaim.days} يوم × ${formatQar(data.retentionRate?.daily || 0)} ريال (${data.retentionRate?.sourceLabel}: ${data.retentionRate?.sourceRef})</td>
            <td class="amount">${formatQar(data.retentionClaim.amount)}</td>
          </tr>
          ` : ''}
          ${depositApplied > 0 ? `
          <tr>
            <td>يخصم: وديعة الضمان المستخدمة في التسوية</td>
            <td>بقرار المدعية وتطبيقًا لشروط العقد</td>
            <td class="amount">(${formatQar(depositApplied)})</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td colspan="2" style="text-align: left; font-weight: bold;">صافي المطالبة حتى تاريخ إعداد الكشف</td>
            <td class="amount" style="font-size: 15px; color: white;">${formatQar(netClaim)}</td>
          </tr>
        </tbody>
      </table>
      <p style="margin-top: 10px; font-size: 12px;">
        وتؤكد المدعية أن البيان السابق لا يتضمن ازدواجًا في المطالبة؛ فلا تجمع عن المركبة والفترة الزمنية ذاتها بين الأجرة التعاقدية وتعويض الاحتباس وفوات التشغيل، ولا تكرر أصل الدين ضمن الضرر التمويلي، وأن كل مبلغ مدرج يقابله عقد أو فاتورة أو كشف رسمي أو إيصال أو تقرير مؤيد له${depositApplied > 0 ? '، وأن قيمة وديعة الضمان خصمت مرة واحدة فقط' : ''}.
      </p>
    </div>

    <!-- Section: Legal Basis -->
    <div class="section">
      <div class="section-title">رابعاً: الأساس القانوني</div>
      <div class="section-content">
        <p>تستند هذه الدعوى إلى أحكام <strong>القانون المدني القطري رقم (22) لسنة 2004</strong>، وقانون إنشاء محكمة الاستثمار والتجارة رقم (21) لسنة 2021، وقانون التنفيذ القضائي رقم (4) لسنة 2024، وذلك على النحو الآتي:</p>

        <div class="legal-article">
          <strong>1. القوة الملزمة للعقد وحسن النية (المادتان 171 و172):</strong>
          تقرر المادة (171) أن العقد شريعة المتعاقدين، وتوجب المادة (172) تنفيذه طبقاً لما اشتمل عليه وبطريقة تتفق مع حسن النية. والثابت من المستندات قيام العلاقة العقدية، في حين تخلف المدعى عليه عن الوفاء بكامل الأجرة المستحقة.
        </div>
        <div class="legal-article">
          <strong>2. الالتزام بسداد الأجرة (المادة 607):</strong>
          يلتزم المستأجر بالوفاء بالأجرة في المواعيد المتفق عليها، والثابت من الفواتير وكشف الحساب أنه لم يسدد كامل الأجرة المستحقة، ولم يقدم ما يثبت براءة ذمته من الرصيد المطالب به.
        </div>
        <div class="legal-article">
          <strong>3. ${effectiveTerminationPath === 'natural_expiry' ? 'انتهاء الإيجار بانقضاء مدته (المادة 625)' : effectiveTerminationPath === 'documented' ? 'الشرط الفاسخ الصريح (المادة 184)' : 'الفسخ القضائي (المادة 183)'}:</strong>
          ${effectiveTerminationPath === 'natural_expiry'
            ? 'ينتهي الإيجار بانقضاء المدة المحددة له في العقد دون حاجة إلى تنبيه بالإخلاء، ما لم يوجد اتفاق على امتداده، وقد ثبت انقضاء المدة وعدم التجديد بالمستندات المرفقة.'
            : effectiveTerminationPath === 'documented'
              ? `ورد الشرط الفاسخ بعبارة صريحة في البند رقم (${data.terminationClause?.number}) من العقد، وثبت وصول الإنذار وانقضاء مهلته دون تنفيذ؛ ومن ثم تطلب المدعية ثبوت الانفساخ، واحتياطياً الفسخ القضائي وفق المادة (183).`
              : `تجيز المادة (183) طلب فسخ العقد عند عدم وفاء الطرف الآخر بالتزامه، مع التعويض إن كان له مقتضى، وذلك بعد الإعذار على الوجه المقرر قانوناً. وإذ يتعلق الإخلال بالتزام جوهري ومتجدد هو سداد الأجرة، تتمسك المدعية بطلب الفسخ وترتيب آثاره من التاريخ الذي تحدده المحكمة.${data.noticeException ? ` وتعرض المدعية الحالة الموثقة الآتية للنظر في انطباق المادة (262): ${data.noticeException.reason}.` : deliveredNotices.length > 0 ? ' وقد ثبت التكليف السابق بالسداد أو الرد بالمستندات.' : ''}`}
        </div>
        <div class="legal-article">
          <strong>4. رد المركبة وتعويض التأخر في ردها (المواد 616 و617 و618):</strong>
          تقضي المادة (616) بأن المستأجر يلتزم برد العين المؤجرة عند انتهاء الإيجار، فإذا أبقاها تحت يده دون حق التزم بأن يدفع للمؤجر تعويضاً يراعى في تقديره القيمة الإيجارية وما أصاب المؤجر من ضرر، مع مراعاة أحكام المادتين (617) و(618) بشأن حالة الرد ومصروفاته.
        </div>
        ${custody === 'with_defendant' ? `
        <div class="legal-article">
          <strong>5. التعويض عن الإبقاء بعد انتهاء العلاقة الإيجارية:</strong>
          إذا استمر في حيازتها بعد صيرورة الفسخ منتجًا لآثاره، التزم إلى جانب الرد بتعويض يراعى في تقديره أجر المثل والضرر الذي أصاب المدعية، دون الجمع عن الفترة نفسها بين الأجرة التعاقدية وتعويض الاحتباس.
        </div>
        ` : ''}
        ${customer.violations_count > 0 ? `<div class="legal-article">
          <strong>${custody === 'with_defendant' ? '6' : '5'}. المخالفات المرورية:</strong>
          نص عقد الإيجار على تحمل المستأجر للمخالفات والالتزامات الناتجة عن استعمال المركبة، وقد ثبتت المخالفات المبينة بالكشف المرفق خلال فترة حيازته لها، ومن ثم يلتزم بأداء قيمتها للمدعية دون تعليق طلبات الدعوى على إجراء التحويل الإداري.
        </div>` : ''}
        ${materialDamage > 0 ? `<div class="legal-article">
          <strong>${custody === 'with_defendant' ? '7' : '6'}. الأضرار والمصاريف:</strong>
          يسأل المستأجر وفق المادة (613) عما يصيب العين أثناء انتفاعه بها من تلف أو هلاك ناشئ عن استعمال غير مألوف، وقد قصرت المدعية طلبها على الأضرار والمصاريف الثابتة بالتقارير والفواتير بعد تنزيل الاستهلاك وما غطاه التأمين.
        </div>` : ''}
        ${paymentDelayDamage > 0 ? `<div class="legal-article">
          <strong>${custody === 'with_defendant' ? '8' : '7'}. التعويض عن التأخر في سداد المبالغ المستحقة (المواد 256 و263 و268):</strong>
          تقضي المادة (256) بالتعويض عن الضرر الناشئ عن عدم التنفيذ أو التأخر فيه، وتحدد المادة (263) نطاقه بما لحق الدائن من خسارة وما فاته من كسب متى كان ذلك نتيجة طبيعية للإخلال، وتجيز المادة (268) للمحكمة عند ثبوت ضرر ناشئ عن التأخر في الوفاء بالدين النقدي بعد الإعذار أن تقضي بتعويض تراعى فيه مقتضيات العدالة. وقد حصرت المدعية طلبها في الضرر الفعلي المباشر المثبت بالمستندات، بما في ذلك الأعباء التمويلية التي ثبتت صلتها بالتأخر، دون إدخال أصل الدين أو الأقساط ذاتها مرتين، بإجمالي (${formatQar(paymentDelayDamage)}) ريال قطري${deliveredNotices.length > 0 ? ' من تاريخ الإعذار الثابت بالمستندات' : '، على أن يبدأ أثر التأخر من تاريخ الإعذار الثابت قانوناً'}.
        </div>` : ''}
        ${operationalLoss > 0 ? `<div class="legal-article">
          <strong>${custody === 'with_defendant' ? '9' : '8'}. فوات الانتفاع خلال مدة الإصلاح بعد الاسترداد (المادتان 256 و263):</strong>
          يشمل التعويض ما فات المدعية من كسب متى كان نتيجة طبيعية ومباشرة للإخلال. وقد حصرت المدعية مطالبتها في صافي فوات الانتفاع والكسب خلال مدة الإصلاح المعقولة بعد استرداد المركبة، والثابت بالمستندات بمبلغ (${formatQar(operationalLoss)}) ريال قطري، بعد استبعاد المصروفات التي لم تتحملها ودون ازدواج مع تعويض الاحتباس السابق على التسليم.
        </div>` : ''}
        ${latePenalty > 0 ? `<div class="legal-article">
          <strong>${custody === 'with_defendant' ? (operationalLoss > 0 ? '10' : '9') : (operationalLoss > 0 ? '9' : '8')}. التعويض الاتفاقي:</strong>
          تتمسك المدعية بالغرامة العقدية بوصفها تعويضاً اتفاقياً ثابتاً في البند رقم (${data.contractualCompensation?.clauseNumber}) من العقد${contractualCompensationClauseText ? `، ونصه: «${contractualCompensationClauseText}»` : ''}، وفق طريقة الحساب الواردة فيه (${contractualCompensationFormula})، بإجمالي (${formatQar(latePenalty)}) ريال قطري، وذلك في الحدود التي تجيزها أحكام القانون، مع خضوعه لرقابة المحكمة وفق المادتين (266) و(267)، ودون جمعه مع تعويض آخر عن الضرر ذاته.
        </div>` : ''}
      </div>
    </div>

    <!-- Section: Evidence -->
    <div class="section">
      <div class="section-title">خامساً: الإثبات والرد على الدفوع</div>
      <div class="section-content">
        <p>
          تلتزم المدعية بإثبات العقد والدين وعناصر الضرر بالمستندات، بينما يقع على المدعى عليه إثبات ما يدعيه من سداد أو رد فعلي للمركبة أو انتقال للحيازة. وتحتفظ المدعية بحقها في تقديم ما يستجد من كشوف وإيصالات ومحاضر رسمية رداً على أي دفع يثار أثناء نظر الدعوى.
        </p>
      </div>
    </div>

    <!-- Section: Requests -->
    <div class="section">
      <div class="section-title">سادساً: الطلبات</div>
      <div class="section-content">
        <p>لذلك، تلتمس المدعية من المحكمة الموقرة الحكم بما يلي:</p>
        <div class="requests-list">
          ${memoRequests.procedural.map((claim) => `
          <div class="request-item">${renderLegalRequestHtml(claim)}</div>`).join('')}
          ${memoRequests.financial.length > 0
            ? '<div style="margin: 14px 0 8px; font-weight: bold;">وفي الطلبات المالية والعينية التابعة:</div>'
            : ''}
          ${memoRequests.financial.map((claim) => `
          <div class="request-item financial-request-item">${renderLegalRequestHtml(claim)}</div>`).join('')}
          ${memoRequests.closing.map((claim) => `
          <div class="request-item">${renderLegalRequestHtml(claim)}</div>`).join('')}
        </div>
        ${additionalNotes ? `
        <p style="margin-top: 15px;"><strong>ملاحظات:</strong> ${additionalNotes}</p>
        ` : ''}
      </div>
    </div>

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
            <p style="font-size: 12px; color: #000; margin: 10px 0 0 0;">التوقيع: __________________</p>
            <p style="font-size: 12px; color: #000; margin: 4px 0 0 0;">التاريخ: ${today}</p>
          </div>
        </td>
      </tr>
    </table>
    
  </div>
  <!-- ذيل طباعة مستقل حتى يتكرر في كل صفحة ولا ينشئ صفحة ختامية -->
  <div class="footer">
    ${COMPANY_INFO.address}<br/>
    هاتف: ${COMPANY_INFO.phone} | البريد: ${COMPANY_INFO.email}
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
  `;
}

