export interface AccountTemplate {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  accountType: 'assets' | 'liabilities' | 'revenue' | 'expenses' | 'equity';
  accountLevel: number;
  balanceType: 'debit' | 'credit';
  parentCode?: string;
  essential: boolean;
  recommended: boolean;
  description: string;
  isEntryLevel?: boolean; // true for levels 5 and 6
  isHeader?: boolean;     // true for levels 1-4
}

export interface BusinessTypeAccounts {
  assets: AccountTemplate[];
  liabilities: AccountTemplate[];
  revenue: AccountTemplate[];
  expenses: AccountTemplate[];
  equity: AccountTemplate[];
}

// قالب تأجير السيارات - منظم محاسبياً وبدون حسابات وهمية
const CAR_RENTAL_ACCOUNTS: BusinessTypeAccounts = {
  assets: [
    // ===== المستوى 3 - مجموعات الأصول الرئيسية =====
    { id: 'vehicle_assets_group', code: '1150', nameEn: 'Vehicle Assets', nameAr: 'أصول المركبات', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '1500', essential: true, recommended: true, description: 'مجموعة أصول المركبات والمعدات', isHeader: true },
    { id: 'inventory_assets_group', code: '1160', nameEn: 'Inventory Assets', nameAr: 'أصول المخزون', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '1100', essential: false, recommended: true, description: 'مخزون السلع والمواد', isHeader: true },
    { id: 'prepaid_assets_group', code: '1130', nameEn: 'Prepaid Assets', nameAr: 'الأصول المدفوعة مقدماً', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '1100', essential: false, recommended: true, description: 'المصاريف المدفوعة مقدماً', isHeader: true },
    { id: 'other_receivables_group', code: '1140', nameEn: 'Other Receivables', nameAr: 'مدينون أخرون', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '1100', essential: false, recommended: true, description: 'المستحقات الأخرى', isHeader: true },
    { id: 'customer_receivables_detail', code: '1125', nameEn: 'Customer Receivables Detail', nameAr: 'تفاصيل العملاء المدينين', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '1120', essential: true, recommended: true, description: 'تصنيف تفصيلي للعملاء المدينين', isHeader: true },

    // ===== المستوى 4 - فئات المركبات =====
    { id: 'vehicle_fleet', code: '1151', nameEn: 'Vehicle Fleet', nameAr: 'أسطول المركبات', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1150', essential: true, recommended: true, description: 'المركبات المملوكة للشركة', isHeader: true },
    { id: 'vehicle_equipment', code: '1152', nameEn: 'Vehicle Equipment', nameAr: 'معدات المركبات', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1150', essential: false, recommended: true, description: 'المعدات والتجهيزات الإضافية للمركبات', isHeader: true },
    { id: 'spare_parts_inventory', code: '1153', nameEn: 'Spare Parts Inventory', nameAr: 'مخزون قطع الغيار', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1150', essential: false, recommended: true, description: 'مخزون قطع الغيار والإطارات', isHeader: true },
    { id: 'accumulated_depreciation', code: '1159', nameEn: 'Accumulated Depreciation - Vehicles', nameAr: 'مجمع إهلاك المركبات', accountType: 'assets', accountLevel: 4, balanceType: 'credit', parentCode: '1150', essential: true, recommended: true, description: 'مجمع إهلاك أسطول المركبات', isHeader: true },

    // ===== المستوى 4 - فئات المخزون =====
    { id: 'fuel_inventory', code: '1161', nameEn: 'Fuel Inventory', nameAr: 'مخزون الوقود', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1160', essential: false, recommended: true, description: 'مخزون الوقود والبترول', isHeader: true },
    { id: 'office_supplies', code: '1162', nameEn: 'Office Supplies', nameAr: 'مواد مكتبية', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1160', essential: false, recommended: true, description: 'المواد والأدوات المكتبية', isHeader: true },

    // ===== المستوى 4 - فئات المدفوعات المقدمة =====
    { id: 'prepaid_insurance', code: '1131', nameEn: 'Prepaid Insurance', nameAr: 'التأمين المدفوع مقدماً', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1130', essential: false, recommended: true, description: 'أقساط التأمين المدفوعة مقدماً', isHeader: true },
    { id: 'prepaid_licenses', code: '1132', nameEn: 'Prepaid Licenses', nameAr: 'الرخص المدفوعة مقدماً', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1130', essential: false, recommended: true, description: 'رسوم التراخيص المدفوعة مقدماً', isHeader: true },
    { id: 'prepaid_rent', code: '1133', nameEn: 'Prepaid Rent', nameAr: 'الإيجار المدفوع مقدماً', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1130', essential: false, recommended: true, description: 'إيجار المباني والمواقف المدفوع مقدماً', isHeader: true },

    // ===== المستوى 4 - فئات المدينين الأخرى =====
    { id: 'driver_advances', code: '1141', nameEn: 'Driver Advances', nameAr: 'عهد السائقين', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1140', essential: false, recommended: true, description: 'العهد والسلف المقدمة للسائقين', isHeader: true },
    { id: 'rental_deposits_receivable', code: '1142', nameEn: 'Rental Deposits Receivable', nameAr: 'ودائع تأجير مستحقة', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1140', essential: false, recommended: true, description: 'الودائع المستحقة من العملاء', isHeader: true },
    { id: 'insurance_claims_receivable', code: '1143', nameEn: 'Insurance Claims Receivable', nameAr: 'مطالبات تأمين مستحقة', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1140', essential: false, recommended: true, description: 'المطالبات المستحقة من شركات التأمين', isHeader: true },

    // ===== المستوى 4 - فئات العملاء =====
    { id: 'individual_customers', code: '1126', nameEn: 'Individual Customers', nameAr: 'عملاء أفراد', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1125', essential: true, recommended: true, description: 'العملاء الأفراد', isHeader: true },
    { id: 'corporate_customers', code: '1127', nameEn: 'Corporate Customers', nameAr: 'عملاء شركات', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1125', essential: true, recommended: true, description: 'العملاء من الشركات', isHeader: true },
    { id: 'government_customers', code: '1128', nameEn: 'Government Customers', nameAr: 'عملاء حكوميون', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1125', essential: false, recommended: true, description: 'العملاء من الجهات الحكومية', isHeader: true },

    // ===== المستوى 5 - حسابات تفصيلية للمركبات =====
    { id: 'sedan_fleet', code: '11511', nameEn: 'Sedan Fleet', nameAr: 'أسطول السيارات الصالون', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1151', essential: true, recommended: true, description: 'السيارات الصالون في الأسطول', isEntryLevel: true },
    { id: 'suv_fleet', code: '11512', nameEn: 'SUV Fleet', nameAr: 'أسطول السيارات الرياضية', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1151', essential: false, recommended: true, description: 'السيارات الرياضية في الأسطول', isEntryLevel: true },
    { id: 'van_fleet', code: '11513', nameEn: 'Van Fleet', nameAr: 'أسطول الحافلات الصغيرة', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1151', essential: false, recommended: true, description: 'الحافلات الصغيرة في الأسطول', isEntryLevel: true },
    { id: 'luxury_fleet', code: '11514', nameEn: 'Luxury Fleet', nameAr: 'أسطول السيارات الفاخرة', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1151', essential: false, recommended: true, description: 'السيارات الفاخرة في الأسطول', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للمعدات =====
    { id: 'gps_devices', code: '11521', nameEn: 'GPS Tracking Devices', nameAr: 'أجهزة التتبع', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1152', essential: false, recommended: true, description: 'أجهزة التتبع والملاحة', isEntryLevel: true },
    { id: 'safety_equipment', code: '11522', nameEn: 'Safety Equipment', nameAr: 'معدات السلامة', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1152', essential: false, recommended: true, description: 'معدات الأمان والسلامة', isEntryLevel: true },
    { id: 'communication_devices', code: '11523', nameEn: 'Communication Devices', nameAr: 'أجهزة الاتصال', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1152', essential: false, recommended: true, description: 'أجهزة الاتصال والراديو', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية لقطع الغيار =====
    { id: 'engine_parts', code: '11531', nameEn: 'Engine Parts', nameAr: 'قطع غيار المحرك', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1153', essential: false, recommended: true, description: 'قطع غيار المحركات', isEntryLevel: true },
    { id: 'tire_inventory', code: '11532', nameEn: 'Tire Inventory', nameAr: 'مخزون الإطارات', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1153', essential: false, recommended: true, description: 'مخزون الإطارات والعجلات', isEntryLevel: true },
    { id: 'brake_parts', code: '11533', nameEn: 'Brake Parts', nameAr: 'قطع غيار الفرامل', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1153', essential: false, recommended: true, description: 'قطع غيار نظام الفرامل', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للإهلاك =====
    { id: 'vehicle_depreciation', code: '11591', nameEn: 'Vehicle Depreciation', nameAr: 'إهلاك المركبات', accountType: 'assets', accountLevel: 5, balanceType: 'credit', parentCode: '1159', essential: true, recommended: true, description: 'مجمع إهلاك المركبات', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للمخزون =====
    { id: 'gasoline_inventory', code: '11611', nameEn: 'Gasoline Inventory', nameAr: 'مخزون البنزين', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1161', essential: false, recommended: true, description: 'مخزون البنزين والوقود', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للمدفوعات المقدمة =====
    { id: 'vehicle_insurance_prepaid', code: '11311', nameEn: 'Vehicle Insurance Prepaid', nameAr: 'تأمين المركبات المدفوع مقدماً', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1131', essential: false, recommended: true, description: 'أقساط تأمين المركبات المدفوعة مقدماً', isEntryLevel: true },
    { id: 'comprehensive_insurance_prepaid', code: '11312', nameEn: 'Comprehensive Insurance Prepaid', nameAr: 'التأمين الشامل المدفوع مقدماً', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1131', essential: false, recommended: true, description: 'أقساط التأمين الشامل المدفوعة مقدماً', isEntryLevel: true },

    { id: 'vehicle_registration_prepaid', code: '11321', nameEn: 'Vehicle Registration Prepaid', nameAr: 'رسوم ترخيص المركبات مقدماً', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1132', essential: false, recommended: true, description: 'رسوم ترخيص المركبات المدفوعة مقدماً', isEntryLevel: true },
    { id: 'business_license_prepaid', code: '11322', nameEn: 'Business License Prepaid', nameAr: 'الرخصة التجارية مقدماً', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1132', essential: false, recommended: true, description: 'رسوم الرخصة التجارية المدفوعة مقدماً', isEntryLevel: true },

    { id: 'office_rent_prepaid', code: '11331', nameEn: 'Office Rent Prepaid', nameAr: 'إيجار المكتب مقدماً', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1133', essential: false, recommended: true, description: 'إيجار المكتب المدفوع مقدماً', isEntryLevel: true },
    { id: 'parking_rent_prepaid', code: '11332', nameEn: 'Parking Rent Prepaid', nameAr: 'إيجار المواقف مقدماً', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1133', essential: false, recommended: true, description: 'إيجار مواقف السيارات المدفوع مقدماً', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للمدينين الأخرى =====
    { id: 'driver_cash_advances', code: '11411', nameEn: 'Driver Cash Advances', nameAr: 'عهد نقدية للسائقين', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1141', essential: false, recommended: true, description: 'العهد النقدية المقدمة للسائقين', isEntryLevel: true },
    { id: 'driver_fuel_advances', code: '11412', nameEn: 'Driver Fuel Advances', nameAr: 'عهد وقود للسائقين', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1141', essential: false, recommended: true, description: 'عهد الوقود المقدمة للسائقين', isEntryLevel: true },

    { id: 'customer_security_deposits', code: '11421', nameEn: 'Customer Security Deposits', nameAr: 'ودائع ضمان العملاء', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1142', essential: false, recommended: true, description: 'ودائع الضمان المقبوضة من العملاء', isEntryLevel: true },
    { id: 'damage_deposits_receivable', code: '11422', nameEn: 'Damage Deposits Receivable', nameAr: 'ودائع الأضرار المستحقة', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1142', essential: false, recommended: true, description: 'ودائع تغطية الأضرار المستحقة', isEntryLevel: true },

    { id: 'accident_claims_receivable', code: '11431', nameEn: 'Accident Claims Receivable', nameAr: 'مطالبات حوادث مستحقة', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1143', essential: false, recommended: true, description: 'المطالبات المستحقة من شركات التأمين', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للعملاء =====
    { id: 'individual_cash_customers', code: '11261', nameEn: 'Individual Cash Customers', nameAr: 'عملاء أفراد نقدي', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1126', essential: true, recommended: true, description: 'العملاء الأفراد النقدي', isEntryLevel: true },
    { id: 'individual_credit_customers', code: '11262', nameEn: 'Individual Credit Customers', nameAr: 'عملاء أفراد آجل', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1126', essential: true, recommended: true, description: 'العملاء الأفراد الآجل', isEntryLevel: true },

    { id: 'private_companies', code: '11271', nameEn: 'Private Companies', nameAr: 'شركات خاصة', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1127', essential: true, recommended: true, description: 'عملاء الشركات الخاصة', isEntryLevel: true },
    { id: 'public_companies', code: '11272', nameEn: 'Public Companies', nameAr: 'شركات مساهمة', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1127', essential: false, recommended: true, description: 'عملاء الشركات المساهمة', isEntryLevel: true },

    { id: 'government_entities', code: '11281', nameEn: 'Government Entities', nameAr: 'جهات حكومية', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1128', essential: false, recommended: true, description: 'العملاء من الجهات الحكومية', isEntryLevel: true }
    ],

  liabilities: [
    // ===== المستوى 2 - الخصوم طويلة الأجل =====
    { id: 'long_term_liabilities', code: '2500', nameEn: 'Long-term Liabilities', nameAr: 'الخصوم طويلة الأجل', accountType: 'liabilities', accountLevel: 2, balanceType: 'credit', parentCode: '2000', essential: false, recommended: true, description: 'الالتزامات طويلة الأجل', isHeader: true },

    // ===== المستوى 3 - مجموعات الخصوم =====
    { id: 'vehicle_financing_group', code: '2510', nameEn: 'Vehicle Financing', nameAr: 'تمويل المركبات', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', parentCode: '2500', essential: false, recommended: true, description: 'قروض وتمويل شراء المركبات', isHeader: true },
    { id: 'customer_deposits_group', code: '2130', nameEn: 'Customer Deposits', nameAr: 'ودائع العملاء', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', parentCode: '2100', essential: false, recommended: true, description: 'الودائع المقبوضة من العملاء', isHeader: true },
    { id: 'maintenance_payables_group', code: '2140', nameEn: 'Maintenance Payables', nameAr: 'مستحقات الصيانة', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', parentCode: '2100', essential: false, recommended: true, description: 'المبالغ المستحقة للصيانة', isHeader: true },
    { id: 'insurance_legal_payables', code: '2150', nameEn: 'Insurance & Legal Payables', nameAr: 'مستحقات التأمين والقانونية', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', parentCode: '2100', essential: false, recommended: true, description: 'المستحقات للتأمين والأمور القانونية', isHeader: true },
    { id: 'taxes_fees_payable', code: '2160', nameEn: 'Taxes & Fees Payable', nameAr: 'ضرائب ورسوم مستحقة', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', parentCode: '2100', essential: false, recommended: true, description: 'الضرائب والرسوم الحكومية المستحقة', isHeader: true },
    { id: 'supplier_payables_detail', code: '2115', nameEn: 'Supplier Payables Detail', nameAr: 'تفاصيل الموردين الدائنين', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', parentCode: '2110', essential: true, recommended: true, description: 'تصنيف تفصيلي للموردين الدائنين', isHeader: true },

    // ===== المستوى 4 - فئات التمويل =====
    { id: 'vehicle_loans', code: '2511', nameEn: 'Vehicle Loans', nameAr: 'قروض المركبات', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2510', essential: false, recommended: true, description: 'قروض شراء المركبات', isHeader: true },
    { id: 'lease_obligations', code: '2512', nameEn: 'Lease Obligations', nameAr: 'التزامات الإيجار التمويلي', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2510', essential: false, recommended: true, description: 'التزامات عقود الإيجار التمويلي', isHeader: true },

    // ===== المستوى 4 - فئات ودائع العملاء =====
    { id: 'rental_deposits', code: '2131', nameEn: 'Rental Deposits', nameAr: 'ودائع التأجير', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2130', essential: false, recommended: true, description: 'ودائع العملاء للتأجير', isHeader: true },
    { id: 'damage_deposits', code: '2132', nameEn: 'Damage Deposits', nameAr: 'ودائع الأضرار', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2130', essential: false, recommended: true, description: 'ودائع تغطية الأضرار', isHeader: true },

    // ===== المستوى 4 - فئات مستحقات الصيانة =====
    { id: 'vehicle_maintenance_payable', code: '2141', nameEn: 'Vehicle Maintenance Payable', nameAr: 'صيانة المركبات المستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2140', essential: false, recommended: true, description: 'مبالغ صيانة المركبات المستحقة', isHeader: true },
    { id: 'spare_parts_payable', code: '2142', nameEn: 'Spare Parts Payable', nameAr: 'قطع الغيار المستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2140', essential: false, recommended: true, description: 'مبالغ قطع الغيار المستحقة', isHeader: true },

    // ===== المستوى 4 - فئات التأمين والقانونية =====
    { id: 'insurance_premiums_payable', code: '2151', nameEn: 'Insurance Premiums Payable', nameAr: 'أقساط التأمين المستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2150', essential: false, recommended: true, description: 'أقساط التأمين المستحقة الدفع', isHeader: true },
    { id: 'legal_fees_payable', code: '2152', nameEn: 'Legal Fees Payable', nameAr: 'أتعاب قانونية مستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2150', essential: false, recommended: true, description: 'الأتعاب القانونية المستحقة', isHeader: true },

    // ===== المستوى 4 - فئات الضرائب والرسوم =====
    { id: 'vat_payable', code: '2161', nameEn: 'VAT Payable', nameAr: 'ضريبة القيمة المضافة المستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2160', essential: false, recommended: true, description: 'ضريبة القيمة المضافة المستحقة للدولة', isHeader: true },
    { id: 'license_fees_payable', code: '2162', nameEn: 'License Fees Payable', nameAr: 'رسوم التراخيص المستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2160', essential: false, recommended: true, description: 'رسوم التراخيص الحكومية المستحقة', isHeader: true },

    // ===== المستوى 4 - فئات الموردين =====
    { id: 'maintenance_suppliers', code: '2116', nameEn: 'Maintenance Suppliers', nameAr: 'موردو الصيانة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2115', essential: false, recommended: true, description: 'موردو خدمات الصيانة', isHeader: true },
    { id: 'parts_suppliers', code: '2117', nameEn: 'Parts Suppliers', nameAr: 'موردو قطع الغيار', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2115', essential: false, recommended: true, description: 'موردو قطع الغيار والإطارات', isHeader: true },
    { id: 'fuel_suppliers', code: '2118', nameEn: 'Fuel Suppliers', nameAr: 'موردو الوقود', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2115', essential: false, recommended: true, description: 'موردو الوقود والزيوت', isHeader: true },

    // ===== المستوى 5 - حسابات تفصيلية للتمويل =====
    { id: 'bank_vehicle_loan', code: '25111', nameEn: 'Bank Vehicle Loan', nameAr: 'قرض بنكي لشراء المركبات', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2511', essential: false, recommended: true, description: 'قرض بنكي لشراء المركبات', isEntryLevel: true },
    { id: 'financing_company_loan', code: '25112', nameEn: 'Financing Company Loan', nameAr: 'قرض شركة تمويل', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2511', essential: false, recommended: true, description: 'قرض من شركة التمويل', isEntryLevel: true },

    { id: 'vehicle_lease_obligation', code: '25121', nameEn: 'Vehicle Lease Obligation', nameAr: 'التزام إيجار تمويلي للمركبات', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2512', essential: false, recommended: true, description: 'التزامات الإيجار التمويلي للمركبات', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للودائع =====
    { id: 'rental_security_deposits', code: '21311', nameEn: 'Rental Security Deposits', nameAr: 'ودائع ضمان التأجير', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2131', essential: false, recommended: true, description: 'ودائع الضمان للتأجير', isEntryLevel: true },
    { id: 'monthly_rental_deposits', code: '21312', nameEn: 'Monthly Rental Deposits', nameAr: 'ودائع التأجير الشهري', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2131', essential: false, recommended: true, description: 'ودائع التأجير الشهري', isEntryLevel: true },

    { id: 'vehicle_damage_deposits', code: '21321', nameEn: 'Vehicle Damage Deposits', nameAr: 'ودائع أضرار المركبات', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2132', essential: false, recommended: true, description: 'ودائع تغطية أضرار المركبات', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للصيانة =====
    { id: 'workshop_maintenance_payable', code: '21411', nameEn: 'Workshop Maintenance Payable', nameAr: 'صيانة الورش المستحقة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2141', essential: false, recommended: true, description: 'مبالغ صيانة الورش المستحقة', isEntryLevel: true },
    { id: 'periodic_maintenance_payable', code: '21412', nameEn: 'Periodic Maintenance Payable', nameAr: 'الصيانة الدورية المستحقة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2141', essential: false, recommended: true, description: 'مبالغ الصيانة الدورية المستحقة', isEntryLevel: true },

    { id: 'engine_parts_payable', code: '21421', nameEn: 'Engine Parts Payable', nameAr: 'قطع غيار المحرك المستحقة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2142', essential: false, recommended: true, description: 'مبالغ قطع غيار المحرك المستحقة', isEntryLevel: true },
    { id: 'tire_replacement_payable', code: '21422', nameEn: 'Tire Replacement Payable', nameAr: 'إطارات بديلة مستحقة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2142', essential: false, recommended: true, description: 'مبالغ الإطارات البديلة المستحقة', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للتأمين =====
    { id: 'comprehensive_insurance_payable', code: '21511', nameEn: 'Comprehensive Insurance Payable', nameAr: 'التأمين الشامل المستحق', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2151', essential: false, recommended: true, description: 'أقساط التأمين الشامل المستحقة', isEntryLevel: true },
    { id: 'third_party_insurance_payable', code: '21512', nameEn: 'Third Party Insurance Payable', nameAr: 'تأمين الغير المستحق', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2151', essential: false, recommended: true, description: 'أقساط تأمين الغير المستحقة', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للرسوم =====
    { id: 'traffic_violations_payable', code: '21621', nameEn: 'Traffic Violations Payable', nameAr: 'مخالفات مرورية مستحقة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2162', essential: false, recommended: true, description: 'غرامات المخالفات المرورية المستحقة', isEntryLevel: true },
    { id: 'registration_fees_payable', code: '21622', nameEn: 'Registration Fees Payable', nameAr: 'رسوم ترخيص مستحقة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2162', essential: false, recommended: true, description: 'رسوم ترخيص المركبات المستحقة', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للموردين =====
    { id: 'authorized_workshops', code: '21161', nameEn: 'Authorized Workshops', nameAr: 'ورش معتمدة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2116', essential: false, recommended: true, description: 'مستحقات الورش المعتمدة', isEntryLevel: true },
    { id: 'independent_mechanics', code: '21162', nameEn: 'Independent Mechanics', nameAr: 'ميكانيكيون مستقلون', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2116', essential: false, recommended: true, description: 'مستحقات الميكانيكيين المستقلين', isEntryLevel: true },

    { id: 'original_parts_suppliers', code: '21171', nameEn: 'Original Parts Suppliers', nameAr: 'موردو قطع أصلية', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2117', essential: false, recommended: true, description: 'موردو قطع الغيار الأصلية', isEntryLevel: true },
    { id: 'aftermarket_parts_suppliers', code: '21172', nameEn: 'Aftermarket Parts Suppliers', nameAr: 'موردو قطع تجارية', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2117', essential: false, recommended: true, description: 'موردو قطع الغيار التجارية', isEntryLevel: true },

    { id: 'gas_stations', code: '21181', nameEn: 'Gas Stations', nameAr: 'محطات الوقود', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2118', essential: false, recommended: true, description: 'مستحقات محطات الوقود', isEntryLevel: true },
    { id: 'oil_suppliers', code: '21182', nameEn: 'Oil Suppliers', nameAr: 'موردو الزيوت', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2118', essential: false, recommended: true, description: 'موردو الزيوت والسوائل', isEntryLevel: true }
  ],

  revenue: [
    // ===== المستوى 3 - مجموعات الإيرادات =====
    { id: 'rental_revenue_group', code: '4120', nameEn: 'Rental Revenue', nameAr: 'إيرادات التأجير', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', parentCode: '4100', essential: true, recommended: true, description: 'إيرادات تأجير المركبات', isHeader: true },
    { id: 'sales_revenue_group', code: '4130', nameEn: 'Sales Revenue', nameAr: 'إيرادات المبيعات', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', parentCode: '4100', essential: false, recommended: true, description: 'إيرادات من مبيعات المركبات والأصول', isHeader: true },
    { id: 'service_revenue_group', code: '4140', nameEn: 'Service Revenue', nameAr: 'إيرادات الخدمات', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', parentCode: '4100', essential: false, recommended: true, description: 'إيرادات من الخدمات المختلفة', isHeader: true },
    { id: 'other_revenue_group', code: '4180', nameEn: 'Other Revenue', nameAr: 'إيرادات أخرى', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', parentCode: '4100', essential: false, recommended: false, description: 'الإيرادات الأخرى', isHeader: true },

    // ===== المستوى 4 - فئات إيرادات التأجير =====
    { id: 'rental_revenue', code: '4121', nameEn: 'Vehicle Rental Revenue', nameAr: 'إيرادات تأجير المركبات', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4120', essential: true, recommended: true, description: 'إيرادات تأجير المركبات الأساسية', isHeader: true },
    { id: 'additional_fees_revenue', code: '4122', nameEn: 'Additional Fees Revenue', nameAr: 'إيرادات الرسوم الإضافية', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4120', essential: false, recommended: true, description: 'رسوم إضافية (وقود، تنظيف، إلخ)', isHeader: true },
    { id: 'driver_service_revenue', code: '4123', nameEn: 'Driver Service Revenue', nameAr: 'إيرادات خدمة السائق', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4120', essential: false, recommended: true, description: 'إيرادات من خدمة توفير السائق', isHeader: true },
    { id: 'delivery_service_revenue', code: '4124', nameEn: 'Delivery Service Revenue', nameAr: 'إيرادات خدمة التوصيل', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4120', essential: false, recommended: true, description: 'إيرادات من خدمات التوصيل والنقل', isHeader: true },

    // ===== المستوى 4 - فئات إيرادات المبيعات =====
    { id: 'used_vehicle_sales', code: '4131', nameEn: 'Used Vehicle Sales', nameAr: 'مبيعات المركبات المستعملة', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4130', essential: false, recommended: true, description: 'إيرادات من بيع المركبات المستعملة', isHeader: true },
    { id: 'parts_sales', code: '4132', nameEn: 'Parts Sales', nameAr: 'مبيعات قطع الغيار', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4130', essential: false, recommended: true, description: 'إيرادات من بيع قطع الغيار الفائضة', isHeader: true },

    // ===== المستوى 4 - فئات إيرادات الخدمات =====
    { id: 'maintenance_service_revenue', code: '4141', nameEn: 'Maintenance Service Revenue', nameAr: 'إيرادات خدمة الصيانة', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4140', essential: false, recommended: true, description: 'إيرادات من تقديم خدمات الصيانة للغير', isHeader: true },
    { id: 'consultation_revenue', code: '4142', nameEn: 'Consultation Revenue', nameAr: 'إيرادات الاستشارات', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4140', essential: false, recommended: true, description: 'إيرادات من الاستشارات الفنية', isHeader: true },

    // ===== المستوى 4 - فئات الإيرادات الأخرى =====
    { id: 'insurance_revenue', code: '4181', nameEn: 'Insurance Revenue', nameAr: 'إيرادات التأمين', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4180', essential: false, recommended: false, description: 'إيرادات من خدمات التأمين', isHeader: true },
    { id: 'late_fees', code: '4182', nameEn: 'Late Fees', nameAr: 'رسوم التأخير', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4180', essential: false, recommended: true, description: 'رسوم التأخير في الإرجاع', isHeader: true },
    { id: 'damage_fees', code: '4183', nameEn: 'Damage Fees', nameAr: 'رسوم الأضرار', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4180', essential: false, recommended: true, description: 'رسوم الأضرار والتلفيات', isHeader: true },

    // ===== المستوى 5 - حسابات تفصيلية للإيرادات =====
    { id: 'daily_rental_revenue', code: '41211', nameEn: 'Daily Rental Revenue', nameAr: 'إيرادات التأجير اليومي', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4121', essential: true, recommended: true, description: 'إيرادات التأجير اليومي للمركبات', isEntryLevel: true },
    { id: 'weekly_rental_revenue', code: '41212', nameEn: 'Weekly Rental Revenue', nameAr: 'إيرادات التأجير الأسبوعي', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4121', essential: false, recommended: true, description: 'إيرادات التأجير الأسبوعي للمركبات', isEntryLevel: true },
    { id: 'monthly_rental_revenue', code: '41213', nameEn: 'Monthly Rental Revenue', nameAr: 'إيرادات التأجير الشهري', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4121', essential: false, recommended: true, description: 'إيرادات التأجير الشهري للمركبات', isEntryLevel: true },
    { id: 'corporate_rental_revenue', code: '41214', nameEn: 'Corporate Rental Revenue', nameAr: 'إيرادات التأجير للشركات', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4121', essential: false, recommended: true, description: 'إيرادات التأجير للشركات والجهات', isEntryLevel: true },

    { id: 'fuel_supplement_revenue', code: '41221', nameEn: 'Fuel Supplement Revenue', nameAr: 'إيرادات رسوم الوقود', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4122', essential: false, recommended: true, description: 'إيرادات من رسوم الوقود الإضافية', isEntryLevel: true },
    { id: 'cleaning_fees_revenue', code: '41222', nameEn: 'Cleaning Fees Revenue', nameAr: 'إيرادات رسوم التنظيف', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4122', essential: false, recommended: true, description: 'إيرادات من رسوم التنظيف', isEntryLevel: true },
    { id: 'gps_fees_revenue', code: '41223', nameEn: 'GPS Fees Revenue', nameAr: 'إيرادات رسوم التتبع', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4122', essential: false, recommended: true, description: 'إيرادات من رسوم خدمة التتبع', isEntryLevel: true },

    { id: 'hourly_driver_service', code: '41231', nameEn: 'Hourly Driver Service', nameAr: 'خدمة السائق بالساعة', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4123', essential: false, recommended: true, description: 'إيرادات خدمة السائق بالساعة', isEntryLevel: true },
    { id: 'daily_driver_service', code: '41232', nameEn: 'Daily Driver Service', nameAr: 'خدمة السائق اليومية', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4123', essential: false, recommended: true, description: 'إيرادات خدمة السائق اليومية', isEntryLevel: true },

    { id: 'airport_delivery', code: '41241', nameEn: 'Airport Delivery', nameAr: 'توصيل المطار', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4124', essential: false, recommended: true, description: 'إيرادات من خدمة توصيل المطار', isEntryLevel: true },
    { id: 'city_delivery', code: '41242', nameEn: 'City Delivery', nameAr: 'توصيل داخل المدينة', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4124', essential: false, recommended: true, description: 'إيرادات من خدمة التوصيل داخل المدينة', isEntryLevel: true },

    { id: 'sedan_sales', code: '41311', nameEn: 'Sedan Sales', nameAr: 'مبيعات السيارات الصالون', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4131', essential: false, recommended: true, description: 'إيرادات من بيع السيارات الصالون المستعملة', isEntryLevel: true },
    { id: 'suv_sales', code: '41312', nameEn: 'SUV Sales', nameAr: 'مبيعات السيارات الرياضية', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4131', essential: false, recommended: true, description: 'إيرادات من بيع السيارات الرياضية المستعملة', isEntryLevel: true },

    { id: 'late_return_fees', code: '41821', nameEn: 'Late Return Fees', nameAr: 'رسوم التأخير في الإرجاع', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4182', essential: false, recommended: true, description: 'رسوم التأخير في إرجاع المركبات', isEntryLevel: true },
    { id: 'vehicle_damage_fees', code: '41831', nameEn: 'Vehicle Damage Fees', nameAr: 'رسوم أضرار المركبات', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4183', essential: false, recommended: true, description: 'رسوم الأضرار التي تلحق بالمركبات', isEntryLevel: true }
  ],

  expenses: [
    // ===== المستوى 3 - مجموعات المصروفات =====
    { id: 'vehicle_expenses_group', code: '5130', nameEn: 'Vehicle Expenses', nameAr: 'مصروفات المركبات', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '5100', essential: true, recommended: true, description: 'جميع مصروفات المركبات والصيانة', isHeader: true },
    { id: 'driver_expenses_group', code: '5220', nameEn: 'Driver Expenses', nameAr: 'مصروفات السائقين', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '5200', essential: false, recommended: true, description: 'جميع مصروفات السائقين', isHeader: true },
    { id: 'marketing_expenses_group', code: '5230', nameEn: 'Marketing Expenses', nameAr: 'مصروفات التسويق', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '5200', essential: false, recommended: true, description: 'مصروفات التسويق والإعلان', isHeader: true },
    { id: 'operational_expenses_group', code: '5240', nameEn: 'Operational Expenses', nameAr: 'المصروفات التشغيلية', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '5200', essential: true, recommended: true, description: 'المصروفات التشغيلية العامة', isHeader: true },
    { id: 'financial_expenses_group', code: '5250', nameEn: 'Financial Expenses', nameAr: 'المصروفات المالية', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '5200', essential: false, recommended: true, description: 'الفوائد والرسوم المصرفية', isHeader: true },

    // ===== المستوى 4 - فئات مصروفات المركبات =====
    { id: 'vehicle_maintenance', code: '5131', nameEn: 'Vehicle Maintenance', nameAr: 'صيانة المركبات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5130', essential: true, recommended: true, description: 'تكاليف صيانة وإصلاح المركبات', isHeader: true },
    { id: 'fuel_expense', code: '5132', nameEn: 'Fuel Expense', nameAr: 'مصاريف الوقود', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5130', essential: false, recommended: true, description: 'تكاليف الوقود للمركبات', isHeader: true },
    { id: 'vehicle_insurance_expense', code: '5133', nameEn: 'Vehicle Insurance Expense', nameAr: 'مصاريف تأمين المركبات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5130', essential: true, recommended: true, description: 'أقساط تأمين المركبات', isHeader: true },
    { id: 'registration_fees', code: '5134', nameEn: 'Registration Fees', nameAr: 'رسوم الترخيص', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5130', essential: false, recommended: true, description: 'رسوم تجديد رخص المركبات', isHeader: true },
    { id: 'vehicle_depreciation_expense', code: '5135', nameEn: 'Vehicle Depreciation', nameAr: 'إهلاك المركبات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5130', essential: true, recommended: true, description: 'مصروف إهلاك المركبات', isHeader: true },
    { id: 'vehicle_cleaning_expense', code: '5136', nameEn: 'Vehicle Cleaning', nameAr: 'تنظيف المركبات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5130', essential: false, recommended: true, description: 'تكاليف تنظيف وغسيل المركبات', isHeader: true },
    { id: 'parking_fees', code: '5137', nameEn: 'Parking Fees', nameAr: 'رسوم المواقف', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5130', essential: false, recommended: true, description: 'رسوم مواقف السيارات', isHeader: true },
    { id: 'traffic_violations', code: '5138', nameEn: 'Traffic Violations', nameAr: 'المخالفات المرورية', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5130', essential: false, recommended: true, description: 'غرامات المخالفات المرورية', isHeader: true },

    // ===== المستوى 4 - فئات مصروفات السائقين =====
    { id: 'driver_salaries', code: '5221', nameEn: 'Driver Salaries', nameAr: 'رواتب السائقين', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5220', essential: false, recommended: true, description: 'رواتب ومكافآت السائقين', isHeader: true },
    { id: 'driver_benefits', code: '5222', nameEn: 'Driver Benefits', nameAr: 'مزايا السائقين', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5220', essential: false, recommended: true, description: 'تأمينات ومزايا السائقين', isHeader: true },
    { id: 'driver_training', code: '5223', nameEn: 'Driver Training', nameAr: 'تدريب السائقين', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5220', essential: false, recommended: true, description: 'تكاليف تدريب وتأهيل السائقين', isHeader: true },

    // ===== المستوى 4 - فئات مصروفات التسويق =====
    { id: 'advertising_expense', code: '5231', nameEn: 'Advertising Expense', nameAr: 'مصاريف الإعلان', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5230', essential: false, recommended: true, description: 'تكاليف الإعلان والتسويق', isHeader: true },
    { id: 'promotional_expense', code: '5232', nameEn: 'Promotional Expense', nameAr: 'مصاريف الترويج', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5230', essential: false, recommended: true, description: 'تكاليف العروض الترويجية', isHeader: true },

    // ===== المستوى 4 - فئات المصروفات التشغيلية =====
    { id: 'office_rent_expense', code: '5241', nameEn: 'Office Rent', nameAr: 'إيجار المكتب', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5240', essential: true, recommended: true, description: 'إيجار المكاتب والمرافق', isHeader: true },
    { id: 'utilities_expense', code: '5242', nameEn: 'Utilities', nameAr: 'المرافق العامة', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5240', essential: true, recommended: true, description: 'فواتير الكهرباء والماء والهاتف', isHeader: true },
    { id: 'communication_expense', code: '5244', nameEn: 'Communication', nameAr: 'الاتصالات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5240', essential: true, recommended: true, description: 'تكاليف الهاتف والإنترنت والاتصالات', isHeader: true },
    { id: 'professional_fees', code: '5245', nameEn: 'Professional Fees', nameAr: 'الأتعاب المهنية', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5240', essential: false, recommended: true, description: 'أتعاب المحاسبين والمحامين والاستشاريين', isHeader: true },

    // ===== المستوى 4 - فئات المصروفات المالية =====
    { id: 'interest_expense', code: '5251', nameEn: 'Interest Expense', nameAr: 'مصاريف الفوائد', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5250', essential: false, recommended: true, description: 'فوائد القروض والتمويل', isHeader: true },
    { id: 'bank_charges', code: '5252', nameEn: 'Bank Charges', nameAr: 'الرسوم المصرفية', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5250', essential: true, recommended: true, description: 'رسوم الخدمات المصرفية', isHeader: true },

    // ===== المستوى 5 - حسابات تفصيلية للصيانة =====
    { id: 'routine_maintenance', code: '51311', nameEn: 'Routine Maintenance', nameAr: 'الصيانة الدورية', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5131', essential: true, recommended: true, description: 'تكاليف الصيانة الدورية للمركبات', isEntryLevel: true },
    { id: 'emergency_repairs', code: '51312', nameEn: 'Emergency Repairs', nameAr: 'الإصلاحات الطارئة', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5131', essential: true, recommended: true, description: 'تكاليف الإصلاحات الطارئة', isEntryLevel: true },
    { id: 'engine_maintenance', code: '51313', nameEn: 'Engine Maintenance', nameAr: 'صيانة المحرك', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5131', essential: true, recommended: true, description: 'تكاليف صيانة وإصلاح المحركات', isEntryLevel: true },
    { id: 'brake_maintenance', code: '51314', nameEn: 'Brake Maintenance', nameAr: 'صيانة الفرامل', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5131', essential: true, recommended: true, description: 'تكاليف صيانة نظام الفرامل', isEntryLevel: true },
    { id: 'tire_replacement', code: '51315', nameEn: 'Tire Replacement', nameAr: 'استبدال الإطارات', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5131', essential: true, recommended: true, description: 'تكاليف استبدال الإطارات', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للوقود =====
    { id: 'fleet_fuel_expense', code: '51321', nameEn: 'Fleet Fuel Expense', nameAr: 'وقود الأسطول', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5132', essential: false, recommended: true, description: 'تكاليف وقود أسطول المركبات', isEntryLevel: true },
    { id: 'oil_change_expense', code: '51322', nameEn: 'Oil Change Expense', nameAr: 'تغيير الزيت', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5132', essential: false, recommended: true, description: 'تكاليف تغيير الزيوت والسوائل', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للتأمين =====
    { id: 'comprehensive_insurance', code: '51331', nameEn: 'Comprehensive Insurance', nameAr: 'التأمين الشامل', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5133', essential: true, recommended: true, description: 'تكاليف التأمين الشامل للمركبات', isEntryLevel: true },
    { id: 'third_party_insurance', code: '51332', nameEn: 'Third Party Insurance', nameAr: 'تأمين الطرف الثالث', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5133', essential: true, recommended: true, description: 'تكاليف تأمين الطرف الثالث', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للرسوم =====
    { id: 'vehicle_registration', code: '51341', nameEn: 'Vehicle Registration', nameAr: 'رسوم تسجيل المركبات', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5134', essential: false, recommended: true, description: 'رسوم تسجيل وترخيص المركبات', isEntryLevel: true },
    { id: 'license_renewal', code: '51342', nameEn: 'License Renewal', nameAr: 'تجديد الرخص', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5134', essential: false, recommended: true, description: 'رسوم تجديد رخص القيادة والتشغيل', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للإهلاك =====
    { id: 'sedan_depreciation', code: '51351', nameEn: 'Sedan Depreciation', nameAr: 'إهلاك السيارات الصالون', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5135', essential: true, recommended: true, description: 'إهلاك السيارات الصالون', isEntryLevel: true },
    { id: 'suv_depreciation', code: '51352', nameEn: 'SUV Depreciation', nameAr: 'إهلاك السيارات الرياضية', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5135', essential: false, recommended: true, description: 'إهلاك السيارات الرياضية', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للتنظيف =====
    { id: 'exterior_cleaning', code: '51361', nameEn: 'Exterior Cleaning', nameAr: 'التنظيف الخارجي', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5136', essential: false, recommended: true, description: 'تكاليف غسيل وتنظيف المركبات من الخارج', isEntryLevel: true },
    { id: 'interior_cleaning', code: '51362', nameEn: 'Interior Cleaning', nameAr: 'التنظيف الداخلي', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5136', essential: false, recommended: true, description: 'تكاليف تنظيف المركبات من الداخل', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للمواقف =====
    { id: 'monthly_parking', code: '51371', nameEn: 'Monthly Parking', nameAr: 'مواقف شهرية', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5137', essential: false, recommended: true, description: 'رسوم المواقف الشهرية', isEntryLevel: true },
    { id: 'hourly_parking', code: '51372', nameEn: 'Hourly Parking', nameAr: 'مواقف بالساعة', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5137', essential: false, recommended: true, description: 'رسوم المواقف بالساعة', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للمخالفات =====
    { id: 'speeding_violations', code: '51381', nameEn: 'Speeding Violations', nameAr: 'مخالفات السرعة', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5138', essential: false, recommended: true, description: 'غرامات مخالفات تجاوز السرعة', isEntryLevel: true },
    { id: 'parking_violations', code: '51382', nameEn: 'Parking Violations', nameAr: 'مخالفات المواقف', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5138', essential: false, recommended: true, description: 'غرامات مخالفات المواقف', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للسائقين =====
    { id: 'driver_basic_salaries', code: '52211', nameEn: 'Driver Basic Salaries', nameAr: 'رواتب السائقين الأساسية', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5221', essential: false, recommended: true, description: 'الرواتب الأساسية للسائقين', isEntryLevel: true },
    { id: 'driver_overtime', code: '52212', nameEn: 'Driver Overtime', nameAr: 'ساعات إضافية السائقين', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5221', essential: false, recommended: true, description: 'مكافآت الساعات الإضافية للسائقين', isEntryLevel: true },

    { id: 'driver_medical_insurance', code: '52221', nameEn: 'Driver Medical Insurance', nameAr: 'التأمين الطبي للسائقين', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5222', essential: false, recommended: true, description: 'تكاليف التأمين الطبي للسائقين', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للتسويق =====
    { id: 'online_advertising', code: '52311', nameEn: 'Online Advertising', nameAr: 'الإعلان الإلكتروني', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5231', essential: false, recommended: true, description: 'تكاليف الإعلان على الإنترنت', isEntryLevel: true },
    { id: 'print_advertising', code: '52312', nameEn: 'Print Advertising', nameAr: 'الإعلان المطبوع', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5231', essential: false, recommended: true, description: 'تكاليف الإعلان في المطبوعات', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للتشغيل =====
    { id: 'main_office_rent', code: '52411', nameEn: 'Main Office Rent', nameAr: 'إيجار المكتب الرئيسي', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5241', essential: true, recommended: true, description: 'إيجار المكتب الرئيسي', isEntryLevel: true },
    { id: 'showroom_rent', code: '52412', nameEn: 'Showroom Rent', nameAr: 'إيجار صالة العرض', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5241', essential: false, recommended: true, description: 'إيجار صالة عرض المركبات', isEntryLevel: true },

    { id: 'electricity_bill', code: '52421', nameEn: 'Electricity Bill', nameAr: 'فاتورة الكهرباء', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5242', essential: true, recommended: true, description: 'فواتير الكهرباء الشهرية', isEntryLevel: true },
    { id: 'water_bill', code: '52422', nameEn: 'Water Bill', nameAr: 'فاتورة الماء', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5242', essential: true, recommended: true, description: 'فواتير المياه الشهرية', isEntryLevel: true },

    { id: 'mobile_phone_bills', code: '52441', nameEn: 'Mobile Phone Bills', nameAr: 'فواتير الهاتف المحمول', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5244', essential: true, recommended: true, description: 'فواتير الهواتف المحمولة', isEntryLevel: true },
    { id: 'internet_bills', code: '52442', nameEn: 'Internet Bills', nameAr: 'فواتير الإنترنت', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5244', essential: true, recommended: true, description: 'فواتير خدمة الإنترنت', isEntryLevel: true },

    { id: 'accounting_fees', code: '52451', nameEn: 'Accounting Fees', nameAr: 'أتعاب المحاسبة', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5245', essential: false, recommended: true, description: 'أتعاب خدمات المحاسبة والمراجعة', isEntryLevel: true },
    { id: 'legal_fees', code: '52452', nameEn: 'Legal Fees', nameAr: 'الأتعاب القانونية', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5245', essential: false, recommended: true, description: 'أتعاب الخدمات القانونية والاستشارات', isEntryLevel: true },

    // ===== المستوى 5 - حسابات تفصيلية للمصروفات المالية =====
    { id: 'vehicle_loan_interest', code: '52511', nameEn: 'Vehicle Loan Interest', nameAr: 'فوائد قروض المركبات', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5251', essential: false, recommended: true, description: 'فوائد قروض تمويل المركبات', isEntryLevel: true },

    { id: 'account_maintenance_fees', code: '52521', nameEn: 'Account Maintenance Fees', nameAr: 'رسوم صيانة الحساب', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5252', essential: true, recommended: true, description: 'رسوم صيانة الحسابات البنكية', isEntryLevel: true },
    { id: 'transfer_fees', code: '52522', nameEn: 'Transfer Fees', nameAr: 'رسوم التحويل', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5252', essential: true, recommended: true, description: 'رسوم التحويلات البنكية', isEntryLevel: true }
  ],

  equity: []
};

// دالة للحصول على حسابات نوع العمل مع دمج الحسابات الأساسية
export const getCleanCarRentalAccounts = (): BusinessTypeAccounts => {
  // الحسابات الأساسية من الملف الأصلي
  const ESSENTIAL_ACCOUNTS: AccountTemplate[] = [
    // ===== LEVEL 1 - MAIN ACCOUNTS =====
    { id: 'assets_main', code: '1000', nameEn: 'Assets', nameAr: 'الأصول', accountType: 'assets', accountLevel: 1, balanceType: 'debit', essential: true, recommended: true, description: 'إجمالي الأصول', isHeader: true },
    { id: 'liabilities_main', code: '2000', nameEn: 'Liabilities', nameAr: 'الخصوم', accountType: 'liabilities', accountLevel: 1, balanceType: 'credit', essential: true, recommended: true, description: 'إجمالي الخصوم', isHeader: true },
    { id: 'equity_main', code: '3000', nameEn: 'Equity', nameAr: 'حقوق الملكية', accountType: 'equity', accountLevel: 1, balanceType: 'credit', essential: true, recommended: true, description: 'إجمالي حقوق الملكية', isHeader: true },
    { id: 'revenue_main', code: '4000', nameEn: 'Revenue', nameAr: 'الإيرادات', accountType: 'revenue', accountLevel: 1, balanceType: 'credit', essential: true, recommended: true, description: 'إجمالي الإيرادات', isHeader: true },
    { id: 'expenses_main', code: '5000', nameEn: 'Expenses', nameAr: 'المصروفات', accountType: 'expenses', accountLevel: 1, balanceType: 'debit', essential: true, recommended: true, description: 'إجمالي المصروفات', isHeader: true },

    // ===== LEVEL 2 - MAJOR GROUPS =====
    { id: 'current_assets', code: '1100', nameEn: 'Current Assets', nameAr: 'الأصول المتداولة', accountType: 'assets', accountLevel: 2, balanceType: 'debit', parentCode: '1000', essential: true, recommended: true, description: 'الأصول المتوقع تحويلها لنقد خلال سنة', isHeader: true },
    { id: 'fixed_assets', code: '1500', nameEn: 'Fixed Assets', nameAr: 'الأصول الثابتة', accountType: 'assets', accountLevel: 2, balanceType: 'debit', parentCode: '1000', essential: true, recommended: true, description: 'الأصول طويلة الأجل', isHeader: true },
    
    { id: 'current_liabilities', code: '2100', nameEn: 'Current Liabilities', nameAr: 'الخصوم المتداولة', accountType: 'liabilities', accountLevel: 2, balanceType: 'credit', parentCode: '2000', essential: true, recommended: true, description: 'الالتزامات المستحقة خلال سنة', isHeader: true },
    
    { id: 'owner_equity', code: '3100', nameEn: 'Owner Equity', nameAr: 'حقوق أصحاب المال', accountType: 'equity', accountLevel: 2, balanceType: 'credit', parentCode: '3000', essential: true, recommended: true, description: 'حقوق المالكين في الشركة', isHeader: true },
    
    { id: 'operating_revenue', code: '4100', nameEn: 'Operating Revenue', nameAr: 'الإيرادات التشغيلية', accountType: 'revenue', accountLevel: 2, balanceType: 'credit', parentCode: '4000', essential: true, recommended: true, description: 'الإيرادات من النشاط الأساسي', isHeader: true },
    
    { id: 'operating_expenses', code: '5100', nameEn: 'Operating Expenses', nameAr: 'المصروفات التشغيلية', accountType: 'expenses', accountLevel: 2, balanceType: 'debit', parentCode: '5000', essential: true, recommended: true, description: 'المصروفات اللازمة للتشغيل', isHeader: true },
    { id: 'administrative_expenses', code: '5200', nameEn: 'Administrative Expenses', nameAr: 'المصروفات الإدارية', accountType: 'expenses', accountLevel: 2, balanceType: 'debit', parentCode: '5000', essential: true, recommended: true, description: 'المصروفات الإدارية والعامة', isHeader: true },

    // ===== LEVEL 3 - SUB GROUPS =====
    { id: 'cash_and_banks', code: '1110', nameEn: 'Cash and Banks', nameAr: 'النقدية والبنوك', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '1100', essential: true, recommended: true, description: 'النقد في الصندوق والحسابات البنكية', isHeader: true },
    { id: 'accounts_receivable_group', code: '1120', nameEn: 'Accounts Receivable', nameAr: 'العملاء والمدينون', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '1100', essential: true, recommended: true, description: 'المبالغ المستحقة من العملاء', isHeader: true },
    
    { id: 'accounts_payable_group', code: '2110', nameEn: 'Accounts Payable', nameAr: 'الموردون والدائنون', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', parentCode: '2100', essential: true, recommended: true, description: 'المبالغ المستحقة للموردين', isHeader: true },
    { id: 'accrued_expenses_group', code: '2120', nameEn: 'Accrued Expenses', nameAr: 'المصاريف المستحقة', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', parentCode: '2100', essential: true, recommended: true, description: 'المصاريف المستحقة وغير المدفوعة', isHeader: true },
    
    { id: 'capital_group', code: '3110', nameEn: 'Capital', nameAr: 'رأس المال', accountType: 'equity', accountLevel: 3, balanceType: 'credit', parentCode: '3100', essential: true, recommended: true, description: 'رأس مال الشركة', isHeader: true },
    
    { id: 'main_revenue', code: '4110', nameEn: 'Main Revenue', nameAr: 'الإيرادات الأساسية', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', parentCode: '4100', essential: true, recommended: true, description: 'إيرادات النشاط الأساسي للشركة', isHeader: true },
    
    { id: 'salaries_group', code: '5210', nameEn: 'Salaries and Benefits', nameAr: 'الرواتب والمزايا', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '5200', essential: true, recommended: true, description: 'رواتب ومزايا الموظفين', isHeader: true },

    // ===== LEVEL 4 - ACCOUNT CATEGORIES =====
    { id: 'cash_accounts', code: '1111', nameEn: 'Cash Accounts', nameAr: 'حسابات النقدية', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1110', essential: true, recommended: true, description: 'حسابات النقد في الصناديق', isHeader: true },
    { id: 'bank_accounts', code: '1112', nameEn: 'Bank Accounts', nameAr: 'الحسابات البنكية', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1110', essential: true, recommended: true, description: 'الحسابات في البنوك المحلية والأجنبية', isHeader: true },
    { id: 'trade_receivables', code: '1121', nameEn: 'Trade Receivables', nameAr: 'العملاء التجاريون', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1120', essential: true, recommended: true, description: 'المستحقات من العملاء التجاريين', isHeader: true },
    
    { id: 'trade_payables', code: '2111', nameEn: 'Trade Payables', nameAr: 'الموردون التجاريون', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2110', essential: true, recommended: true, description: 'المستحقات للموردين التجاريين', isHeader: true },
    { id: 'salary_payables', code: '2121', nameEn: 'Salary Payables', nameAr: 'رواتب مستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2120', essential: true, recommended: true, description: 'الرواتب المستحقة وغير المدفوعة', isHeader: true },
    
    { id: 'paid_capital', code: '3111', nameEn: 'Paid Capital', nameAr: 'رأس المال المدفوع', accountType: 'equity', accountLevel: 4, balanceType: 'credit', parentCode: '3110', essential: true, recommended: true, description: 'رأس المال المدفوع من قبل المالكين', isHeader: true },
    
    { id: 'sales_revenue', code: '4111', nameEn: 'Sales Revenue', nameAr: 'إيرادات المبيعات', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4110', essential: true, recommended: true, description: 'إيرادات من بيع السلع والخدمات', isHeader: true },
    
    { id: 'basic_salaries', code: '5211', nameEn: 'Basic Salaries', nameAr: 'الرواتب الأساسية', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5210', essential: true, recommended: true, description: 'الرواتب الأساسية للموظفين', isHeader: true },

    // ===== LEVEL 5 - ENTRY ACCOUNTS =====
    { id: 'main_cash_box', code: '11111', nameEn: 'Main Cash Box', nameAr: 'صندوق الفرع الرئيسي', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1111', essential: true, recommended: true, description: 'النقد في صندوق الفرع الرئيسي', isEntryLevel: true },
    { id: 'petty_cash', code: '11112', nameEn: 'Petty Cash', nameAr: 'صندوق المصروفات النثرية', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1111', essential: true, recommended: true, description: 'النقد للمصروفات النثرية', isEntryLevel: true },
    
    { id: 'main_bank_account', code: '11121', nameEn: 'Main Bank Account', nameAr: 'الحساب البنكي الرئيسي', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1112', essential: true, recommended: true, description: 'الحساب البنكي الرئيسي للشركة', isEntryLevel: true },
    
    { id: 'general_customers', code: '11211', nameEn: 'General Customers', nameAr: 'عملاء عامون', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1121', essential: true, recommended: true, description: 'العملاء العامون للشركة', isEntryLevel: true },
    
    { id: 'general_suppliers', code: '21111', nameEn: 'General Suppliers', nameAr: 'موردون عامون', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2111', essential: true, recommended: true, description: 'الموردون العامون للشركة', isEntryLevel: true },
    
    { id: 'monthly_salaries_payable', code: '21211', nameEn: 'Monthly Salaries Payable', nameAr: 'رواتب شهرية مستحقة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2121', essential: true, recommended: true, description: 'الرواتب الشهرية المستحقة للموظفين', isEntryLevel: true },
    
    { id: 'owner_capital', code: '31111', nameEn: 'Owner Capital', nameAr: 'رأس مال المالك', accountType: 'equity', accountLevel: 5, balanceType: 'credit', parentCode: '3111', essential: true, recommended: true, description: 'رأس مال المالك الأساسي', isEntryLevel: true },
    
    { id: 'main_sales_revenue', code: '41111', nameEn: 'Main Sales Revenue', nameAr: 'إيرادات المبيعات الرئيسية', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4111', essential: true, recommended: true, description: 'إيرادات المبيعات من النشاط الأساسي', isEntryLevel: true },
    
    { id: 'employee_basic_salaries', code: '52111', nameEn: 'Employee Basic Salaries', nameAr: 'رواتب الموظفين الأساسية', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5211', essential: true, recommended: true, description: 'الرواتب الأساسية لجميع الموظفين', isEntryLevel: true }
  ];

  // دمج الحسابات الأساسية مع حسابات التأجير
  return {
    assets: [
      ...ESSENTIAL_ACCOUNTS.filter(acc => acc.accountType === 'assets'),
      ...CAR_RENTAL_ACCOUNTS.assets
    ],
    liabilities: [
      ...ESSENTIAL_ACCOUNTS.filter(acc => acc.accountType === 'liabilities'),
      ...CAR_RENTAL_ACCOUNTS.liabilities
    ],
    revenue: [
      ...ESSENTIAL_ACCOUNTS.filter(acc => acc.accountType === 'revenue'),
      ...CAR_RENTAL_ACCOUNTS.revenue
    ],
    expenses: [
      ...ESSENTIAL_ACCOUNTS.filter(acc => acc.accountType === 'expenses'),
      ...CAR_RENTAL_ACCOUNTS.expenses
    ],
    equity: [
      ...ESSENTIAL_ACCOUNTS.filter(acc => acc.accountType === 'equity'),
      ...CAR_RENTAL_ACCOUNTS.equity
    ]
  };
};

// دالة لحساب إجمالي الحسابات
export const getCleanCarRentalAccountsCount = (): number => {
  const accounts = getCleanCarRentalAccounts();
  return accounts.assets.length + 
         accounts.liabilities.length + 
         accounts.revenue.length + 
         accounts.expenses.length + 
         accounts.equity.length;
};
