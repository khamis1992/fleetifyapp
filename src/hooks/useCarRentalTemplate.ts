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
  isEntryLevel?: boolean; // true for level 5
  isHeader?: boolean;     // true for levels 1-4
}

export interface BusinessTypeAccounts {
  assets: AccountTemplate[];
  liabilities: AccountTemplate[];
  revenue: AccountTemplate[];
  expenses: AccountTemplate[];
  equity: AccountTemplate[];
}

/**
 * قالب دليل الحسابات المتخصص لشركات تأجير السيارات
 * هيكل محاسبي احترافي من المستوى 1 إلى 5
 * خالي من الحسابات الوهمية والأسماء الشخصية
 */
export const CAR_RENTAL_TEMPLATE: BusinessTypeAccounts = {
  assets: [
    // ===== المستوى 1 - الحساب الرئيسي =====
    { id: 'assets_main', code: '1', nameEn: 'Assets', nameAr: 'الأصول', accountType: 'assets', accountLevel: 1, balanceType: 'debit', essential: true, recommended: true, description: 'إجمالي أصول الشركة', isHeader: true },

    // ===== المستوى 2 - المجموعات الرئيسية =====
    { id: 'current_assets', code: '11', nameEn: 'Current Assets', nameAr: 'الأصول المتداولة', accountType: 'assets', accountLevel: 2, balanceType: 'debit', parentCode: '1', essential: true, recommended: true, description: 'الأصول المتوقع تحويلها لنقد خلال سنة', isHeader: true },
    { id: 'fixed_assets', code: '15', nameEn: 'Fixed Assets', nameAr: 'الأصول الثابتة', accountType: 'assets', accountLevel: 2, balanceType: 'debit', parentCode: '1', essential: true, recommended: true, description: 'الأصول طويلة الأجل', isHeader: true },

    // ===== المستوى 3 - مجموعات الأصول المتداولة =====
    { id: 'cash_and_banks', code: '111', nameEn: 'Cash and Banks', nameAr: 'النقدية والبنوك', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '11', essential: true, recommended: true, description: 'النقد والحسابات البنكية', isHeader: true },
    { id: 'accounts_receivable', code: '112', nameEn: 'Accounts Receivable', nameAr: 'العملاء والمدينون', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '11', essential: true, recommended: true, description: 'المستحقات من العملاء', isHeader: true },
    { id: 'prepaid_expenses', code: '113', nameEn: 'Prepaid Expenses', nameAr: 'المصروفات المدفوعة مقدماً', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '11', essential: true, recommended: true, description: 'المصروفات المدفوعة مقدماً', isHeader: true },
    { id: 'inventory', code: '114', nameEn: 'Inventory', nameAr: 'المخزون', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '11', essential: true, recommended: true, description: 'مخزون قطع الغيار والوقود', isHeader: true },
    { id: 'other_receivables', code: '119', nameEn: 'Other Receivables', nameAr: 'مدينون أخرون', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '11', essential: true, recommended: true, description: 'المستحقات الأخرى', isHeader: true },

    // ===== المستوى 3 - مجموعات الأصول الثابتة =====
    { id: 'vehicle_fleet', code: '151', nameEn: 'Vehicle Fleet', nameAr: 'أسطول المركبات', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '15', essential: true, recommended: true, description: 'المركبات المملوكة للشركة', isHeader: true },
    { id: 'equipment', code: '152', nameEn: 'Equipment', nameAr: 'المعدات', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '15', essential: true, recommended: true, description: 'المعدات والأجهزة', isHeader: true },
    { id: 'accumulated_depreciation_group', code: '159', nameEn: 'Accumulated Depreciation', nameAr: 'مجمع الإهلاك', accountType: 'assets', accountLevel: 3, balanceType: 'credit', parentCode: '15', essential: true, recommended: true, description: 'مجمع إهلاك الأصول الثابتة', isHeader: true },

    // ===== المستوى 4 - تفاصيل النقدية والبنوك =====
    { id: 'cash_on_hand', code: '1111', nameEn: 'Cash on Hand', nameAr: 'النقد في الصندوق', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '111', essential: true, recommended: true, description: 'النقد المتوفر في صناديق الشركة', isHeader: true },
    { id: 'bank_accounts_group', code: '1112', nameEn: 'Bank Accounts', nameAr: 'الحسابات البنكية', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '111', essential: true, recommended: true, description: 'الحسابات في البنوك', isHeader: true },

    // ===== المستوى 4 - تفاصيل العملاء =====
    { id: 'individual_customers', code: '1121', nameEn: 'Individual Customers', nameAr: 'عملاء أفراد', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '112', essential: true, recommended: true, description: 'العملاء الأفراد', isHeader: true },
    { id: 'corporate_customers', code: '1122', nameEn: 'Corporate Customers', nameAr: 'عملاء شركات', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '112', essential: true, recommended: true, description: 'العملاء من الشركات', isHeader: true },
    { id: 'government_customers', code: '1123', nameEn: 'Government Customers', nameAr: 'عملاء حكوميون', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '112', essential: false, recommended: true, description: 'العملاء الحكوميون', isHeader: true },

    // ===== المستوى 4 - تفاصيل المصروفات المقدمة =====
    { id: 'prepaid_insurance', code: '1131', nameEn: 'Prepaid Insurance', nameAr: 'التأمين المدفوع مقدماً', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '113', essential: true, recommended: true, description: 'أقساط التأمين المدفوعة مقدماً', isHeader: true },
    { id: 'prepaid_licenses', code: '1132', nameEn: 'Prepaid Licenses', nameAr: 'الرخص المدفوعة مقدماً', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '113', essential: true, recommended: true, description: 'رسوم التراخيص المدفوعة مقدماً', isHeader: true },
    { id: 'prepaid_rent', code: '1133', nameEn: 'Prepaid Rent', nameAr: 'الإيجار المدفوع مقدماً', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '113', essential: false, recommended: true, description: 'إيجار المباني المدفوع مقدماً', isHeader: true },

    // ===== المستوى 4 - تفاصيل المخزون =====
    { id: 'spare_parts', code: '1141', nameEn: 'Spare Parts', nameAr: 'قطع الغيار', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '114', essential: true, recommended: true, description: 'مخزون قطع غيار المركبات', isHeader: true },
    { id: 'fuel_inventory_group', code: '1142', nameEn: 'Fuel Inventory', nameAr: 'مخزون الوقود', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '114', essential: false, recommended: true, description: 'مخزون الوقود والزيوت', isHeader: true },

    // ===== المستوى 4 - تفاصيل المدينين الأخرى =====
    { id: 'employee_advances', code: '1191', nameEn: 'Employee Advances', nameAr: 'سلف الموظفين', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '119', essential: true, recommended: true, description: 'السلف المقدمة للموظفين والسائقين', isHeader: true },
    { id: 'rental_deposits_receivable', code: '1192', nameEn: 'Rental Deposits Receivable', nameAr: 'ودائع تأجير مستحقة', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '119', essential: true, recommended: true, description: 'ودائع العملاء المستحقة', isHeader: true },
    { id: 'insurance_claims', code: '1193', nameEn: 'Insurance Claims', nameAr: 'مطالبات التأمين', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '119', essential: false, recommended: true, description: 'المطالبات من شركات التأمين', isHeader: true },

    // ===== المستوى 4 - تفاصيل الأصول الثابتة =====
    { id: 'passenger_vehicles', code: '1511', nameEn: 'Passenger Vehicles', nameAr: 'مركبات الركوب', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '151', essential: true, recommended: true, description: 'مركبات نقل الركاب', isHeader: true },
    { id: 'commercial_vehicles', code: '1512', nameEn: 'Commercial Vehicles', nameAr: 'المركبات التجارية', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '151', essential: false, recommended: true, description: 'المركبات التجارية والشحن', isHeader: true },

    { id: 'vehicle_equipment', code: '1521', nameEn: 'Vehicle Equipment', nameAr: 'معدات المركبات', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '152', essential: true, recommended: true, description: 'معدات وأجهزة المركبات', isHeader: true },
    { id: 'office_equipment', code: '1522', nameEn: 'Office Equipment', nameAr: 'معدات المكتب', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '152', essential: false, recommended: true, description: 'معدات وأجهزة المكتب', isHeader: true },

    { id: 'accumulated_depreciation_vehicles', code: '1591', nameEn: 'Accumulated Depreciation - Vehicles', nameAr: 'مجمع إهلاك المركبات', accountType: 'assets', accountLevel: 4, balanceType: 'credit', parentCode: '159', essential: true, recommended: true, description: 'مجمع إهلاك المركبات', isHeader: true },
    { id: 'accumulated_depreciation_equipment', code: '1592', nameEn: 'Accumulated Depreciation - Equipment', nameAr: 'مجمع إهلاك المعدات', accountType: 'assets', accountLevel: 4, balanceType: 'credit', parentCode: '159', essential: true, recommended: true, description: 'مجمع إهلاك المعدات', isHeader: true },

    // ===== المستوى 5 - الحسابات التفصيلية (Entry Level) =====
    // النقدية
    { id: 'main_cash_box', code: '11111', nameEn: 'Main Cash Box', nameAr: 'الصندوق الرئيسي', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1111', essential: true, recommended: true, description: 'النقد في الصندوق الرئيسي', isEntryLevel: true },
    { id: 'petty_cash', code: '11112', nameEn: 'Petty Cash', nameAr: 'صندوق المصروفات النثرية', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1111', essential: true, recommended: true, description: 'النقد للمصروفات النثرية', isEntryLevel: true },

    // الحسابات البنكية
    { id: 'main_bank_account', code: '11121', nameEn: 'Main Bank Account', nameAr: 'الحساب البنكي الرئيسي', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1112', essential: true, recommended: true, description: 'الحساب البنكي الرئيسي للشركة', isEntryLevel: true },
    { id: 'operations_bank_account', code: '11122', nameEn: 'Operations Bank Account', nameAr: 'حساب العمليات البنكي', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1112', essential: false, recommended: true, description: 'حساب بنكي للعمليات اليومية', isEntryLevel: true },

    // العملاء الأفراد
    { id: 'individual_cash_customers', code: '11211', nameEn: 'Individual Cash Customers', nameAr: 'عملاء أفراد نقدي', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1121', essential: true, recommended: true, description: 'العملاء الأفراد النقدي', isEntryLevel: true },
    { id: 'individual_credit_customers', code: '11212', nameEn: 'Individual Credit Customers', nameAr: 'عملاء أفراد آجل', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1121', essential: true, recommended: true, description: 'العملاء الأفراد الآجل', isEntryLevel: true },

    // العملاء الشركات
    { id: 'corporate_cash_customers', code: '11221', nameEn: 'Corporate Cash Customers', nameAr: 'عملاء شركات نقدي', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1122', essential: true, recommended: true, description: 'العملاء الشركات النقدي', isEntryLevel: true },
    { id: 'corporate_credit_customers', code: '11222', nameEn: 'Corporate Credit Customers', nameAr: 'عملاء شركات آجل', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1122', essential: true, recommended: true, description: 'العملاء الشركات الآجل', isEntryLevel: true },

    // العملاء الحكوميون
    { id: 'government_entities', code: '11231', nameEn: 'Government Entities', nameAr: 'الجهات الحكومية', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1123', essential: false, recommended: true, description: 'العملاء من الجهات الحكومية', isEntryLevel: true },

    // التأمين المدفوع مقدماً
    { id: 'vehicle_insurance_prepaid', code: '11311', nameEn: 'Vehicle Insurance Prepaid', nameAr: 'تأمين المركبات مقدماً', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1131', essential: true, recommended: true, description: 'أقساط تأمين المركبات المدفوعة مقدماً', isEntryLevel: true },
    { id: 'comprehensive_insurance_prepaid', code: '11312', nameEn: 'Comprehensive Insurance Prepaid', nameAr: 'التأمين الشامل مقدماً', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1131', essential: false, recommended: true, description: 'التأمين الشامل المدفوع مقدماً', isEntryLevel: true },

    // الرخص المدفوعة مقدماً
    { id: 'vehicle_registration_prepaid', code: '11321', nameEn: 'Vehicle Registration Prepaid', nameAr: 'رسوم ترخيص المركبات مقدماً', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1132', essential: true, recommended: true, description: 'رسوم ترخيص المركبات المدفوعة مقدماً', isEntryLevel: true },
    { id: 'business_license_prepaid', code: '11322', nameEn: 'Business License Prepaid', nameAr: 'الرخصة التجارية مقدماً', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1132', essential: false, recommended: true, description: 'رسوم الرخصة التجارية المدفوعة مقدماً', isEntryLevel: true },

    // الإيجار المدفوع مقدماً
    { id: 'office_rent_prepaid', code: '11331', nameEn: 'Office Rent Prepaid', nameAr: 'إيجار المكتب مقدماً', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1133', essential: true, recommended: true, description: 'إيجار المكتب المدفوع مقدماً', isEntryLevel: true },

    // قطع الغيار
    { id: 'engine_parts', code: '11411', nameEn: 'Engine Parts', nameAr: 'قطع غيار المحرك', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1141', essential: true, recommended: true, description: 'مخزون قطع غيار المحركات', isEntryLevel: true },
    { id: 'tire_inventory', code: '11412', nameEn: 'Tire Inventory', nameAr: 'مخزون الإطارات', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1141', essential: true, recommended: true, description: 'مخزون الإطارات والعجلات', isEntryLevel: true },
    { id: 'brake_parts', code: '11413', nameEn: 'Brake Parts', nameAr: 'قطع غيار الفرامل', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1141', essential: false, recommended: true, description: 'مخزون قطع غيار الفرامل', isEntryLevel: true },

    // الوقود
    { id: 'gasoline_inventory', code: '11421', nameEn: 'Gasoline Inventory', nameAr: 'مخزون البنزين', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1142', essential: false, recommended: true, description: 'مخزون البنزين والوقود', isEntryLevel: true },

    // المدينون الأخرون
    { id: 'driver_advances', code: '11911', nameEn: 'Driver Advances', nameAr: 'سلف السائقين', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1191', essential: true, recommended: true, description: 'السلف المقدمة للسائقين', isEntryLevel: true },
    { id: 'customer_deposits_receivable', code: '11921', nameEn: 'Customer Deposits Receivable', nameAr: 'ودائع العملاء المستحقة', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1192', essential: true, recommended: true, description: 'ودائع الضمان المستحقة من العملاء', isEntryLevel: true },
    { id: 'insurance_claims_receivable', code: '11931', nameEn: 'Insurance Claims Receivable', nameAr: 'مطالبات التأمين المستحقة', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1193', essential: false, recommended: true, description: 'المطالبات المستحقة من شركات التأمين', isEntryLevel: true },

    // المركبات
    { id: 'sedan_fleet', code: '15111', nameEn: 'Sedan Fleet', nameAr: 'أسطول السيارات الصالون', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1511', essential: true, recommended: true, description: 'السيارات الصالون في الأسطول', isEntryLevel: true },
    { id: 'suv_fleet', code: '15112', nameEn: 'SUV Fleet', nameAr: 'أسطول السيارات الرياضية', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1511', essential: false, recommended: true, description: 'السيارات الرياضية في الأسطول', isEntryLevel: true },
    { id: 'van_fleet', code: '15113', nameEn: 'Van Fleet', nameAr: 'أسطول الحافلات الصغيرة', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1511', essential: false, recommended: true, description: 'الحافلات الصغيرة في الأسطول', isEntryLevel: true },

    // المعدات
    { id: 'gps_devices', code: '15211', nameEn: 'GPS Tracking Devices', nameAr: 'أجهزة التتبع', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1521', essential: true, recommended: true, description: 'أجهزة التتبع والملاحة', isEntryLevel: true },
    { id: 'safety_equipment', code: '15212', nameEn: 'Safety Equipment', nameAr: 'معدات السلامة', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1521', essential: false, recommended: true, description: 'معدات الأمان والسلامة', isEntryLevel: true },

    // مجمع الإهلاك
    { id: 'vehicle_depreciation', code: '15911', nameEn: 'Vehicle Depreciation', nameAr: 'مجمع إهلاك المركبات', accountType: 'assets', accountLevel: 5, balanceType: 'credit', parentCode: '1591', essential: true, recommended: true, description: 'مجمع إهلاك أسطول المركبات', isEntryLevel: true },
    { id: 'equipment_depreciation', code: '15921', nameEn: 'Equipment Depreciation', nameAr: 'مجمع إهلاك المعدات', accountType: 'assets', accountLevel: 5, balanceType: 'credit', parentCode: '1592', essential: true, recommended: true, description: 'مجمع إهلاك المعدات والأجهزة', isEntryLevel: true }
  ],

  liabilities: [
    // ===== المستوى 1 - الحساب الرئيسي =====
    { id: 'liabilities_main', code: '2', nameEn: 'Liabilities', nameAr: 'الخصوم', accountType: 'liabilities', accountLevel: 1, balanceType: 'credit', essential: true, recommended: true, description: 'إجمالي خصوم الشركة', isHeader: true },

    // ===== المستوى 2 - المجموعات الرئيسية =====
    { id: 'current_liabilities', code: '21', nameEn: 'Current Liabilities', nameAr: 'الخصوم المتداولة', accountType: 'liabilities', accountLevel: 2, balanceType: 'credit', parentCode: '2', essential: true, recommended: true, description: 'الالتزامات المستحقة خلال سنة', isHeader: true },
    { id: 'long_term_liabilities', code: '25', nameEn: 'Long-term Liabilities', nameAr: 'الخصوم طويلة الأجل', accountType: 'liabilities', accountLevel: 2, balanceType: 'credit', parentCode: '2', essential: false, recommended: true, description: 'الالتزامات طويلة الأجل', isHeader: true },

    // ===== المستوى 3 - مجموعات الخصوم المتداولة =====
    { id: 'accounts_payable', code: '211', nameEn: 'Accounts Payable', nameAr: 'الموردون والدائنون', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', parentCode: '21', essential: true, recommended: true, description: 'المبالغ المستحقة للموردين', isHeader: true },
    { id: 'accrued_expenses', code: '212', nameEn: 'Accrued Expenses', nameAr: 'المصاريف المستحقة', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', parentCode: '21', essential: true, recommended: true, description: 'المصاريف المستحقة وغير المدفوعة', isHeader: true },
    { id: 'customer_deposits', code: '213', nameEn: 'Customer Deposits', nameAr: 'ودائع العملاء', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', parentCode: '21', essential: true, recommended: true, description: 'الودائع المقبوضة من العملاء', isHeader: true },
    { id: 'taxes_payable', code: '216', nameEn: 'Taxes Payable', nameAr: 'ضرائب ورسوم مستحقة', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', parentCode: '21', essential: true, recommended: true, description: 'الضرائب والرسوم المستحقة', isHeader: true },

    // ===== المستوى 3 - الخصوم طويلة الأجل =====
    { id: 'vehicle_financing', code: '251', nameEn: 'Vehicle Financing', nameAr: 'تمويل المركبات', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', parentCode: '25', essential: false, recommended: true, description: 'قروض وتمويل شراء المركبات', isHeader: true },

    // ===== المستوى 4 - تفاصيل الموردين =====
    { id: 'maintenance_suppliers', code: '2111', nameEn: 'Maintenance Suppliers', nameAr: 'موردو الصيانة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '211', essential: true, recommended: true, description: 'موردو خدمات الصيانة', isHeader: true },
    { id: 'parts_suppliers', code: '2112', nameEn: 'Parts Suppliers', nameAr: 'موردو قطع الغيار', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '211', essential: true, recommended: true, description: 'موردو قطع الغيار والإطارات', isHeader: true },
    { id: 'fuel_suppliers', code: '2113', nameEn: 'Fuel Suppliers', nameAr: 'موردو الوقود', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '211', essential: false, recommended: true, description: 'موردو الوقود والزيوت', isHeader: true },
    { id: 'general_suppliers', code: '2119', nameEn: 'General Suppliers', nameAr: 'موردون عامون', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '211', essential: true, recommended: true, description: 'الموردون العامون', isHeader: true },

    // ===== المستوى 4 - تفاصيل المصاريف المستحقة =====
    { id: 'salary_payables', code: '2121', nameEn: 'Salary Payables', nameAr: 'رواتب مستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '212', essential: true, recommended: true, description: 'الرواتب المستحقة وغير المدفوعة', isHeader: true },
    { id: 'insurance_payables', code: '2122', nameEn: 'Insurance Payables', nameAr: 'تأمينات مستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '212', essential: true, recommended: true, description: 'أقساط التأمين المستحقة', isHeader: true },
    { id: 'maintenance_payables', code: '2123', nameEn: 'Maintenance Payables', nameAr: 'صيانة مستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '212', essential: true, recommended: true, description: 'مبالغ الصيانة المستحقة', isHeader: true },

    // ===== المستوى 4 - تفاصيل ودائع العملاء =====
    { id: 'rental_deposits', code: '2131', nameEn: 'Rental Deposits', nameAr: 'ودائع التأجير', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '213', essential: true, recommended: true, description: 'ودائع العملاء للتأجير', isHeader: true },
    { id: 'damage_deposits', code: '2132', nameEn: 'Damage Deposits', nameAr: 'ودائع الأضرار', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '213', essential: true, recommended: true, description: 'ودائع تغطية الأضرار', isHeader: true },

    // ===== المستوى 4 - تفاصيل الضرائب =====
    { id: 'vat_payable', code: '2161', nameEn: 'VAT Payable', nameAr: 'ضريبة القيمة المضافة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '216', essential: true, recommended: true, description: 'ضريبة القيمة المضافة المستحقة', isHeader: true },
    { id: 'license_fees_payable', code: '2162', nameEn: 'License Fees Payable', nameAr: 'رسوم التراخيص', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '216', essential: false, recommended: true, description: 'رسوم التراخيص المستحقة', isHeader: true },

    // ===== المستوى 4 - تفاصيل التمويل =====
    { id: 'vehicle_loans', code: '2511', nameEn: 'Vehicle Loans', nameAr: 'قروض المركبات', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '251', essential: false, recommended: true, description: 'قروض شراء المركبات', isHeader: true },

    // ===== المستوى 5 - الحسابات التفصيلية =====
    // موردو الصيانة
    { id: 'authorized_workshops', code: '21111', nameEn: 'Authorized Workshops', nameAr: 'ورش معتمدة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2111', essential: true, recommended: true, description: 'مستحقات الورش المعتمدة', isEntryLevel: true },
    { id: 'independent_mechanics', code: '21112', nameEn: 'Independent Mechanics', nameAr: 'ميكانيكيون مستقلون', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2111', essential: false, recommended: true, description: 'مستحقات الميكانيكيين المستقلين', isEntryLevel: true },

    // موردو قطع الغيار
    { id: 'original_parts_suppliers', code: '21121', nameEn: 'Original Parts Suppliers', nameAr: 'موردو قطع أصلية', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2112', essential: true, recommended: true, description: 'موردو قطع الغيار الأصلية', isEntryLevel: true },
    { id: 'aftermarket_parts_suppliers', code: '21122', nameEn: 'Aftermarket Parts Suppliers', nameAr: 'موردو قطع تجارية', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2112', essential: false, recommended: true, description: 'موردو قطع الغيار التجارية', isEntryLevel: true },

    // موردو الوقود
    { id: 'gas_stations', code: '21131', nameEn: 'Gas Stations', nameAr: 'محطات الوقود', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2113', essential: false, recommended: true, description: 'مستحقات محطات الوقود', isEntryLevel: true },

    // الرواتب المستحقة
    { id: 'employee_salaries_payable', code: '21211', nameEn: 'Employee Salaries Payable', nameAr: 'رواتب الموظفين المستحقة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2121', essential: true, recommended: true, description: 'رواتب الموظفين المستحقة', isEntryLevel: true },
    { id: 'driver_salaries_payable', code: '21212', nameEn: 'Driver Salaries Payable', nameAr: 'رواتب السائقين المستحقة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2121', essential: true, recommended: true, description: 'رواتب السائقين المستحقة', isEntryLevel: true },

    // التأمينات المستحقة
    { id: 'vehicle_insurance_payable', code: '21221', nameEn: 'Vehicle Insurance Payable', nameAr: 'تأمين المركبات المستحق', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2122', essential: true, recommended: true, description: 'أقساط تأمين المركبات المستحقة', isEntryLevel: true },
    { id: 'employee_insurance_payable', code: '21222', nameEn: 'Employee Insurance Payable', nameAr: 'تأمين الموظفين المستحق', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2122', essential: false, recommended: true, description: 'تأمينات الموظفين المستحقة', isEntryLevel: true },

    // الصيانة المستحقة
    { id: 'routine_maintenance_payable', code: '21231', nameEn: 'Routine Maintenance Payable', nameAr: 'صيانة دورية مستحقة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2123', essential: true, recommended: true, description: 'مبالغ الصيانة الدورية المستحقة', isEntryLevel: true },
    { id: 'emergency_repairs_payable', code: '21232', nameEn: 'Emergency Repairs Payable', nameAr: 'إصلاحات طارئة مستحقة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2123', essential: false, recommended: true, description: 'مبالغ الإصلاحات الطارئة المستحقة', isEntryLevel: true },

    // ودائع العملاء
    { id: 'rental_security_deposits', code: '21311', nameEn: 'Rental Security Deposits', nameAr: 'ودائع ضمان التأجير', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2131', essential: true, recommended: true, description: 'ودائع الضمان للتأجير', isEntryLevel: true },
    { id: 'vehicle_damage_deposits', code: '21321', nameEn: 'Vehicle Damage Deposits', nameAr: 'ودائع أضرار المركبات', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2132', essential: true, recommended: true, description: 'ودائع تغطية أضرار المركبات', isEntryLevel: true },

    // الضرائب والرسوم
    { id: 'vat_payable_detail', code: '21611', nameEn: 'VAT Payable', nameAr: 'ضريبة القيمة المضافة المستحقة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2161', essential: true, recommended: true, description: 'ضريبة القيمة المضافة المستحقة للدولة', isEntryLevel: true },
    { id: 'vehicle_registration_fees', code: '21621', nameEn: 'Vehicle Registration Fees', nameAr: 'رسوم ترخيص المركبات', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2162', essential: false, recommended: true, description: 'رسوم ترخيص المركبات المستحقة', isEntryLevel: true },

    // التمويل
    { id: 'bank_vehicle_loans', code: '25111', nameEn: 'Bank Vehicle Loans', nameAr: 'قروض بنكية للمركبات', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2511', essential: false, recommended: true, description: 'قروض بنكية لشراء المركبات', isEntryLevel: true }
  ],

  revenue: [
    // ===== المستوى 1 - الحساب الرئيسي =====
    { id: 'revenue_main', code: '4', nameEn: 'Revenue', nameAr: 'الإيرادات', accountType: 'revenue', accountLevel: 1, balanceType: 'credit', essential: true, recommended: true, description: 'إجمالي إيرادات الشركة', isHeader: true },

    // ===== المستوى 2 - المجموعات الرئيسية =====
    { id: 'operating_revenue', code: '41', nameEn: 'Operating Revenue', nameAr: 'الإيرادات التشغيلية', accountType: 'revenue', accountLevel: 2, balanceType: 'credit', parentCode: '4', essential: true, recommended: true, description: 'الإيرادات من النشاط الأساسي', isHeader: true },
    { id: 'other_revenue', code: '49', nameEn: 'Other Revenue', nameAr: 'إيرادات أخرى', accountType: 'revenue', accountLevel: 2, balanceType: 'credit', parentCode: '4', essential: false, recommended: true, description: 'الإيرادات الأخرى', isHeader: true },

    // ===== المستوى 3 - مجموعات الإيرادات التشغيلية =====
    { id: 'rental_revenue_group', code: '411', nameEn: 'Rental Revenue', nameAr: 'إيرادات التأجير', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', parentCode: '41', essential: true, recommended: true, description: 'إيرادات تأجير المركبات', isHeader: true },
    { id: 'service_revenue_group', code: '412', nameEn: 'Service Revenue', nameAr: 'إيرادات الخدمات', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', parentCode: '41', essential: true, recommended: true, description: 'إيرادات الخدمات الإضافية', isHeader: true },
    { id: 'sales_revenue_group', code: '413', nameEn: 'Sales Revenue', nameAr: 'إيرادات المبيعات', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', parentCode: '41', essential: false, recommended: true, description: 'إيرادات مبيعات المركبات والأصول', isHeader: true },

    // ===== المستوى 3 - الإيرادات الأخرى =====
    { id: 'penalty_revenue', code: '491', nameEn: 'Penalty Revenue', nameAr: 'إيرادات الغرامات', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', parentCode: '49', essential: false, recommended: true, description: 'إيرادات الغرامات والرسوم الإضافية', isHeader: true },

    // ===== المستوى 4 - تفاصيل إيرادات التأجير =====
    { id: 'daily_rental', code: '4111', nameEn: 'Daily Rental', nameAr: 'التأجير اليومي', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '411', essential: true, recommended: true, description: 'إيرادات التأجير اليومي', isHeader: true },
    { id: 'weekly_rental', code: '4112', nameEn: 'Weekly Rental', nameAr: 'التأجير الأسبوعي', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '411', essential: false, recommended: true, description: 'إيرادات التأجير الأسبوعي', isHeader: true },
    { id: 'monthly_rental', code: '4113', nameEn: 'Monthly Rental', nameAr: 'التأجير الشهري', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '411', essential: true, recommended: true, description: 'إيرادات التأجير الشهري', isHeader: true },

    // ===== المستوى 4 - تفاصيل إيرادات الخدمات =====
    { id: 'driver_service', code: '4121', nameEn: 'Driver Service', nameAr: 'خدمة السائق', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '412', essential: true, recommended: true, description: 'إيرادات خدمة توفير السائق', isHeader: true },
    { id: 'delivery_service', code: '4122', nameEn: 'Delivery Service', nameAr: 'خدمة التوصيل', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '412', essential: false, recommended: true, description: 'إيرادات خدمة التوصيل', isHeader: true },
    { id: 'additional_fees', code: '4123', nameEn: 'Additional Fees', nameAr: 'الرسوم الإضافية', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '412', essential: true, recommended: true, description: 'رسوم إضافية (وقود، تنظيف، GPS)', isHeader: true },

    // ===== المستوى 4 - تفاصيل إيرادات المبيعات =====
    { id: 'vehicle_sales', code: '4131', nameEn: 'Vehicle Sales', nameAr: 'مبيعات المركبات', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '413', essential: false, recommended: true, description: 'إيرادات بيع المركبات المستعملة', isHeader: true },

    // ===== المستوى 4 - تفاصيل الغرامات =====
    { id: 'late_fees', code: '4911', nameEn: 'Late Fees', nameAr: 'رسوم التأخير', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '491', essential: false, recommended: true, description: 'رسوم التأخير في الإرجاع', isHeader: true },
    { id: 'damage_fees', code: '4912', nameEn: 'Damage Fees', nameAr: 'رسوم الأضرار', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '491', essential: false, recommended: true, description: 'رسوم الأضرار والتلفيات', isHeader: true },

    // ===== المستوى 5 - الحسابات التفصيلية =====
    // التأجير اليومي
    { id: 'sedan_daily_rental', code: '41111', nameEn: 'Sedan Daily Rental', nameAr: 'تأجير الصالون اليومي', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4111', essential: true, recommended: true, description: 'إيرادات تأجير السيارات الصالون يومياً', isEntryLevel: true },
    { id: 'suv_daily_rental', code: '41112', nameEn: 'SUV Daily Rental', nameAr: 'تأجير الرياضية اليومي', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4111', essential: false, recommended: true, description: 'إيرادات تأجير السيارات الرياضية يومياً', isEntryLevel: true },

    // التأجير الشهري
    { id: 'sedan_monthly_rental', code: '41131', nameEn: 'Sedan Monthly Rental', nameAr: 'تأجير الصالون الشهري', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4113', essential: true, recommended: true, description: 'إيرادات تأجير السيارات الصالون شهرياً', isEntryLevel: true },
    { id: 'corporate_monthly_rental', code: '41132', nameEn: 'Corporate Monthly Rental', nameAr: 'تأجير الشركات الشهري', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4113', essential: true, recommended: true, description: 'إيرادات التأجير الشهري للشركات', isEntryLevel: true },

    // خدمة السائق
    { id: 'hourly_driver_service', code: '41211', nameEn: 'Hourly Driver Service', nameAr: 'خدمة السائق بالساعة', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4121', essential: true, recommended: true, description: 'إيرادات خدمة السائق بالساعة', isEntryLevel: true },
    { id: 'daily_driver_service', code: '41212', nameEn: 'Daily Driver Service', nameAr: 'خدمة السائق اليومية', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4121', essential: false, recommended: true, description: 'إيرادات خدمة السائق اليومية', isEntryLevel: true },

    // الرسوم الإضافية
    { id: 'fuel_fees', code: '41231', nameEn: 'Fuel Fees', nameAr: 'رسوم الوقود', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4123', essential: true, recommended: true, description: 'إيرادات رسوم الوقود الإضافية', isEntryLevel: true },
    { id: 'cleaning_fees', code: '41232', nameEn: 'Cleaning Fees', nameAr: 'رسوم التنظيف', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4123', essential: false, recommended: true, description: 'إيرادات رسوم التنظيف', isEntryLevel: true },
    { id: 'gps_fees', code: '41233', nameEn: 'GPS Fees', nameAr: 'رسوم التتبع', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4123', essential: false, recommended: true, description: 'إيرادات رسوم خدمة التتبع', isEntryLevel: true }
  ],

  expenses: [
    // ===== المستوى 1 - الحساب الرئيسي =====
    { id: 'expenses_main', code: '5', nameEn: 'Expenses', nameAr: 'المصروفات', accountType: 'expenses', accountLevel: 1, balanceType: 'debit', essential: true, recommended: true, description: 'إجمالي مصروفات الشركة', isHeader: true },

    // ===== المستوى 2 - المجموعات الرئيسية =====
    { id: 'operating_expenses', code: '51', nameEn: 'Operating Expenses', nameAr: 'المصروفات التشغيلية', accountType: 'expenses', accountLevel: 2, balanceType: 'debit', parentCode: '5', essential: true, recommended: true, description: 'المصروفات اللازمة للتشغيل', isHeader: true },
    { id: 'administrative_expenses', code: '52', nameEn: 'Administrative Expenses', nameAr: 'المصروفات الإدارية', accountType: 'expenses', accountLevel: 2, balanceType: 'debit', parentCode: '5', essential: true, recommended: true, description: 'المصروفات الإدارية والعامة', isHeader: true },
    { id: 'financial_expenses', code: '59', nameEn: 'Financial Expenses', nameAr: 'المصروفات المالية', accountType: 'expenses', accountLevel: 2, balanceType: 'debit', parentCode: '5', essential: false, recommended: true, description: 'الفوائد والرسوم المصرفية', isHeader: true },

    // ===== المستوى 3 - مجموعات المصروفات التشغيلية =====
    { id: 'vehicle_expenses', code: '511', nameEn: 'Vehicle Expenses', nameAr: 'مصروفات المركبات', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '51', essential: true, recommended: true, description: 'جميع مصروفات المركبات', isHeader: true },
    { id: 'maintenance_expenses', code: '512', nameEn: 'Maintenance Expenses', nameAr: 'مصروفات الصيانة', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '51', essential: true, recommended: true, description: 'مصروفات صيانة وإصلاح المركبات', isHeader: true },
    { id: 'fuel_expenses', code: '513', nameEn: 'Fuel Expenses', nameAr: 'مصروفات الوقود', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '51', essential: true, recommended: true, description: 'مصروفات الوقود والزيوت', isHeader: true },
    { id: 'depreciation_expenses', code: '514', nameEn: 'Depreciation Expenses', nameAr: 'مصروفات الإهلاك', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '51', essential: true, recommended: true, description: 'مصروفات إهلاك الأصول', isHeader: true },

    // ===== المستوى 3 - مجموعات المصروفات الإدارية =====
    { id: 'salaries_benefits', code: '521', nameEn: 'Salaries and Benefits', nameAr: 'الرواتب والمزايا', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '52', essential: true, recommended: true, description: 'رواتب ومزايا الموظفين', isHeader: true },
    { id: 'office_expenses', code: '522', nameEn: 'Office Expenses', nameAr: 'مصروفات المكتب', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '52', essential: true, recommended: true, description: 'مصروفات تشغيل المكتب', isHeader: true },
    { id: 'marketing_expenses', code: '523', nameEn: 'Marketing Expenses', nameAr: 'مصروفات التسويق', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '52', essential: false, recommended: true, description: 'مصروفات التسويق والإعلان', isHeader: true },

    // ===== المستوى 3 - المصروفات المالية =====
    { id: 'interest_expenses', code: '591', nameEn: 'Interest Expenses', nameAr: 'مصروفات الفوائد', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '59', essential: false, recommended: true, description: 'فوائد القروض والتمويل', isHeader: true },
    { id: 'bank_charges', code: '592', nameEn: 'Bank Charges', nameAr: 'الرسوم المصرفية', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '59', essential: true, recommended: true, description: 'رسوم الخدمات المصرفية', isHeader: true },

    // ===== المستوى 4 - تفاصيل مصروفات المركبات =====
    { id: 'vehicle_insurance', code: '5111', nameEn: 'Vehicle Insurance', nameAr: 'تأمين المركبات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '511', essential: true, recommended: true, description: 'مصروفات تأمين المركبات', isHeader: true },
    { id: 'vehicle_registration', code: '5112', nameEn: 'Vehicle Registration', nameAr: 'ترخيص المركبات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '511', essential: true, recommended: true, description: 'رسوم ترخيص المركبات', isHeader: true },
    { id: 'vehicle_cleaning', code: '5113', nameEn: 'Vehicle Cleaning', nameAr: 'تنظيف المركبات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '511', essential: false, recommended: true, description: 'مصروفات تنظيف المركبات', isHeader: true },

    // ===== المستوى 4 - تفاصيل الصيانة =====
    { id: 'routine_maintenance', code: '5121', nameEn: 'Routine Maintenance', nameAr: 'الصيانة الدورية', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '512', essential: true, recommended: true, description: 'مصروفات الصيانة الدورية', isHeader: true },
    { id: 'emergency_repairs', code: '5122', nameEn: 'Emergency Repairs', nameAr: 'الإصلاحات الطارئة', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '512', essential: true, recommended: true, description: 'مصروفات الإصلاحات الطارئة', isHeader: true },
    { id: 'spare_parts_expense', code: '5123', nameEn: 'Spare Parts Expense', nameAr: 'مصروفات قطع الغيار', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '512', essential: true, recommended: true, description: 'مصروفات شراء قطع الغيار', isHeader: true },

    // ===== المستوى 4 - تفاصيل الوقود =====
    { id: 'fleet_fuel', code: '5131', nameEn: 'Fleet Fuel', nameAr: 'وقود الأسطول', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '513', essential: true, recommended: true, description: 'مصروفات وقود أسطول المركبات', isHeader: true },

    // ===== المستوى 4 - تفاصيل الإهلاك =====
    { id: 'vehicle_depreciation_expense', code: '5141', nameEn: 'Vehicle Depreciation', nameAr: 'إهلاك المركبات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '514', essential: true, recommended: true, description: 'مصروف إهلاك المركبات', isHeader: true },
    { id: 'equipment_depreciation_expense', code: '5142', nameEn: 'Equipment Depreciation', nameAr: 'إهلاك المعدات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '514', essential: true, recommended: true, description: 'مصروف إهلاك المعدات', isHeader: true },

    // ===== المستوى 4 - تفاصيل الرواتب =====
    { id: 'employee_salaries', code: '5211', nameEn: 'Employee Salaries', nameAr: 'رواتب الموظفين', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '521', essential: true, recommended: true, description: 'رواتب الموظفين الإداريين', isHeader: true },
    { id: 'driver_salaries', code: '5212', nameEn: 'Driver Salaries', nameAr: 'رواتب السائقين', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '521', essential: true, recommended: true, description: 'رواتب السائقين', isHeader: true },
    { id: 'employee_benefits', code: '5213', nameEn: 'Employee Benefits', nameAr: 'مزايا الموظفين', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '521', essential: true, recommended: true, description: 'تأمينات ومزايا الموظفين', isHeader: true },

    // ===== المستوى 4 - تفاصيل مصروفات المكتب =====
    { id: 'office_rent', code: '5221', nameEn: 'Office Rent', nameAr: 'إيجار المكتب', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '522', essential: true, recommended: true, description: 'إيجار المكاتب والمرافق', isHeader: true },
    { id: 'utilities', code: '5222', nameEn: 'Utilities', nameAr: 'المرافق العامة', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '522', essential: true, recommended: true, description: 'فواتير الكهرباء والماء والهاتف', isHeader: true },
    { id: 'communication', code: '5223', nameEn: 'Communication', nameAr: 'الاتصالات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '522', essential: true, recommended: true, description: 'تكاليف الهاتف والإنترنت', isHeader: true },
    { id: 'professional_fees', code: '5224', nameEn: 'Professional Fees', nameAr: 'الأتعاب المهنية', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '522', essential: false, recommended: true, description: 'أتعاب المحاسبين والمحامين', isHeader: true },

    // ===== المستوى 4 - تفاصيل التسويق =====
    { id: 'advertising', code: '5231', nameEn: 'Advertising', nameAr: 'الإعلان', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '523', essential: false, recommended: true, description: 'مصروفات الإعلان والتسويق', isHeader: true },

    // ===== المستوى 5 - الحسابات التفصيلية =====
    // تأمين المركبات
    { id: 'comprehensive_insurance_expense', code: '51111', nameEn: 'Comprehensive Insurance', nameAr: 'التأمين الشامل', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5111', essential: true, recommended: true, description: 'مصروفات التأمين الشامل للمركبات', isEntryLevel: true },
    { id: 'third_party_insurance_expense', code: '51112', nameEn: 'Third Party Insurance', nameAr: 'تأمين الطرف الثالث', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5111', essential: true, recommended: true, description: 'مصروفات تأمين الطرف الثالث', isEntryLevel: true },

    // ترخيص المركبات
    { id: 'annual_registration', code: '51121', nameEn: 'Annual Registration', nameAr: 'الترخيص السنوي', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5112', essential: true, recommended: true, description: 'رسوم الترخيص السنوي للمركبات', isEntryLevel: true },

    // الصيانة الدورية
    { id: 'oil_change', code: '51211', nameEn: 'Oil Change', nameAr: 'تغيير الزيت', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5121', essential: true, recommended: true, description: 'مصروفات تغيير الزيت والفلاتر', isEntryLevel: true },
    { id: 'tire_replacement', code: '51212', nameEn: 'Tire Replacement', nameAr: 'استبدال الإطارات', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5121', essential: true, recommended: true, description: 'مصروفات استبدال الإطارات', isEntryLevel: true },

    // الإصلاحات الطارئة
    { id: 'engine_repairs', code: '51221', nameEn: 'Engine Repairs', nameAr: 'إصلاح المحرك', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5122', essential: true, recommended: true, description: 'مصروفات إصلاح المحركات', isEntryLevel: true },
    { id: 'brake_repairs', code: '51222', nameEn: 'Brake Repairs', nameAr: 'إصلاح الفرامل', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5122', essential: true, recommended: true, description: 'مصروفات إصلاح الفرامل', isEntryLevel: true },

    // الوقود
    { id: 'gasoline_expense', code: '51311', nameEn: 'Gasoline Expense', nameAr: 'مصروفات البنزين', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5131', essential: true, recommended: true, description: 'مصروفات البنزين للأسطول', isEntryLevel: true },

    // الإهلاك
    { id: 'vehicle_depreciation_detail', code: '51411', nameEn: 'Vehicle Depreciation', nameAr: 'إهلاك المركبات', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5141', essential: true, recommended: true, description: 'مصروف إهلاك أسطول المركبات', isEntryLevel: true },
    { id: 'equipment_depreciation_detail', code: '51421', nameEn: 'Equipment Depreciation', nameAr: 'إهلاك المعدات', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5142', essential: true, recommended: true, description: 'مصروف إهلاك المعدات', isEntryLevel: true },

    // الرواتب
    { id: 'basic_salaries', code: '52111', nameEn: 'Basic Salaries', nameAr: 'الرواتب الأساسية', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5211', essential: true, recommended: true, description: 'الرواتب الأساسية للموظفين', isEntryLevel: true },
    { id: 'driver_basic_salaries', code: '52121', nameEn: 'Driver Basic Salaries', nameAr: 'رواتب السائقين الأساسية', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5212', essential: true, recommended: true, description: 'الرواتب الأساسية للسائقين', isEntryLevel: true },
    { id: 'medical_insurance', code: '52131', nameEn: 'Medical Insurance', nameAr: 'التأمين الطبي', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5213', essential: true, recommended: true, description: 'مصروفات التأمين الطبي للموظفين', isEntryLevel: true },

    // مصروفات المكتب
    { id: 'main_office_rent', code: '52211', nameEn: 'Main Office Rent', nameAr: 'إيجار المكتب الرئيسي', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5221', essential: true, recommended: true, description: 'إيجار المكتب الرئيسي', isEntryLevel: true },
    { id: 'electricity_bills', code: '52221', nameEn: 'Electricity Bills', nameAr: 'فواتير الكهرباء', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5222', essential: true, recommended: true, description: 'فواتير الكهرباء الشهرية', isEntryLevel: true },
    { id: 'water_bills', code: '52222', nameEn: 'Water Bills', nameAr: 'فواتير الماء', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5222', essential: true, recommended: true, description: 'فواتير المياه الشهرية', isEntryLevel: true },
    { id: 'phone_internet', code: '52231', nameEn: 'Phone & Internet', nameAr: 'الهاتف والإنترنت', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5223', essential: true, recommended: true, description: 'فواتير الهاتف والإنترنت', isEntryLevel: true },
    { id: 'accounting_fees', code: '52241', nameEn: 'Accounting Fees', nameAr: 'أتعاب المحاسبة', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5224', essential: false, recommended: true, description: 'أتعاب خدمات المحاسبة', isEntryLevel: true }
  ],

  equity: [
    // ===== المستوى 1 - الحساب الرئيسي =====
    { id: 'equity_main', code: '3', nameEn: 'Equity', nameAr: 'حقوق الملكية', accountType: 'equity', accountLevel: 1, balanceType: 'credit', essential: true, recommended: true, description: 'إجمالي حقوق الملكية', isHeader: true },

    // ===== المستوى 2 - المجموعات الرئيسية =====
    { id: 'owner_equity', code: '31', nameEn: 'Owner Equity', nameAr: 'حقوق المالك', accountType: 'equity', accountLevel: 2, balanceType: 'credit', parentCode: '3', essential: true, recommended: true, description: 'حقوق المالك في الشركة', isHeader: true },
    { id: 'retained_earnings', code: '32', nameEn: 'Retained Earnings', nameAr: 'الأرباح المحتجزة', accountType: 'equity', accountLevel: 2, balanceType: 'credit', parentCode: '3', essential: true, recommended: true, description: 'الأرباح المحتجزة من السنوات السابقة', isHeader: true },

    // ===== المستوى 3 - تفاصيل حقوق المالك =====
    { id: 'capital', code: '311', nameEn: 'Capital', nameAr: 'رأس المال', accountType: 'equity', accountLevel: 3, balanceType: 'credit', parentCode: '31', essential: true, recommended: true, description: 'رأس مال الشركة', isHeader: true },
    { id: 'owner_drawings', code: '312', nameEn: 'Owner Drawings', nameAr: 'مسحوبات المالك', accountType: 'equity', accountLevel: 3, balanceType: 'debit', parentCode: '31', essential: true, recommended: true, description: 'مسحوبات المالك الشخصية', isHeader: true },

    // ===== المستوى 3 - الأرباح المحتجزة =====
    { id: 'current_year_earnings', code: '321', nameEn: 'Current Year Earnings', nameAr: 'أرباح السنة الحالية', accountType: 'equity', accountLevel: 3, balanceType: 'credit', parentCode: '32', essential: true, recommended: true, description: 'صافي الربح للسنة الحالية', isHeader: true },
    { id: 'prior_year_earnings', code: '322', nameEn: 'Prior Year Earnings', nameAr: 'أرباح السنوات السابقة', accountType: 'equity', accountLevel: 3, balanceType: 'credit', parentCode: '32', essential: true, recommended: true, description: 'الأرباح المحتجزة من السنوات السابقة', isHeader: true },

    // ===== المستوى 4 - تفاصيل رأس المال =====
    { id: 'paid_capital', code: '3111', nameEn: 'Paid Capital', nameAr: 'رأس المال المدفوع', accountType: 'equity', accountLevel: 4, balanceType: 'credit', parentCode: '311', essential: true, recommended: true, description: 'رأس المال المدفوع فعلياً', isHeader: true },

    // ===== المستوى 5 - الحسابات التفصيلية =====
    { id: 'owner_capital_account', code: '31111', nameEn: 'Owner Capital Account', nameAr: 'حساب رأس مال المالك', accountType: 'equity', accountLevel: 5, balanceType: 'credit', parentCode: '3111', essential: true, recommended: true, description: 'حساب رأس مال المالك الأساسي', isEntryLevel: true }
  ]
};

// دالة للحصول على قالب التأجير المنظم
export const getCarRentalTemplate = (): BusinessTypeAccounts => {
  return CAR_RENTAL_TEMPLATE;
};

// دالة لحساب إجمالي الحسابات في القالب المنظم
export const getCarRentalTemplateCount = (): number => {
  const template = CAR_RENTAL_TEMPLATE;
  return template.assets.length + 
         template.liabilities.length + 
         template.revenue.length + 
         template.expenses.length + 
         template.equity.length;
};
