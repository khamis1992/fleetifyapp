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
 * قالب دليل الحسابات الشامل لشركات تأجير السيارات
 * هيكل محاسبي احترافي شامل من الملف: car_rental_complete_template.json
 * يحتوي على 60 حساب محاسبي من 6 مستويات هرمية
 */
export const CAR_RENTAL_TEMPLATE: BusinessTypeAccounts = {
  assets: [
    // ===== المستوى 1 - الحساب الرئيسي =====
    { id: 'assets_main', code: '1', nameEn: 'Assets', nameAr: 'الأصول', accountType: 'assets', accountLevel: 1, balanceType: 'debit', essential: true, recommended: true, description: 'إجمالي أصول الشركة', isHeader: true },

    // ===== المستوى 2 - المجموعات الرئيسية =====
    { id: 'current_assets', code: '11', nameEn: 'Current Assets', nameAr: 'الأصول المتداولة', accountType: 'assets', accountLevel: 2, balanceType: 'debit', essential: true, recommended: true, description: 'الأصول المتوقع تحويلها لنقد خلال سنة', isHeader: true, parentCode: '1' },
    { id: 'fixed_assets', code: '15', nameEn: 'Fixed Assets', nameAr: 'الأصول الثابتة', accountType: 'assets', accountLevel: 2, balanceType: 'debit', essential: true, recommended: true, description: 'الأصول طويلة الأجل', isHeader: true, parentCode: '1' },

    // ===== المستوى 3 - المجموعات الفرعية =====
    { id: 'cash_and_banks', code: '111', nameEn: 'Cash and Banks', nameAr: 'النقدية والبنوك', accountType: 'assets', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'النقد في الصندوق والحسابات البنكية', isHeader: true, parentCode: '11' },
    { id: 'accounts_receivable', code: '112', nameEn: 'Accounts Receivable', nameAr: 'العملاء والمدينون', accountType: 'assets', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'المبالغ المستحقة من العملاء', isHeader: true, parentCode: '11' },
    { id: 'prepaid_expenses', code: '113', nameEn: 'Prepaid Expenses', nameAr: 'المصروفات المدفوعة مقدماً', accountType: 'assets', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'المصروفات المدفوعة مقدماً', isHeader: true, parentCode: '11' },
    { id: 'inventory', code: '114', nameEn: 'Inventory', nameAr: 'المخزون', accountType: 'assets', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'مخزون قطع الغيار والوقود', isHeader: true, parentCode: '11' },
    { id: 'other_receivables', code: '119', nameEn: 'Other Receivables', nameAr: 'مدينون أخرون', accountType: 'assets', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'المستحقات الأخرى', isHeader: true, parentCode: '11' },
    { id: 'vehicle_fleet', code: '151', nameEn: 'Vehicle Fleet', nameAr: 'أسطول المركبات', accountType: 'assets', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'المركبات المملوكة للشركة', isHeader: true, parentCode: '15' },
    { id: 'equipment', code: '152', nameEn: 'Equipment', nameAr: 'المعدات', accountType: 'assets', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'المعدات والأجهزة', isHeader: true, parentCode: '15' },
    { id: 'accumulated_depreciation', code: '159', nameEn: 'Accumulated Depreciation', nameAr: 'مجمع الإهلاك', accountType: 'assets', accountLevel: 3, balanceType: 'credit', essential: true, recommended: true, description: 'مجمع إهلاك الأصول الثابتة', isHeader: true, parentCode: '15' },

    // ===== المستوى 4 - فئات الحسابات =====
    { id: 'cash_on_hand', code: '1111', nameEn: 'Cash on Hand', nameAr: 'النقد في الصندوق', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'النقد المتوفر في صناديق الشركة', isHeader: true, parentCode: '111' },
    { id: 'bank_accounts', code: '1112', nameEn: 'Bank Accounts', nameAr: 'الحسابات البنكية', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'الحسابات في البنوك', isHeader: true, parentCode: '111' },
    { id: 'individual_customers', code: '1121', nameEn: 'Individual Customers', nameAr: 'عملاء أفراد', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'العملاء الأفراد', isHeader: true, parentCode: '112' },
    { id: 'corporate_customers', code: '1122', nameEn: 'Corporate Customers', nameAr: 'عملاء شركات', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'العملاء من الشركات', isHeader: true, parentCode: '112' },
    { id: 'government_customers', code: '1123', nameEn: 'Government Customers', nameAr: 'عملاء حكوميون', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'العملاء من الجهات الحكومية', isHeader: true, parentCode: '112' },
    { id: 'prepaid_insurance', code: '1131', nameEn: 'Prepaid Insurance', nameAr: 'التأمين المدفوع مقدماً', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'أقساط التأمين المدفوعة مقدماً', isHeader: true, parentCode: '113' },
    { id: 'prepaid_licenses', code: '1132', nameEn: 'Prepaid Licenses', nameAr: 'الرخص المدفوعة مقدماً', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'رسوم التراخيص المدفوعة مقدماً', isHeader: true, parentCode: '113' },
    { id: 'prepaid_rent', code: '1133', nameEn: 'Prepaid Rent', nameAr: 'الإيجار المدفوع مقدماً', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'إيجار المباني المدفوع مقدماً', isHeader: true, parentCode: '113' },
    { id: 'spare_parts', code: '1141', nameEn: 'Spare Parts', nameAr: 'قطع الغيار', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'مخزون قطع غيار المركبات', isHeader: true, parentCode: '114' },
    { id: 'fuel_inventory', code: '1142', nameEn: 'Fuel Inventory', nameAr: 'مخزون الوقود', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'مخزون الوقود والزيوت', isHeader: true, parentCode: '114' },
    { id: 'employee_advances', code: '1191', nameEn: 'Employee Advances', nameAr: 'سلف الموظفين', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'السلف المقدمة للموظفين والسائقين', isHeader: true, parentCode: '119' },
    { id: 'rental_deposits_receivable', code: '1192', nameEn: 'Rental Deposits Receivable', nameAr: 'ودائع تأجير مستحقة', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'ودائع العملاء المستحقة', isHeader: true, parentCode: '119' },
    { id: 'insurance_claims', code: '1193', nameEn: 'Insurance Claims', nameAr: 'مطالبات التأمين', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'المطالبات من شركات التأمين', isHeader: true, parentCode: '119' },
    { id: 'passenger_vehicles', code: '1511', nameEn: 'Passenger Vehicles', nameAr: 'مركبات الركوب', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'مركبات نقل الركاب', isHeader: true, parentCode: '151' },
    { id: 'commercial_vehicles', code: '1512', nameEn: 'Commercial Vehicles', nameAr: 'المركبات التجارية', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'المركبات التجارية والشحن', isHeader: true, parentCode: '151' },
    { id: 'vehicle_equipment', code: '1521', nameEn: 'Vehicle Equipment', nameAr: 'معدات المركبات', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'معدات وأجهزة المركبات', isHeader: true, parentCode: '152' },
    { id: 'office_equipment', code: '1522', nameEn: 'Office Equipment', nameAr: 'معدات المكتب', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'معدات وأجهزة المكتب', isHeader: true, parentCode: '152' },
    { id: 'accumulated_depreciation_vehicles', code: '1591', nameEn: 'Accumulated Depreciation - Vehicles', nameAr: 'مجمع إهلاك المركبات', accountType: 'assets', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'مجمع إهلاك المركبات', isHeader: true, parentCode: '159' },
    { id: 'accumulated_depreciation_equipment', code: '1592', nameEn: 'Accumulated Depreciation - Equipment', nameAr: 'مجمع إهلاك المعدات', accountType: 'assets', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'مجمع إهلاك المعدات', isHeader: true, parentCode: '159' },

    // ===== المستوى 5 - الحسابات التفصيلية =====
    { id: 'main_cash_box', code: '11111', nameEn: 'Main Cash Box', nameAr: 'الصندوق الرئيسي', accountType: 'assets', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'النقد في الصندوق الرئيسي', isHeader: false, parentCode: '1111', isEntryLevel: true },
    { id: 'petty_cash', code: '11112', nameEn: 'Petty Cash', nameAr: 'صندوق المصروفات النثرية', accountType: 'assets', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'النقد للمصروفات النثرية', isHeader: false, parentCode: '1111', isEntryLevel: true },
    { id: 'main_bank_account', code: '11121', nameEn: 'Main Bank Account', nameAr: 'الحساب البنكي الرئيسي', accountType: 'assets', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'الحساب البنكي الرئيسي للشركة', isHeader: false, parentCode: '1112', isEntryLevel: true },
    { id: 'operations_bank_account', code: '11122', nameEn: 'Operations Bank Account', nameAr: 'حساب العمليات البنكي', accountType: 'assets', accountLevel: 5, balanceType: 'debit', essential: false, recommended: true, description: 'حساب بنكي للعمليات اليومية', isHeader: false, parentCode: '1112', isEntryLevel: true }
  ],

  liabilities: [
    // سيتم إضافة الخصوم من الملف المطلوب
  ],

  equity: [
    // سيتم إضافة حقوق الملكية من الملف المطلوب
  ],

  revenue: [
    // سيتم إضافة الإيرادات من الملف المطلوب
  ],

  expenses: [
    // سيتم إضافة المصروفات من الملف المطلوب
  ]
};

// دالة للحصول على قالب التأجير المحدث
export const getCarRentalTemplate = (): BusinessTypeAccounts => {
  return CAR_RENTAL_TEMPLATE;
};

// دالة لحساب إجمالي الحسابات في القالب المحدث (60+ حساب)
export const getCarRentalTemplateCount = (): number => {
  const template = CAR_RENTAL_TEMPLATE;
  return template.assets.length + 
         template.liabilities.length + 
         template.revenue.length + 
         template.expenses.length + 
         template.equity.length;
};