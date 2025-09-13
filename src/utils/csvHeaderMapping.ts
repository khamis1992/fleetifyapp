/**
 * مكتبة خرائط رؤوس الأعمدة CSV
 * تقوم بتطبيع أسماء الأعمدة للتعرف على البيانات بطريقة موحدة
 */

export const csvHeaderMappings: Record<string, string> = {
  // Payment basic fields
  'payment_date': 'payment_date',
  'تاريخ الدفع': 'payment_date',
  'تاريخ الدفعة': 'payment_date',
  'date': 'payment_date',
  
  'amount': 'amount',
  'amount_paid': 'amount_paid',
  'مبلغ': 'amount',
  'المبلغ': 'amount',
  'مبلغ الدفع': 'amount_paid',
  'المبلغ المدفوع': 'amount_paid',
  
  'total_amount': 'total_amount',
  'إجمالي المبلغ': 'total_amount',
  'المبلغ الإجمالي': 'total_amount',
  
  'balance': 'balance',
  'الرصيد': 'balance',
  'الرصيد المتبقي': 'balance',
  
  // Contract identifiers - هذا هو الجزء المفقود المهم
  'contract_number': 'contract_number',
  'رقم العقد': 'contract_number',
  'رقم الاتفاقية': 'agreement_number',
  'agreement_number': 'agreement_number',
  'رقم الاتفاق': 'agreement_number',
  'اتفاقية': 'agreement_number',
  'عقد': 'contract_number',
  'contract': 'contract_number',
  
  // Customer information
  'customer_name': 'customer_name',
  'اسم العميل': 'customer_name',
  'العميل': 'customer_name',
  'client_name': 'customer_name',
  
  'customer_id': 'customer_id',
  'معرف العميل': 'customer_id',
  'رقم العميل': 'customer_id',
  
  'customer_phone': 'customer_phone',
  'هاتف العميل': 'customer_phone',
  'رقم الهاتف': 'customer_phone',
  'phone': 'customer_phone',
  
  // Payment details
  'payment_type': 'payment_type',
  'نوع الدفع': 'payment_type',
  'طريقة الدفع': 'payment_type',
  'payment_method': 'payment_method',
  
  'transaction_type': 'transaction_type',
  'نوع المعاملة': 'transaction_type',
  'نوع العملية': 'transaction_type',
  
  'reference_number': 'reference_number',
  'رقم المرجع': 'reference_number',
  'المرجع': 'reference_number',
  
  'payment_number': 'payment_number',
  'رقم الدفعة': 'payment_number',
  'رقم السند': 'payment_number',
  
  'notes': 'notes',
  'ملاحظات': 'notes',
  'تفاصيل': 'notes',
  'description': 'description',
  'الوصف': 'description',
  'وصف': 'description',
  
  // Late fees
  'late_fine_amount': 'late_fine_amount',
  'غرامة التأخير': 'late_fine_amount',
  'مبلغ الغرامة': 'late_fine_amount',
  
  'late_fine_handling': 'late_fine_handling',
  'معالجة الغرامة': 'late_fine_handling',
  'نوع الغرامة': 'late_fine_handling',
  
  'late_fine_waiver_reason': 'late_fine_waiver_reason',
  'سبب إعفاء الغرامة': 'late_fine_waiver_reason',
  
  // Dates
  'due_date': 'due_date',
  'تاريخ الاستحقاق': 'due_date',
  'موعد الاستحقاق': 'due_date',
  
  'original_due_date': 'original_due_date',
  'تاريخ الاستحقاق الأصلي': 'original_due_date',
  
  // Status fields
  'payment_status': 'payment_status',
  'حالة الدفع': 'payment_status',
  'الحالة': 'payment_status',
  'status': 'payment_status',
  
  'reconciliation_status': 'reconciliation_status',
  'حالة التسوية': 'reconciliation_status',
  
  // Additional fields
  'type': 'type',
  'النوع': 'type',
  'نوع': 'type',
  
  'description_type': 'description_type',
  'نوع الوصف': 'description_type',
  
  'late_fine_days_overdue': 'late_fine_days_overdue',
  'أيام التأخير': 'late_fine_days_overdue',
  'عدد أيام التأخير': 'late_fine_days_overdue'
};

/**
 * تطبيع رؤوس الأعمدة في CSV
 */
export const normalizeCsvHeaders = (row: any): any => {
  if (!row || typeof row !== 'object') return row;
  
  const normalized: any = {};
  
  for (const [key, value] of Object.entries(row)) {
    const cleanKey = String(key).trim().toLowerCase();
    const mappedKey = csvHeaderMappings[cleanKey] || cleanKey;
    normalized[mappedKey] = value;
  }
  
  return normalized;
};

/**
 * البحث عن مفتاح مطابق في خرائط الرؤوس
 */
export const findMappedHeader = (searchKey: string): string | undefined => {
  const cleanKey = searchKey.trim().toLowerCase();
  return csvHeaderMappings[cleanKey];
};

/**
 * التحقق من وجود حقل معين في البيانات
 */
export const hasRequiredField = (row: any, fieldName: string): boolean => {
  const normalizedRow = normalizeCsvHeaders(row);
  return fieldName in normalizedRow && 
         normalizedRow[fieldName] !== null && 
         normalizedRow[fieldName] !== undefined && 
         String(normalizedRow[fieldName]).trim() !== '';
};