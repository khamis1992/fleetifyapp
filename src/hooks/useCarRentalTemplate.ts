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
 * هيكل محاسبي احترافي من المستوى 1 إلى 5 (50 حساب)
 * محدث من الملف: car_rental_complete_template.json
 */
export const CAR_RENTAL_TEMPLATE: BusinessTypeAccounts = {
  assets: [
    // ===== المستوى 1 - الحساب الرئيسي =====
    { id: 'assets_main', code: '1', nameEn: 'Assets', nameAr: 'الأصول', accountType: 'assets', accountLevel: 1, balanceType: 'debit', essential: true, recommended: true, description: 'إجمالي أصول الشركة', isHeader: true },

    // ===== المستوى 2 - مجموعات الأصول =====
    { id: 'current_assets', code: '11', nameEn: 'Current Assets', nameAr: 'الأصول المتداولة', accountType: 'assets', accountLevel: 2, balanceType: 'debit', essential: true, recommended: true, description: 'الأصول المتوقع تحويلها لنقد خلال سنة', isHeader: true, parentCode: '1' },
    { id: 'fixed_assets', code: '15', nameEn: 'Fixed Assets', nameAr: 'الأصول الثابتة', accountType: 'assets', accountLevel: 2, balanceType: 'debit', essential: true, recommended: true, description: 'الأصول طويلة الأجل', isHeader: true, parentCode: '1' },

    // ===== المستوى 3 - مجموعات فرعية =====
    { id: 'cash_and_banks', code: '111', nameEn: 'Cash and Banks', nameAr: 'النقدية والبنوك', accountType: 'assets', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'النقد في الصندوق والحسابات البنكية', isHeader: true, parentCode: '11' },
    { id: 'accounts_receivable', code: '112', nameEn: 'Accounts Receivable', nameAr: 'العملاء والمدينون', accountType: 'assets', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'المبالغ المستحقة من العملاء', isHeader: true, parentCode: '11' },
    { id: 'vehicle_fleet', code: '151', nameEn: 'Vehicle Fleet', nameAr: 'أسطول المركبات', accountType: 'assets', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'المركبات المملوكة للشركة', isHeader: true, parentCode: '15' },
    { id: 'accumulated_depreciation', code: '159', nameEn: 'Accumulated Depreciation - Vehicles', nameAr: 'مجمع إهلاك المركبات', accountType: 'assets', accountLevel: 3, balanceType: 'credit', essential: true, recommended: true, description: 'مجمع إهلاك أسطول المركبات', isHeader: true, parentCode: '15' },

    // ===== المستوى 5 - حسابات تفصيلية =====
    { id: 'main_cash', code: '11111', nameEn: 'Main Cash Box', nameAr: 'الصندوق الرئيسي', accountType: 'assets', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'النقد في الصندوق الرئيسي', isHeader: false, parentCode: '111', isEntryLevel: true },
    { id: 'petty_cash', code: '11112', nameEn: 'Petty Cash', nameAr: 'صندوق المصروفات النثرية', accountType: 'assets', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'النقد للمصروفات النثرية', isHeader: false, parentCode: '111', isEntryLevel: true },
    { id: 'main_bank', code: '11121', nameEn: 'Main Bank Account', nameAr: 'الحساب البنكي الرئيسي', accountType: 'assets', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'الحساب البنكي الرئيسي للشركة', isHeader: false, parentCode: '111', isEntryLevel: true },
    { id: 'cash_customers', code: '11211', nameEn: 'Individual Cash Customers', nameAr: 'عملاء أفراد نقدي', accountType: 'assets', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'العملاء الأفراد النقدي', isHeader: false, parentCode: '112', isEntryLevel: true },
    { id: 'credit_customers', code: '11212', nameEn: 'Individual Credit Customers', nameAr: 'عملاء أفراد آجل', accountType: 'assets', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'العملاء الأفراد الآجل', isHeader: false, parentCode: '112', isEntryLevel: true },
    { id: 'sedan_fleet', code: '15111', nameEn: 'Sedan Fleet', nameAr: 'أسطول السيارات الصالون', accountType: 'assets', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'السيارات الصالون في الأسطول', isHeader: false, parentCode: '151', isEntryLevel: true },
    { id: 'suv_fleet', code: '15112', nameEn: 'SUV Fleet', nameAr: 'أسطول السيارات الرياضية', accountType: 'assets', accountLevel: 5, balanceType: 'debit', essential: false, recommended: true, description: 'السيارات الرياضية في الأسطول', isHeader: false, parentCode: '151', isEntryLevel: true },
    { id: 'vehicle_depreciation', code: '15911', nameEn: 'Vehicle Depreciation', nameAr: 'مجمع إهلاك المركبات', accountType: 'assets', accountLevel: 5, balanceType: 'credit', essential: true, recommended: true, description: 'مجمع إهلاك أسطول المركبات', isHeader: false, parentCode: '159', isEntryLevel: true }
  ],

  liabilities: [
    // ===== المستوى 1 - الحساب الرئيسي =====
    { id: 'liabilities_main', code: '2', nameEn: 'Liabilities', nameAr: 'الخصوم', accountType: 'liabilities', accountLevel: 1, balanceType: 'credit', essential: true, recommended: true, description: 'إجمالي خصوم الشركة', isHeader: true },

    // ===== المستوى 2 - مجموعات الخصوم =====
    { id: 'current_liabilities', code: '21', nameEn: 'Current Liabilities', nameAr: 'الخصوم المتداولة', accountType: 'liabilities', accountLevel: 2, balanceType: 'credit', essential: true, recommended: true, description: 'الالتزامات المستحقة خلال سنة', isHeader: true, parentCode: '2' },

    // ===== المستوى 3 - مجموعات فرعية =====
    { id: 'accounts_payable', code: '211', nameEn: 'Accounts Payable', nameAr: 'الموردون والدائنون', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', essential: true, recommended: true, description: 'المبالغ المستحقة للموردين', isHeader: true, parentCode: '21' },
    { id: 'customer_deposits', code: '213', nameEn: 'Customer Deposits', nameAr: 'ودائع العملاء', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', essential: true, recommended: true, description: 'الودائع المقبوضة من العملاء', isHeader: true, parentCode: '21' },

    // ===== المستوى 5 - حسابات تفصيلية =====
    { id: 'general_suppliers', code: '21111', nameEn: 'General Suppliers', nameAr: 'موردون عامون', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', essential: true, recommended: true, description: 'الموردون العامون للشركة', isHeader: false, parentCode: '211', isEntryLevel: true },
    { id: 'rental_deposits', code: '21311', nameEn: 'Rental Security Deposits', nameAr: 'ودائع ضمان التأجير', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', essential: true, recommended: true, description: 'ودائع الضمان للتأجير', isHeader: false, parentCode: '213', isEntryLevel: true }
  ],

  equity: [
    // ===== المستوى 1 - الحساب الرئيسي =====
    { id: 'equity_main', code: '3', nameEn: 'Equity', nameAr: 'حقوق الملكية', accountType: 'equity', accountLevel: 1, balanceType: 'credit', essential: true, recommended: true, description: 'إجمالي حقوق الملكية', isHeader: true },

    // ===== المستوى 2 - مجموعات حقوق الملكية =====
    { id: 'owner_equity', code: '31', nameEn: 'Owner Equity', nameAr: 'حقوق المالك', accountType: 'equity', accountLevel: 2, balanceType: 'credit', essential: true, recommended: true, description: 'حقوق المالك في الشركة', isHeader: true, parentCode: '3' },
    { id: 'retained_earnings', code: '32', nameEn: 'Retained Earnings', nameAr: 'الأرباح المحتجزة', accountType: 'equity', accountLevel: 2, balanceType: 'credit', essential: true, recommended: true, description: 'الأرباح المحتجزة من السنوات السابقة', isHeader: true, parentCode: '3' },

    // ===== المستوى 3 - مجموعات فرعية =====
    { id: 'capital', code: '311', nameEn: 'Capital', nameAr: 'رأس المال', accountType: 'equity', accountLevel: 3, balanceType: 'credit', essential: true, recommended: true, description: 'رأس مال الشركة', isHeader: true, parentCode: '31' },
    { id: 'current_year_earnings', code: '321', nameEn: 'Current Year Earnings', nameAr: 'أرباح السنة الحالية', accountType: 'equity', accountLevel: 3, balanceType: 'credit', essential: true, recommended: true, description: 'صافي الربح للسنة الحالية', isHeader: true, parentCode: '32' },

    // ===== المستوى 5 - حسابات تفصيلية =====
    { id: 'owner_capital', code: '31111', nameEn: 'Owner Capital', nameAr: 'رأس مال المالك', accountType: 'equity', accountLevel: 5, balanceType: 'credit', essential: true, recommended: true, description: 'رأس مال المالك الأساسي', isHeader: false, parentCode: '311', isEntryLevel: true }
  ],

  revenue: [
    // ===== المستوى 1 - الحساب الرئيسي =====
    { id: 'revenue_main', code: '4', nameEn: 'Revenue', nameAr: 'الإيرادات', accountType: 'revenue', accountLevel: 1, balanceType: 'credit', essential: true, recommended: true, description: 'إجمالي إيرادات الشركة', isHeader: true },

    // ===== المستوى 2 - مجموعات الإيرادات =====
    { id: 'operating_revenue', code: '41', nameEn: 'Operating Revenue', nameAr: 'الإيرادات التشغيلية', accountType: 'revenue', accountLevel: 2, balanceType: 'credit', essential: true, recommended: true, description: 'الإيرادات من النشاط الأساسي', isHeader: true, parentCode: '4' },
    { id: 'other_revenue', code: '49', nameEn: 'Other Revenue', nameAr: 'إيرادات أخرى', accountType: 'revenue', accountLevel: 2, balanceType: 'credit', essential: false, recommended: true, description: 'الإيرادات الأخرى', isHeader: true, parentCode: '4' },

    // ===== المستوى 3 - مجموعات فرعية =====
    { id: 'rental_revenue', code: '411', nameEn: 'Rental Revenue', nameAr: 'إيرادات التأجير', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', essential: true, recommended: true, description: 'إيرادات تأجير المركبات', isHeader: true, parentCode: '41' },
    { id: 'service_revenue', code: '412', nameEn: 'Service Revenue', nameAr: 'إيرادات الخدمات', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', essential: true, recommended: true, description: 'إيرادات الخدمات الإضافية', isHeader: true, parentCode: '41' },
    { id: 'penalty_revenue', code: '491', nameEn: 'Penalty Revenue', nameAr: 'إيرادات الغرامات', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', essential: false, recommended: true, description: 'إيرادات الغرامات والرسوم الإضافية', isHeader: true, parentCode: '49' },

    // ===== المستوى 5 - حسابات تفصيلية =====
    { id: 'daily_rental', code: '41111', nameEn: 'Daily Rental Revenue', nameAr: 'إيرادات التأجير اليومي', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', essential: true, recommended: true, description: 'إيرادات التأجير اليومي للمركبات', isHeader: false, parentCode: '411', isEntryLevel: true },
    { id: 'monthly_rental', code: '41112', nameEn: 'Monthly Rental Revenue', nameAr: 'إيرادات التأجير الشهري', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', essential: false, recommended: true, description: 'إيرادات التأجير الشهري للمركبات', isHeader: false, parentCode: '411', isEntryLevel: true },
    { id: 'driver_service', code: '41211', nameEn: 'Hourly Driver Service', nameAr: 'خدمة السائق بالساعة', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', essential: false, recommended: true, description: 'إيرادات خدمة السائق بالساعة', isHeader: false, parentCode: '412', isEntryLevel: true },
    { id: 'late_fees', code: '49111', nameEn: 'Late Fees', nameAr: 'رسوم التأخير', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', essential: false, recommended: true, description: 'رسوم التأخير في الإرجاع', isHeader: false, parentCode: '491', isEntryLevel: true }
  ],

  expenses: [
    // ===== المستوى 1 - الحساب الرئيسي =====
    { id: 'expenses_main', code: '5', nameEn: 'Expenses', nameAr: 'المصروفات', accountType: 'expenses', accountLevel: 1, balanceType: 'debit', essential: true, recommended: true, description: 'إجمالي مصروفات الشركة', isHeader: true },

    // ===== المستوى 2 - مجموعات المصروفات =====
    { id: 'operating_expenses', code: '51', nameEn: 'Operating Expenses', nameAr: 'المصروفات التشغيلية', accountType: 'expenses', accountLevel: 2, balanceType: 'debit', essential: true, recommended: true, description: 'المصروفات اللازمة للتشغيل', isHeader: true, parentCode: '5' },
    { id: 'admin_expenses', code: '52', nameEn: 'Administrative Expenses', nameAr: 'المصروفات الإدارية', accountType: 'expenses', accountLevel: 2, balanceType: 'debit', essential: true, recommended: true, description: 'المصروفات الإدارية والعامة', isHeader: true, parentCode: '5' },

    // ===== المستوى 3 - مجموعات فرعية =====
    { id: 'vehicle_expenses', code: '511', nameEn: 'Vehicle Expenses', nameAr: 'مصروفات المركبات', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'جميع مصروفات المركبات', isHeader: true, parentCode: '51' },
    { id: 'maintenance_expenses', code: '512', nameEn: 'Maintenance Expenses', nameAr: 'مصروفات الصيانة', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'مصروفات صيانة وإصلاح المركبات', isHeader: true, parentCode: '51' },
    { id: 'depreciation_expenses', code: '514', nameEn: 'Depreciation Expenses', nameAr: 'مصروفات الإهلاك', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'مصروفات إهلاك الأصول', isHeader: true, parentCode: '51' },
    { id: 'salaries_benefits', code: '521', nameEn: 'Salaries and Benefits', nameAr: 'الرواتب والمزايا', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', essential: true, recommended: true, description: 'رواتب ومزايا الموظفين', isHeader: true, parentCode: '52' },

    // ===== المستوى 5 - حسابات تفصيلية =====
    { id: 'insurance_expense', code: '51111', nameEn: 'Comprehensive Insurance', nameAr: 'التأمين الشامل', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'مصروفات التأمين الشامل للمركبات', isHeader: false, parentCode: '511', isEntryLevel: true },
    { id: 'routine_maintenance', code: '51211', nameEn: 'Routine Maintenance', nameAr: 'الصيانة الدورية', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'تكاليف الصيانة الدورية للمركبات', isHeader: false, parentCode: '512', isEntryLevel: true },
    { id: 'vehicle_depreciation_exp', code: '51411', nameEn: 'Vehicle Depreciation', nameAr: 'إهلاك المركبات', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'مصروف إهلاك أسطول المركبات', isHeader: false, parentCode: '514', isEntryLevel: true },
    { id: 'basic_salaries', code: '52111', nameEn: 'Basic Salaries', nameAr: 'الرواتب الأساسية', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', essential: true, recommended: true, description: 'الرواتب الأساسية للموظفين', isHeader: false, parentCode: '521', isEntryLevel: true }
  ]
};

// دالة للحصول على قالب التأجير المحدث
export const getCarRentalTemplate = (): BusinessTypeAccounts => {
  return CAR_RENTAL_TEMPLATE;
};

// دالة لحساب إجمالي الحسابات في القالب المحدث (50 حساب)
export const getCarRentalTemplateCount = (): number => {
  const template = CAR_RENTAL_TEMPLATE;
  return template.assets.length + 
         template.liabilities.length + 
         template.revenue.length + 
         template.expenses.length + 
         template.equity.length;
};