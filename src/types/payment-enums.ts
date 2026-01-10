/**
 * Payment Enums
 * 
 * أنواع المدفوعات الموحدة - يستخدم لتحديد:
 * - payment_method: كيف دُفعت (cash, check, etc)
 * - payment_type: ما نوع الدفعة (rental, security deposit, etc)
 * 
 * يساعد على تجنب الخلط وضمان استخدام قيم صحيحة في جميع أنحاء النظام.
 */

/**
 * طرق الدفع (Payment Method)
 * - كيف دُفعت النقود
 * - تعتبر قيمة مطلوبة في جدول payments
 */
export enum PaymentMethod {
  // النقد
  CASH = 'cash',
  
  // الشيك
  CHECK = 'check',
  
  // التحويل البنكي
  BANK_TRANSFER = 'bank_transfer',
  
  // بطاقة ائتمان
  CREDIT_CARD = 'credit_card',
  
  // التحويل الإلكتروني
  ONLINE_TRANSFER = 'online_transfer',
  
  // أخرى
  OTHER = 'other'
}

/**
 * أنواع الدفع (Payment Type)
 * - ما نوع الدفعة/العملية المالية
 * - يساعد في التصنيف المحاسبي والتحليل
 */
export enum PaymentType {
  // دفع إيجار شهري
  MONTHLY_RENT = 'monthly_rent',
  
  // وديعة أمان
  SECURITY_DEPOSIT = 'security_deposit',
  
  // دفعة فاتورة مسبقة
  INVOICE_PAYMENT = 'invoice_payment',
  
  // رسوم تأخير
  LATE_FEE = 'late_fee',
  
  // خصم
  DISCOUNT = 'discount',
  
  // استرداد (للعميل أو للمورد)
  REFUND = 'refund',
  
  // دفعة للموردين
  SUPPLIER_PAYMENT = 'supplier_payment',
  
  // غرامة مخالفة
  PENALTY = 'penalty',
  
  // أخرى
  OTHER = 'other'
}

/**
 * حالة الدفعة (Payment Status)
 * - الحالة الحالية للدفعة
 */
export enum PaymentStatus {
  // معلقة (قيد المعالجة)
  PENDING = 'pending',
  
  // جاري المعالجة
  PROCESSING = 'processing',
  
  // مكتملة
  COMPLETED = 'completed',
  
  // تمت
  CLEARED = 'cleared',
  
  // فشلت
  FAILED = 'failed',
  
  // ملغية
  CANCELLED = 'cancelled',
  
  // مرجوعة (شيك رجع مثلاً)
  BOUNCED = 'bounced',
  
  // ملغاة (إلغاء بعد الإنجاز)
  VOIDED = 'voided'
}

/**
 * اتجاهة المعاملة (Transaction Type)
 * - اتجاهة الدفعة (داخل أو خارج)
 * - deprecated: يفضل استخدام payment_type بدلاً منها
 * - تم الإبقاء للتوافقية مع البيانات القديمة
 */
export enum TransactionType {
  // دخل (دفعة من عميل)
  INCOME = 'income',
  
  // مصروف (دفع مورد، غرامة، etc)
  EXPENSE = 'expense'
}

/**
 * حالة التوزيع (Allocation Status)
 * - كيف تم توزيع الدفعة على الحسابات أو الفواتير
 */
export enum AllocationStatus {
  // غير موزعة
  UNALLOCATED = 'unallocated',
  
  // موزعة جزئياً
  PARTIALLY_ALLOCATED = 'partially_allocated',
  
  // موزعة بالكامل
  FULLY_ALLOCATED = 'fully_allocated',
  
  // موزعة يدوياً
  MANUALLY_ALLOCATED = 'manually_allocated'
}

/**
 * حالة التسوية (Reconciliation Status)
 * - حالة مطابقة الدفعة مع السجلات البنكية
 */
export enum ReconciliationStatus {
  // غير مسواة بعد
  UNMATCHED = 'unmatched',
  
  // مطابقة تلقائياً
  AUTO_MATCHED = 'auto_matched',
  
  // مطابقة يدوياً
  MANUALLY_MATCHED = 'manually_matched',
  
  // تمت التسوية
  RECONCILED = 'reconciled',
  
  // تختلف عن السجل البنكي
  DISCREPANCY = 'discrepancy',
  
  // معلقة المراجعة
  PENDING_REVIEW = 'pending_review'
}

/**
 * حالة المعالجة (Processing Status)
 * - حالة معالجة الدفعة
 */
export enum ProcessingStatus {
  // لا معالجة مطلوبة
  NOT_STARTED = 'not_started',
  
  // قيد المعالجة
  PROCESSING = 'processing',
  
  // معلقة للمراجعة
  NEEDS_REVIEW = 'needs_review',
  
  // معالجة كاملة
  COMPLETED = 'completed',
  
  // فشلت
  FAILED = 'failed'
}

/**
 * وظائف مساعدة للعمل مع Enums
 */
export class PaymentEnumUtils {
  /**
   * التحقق من صحة payment_method
   */
  static isValidPaymentMethod(method: string): boolean {
    return Object.values(PaymentMethod).includes(method as PaymentMethod);
  }

  /**
   * التحقق من صحة payment_type
   */
  static isValidPaymentType(type: string): boolean {
    return Object.values(PaymentType).includes(type as PaymentType);
  }

