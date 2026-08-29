/**
 * واجهات وأنواع الكتب الرسمية
 */

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
  /** تعويض اتفاقي لا يدخل إلا إذا كانت القاعدة وبند العقد ومستندها موثقة */
  contractualCompensation?: {
    amount: number;
    clauseNumber?: string;
  } | null;
  /** تعويض احتباس المركبة الماضي، محسوب من معدل موثق فقط */
  retentionCompensation?: {
    amount: number;
    days: number;
    sourceLabel?: string;
  } | null;
  /** بنود مصاريف الأضرار المتحقق منها بسند مستند (تُعرض ضمن ملخص المطالبة) */
  damageCosts?: { description: string; amount: number }[];
  /** وديعة الضمان المطبقة خصماً من التسوية (بقرار صريح فقط) */
  securityDepositDeduction?: { amount: number } | null;
  /** صافي المطالبة بعد الخصم — يطابق صافي مطالبة المذكرة وقيمة تقاضي */
  netClaimTotal?: number;
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
    url?: string; // رابط المستند للعرض
    type?: string; // نوع الملف (image, pdf, html, etc)
    htmlContent?: string; // محتوى HTML للمستندات من نوع html
  }[];
  // بيانات إضافية للدمج (للتوافق مع الكود القديم)
  claimsStatementHtml?: string; // كشف المطالبات كـ HTML
  memoHtml?: string; // المذكرة الشارحة كـ HTML
}

// واجهة بيانات بلاغ جنائي بالامتناع عن رد المركبة
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
  criminalComplaintHtml?: string; // بلاغ جنائي بالامتناع عن رد المركبة - HTML كامل
  violationsTransferHtml?: string; // طلب تحويل المخالفات - HTML كامل
  contractImageUrl?: string; // عقد الإيجار - رابط صورة
  ibanImageUrl?: string; // شهادة IBAN - رابط صورة
  commercialRegisterUrl?: string; // السجل التجاري - رابط صورة
}
