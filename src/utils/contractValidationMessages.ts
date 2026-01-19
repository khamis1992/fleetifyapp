export const contractValidationMessages = {
  // Required field messages
  required: {
    customer_id: 'يرجى اختيار العميل',
    vehicle_id: 'يرجى اختيار المركبة',
    contract_type: 'يرجى اختيار نوع العقد',
    contract_date: 'يرجى تحديد تاريخ العقد',
    start_date: 'يرجى تحديد تاريخ بداية العقد',
    end_date: 'يرجى تحديد تاريخ نهاية العقد',
    contract_amount: 'يرجى إدخال مبلغ العقد',
    monthly_amount: 'يرجى إدخال المبلغ الشهري'
  },

  // Specific validation messages
  validation: {
    customer_not_selected: 'يرجى اختيار العميل من القائمة',
    customer_inactive: 'العميل المحدد غير نشط',
    customer_blacklisted: 'العميل المحدد في القائمة السوداء',
    
    vehicle_not_selected: 'يرجى اختيار المركبة من القائمة',
    vehicle_not_available: 'المركبة غير متاحة في الفترة المحددة',
    vehicle_maintenance: 'المركبة قيد الصيانة',
    
    contract_type_invalid: 'نوع العقد غير صحيح',
    contract_type_required: 'يرجى اختيار نوع العقد',
    
    date_invalid: 'التاريخ غير صحيح',
    date_past: 'التاريخ لا يمكن أن يكون في الماضي',
    start_date_required: 'تاريخ البداية مطلوب',
    end_date_required: 'تاريخ النهاية مطلوب',
    end_date_before_start: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
    date_range_invalid: 'الفترة الزمنية غير صحيحة',
    
    amount_required: 'مبلغ العقد مطلوب',
    amount_zero: 'مبلغ العقد يجب أن يكون أكبر من صفر',
    amount_negative: 'المبلغ لا يمكن أن يكون سالباً',
    amount_too_high: 'المبلغ كبير جداً، يرجى المراجعة',
    monthly_amount_invalid: 'المبلغ الشهري غير صحيح',
    
    contract_number_exists: 'رقم العقد موجود مسبقاً',
    contract_number_invalid: 'رقم العقد غير صحيح'
  },

  // Warning messages
  warnings: {
    customer_no_credit_check: 'لم يتم فحص الائتمان للعميل',
    vehicle_high_mileage: 'المركبة لديها عدد كيلومترات عالي',
    amount_unusual: 'المبلغ غير عادي لهذا النوع من العقود',
    date_weekend: 'التاريخ المحدد في عطلة نهاية الأسبوع',
    contract_long_duration: 'مدة العقد طويلة جداً',
    no_vehicle_selected: 'لم يتم تحديد مركبة لهذا العقد'
  },

  // Success messages
  success: {
    form_valid: 'جميع البيانات صحيحة',
    customer_verified: 'تم التحقق من بيانات العميل',
    vehicle_available: 'المركبة متاحة',
    amount_calculated: 'تم حساب المبلغ تلقائياً',
    dates_valid: 'التواريخ صحيحة'
  },

  // Field labels with required indicator
  fieldLabels: {
    customer_id: 'العميل *',
    vehicle_id: 'المركبة',
    contract_type: 'نوع العقد *',
    contract_date: 'تاريخ العقد *',
    start_date: 'تاريخ البداية *',
    end_date: 'تاريخ النهاية *',
    contract_amount: 'مبلغ العقد *',
    monthly_amount: 'المبلغ الشهري',
    description: 'الوصف',
    terms: 'الشروط',
    contract_number: 'رقم العقد'
  },

  // Helper messages
  helpers: {
    customer_search: 'ابحث عن العميل بالاسم أو رقم الهوية',
    vehicle_search: 'ابحث عن المركبة بالنوع أو رقم اللوحة',
    contract_type_help: 'اختر النوع المناسب للعقد',
    date_format: 'التاريخ بصيغة يوم/شهر/سنة',
    amount_currency: 'المبلغ بالريال السعودي',
    auto_calculate: 'سيتم حساب المبلغ تلقائياً حسب النوع والمدة'
  }
}

export const getFieldLabel = (field: string, isRequired = false): string => {
  const label = contractValidationMessages.fieldLabels[field as keyof typeof contractValidationMessages.fieldLabels]
  return label || field
}

export const getRequiredFieldMessage = (field: string): string => {
  return contractValidationMessages.required[field as keyof typeof contractValidationMessages.required] || `${field} مطلوب`
}

export const getValidationMessage = (messageKey: string): string => {
  return contractValidationMessages.validation[messageKey as keyof typeof contractValidationMessages.validation] || messageKey
}

export const getWarningMessage = (messageKey: string): string => {
  return contractValidationMessages.warnings[messageKey as keyof typeof contractValidationMessages.warnings] || messageKey
}