  /**
   * التحقق من صحة payment_status
   */
  static isValidPaymentStatus(status: string): boolean {
    return Object.values(PaymentStatus).includes(status as PaymentStatus);
  }

  /**
   * الحصول على وصف عربي لحالة الدفعة
   */
  static getPaymentStatusLabel(status: PaymentStatus): string {
    const labels: Record<PaymentStatus, string> = {
      [PaymentStatus.PENDING]: 'معلقة',
      [PaymentStatus.PROCESSING]: 'جاري المعالجة',
      [PaymentStatus.COMPLETED]: 'مكتملة',
      [PaymentStatus.CLEARED]: 'تمت',
      [PaymentStatus.FAILED]: 'فشلت',
      [PaymentStatus.CANCELLED]: 'ملغية',
      [PaymentStatus.BOUNCED]: 'مرجوعة',
      [PaymentStatus.VOIDED]: 'ملغاة'
    };
    
    return labels[status] || status;
  }

  /**
   * الحصول على وصف عربي لطريقة الدفع
   */
  static getPaymentMethodLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: 'نقدي',
      [PaymentMethod.CHECK]: 'شيك',
      [PaymentMethod.BANK_TRANSFER]: 'تحويل بنكي',
      [PaymentMethod.CREDIT_CARD]: 'بطاقة ائتمان',
      [PaymentMethod.ONLINE_TRANSFER]: 'تحويل إلكتروني',
      [PaymentMethod.OTHER]: 'أخرى'
    };
    
    return labels[method] || method;
  }

  /**
   * الحصول على وصف عربي لنوع الدفعة
   */
  static getPaymentTypeLabel(type: PaymentType): string {
    const labels: Record<PaymentType, string> = {
      [PaymentType.MONTHLY_RENT]: 'إيجار شهري',
      [PaymentType.SECURITY_DEPOSIT]: 'وديعة أمان',
      [PaymentType.INVOICE_PAYMENT]: 'دفع فاتورة',
      [PaymentType.LATE_FEE]: 'رسوم تأخير',
      [PaymentType.DISCOUNT]: 'خصم',
      [PaymentType.REFUND]: 'استرداد',
      [PaymentType.SUPPLIER_PAYMENT]: 'دفع مورد',
      [PaymentType.PENALTY]: 'غرامة',
      [PaymentType.OTHER]: 'أخرى'
    };
    
    return labels[type] || type;
  }

  /**
   * التحقق من أن payment_type مناسب لـ income
   */
  static isIncomeType(type: PaymentType): boolean {
    const incomeTypes = [
      PaymentType.MONTHLY_RENT,
      PaymentType.INVOICE_PAYMENT,
      PaymentType.SECURITY_DEPOSIT
    ];
    return incomeTypes.includes(type);
  }

  /**
   * التحقق من أن payment_type مناسب لـ expense
   */
  static isExpenseType(type: PaymentType): boolean {
    const expenseTypes = [
      PaymentType.LATE_FEE,
      PaymentType.PENALTY,
      PaymentType.SUPPLIER_PAYMENT
    ];
    return expenseTypes.includes(type);
  }

  /**
   * تحويل payment_method إلى TransactionType المناسب
   * - Cash/Credit Card/Online Transfer = income (دخل)
   * - Check/Bank Transfer (refund) = expense (مصروف)
   */
  static getTransactionTypeFromMethod(
    method: PaymentMethod,
    isRefund: boolean = false
  ): TransactionType {
    if (isRefund) {
      return TransactionType.EXPENSE;
    }
    
    // Cash, Credit Card, Online Transfer = income
    if ([PaymentMethod.CASH, PaymentMethod.CREDIT_CARD, PaymentMethod.ONLINE_TRANSFER].includes(method)) {
      return TransactionType.INCOME;
    }
    
    // Check, Bank Transfer = expense (could be refunds)
    return TransactionType.EXPENSE;
  }
}

/**
 * تفضيلات العملة (للاستخدام في الـ UI)
 */
export const PAYMENT_METHOD_OPTIONS = [
  { value: PaymentMethod.CASH, label: 'نقدي', icon: '💵' },
  { value: PaymentMethod.CHECK, label: 'شيك', icon: '📄' },
  { value: PaymentMethod.BANK_TRANSFER, label: 'تحويل بنكي', icon: '🏦' },
  { value: PaymentMethod.CREDIT_CARD, label: 'بطاقة ائتمان', icon: '💳' },
  { value: PaymentMethod.ONLINE_TRANSFER, label: 'تحويل إلكتروني', icon: '📱' },
  { value: PaymentMethod.OTHER, label: 'أخرى', icon: '➕' }
];

export const PAYMENT_TYPE_OPTIONS = [
  { value: PaymentType.MONTHLY_RENT, label: 'إيجار شهري', icon: '📅' },
  { value: PaymentType.SECURITY_DEPOSIT, label: 'وديعة أمان', icon: '🔒' },
  { value: PaymentType.INVOICE_PAYMENT, label: 'دفع فاتورة', icon: '📄' },
  { value: PaymentType.LATE_FEE, label: 'رسوم تأخير', icon: '⏰' },
  { value: PaymentType.REFUND, label: 'استرداد', icon: '💸' },
  { value: PaymentType.SUPPLIER_PAYMENT, label: 'دفع مورد', icon: '🏭' },
  { value: PaymentType.DISCOUNT, label: 'خصم', icon: '🏷' },
  { value: PaymentType.OTHER, label: 'أخرى', icon: '➕' }
];
