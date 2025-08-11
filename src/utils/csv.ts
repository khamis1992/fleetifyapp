export const normalizeCsvHeaders = (row: Record<string, any>): Record<string, any> => {
  if (!row || typeof row !== 'object') return row;
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
    'رقم الهاتف': 'customer_phone',
    'الهاتف': 'customer_phone',
    'الجوال': 'customer_phone',
    'رقم الجوال': 'customer_phone',
    'هاتف العميل': 'customer_phone',
    'تليفون': 'customer_phone',
    'الوصف': 'description',
    'الشروط': 'terms',

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
    'customer phone': 'customer_phone',
    'phone': 'customer_phone',
    'mobile': 'customer_phone',
    'phone number': 'customer_phone',
    'mobile number': 'customer_phone',
    'customer mobile': 'customer_phone',
    'description': 'description',
    'terms': 'terms',
  };


  const normalized: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    const cleanedKey = key?.toString().trim();
    const lowerKey = cleanedKey.toLowerCase();
    const mapped = map[cleanedKey] || map[lowerKey] || cleanedKey;
    normalized[mapped] = typeof val === 'string' ? val.trim() : val;
  }
  return normalized;
};
