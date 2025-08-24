export const normalizeCsvHeaders = (row: Record<string, any>, entityType?: 'customer' | 'vehicle' | 'contract' | 'payment' | 'chart_account'): Record<string, any> => {
  if (!row || typeof row !== 'object') return row;
  
  console.log(`🔍 [NORMALIZE] Processing row for entityType: ${entityType}`);
  console.log(`🔍 [NORMALIZE] Original row keys:`, Object.keys(row));
  const map: Record<string, string> = {
    // Arabic headers
    'اسم العميل': 'customer_name',
    'العميل': 'customer_name',
    'رقم العميل': 'customer_id',
    'معرف العميل': 'customer_id',
    'معرّف العميل': 'customer_id',
    'رقم اللوحة': 'vehicle_number',
    'رقم المركبة': 'vehicle_number',
    'لوحة المركبة': 'vehicle_number',
    'معرف المركبة': 'vehicle_id',
    'معرّف المركبة': 'vehicle_id',
    'رقم العقد': 'contract_number',
    'نوع العقد': 'contract_type',
    'تاريخ العقد': 'contract_date',
    'تاريخ البداية': 'start_date',
    'تاريخ البدء': 'start_date',
    'بداية العقد': 'start_date',
    'تاريخ النهاية': 'end_date',
    'نهاية العقد': 'end_date',
    'مبلغ العقد': 'contract_amount',
    'المبلغ الشهري': 'monthly_amount',
    'مركز التكلفة': 'cost_center_name',
    'اسم مركز التكلفة': 'cost_center_name',
    'كود مركز التكلفة': 'cost_center_code',
    'معرف مركز التكلفة': 'cost_center_id',
    'معرّف مركز التكلفة': 'cost_center_id',
    'رقم الهاتف': entityType === 'customer' ? 'phone' : 'customer_phone',
    'الهاتف': entityType === 'customer' ? 'phone' : 'customer_phone',
    'الجوال': entityType === 'customer' ? 'phone' : 'customer_phone',
    'رقم الجوال': entityType === 'customer' ? 'phone' : 'customer_phone',
    'هاتف العميل': entityType === 'customer' ? 'phone' : 'customer_phone',
    'تليفون': entityType === 'customer' ? 'phone' : 'customer_phone',
    'الوصف': 'description',
    'الشروط': 'terms',
    'البداية': 'start_date',
    'النهاية': 'end_date',
    'بداية': 'start_date',
    'نهاية': 'end_date',
    'المبلغ': 'contract_amount',
    'القيمة': 'contract_amount',
    'السعر': 'monthly_amount',
    'السعر الشهري': 'monthly_amount',
    'رقم هاتف العميل': entityType === 'customer' ? 'phone' : 'customer_phone',
    'النوع': 'contract_type',
    'نوع': 'contract_type',

    // Common English variations (normalize spaces/casing)
    'customer name': 'customer_name',
    'customer id': 'customer_id',
    'vehicle number': 'vehicle_number',
    'vehicle plate': 'vehicle_number',
    'vehicle id': 'vehicle_id',
    'contract number': 'contract_number',
    'contract type': 'contract_type',
    'contract date': 'contract_date',
    'start date': 'start_date',
    'end date': 'end_date',
    'contract amount': 'contract_amount',
    'monthly amount': 'monthly_amount',
    'cost center': 'cost_center_name',
    'cost center name': 'cost_center_name',
    'cost center code': 'cost_center_code',
    'cost center id': 'cost_center_id',
    'customer phone': entityType === 'customer' ? 'phone' : 'customer_phone',
    'phone': entityType === 'customer' ? 'phone' : 'customer_phone',
    'mobile': entityType === 'customer' ? 'phone' : 'customer_phone',
    'phone number': entityType === 'customer' ? 'phone' : 'customer_phone',
    'mobile number': entityType === 'customer' ? 'phone' : 'customer_phone',
    'customer mobile': entityType === 'customer' ? 'phone' : 'customer_phone',
    'description': 'description',
    'terms': 'terms',
    'start': 'start_date',
    'begin': 'start_date',
    'beginning': 'start_date',
    'end': 'end_date',
    'finish': 'end_date',
    'amount': 'contract_amount',
    'value': 'contract_amount',
    'price': 'monthly_amount',
    'monthly price': 'monthly_amount',
    'type': 'contract_type',
    'category': 'contract_type',

    // Payments-specific English headers
    'payment type': 'payment_type',
    'payment method': 'payment_type',
    'transaction type': 'transaction_type',
    'payment date': 'payment_date',
    'payment amount': 'amount',
    'paid amount': 'amount',
    'receipt amount': 'amount',
    'payment number': 'payment_number',
    'reference number': 'reference_number',
    'check number': 'check_number',
    'bank account': 'bank_account',
    'currency': 'currency',
    'invoice number': 'invoice_number',
    'vendor name': 'vendor_name',

    // Payments-specific Arabic headers
    'نوع العملية': 'transaction_type',
    'نوع الحركة': 'transaction_type',
    'نوع الدفعة': 'payment_type',
    'طريقة الدفع': 'payment_type',
    'تاريخ الدفع': 'payment_date',
    'تاريخ الاستحقاق': 'original_due_date',
    'تاريخ الانتهاء': 'original_due_date',
    'التاريخ الأصلي': 'original_due_date',
    'موعد الاستحقاق': 'original_due_date',
    'مبلغ السداد': 'amount',
    'قيمة الدفع': 'amount',
    'المبلغ المدفوع': 'amount',
    'رقم الدفع': 'payment_number',
    'المرجع': 'reference_number',
    'رقم المرجع': 'reference_number',
    'رقم الشيك': 'check_number',
    'حساب بنكي': 'bank_account',
    'رقم الحساب البنكي': 'bank_account',
    'العملة': 'currency',
    'رقم الفاتورة': 'invoice_number',
    'المورد': 'vendor_name',
    'اسم المورد': 'vendor_name',
    
    // Additional date-related headers (English)
    'due date': 'original_due_date',
    'original due date': 'original_due_date',
    'due_date': 'original_due_date',
    'expiry date': 'original_due_date',
    'expiration date': 'original_due_date',
    'maturity date': 'original_due_date',
    
    // Chart of accounts mappings
    'رقم الحساب': 'account_code',
    'كود الحساب': 'account_code',
    'account number': 'account_code',
    'account code': 'account_code',
    'اسم الحساب': 'account_name',
    'اسم الحساب بالإنجليزية': 'account_name',
    'account name': 'account_name',
    'اسم الحساب بالعربية': 'account_name_ar',
    'اسم الحساب العربي': 'account_name_ar',
    'account name arabic': 'account_name_ar',
    'نوع الحساب': 'account_type',
    'account type': 'account_type',
    'النوع الفرعي': 'account_subtype',
    'account subtype': 'account_subtype',
    'نوع الرصيد': 'balance_type',
    'balance type': 'balance_type',
    'الحساب الأب': 'parent_account_code',
    'رقم الحساب الأب': 'parent_account_code',
    'parent account': 'parent_account_code',
    'parent account code': 'parent_account_code',
    'المستوى': 'account_level',
    'مستوى الحساب': 'account_level',
    'account level': 'account_level',
    'level': 'account_level',
    'حساب رئيسي': 'is_header',
    'header account': 'is_header',
    'is header': 'is_header',
    'وصف الحساب': 'description',
    'ملاحظات': 'description',
    'account description': 'description',
  };


  const normalized: Record<string, any> = {};
  const phoneKeys: string[] = [];
  
  for (const [key, val] of Object.entries(row)) {
    const cleanedKey = key?.toString().trim();
    const lowerKey = cleanedKey.toLowerCase();
    const mapped = map[cleanedKey] || map[lowerKey] || cleanedKey;
    
    // Track phone-related keys for debugging
    if (cleanedKey.includes('phone') || cleanedKey.includes('هاتف') || cleanedKey.includes('جوال') || cleanedKey.includes('تليفون')) {
      phoneKeys.push(cleanedKey);
    }
    
    // Preserve both original and normalized keys for ambiguous fields like 'amount'
    normalized[mapped] = typeof val === 'string' ? val.trim() : val;
    if (mapped !== cleanedKey && (cleanedKey.toLowerCase() === 'amount' || cleanedKey === 'المبلغ')) {
      normalized['amount'] = typeof val === 'string' ? val.trim() : val;
    }
  }
  
  console.log(`🔍 [NORMALIZE] Phone-related keys found:`, phoneKeys);
  console.log(`🔍 [NORMALIZE] Normalized keys:`, Object.keys(normalized));
  console.log(`🔍 [NORMALIZE] Final phone field:`, normalized.phone);
  
  return normalized;
};
