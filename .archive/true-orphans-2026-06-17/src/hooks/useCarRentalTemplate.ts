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
    // ===== المستوى 1 - الحساب الرئيسي =====
    { id: 'liabilities_main', code: '2', nameEn: 'Liabilities', nameAr: 'الخصوم', accountType: 'liabilities', accountLevel: 1, balanceType: 'credit', essential: true, recommended: true, description: 'إجمالي خصوم الشركة', isHeader: true },

    // ===== المستوى 2 - المجموعات الرئيسية =====
    { id: 'current_liabilities', code: '21', nameEn: 'Current Liabilities', nameAr: 'الخصوم المتداولة', accountType: 'liabilities', accountLevel: 2, balanceType: 'credit', essential: true, recommended: true, description: 'الالتزامات المستحقة خلال سنة', isHeader: true, parentCode: '2' },
    { id: 'long_term_liabilities', code: '25', nameEn: 'Long-term Liabilities', nameAr: 'الخصوم طويلة الأجل', accountType: 'liabilities', accountLevel: 2, balanceType: 'credit', essential: false, recommended: true, description: 'الالتزامات طويلة الأجل', isHeader: true, parentCode: '2' },

    // ===== المستوى 3 - المجموعات الفرعية =====
    { id: 'accounts_payable', code: '211', nameEn: 'Accounts Payable', nameAr: 'الموردون والدائنون', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', essential: true, recommended: true, description: 'المبالغ المستحقة للموردين', isHeader: true, parentCode: '21' },
    { id: 'accrued_expenses', code: '212', nameEn: 'Accrued Expenses', nameAr: 'المصروفات المستحقة', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', essential: true, recommended: true, description: 'المصروفات المستحقة غير المدفوعة', isHeader: true, parentCode: '21' },
    { id: 'customer_deposits', code: '213', nameEn: 'Customer Deposits', nameAr: 'ودائع العملاء', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', essential: true, recommended: true, description: 'الودائع المقبوضة من العملاء', isHeader: true, parentCode: '21' },
    { id: 'vehicle_loans', code: '251', nameEn: 'Vehicle Loans', nameAr: 'قروض المركبات', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', essential: false, recommended: true, description: 'قروض شراء المركبات', isHeader: true, parentCode: '25' },

    // ===== المستوى 4 - فئات الحسابات =====
    { id: 'suppliers_general', code: '2111', nameEn: 'General Suppliers', nameAr: 'موردون عامون', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'الموردون العامون للشركة', isHeader: true, parentCode: '211' },
    { id: 'vehicle_suppliers', code: '2112', nameEn: 'Vehicle Suppliers', nameAr: 'موردو المركبات', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'موردو المركبات وقطع الغيار', isHeader: true, parentCode: '211' },
    { id: 'salary_accruals', code: '2121', nameEn: 'Salary Accruals', nameAr: 'الرواتب المستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'رواتب الموظفين المستحقة', isHeader: true, parentCode: '212' },
    { id: 'tax_accruals', code: '2122', nameEn: 'Tax Accruals', nameAr: 'الضرائب المستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'الضرائب والرسوم المستحقة', isHeader: true, parentCode: '212' },
    { id: 'rental_deposits', code: '2131', nameEn: 'Rental Security Deposits', nameAr: 'ودائع ضمان التأجير', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'ودائع الضمان للتأجير', isHeader: true, parentCode: '213' },

    // ===== المستوى 5 - الحسابات التفصيلية =====
    { id: 'spare_parts_suppliers', code: '21121', nameEn: 'Spare Parts Suppliers', nameAr: 'موردو قطع الغيار', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', essential: true, recommended: true, description: 'موردو قطع غيار المركبات', isHeader: false, parentCode: '2112', isEntryLevel: true },
    { id: 'employee_salaries_payable', code: '21211', nameEn: 'Employee Salaries Payable', nameAr: 'رواتب الموظفين المستحقة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', essential: true, recommended: true, description: 'رواتب الموظفين المستحقة الدفع', isHeader: false, parentCode: '2121', isEntryLevel: true },
    { id: 'customer_security_deposits', code: '21311', nameEn: 'Customer Security Deposits', nameAr: 'ودائع ضمان العملاء', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', essential: true, recommended: true, description: 'ودائع الضمان المقبوضة من العملاء', isHeader: false, parentCode: '2131', isEntryLevel: true }
  ],

  equity: [
    // ===== المستوى 1 - الحساب الرئيسي =====
    { id: 'equity_main', code: '3', nameEn: 'Equity', nameAr: 'حقوق الملكية', accountType: 'equity', accountLevel: 1, balanceType: 'credit', essential: true, recommended: true, description: 'إجمالي حقوق الملكية', isHeader: true },

    // ===== المستوى 2 - المجموعات الرئيسية =====
    { id: 'owner_equity', code: '31', nameEn: 'Owner Equity', nameAr: 'حقوق المالك', accountType: 'equity', accountLevel: 2, balanceType: 'credit', essential: true, recommended: true, description: 'حقوق المالك في الشركة', isHeader: true, parentCode: '3' },
    { id: 'retained_earnings', code: '32', nameEn: 'Retained Earnings', nameAr: 'الأرباح المحتجزة', accountType: 'equity', accountLevel: 2, balanceType: 'credit', essential: true, recommended: true, description: 'الأرباح المحتجزة من السنوات السابقة', isHeader: true, parentCode: '3' },

    // ===== المستوى 3 - المجموعات الفرعية =====
    { id: 'capital', code: '311', nameEn: 'Capital', nameAr: 'رأس المال', accountType: 'equity', accountLevel: 3, balanceType: 'credit', essential: true, recommended: true, description: 'رأس مال الشركة', isHeader: true, parentCode: '31' },
    { id: 'drawings', code: '312', nameEn: 'Owner Drawings', nameAr: 'مسحوبات المالك', accountType: 'equity', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'مسحوبات المالك الشخصية', isHeader: true, parentCode: '31' },
    { id: 'current_year_earnings', code: '321', nameEn: 'Current Year Earnings', nameAr: 'أرباح السنة الحالية', accountType: 'equity', accountLevel: 3, balanceType: 'credit', essential: true, recommended: true, description: 'صافي الربح للسنة الحالية', isHeader: true, parentCode: '32' },

    // ===== المستوى 5 - الحسابات التفصيلية =====
    { id: 'owner_capital', code: '31111', nameEn: 'Owner Capital', nameAr: 'رأس مال المالك', accountType: 'equity', accountLevel: 5, balanceType: 'credit', essential: true, recommended: true, description: 'رأس مال المالك الأساسي', isHeader: false, parentCode: '311', isEntryLevel: true },
    { id: 'personal_drawings', code: '31211', nameEn: 'Personal Drawings', nameAr: 'مسحوبات شخصية', accountType: 'equity', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'المسحوبات الشخصية للمالك', isHeader: false, parentCode: '312', isEntryLevel: true }
  ],

  revenue: [
    // ===== المستوى 1 - الحساب الرئيسي =====
    { id: 'revenue_main', code: '4', nameEn: 'Revenue', nameAr: 'الإيرادات', accountType: 'revenue', accountLevel: 1, balanceType: 'credit', essential: true, recommended: true, description: 'إجمالي إيرادات الشركة', isHeader: true },

    // ===== المستوى 2 - المجموعات الرئيسية =====
    { id: 'operating_revenue', code: '41', nameEn: 'Operating Revenue', nameAr: 'الإيرادات التشغيلية', accountType: 'revenue', accountLevel: 2, balanceType: 'credit', essential: true, recommended: true, description: 'الإيرادات من النشاط الأساسي', isHeader: true, parentCode: '4' },
    { id: 'other_revenue', code: '49', nameEn: 'Other Revenue', nameAr: 'إيرادات أخرى', accountType: 'revenue', accountLevel: 2, balanceType: 'credit', essential: false, recommended: true, description: 'الإيرادات الأخرى', isHeader: true, parentCode: '4' },

    // ===== المستوى 3 - المجموعات الفرعية =====
    { id: 'rental_revenue', code: '411', nameEn: 'Rental Revenue', nameAr: 'إيرادات التأجير', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', essential: true, recommended: true, description: 'إيرادات تأجير المركبات', isHeader: true, parentCode: '41' },
    { id: 'service_revenue', code: '412', nameEn: 'Service Revenue', nameAr: 'إيرادات الخدمات', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', essential: true, recommended: true, description: 'إيرادات الخدمات الإضافية', isHeader: true, parentCode: '41' },
    { id: 'penalty_revenue', code: '491', nameEn: 'Penalty Revenue', nameAr: 'إيرادات الغرامات', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', essential: false, recommended: true, description: 'إيرادات الغرامات والرسوم الإضافية', isHeader: true, parentCode: '49' },

    // ===== المستوى 4 - فئات الحسابات =====
    { id: 'daily_rental', code: '4111', nameEn: 'Daily Rental', nameAr: 'التأجير اليومي', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'إيرادات التأجير اليومي', isHeader: true, parentCode: '411' },
    { id: 'weekly_rental', code: '4112', nameEn: 'Weekly Rental', nameAr: 'التأجير الأسبوعي', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', essential: false, recommended: true, description: 'إيرادات التأجير الأسبوعي', isHeader: true, parentCode: '411' },
    { id: 'monthly_rental', code: '4113', nameEn: 'Monthly Rental', nameAr: 'التأجير الشهري', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'إيرادات التأجير الشهري', isHeader: true, parentCode: '411' },
    { id: 'driver_service', code: '4121', nameEn: 'Driver Service', nameAr: 'خدمة السائق', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', essential: false, recommended: true, description: 'إيرادات خدمة السائق', isHeader: true, parentCode: '412' },
    { id: 'delivery_service', code: '4122', nameEn: 'Delivery Service', nameAr: 'خدمة التوصيل', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', essential: false, recommended: true, description: 'إيرادات خدمة التوصيل', isHeader: true, parentCode: '412' },

    // ===== المستوى 5 - الحسابات التفصيلية =====
    { id: 'sedan_daily_rental', code: '41111', nameEn: 'Sedan Daily Rental', nameAr: 'تأجير صالون يومي', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', essential: true, recommended: true, description: 'إيرادات تأجير السيارات الصالون يومياً', isHeader: false, parentCode: '4111', isEntryLevel: true },
    { id: 'suv_daily_rental', code: '41112', nameEn: 'SUV Daily Rental', nameAr: 'تأجير رياضي يومي', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', essential: false, recommended: true, description: 'إيرادات تأجير السيارات الرياضية يومياً', isHeader: false, parentCode: '4111', isEntryLevel: true },
    { id: 'sedan_monthly_rental', code: '41131', nameEn: 'Sedan Monthly Rental', nameAr: 'تأجير صالون شهري', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', essential: true, recommended: true, description: 'إيرادات تأجير السيارات الصالون شهرياً', isHeader: false, parentCode: '4113', isEntryLevel: true },
    { id: 'hourly_driver_service', code: '41211', nameEn: 'Hourly Driver Service', nameAr: 'خدمة السائق بالساعة', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', essential: false, recommended: true, description: 'إيرادات خدمة السائق بالساعة', isHeader: false, parentCode: '4121', isEntryLevel: true }
  ],

  expenses: [
    // ===== المستوى 1 - الحساب الرئيسي =====
    { id: 'expenses_main', code: '5', nameEn: 'Expenses', nameAr: 'المصروفات', accountType: 'expenses', accountLevel: 1, balanceType: 'debit', essential: true, recommended: true, description: 'إجمالي مصروفات الشركة', isHeader: true },

    // ===== المستوى 2 - المجموعات الرئيسية =====
    { id: 'operating_expenses', code: '51', nameEn: 'Operating Expenses', nameAr: 'المصروفات التشغيلية', accountType: 'expenses', accountLevel: 2, balanceType: 'debit', essential: true, recommended: true, description: 'المصروفات اللازمة للتشغيل', isHeader: true, parentCode: '5' },
    { id: 'admin_expenses', code: '52', nameEn: 'Administrative Expenses', nameAr: 'المصروفات الإدارية', accountType: 'expenses', accountLevel: 2, balanceType: 'debit', essential: true, recommended: true, description: 'المصروفات الإدارية والعامة', isHeader: true, parentCode: '5' },

    // ===== المستوى 3 - المجموعات الفرعية =====
    { id: 'vehicle_expenses', code: '511', nameEn: 'Vehicle Expenses', nameAr: 'مصروفات المركبات', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'جميع مصروفات المركبات', isHeader: true, parentCode: '51' },
    { id: 'maintenance_expenses', code: '512', nameEn: 'Maintenance Expenses', nameAr: 'مصروفات الصيانة', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'مصروفات صيانة وإصلاح المركبات', isHeader: true, parentCode: '51' },
    { id: 'fuel_expenses', code: '513', nameEn: 'Fuel Expenses', nameAr: 'مصروفات الوقود', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'مصروفات الوقود والزيوت', isHeader: true, parentCode: '51' },
    { id: 'depreciation_expenses', code: '514', nameEn: 'Depreciation Expenses', nameAr: 'مصروفات الإهلاك', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'مصروفات إهلاك الأصول', isHeader: true, parentCode: '51' },
    { id: 'salaries_benefits', code: '521', nameEn: 'Salaries and Benefits', nameAr: 'الرواتب والمزايا', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'رواتب ومزايا الموظفين', isHeader: true, parentCode: '52' },
    { id: 'office_expenses', code: '522', nameEn: 'Office Expenses', nameAr: 'مصروفات المكتب', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'مصروفات المكتب والإدارة', isHeader: true, parentCode: '52' },

    // ===== المستوى 4 - فئات الحسابات =====
    { id: 'insurance_expense', code: '5111', nameEn: 'Insurance Expenses', nameAr: 'مصروفات التأمين', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'مصروفات تأمين المركبات', isHeader: true, parentCode: '511' },
    { id: 'registration_fees', code: '5112', nameEn: 'Registration Fees', nameAr: 'رسوم التسجيل', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'رسوم تسجيل وترخيص المركبات', isHeader: true, parentCode: '511' },
    { id: 'routine_maintenance', code: '5121', nameEn: 'Routine Maintenance', nameAr: 'الصيانة الدورية', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'تكاليف الصيانة الدورية', isHeader: true, parentCode: '512' },
    { id: 'emergency_repairs', code: '5122', nameEn: 'Emergency Repairs', nameAr: 'الإصلاحات الطارئة', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'تكاليف الإصلاحات الطارئة', isHeader: true, parentCode: '512' },
    { id: 'gasoline_expense', code: '5131', nameEn: 'Gasoline Expense', nameAr: 'مصروف البنزين', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'تكلفة البنزين للمركبات', isHeader: true, parentCode: '513' },
    { id: 'vehicle_depreciation_exp', code: '5141', nameEn: 'Vehicle Depreciation', nameAr: 'إهلاك المركبات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'مصروف إهلاك أسطول المركبات', isHeader: true, parentCode: '514' },
    { id: 'basic_salaries', code: '5211', nameEn: 'Basic Salaries', nameAr: 'الرواتب الأساسية', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'الرواتب الأساسية للموظفين', isHeader: true, parentCode: '521' },
    { id: 'allowances', code: '5212', nameEn: 'Allowances', nameAr: 'البدلات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'بدلات الموظفين المختلفة', isHeader: true, parentCode: '521' },
    { id: 'rent_expense', code: '5221', nameEn: 'Rent Expense', nameAr: 'مصروف الإيجار', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'إيجار المكاتب والمباني', isHeader: true, parentCode: '522' },
    { id: 'utilities', code: '5222', nameEn: 'Utilities', nameAr: 'المرافق العامة', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'الكهرباء والماء والهاتف', isHeader: true, parentCode: '522' },

    // ===== المستوى 5 - الحسابات التفصيلية =====
    { id: 'comprehensive_insurance', code: '51111', nameEn: 'Comprehensive Insurance', nameAr: 'التأمين الشامل', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'مصروفات التأمين الشامل للمركبات', isHeader: false, parentCode: '5111', isEntryLevel: true },
    { id: 'oil_change', code: '51211', nameEn: 'Oil Change', nameAr: 'تغيير الزيت', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'تكلفة تغيير زيت المحرك', isHeader: false, parentCode: '5121', isEntryLevel: true },
    { id: 'tire_replacement', code: '51212', nameEn: 'Tire Replacement', nameAr: 'تغيير الإطارات', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'تكلفة تغيير إطارات المركبات', isHeader: false, parentCode: '5121', isEntryLevel: true },
    { id: 'regular_gasoline', code: '51311', nameEn: 'Regular Gasoline', nameAr: 'بنزين عادي', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'تكلفة البنزين العادي', isHeader: false, parentCode: '5131', isEntryLevel: true },
    { id: 'employee_basic_salary', code: '52111', nameEn: 'Employee Basic Salary', nameAr: 'راتب الموظف الأساسي', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'الراتب الأساسي للموظفين', isHeader: false, parentCode: '5211', isEntryLevel: true },
    { id: 'driver_allowance', code: '52121', nameEn: 'Driver Allowance', nameAr: 'بدل السائق', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', essential: false, recommended: true, description: 'بدل السائقين', isHeader: false, parentCode: '5212', isEntryLevel: true }
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