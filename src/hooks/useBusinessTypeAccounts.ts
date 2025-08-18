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
  isHeader?: boolean;     // true for levels 1-3
}

export interface BusinessTypeAccounts {
  assets: AccountTemplate[];
  liabilities: AccountTemplate[];
  revenue: AccountTemplate[];
  expenses: AccountTemplate[];
  equity: AccountTemplate[];
}

// Default accounts that all businesses need - Complete Hierarchy
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
  { id: 'cash_accounts', code: '1111', nameEn: 'Cash Accounts', nameAr: 'حسابات النقدية', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1110', essential: true, recommended: true, description: 'حسابات النقد في الصناديق' },
  { id: 'bank_accounts', code: '1112', nameEn: 'Bank Accounts', nameAr: 'الحسابات البنكية', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1110', essential: true, recommended: true, description: 'الحسابات في البنوك المحلية والأجنبية' },
  { id: 'trade_receivables', code: '1121', nameEn: 'Trade Receivables', nameAr: 'العملاء التجاريون', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1120', essential: true, recommended: true, description: 'المستحقات من العملاء التجاريين' },
  
  { id: 'trade_payables', code: '2111', nameEn: 'Trade Payables', nameAr: 'الموردون التجاريون', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2110', essential: true, recommended: true, description: 'المستحقات للموردين التجاريين' },
  { id: 'salary_payables', code: '2121', nameEn: 'Salary Payables', nameAr: 'رواتب مستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2120', essential: true, recommended: true, description: 'الرواتب المستحقة وغير المدفوعة' },
  
  { id: 'paid_capital', code: '3111', nameEn: 'Paid Capital', nameAr: 'رأس المال المدفوع', accountType: 'equity', accountLevel: 4, balanceType: 'credit', parentCode: '3110', essential: true, recommended: true, description: 'رأس المال المدفوع من قبل المالكين' },
  
  { id: 'sales_revenue', code: '4111', nameEn: 'Sales Revenue', nameAr: 'إيرادات المبيعات', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4110', essential: true, recommended: true, description: 'إيرادات من بيع السلع والخدمات' },
  
  { id: 'basic_salaries', code: '5211', nameEn: 'Basic Salaries', nameAr: 'الرواتب الأساسية', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5210', essential: true, recommended: true, description: 'الرواتب الأساسية للموظفين' },

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

// Business-specific account templates
const BUSINESS_SPECIFIC_ACCOUNTS: Record<string, Partial<BusinessTypeAccounts>> = {
  car_rental: {
    assets: [
      // Level 3 - Vehicle Assets Group
      { id: 'vehicle_assets_group', code: '1150', nameEn: 'Vehicle Assets', nameAr: 'أصول المركبات', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '1500', essential: true, recommended: true, description: 'مجموعة أصول المركبات والمعدات', isHeader: true },
      
      // Level 4 - Vehicle Categories
      { id: 'vehicle_fleet', code: '1151', nameEn: 'Vehicle Fleet', nameAr: 'أسطول المركبات', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1150', essential: true, recommended: true, description: 'المركبات المملوكة للشركة' },
      { id: 'vehicle_equipment', code: '1152', nameEn: 'Vehicle Equipment', nameAr: 'معدات المركبات', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1150', essential: false, recommended: true, description: 'المعدات والتجهيزات الإضافية للمركبات' },
      
      // Level 3 - Prepaid Assets
      { id: 'prepaid_assets_group', code: '1130', nameEn: 'Prepaid Assets', nameAr: 'الأصول المدفوعة مقدماً', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '1100', essential: false, recommended: true, description: 'المصاريف المدفوعة مقدماً', isHeader: true },
      
      // Level 4 - Prepaid Categories
      { id: 'prepaid_insurance', code: '1131', nameEn: 'Prepaid Insurance', nameAr: 'التأمين المدفوع مقدماً', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1130', essential: false, recommended: true, description: 'أقساط التأمين المدفوعة مقدماً' },
      
      // Level 3 - Other Receivables
      { id: 'other_receivables_group', code: '1140', nameEn: 'Other Receivables', nameAr: 'مدينون أخرون', accountType: 'assets', accountLevel: 3, balanceType: 'debit', parentCode: '1100', essential: false, recommended: true, description: 'المستحقات الأخرى', isHeader: true },
      
      // Level 4 - Other Receivables Categories
      { id: 'driver_advances', code: '1141', nameEn: 'Driver Advances', nameAr: 'عهد السائقين', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1140', essential: false, recommended: true, description: 'العهد والسلف المقدمة للسائقين' },
      { id: 'rental_deposits_receivable', code: '1142', nameEn: 'Rental Deposits Receivable', nameAr: 'ودائع تأجير مستحقة', accountType: 'assets', accountLevel: 4, balanceType: 'debit', parentCode: '1140', essential: false, recommended: true, description: 'الودائع المستحقة من العملاء' },
      
      // Level 5 - Entry Level Accounts
      { id: 'sedan_fleet', code: '11511', nameEn: 'Sedan Fleet', nameAr: 'أسطول السيارات الصالون', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1151', essential: true, recommended: true, description: 'السيارات الصالون في الأسطول', isEntryLevel: true },
      { id: 'suv_fleet', code: '11512', nameEn: 'SUV Fleet', nameAr: 'أسطول السيارات الرياضية', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1151', essential: false, recommended: true, description: 'السيارات الرياضية في الأسطول', isEntryLevel: true },
      { id: 'van_fleet', code: '11513', nameEn: 'Van Fleet', nameAr: 'أسطول الحافلات الصغيرة', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1151', essential: false, recommended: true, description: 'الحافلات الصغيرة في الأسطول', isEntryLevel: true },
      
      { id: 'vehicle_insurance_prepaid', code: '11311', nameEn: 'Vehicle Insurance Prepaid', nameAr: 'تأمين المركبات المدفوع مقدماً', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1131', essential: false, recommended: true, description: 'أقساط تأمين المركبات المدفوعة مقدماً', isEntryLevel: true },
      
      { id: 'driver_cash_advances', code: '11411', nameEn: 'Driver Cash Advances', nameAr: 'عهد نقدية للسائقين', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1141', essential: false, recommended: true, description: 'العهد النقدية المقدمة للسائقين', isEntryLevel: true },
      { id: 'customer_security_deposits', code: '11421', nameEn: 'Customer Security Deposits', nameAr: 'ودائع ضمان العملاء', accountType: 'assets', accountLevel: 5, balanceType: 'debit', parentCode: '1142', essential: false, recommended: true, description: 'ودائع الضمان المقبوضة من العملاء', isEntryLevel: true }
    ],
    
    liabilities: [
      // Level 3 - Customer Deposits Group
      { id: 'customer_deposits_group', code: '2130', nameEn: 'Customer Deposits', nameAr: 'ودائع العملاء', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', parentCode: '2100', essential: false, recommended: true, description: 'الودائع المقبوضة من العملاء', isHeader: true },
      
      // Level 4 - Deposit Categories
      { id: 'rental_deposits', code: '2131', nameEn: 'Rental Deposits', nameAr: 'ودائع التأجير', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2130', essential: false, recommended: true, description: 'ودائع العملاء للتأجير' },
      
      // Level 3 - Maintenance Payables
      { id: 'maintenance_payables_group', code: '2140', nameEn: 'Maintenance Payables', nameAr: 'مستحقات الصيانة', accountType: 'liabilities', accountLevel: 3, balanceType: 'credit', parentCode: '2100', essential: false, recommended: true, description: 'المبالغ المستحقة للصيانة', isHeader: true },
      
      // Level 4 - Maintenance Categories
      { id: 'vehicle_maintenance_payable', code: '2141', nameEn: 'Vehicle Maintenance Payable', nameAr: 'صيانة المركبات المستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', parentCode: '2140', essential: false, recommended: true, description: 'مبالغ صيانة المركبات المستحقة' },
      
      // Level 5 - Entry Level Accounts
      { id: 'rental_security_deposits', code: '21311', nameEn: 'Rental Security Deposits', nameAr: 'ودائع ضمان التأجير', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2131', essential: false, recommended: true, description: 'ودائع الضمان للتأجير', isEntryLevel: true },
      { id: 'advance_rental_payments', code: '21312', nameEn: 'Advance Rental Payments', nameAr: 'دفعات تأجير مقدمة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2131', essential: false, recommended: true, description: 'المبالغ المقبوضة مقدماً للتأجير', isEntryLevel: true },
      
      { id: 'workshop_maintenance_payable', code: '21411', nameEn: 'Workshop Maintenance Payable', nameAr: 'صيانة الورش المستحقة', accountType: 'liabilities', accountLevel: 5, balanceType: 'credit', parentCode: '2141', essential: false, recommended: true, description: 'مبالغ صيانة الورش المستحقة', isEntryLevel: true }
    ],
    
    revenue: [
      // Level 3 - Rental Revenue Group  
      { id: 'rental_revenue_group', code: '4120', nameEn: 'Rental Revenue', nameAr: 'إيرادات التأجير', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', parentCode: '4100', essential: true, recommended: true, description: 'إيرادات تأجير المركبات', isHeader: true },
      
      // Level 4 - Rental Categories
      { id: 'rental_revenue', code: '4121', nameEn: 'Vehicle Rental Revenue', nameAr: 'إيرادات تأجير المركبات', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4120', essential: true, recommended: true, description: 'إيرادات تأجير المركبات الأساسية' },
      { id: 'additional_fees_revenue', code: '4122', nameEn: 'Additional Fees Revenue', nameAr: 'إيرادات الرسوم الإضافية', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4120', essential: false, recommended: true, description: 'رسوم إضافية (وقود، تنظيف، إلخ)' },
      
      // Level 3 - Other Revenue
      { id: 'other_revenue_group', code: '4180', nameEn: 'Other Revenue', nameAr: 'إيرادات أخرى', accountType: 'revenue', accountLevel: 3, balanceType: 'credit', parentCode: '4100', essential: false, recommended: false, description: 'الإيرادات الأخرى', isHeader: true },
      
      // Level 4 - Other Revenue Categories
      { id: 'insurance_revenue', code: '4181', nameEn: 'Insurance Revenue', nameAr: 'إيرادات التأمين', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4180', essential: false, recommended: false, description: 'إيرادات من خدمات التأمين' },
      { id: 'late_fees', code: '4182', nameEn: 'Late Fees', nameAr: 'رسوم التأخير', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', parentCode: '4180', essential: false, recommended: true, description: 'رسوم التأخير في الإرجاع' },
      
      // Level 5 - Entry Level Accounts
      { id: 'daily_rental_revenue', code: '41211', nameEn: 'Daily Rental Revenue', nameAr: 'إيرادات التأجير اليومي', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4121', essential: true, recommended: true, description: 'إيرادات التأجير اليومي للمركبات', isEntryLevel: true },
      { id: 'weekly_rental_revenue', code: '41212', nameEn: 'Weekly Rental Revenue', nameAr: 'إيرادات التأجير الأسبوعي', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4121', essential: false, recommended: true, description: 'إيرادات التأجير الأسبوعي للمركبات', isEntryLevel: true },
      { id: 'monthly_rental_revenue', code: '41213', nameEn: 'Monthly Rental Revenue', nameAr: 'إيرادات التأجير الشهري', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4121', essential: false, recommended: true, description: 'إيرادات التأجير الشهري للمركبات', isEntryLevel: true },
      
      { id: 'fuel_supplement_revenue', code: '41221', nameEn: 'Fuel Supplement Revenue', nameAr: 'إيرادات رسوم الوقود', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4122', essential: false, recommended: true, description: 'إيرادات من رسوم الوقود الإضافية', isEntryLevel: true },
      { id: 'cleaning_fees_revenue', code: '41222', nameEn: 'Cleaning Fees Revenue', nameAr: 'إيرادات رسوم التنظيف', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4122', essential: false, recommended: true, description: 'إيرادات من رسوم التنظيف', isEntryLevel: true },
      
      { id: 'late_return_fees', code: '41821', nameEn: 'Late Return Fees', nameAr: 'رسوم التأخير في الإرجاع', accountType: 'revenue', accountLevel: 5, balanceType: 'credit', parentCode: '4182', essential: false, recommended: true, description: 'رسوم التأخير في إرجاع المركبات', isEntryLevel: true }
    ],
    
    expenses: [
      // Level 3 - Vehicle Expenses Group
      { id: 'vehicle_expenses_group', code: '5130', nameEn: 'Vehicle Expenses', nameAr: 'مصروفات المركبات', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '5100', essential: true, recommended: true, description: 'جميع مصروفات المركبات والصيانة', isHeader: true },
      
      // Level 4 - Vehicle Expense Categories
      { id: 'vehicle_maintenance', code: '5131', nameEn: 'Vehicle Maintenance', nameAr: 'صيانة المركبات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5130', essential: true, recommended: true, description: 'تكاليف صيانة وإصلاح المركبات' },
      { id: 'fuel_expense', code: '5132', nameEn: 'Fuel Expense', nameAr: 'مصاريف الوقود', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5130', essential: false, recommended: true, description: 'تكاليف الوقود للمركبات' },
      { id: 'vehicle_insurance_expense', code: '5133', nameEn: 'Vehicle Insurance Expense', nameAr: 'مصاريف تأمين المركبات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5130', essential: true, recommended: true, description: 'أقساط تأمين المركبات' },
      { id: 'registration_fees', code: '5134', nameEn: 'Registration Fees', nameAr: 'رسوم الترخيص', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5130', essential: false, recommended: true, description: 'رسوم تجديد رخص المركبات' },
      
      // Level 3 - Staff Expenses Group
      { id: 'driver_expenses_group', code: '5220', nameEn: 'Driver Expenses', nameAr: 'مصروفات السائقين', accountType: 'expenses', accountLevel: 3, balanceType: 'debit', parentCode: '5200', essential: false, recommended: true, description: 'جميع مصروفات السائقين', isHeader: true },
      
      // Level 4 - Driver Expense Categories
      { id: 'driver_salaries', code: '5221', nameEn: 'Driver Salaries', nameAr: 'رواتب السائقين', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', parentCode: '5220', essential: false, recommended: true, description: 'رواتب ومكافآت السائقين' },
      
      // Level 5 - Entry Level Accounts
      { id: 'routine_maintenance', code: '51311', nameEn: 'Routine Maintenance', nameAr: 'الصيانة الدورية', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5131', essential: true, recommended: true, description: 'تكاليف الصيانة الدورية للمركبات', isEntryLevel: true },
      { id: 'emergency_repairs', code: '51312', nameEn: 'Emergency Repairs', nameAr: 'الإصلاحات الطارئة', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5131', essential: true, recommended: true, description: 'تكاليف الإصلاحات الطارئة', isEntryLevel: true },
      
      { id: 'fleet_fuel_expense', code: '51321', nameEn: 'Fleet Fuel Expense', nameAr: 'وقود الأسطول', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5132', essential: false, recommended: true, description: 'تكاليف وقود أسطول المركبات', isEntryLevel: true },
      
      { id: 'comprehensive_insurance', code: '51331', nameEn: 'Comprehensive Insurance', nameAr: 'التأمين الشامل', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5133', essential: true, recommended: true, description: 'تكاليف التأمين الشامل للمركبات', isEntryLevel: true },
      { id: 'third_party_insurance', code: '51332', nameEn: 'Third Party Insurance', nameAr: 'تأمين الطرف الثالث', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5133', essential: true, recommended: true, description: 'تكاليف تأمين الطرف الثالث', isEntryLevel: true },
      
      { id: 'vehicle_registration', code: '51341', nameEn: 'Vehicle Registration', nameAr: 'رسوم تسجيل المركبات', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5134', essential: false, recommended: true, description: 'رسوم تسجيل وترخيص المركبات', isEntryLevel: true },
      
      { id: 'driver_basic_salaries', code: '52211', nameEn: 'Driver Basic Salaries', nameAr: 'رواتب السائقين الأساسية', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5221', essential: false, recommended: true, description: 'الرواتب الأساسية للسائقين', isEntryLevel: true },
      { id: 'driver_overtime', code: '52212', nameEn: 'Driver Overtime', nameAr: 'ساعات إضافية السائقين', accountType: 'expenses', accountLevel: 5, balanceType: 'debit', parentCode: '5221', essential: false, recommended: true, description: 'مكافآت الساعات الإضافية للسائقين', isEntryLevel: true }
    ]
  }
};

export const useBusinessTypeAccounts = () => {
  // Move useMemo to hook level to comply with Rules of Hooks
  const getAccountsByBusinessType = (businessType: string): BusinessTypeAccounts => {
    // Start with essential accounts
    const baseAccounts: BusinessTypeAccounts = {
      assets: ESSENTIAL_ACCOUNTS.filter(acc => acc.accountType === 'assets'),
      liabilities: ESSENTIAL_ACCOUNTS.filter(acc => acc.accountType === 'liabilities'),
      revenue: ESSENTIAL_ACCOUNTS.filter(acc => acc.accountType === 'revenue'),
      expenses: ESSENTIAL_ACCOUNTS.filter(acc => acc.accountType === 'expenses'),
      equity: ESSENTIAL_ACCOUNTS.filter(acc => acc.accountType === 'equity')
    };
    
    // Add business-specific accounts
    const specificAccounts = BUSINESS_SPECIFIC_ACCOUNTS[businessType];
    if (specificAccounts) {
      return {
        assets: [...baseAccounts.assets, ...(specificAccounts.assets || [])],
        liabilities: [...baseAccounts.liabilities, ...(specificAccounts.liabilities || [])],
        revenue: [...baseAccounts.revenue, ...(specificAccounts.revenue || [])],
        expenses: [...baseAccounts.expenses, ...(specificAccounts.expenses || [])],
        equity: baseAccounts.equity
      };
    }
    
    return baseAccounts;
  };

  const generateAccountCode = (accountType: string, existingCodes: string[]): string => {
    const baseCode = {
      'assets': '1',
      'liabilities': '2', 
      'equity': '3',
      'revenue': '4',
      'expenses': '5'
    }[accountType] || '1';
    
    let counter = 111;
    let newCode = baseCode + counter.toString();
    
    while (existingCodes.includes(newCode)) {
      counter++;
      newCode = baseCode + counter.toString();
    }
    
    return newCode;
  };

  return {
    getAccountsByBusinessType,
    generateAccountCode,
    ESSENTIAL_ACCOUNTS
  };
};