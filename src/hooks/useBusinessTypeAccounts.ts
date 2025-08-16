import { useMemo } from 'react';

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
}

export interface BusinessTypeAccounts {
  assets: AccountTemplate[];
  liabilities: AccountTemplate[];
  revenue: AccountTemplate[];
  expenses: AccountTemplate[];
  equity: AccountTemplate[];
}

// Default accounts that all businesses need
const ESSENTIAL_ACCOUNTS: AccountTemplate[] = [
  // Assets
  { id: 'cash', code: '1111', nameEn: 'Cash on Hand', nameAr: 'النقد في الصندوق', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'النقد المتوفر في الصندوق' },
  { id: 'bank', code: '1121', nameEn: 'Bank Accounts', nameAr: 'البنوك', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'الحسابات البنكية للشركة' },
  { id: 'accounts_receivable', code: '1211', nameEn: 'Accounts Receivable', nameAr: 'العملاء المدينون', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'المبالغ المستحقة من العملاء' },
  
  // Liabilities
  { id: 'accounts_payable', code: '2111', nameEn: 'Accounts Payable', nameAr: 'الموردون الدائنون', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'المبالغ المستحقة للموردين' },
  { id: 'accrued_expenses', code: '2211', nameEn: 'Accrued Expenses', nameAr: 'المصاريف المستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'المصاريف المستحقة غير المدفوعة' },
  
  // Revenue
  { id: 'sales_revenue', code: '4111', nameEn: 'Sales Revenue', nameAr: 'إيرادات المبيعات', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'الإيرادات من المبيعات الأساسية' },
  
  // Expenses
  { id: 'operating_expenses', code: '5111', nameEn: 'Operating Expenses', nameAr: 'المصاريف التشغيلية', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'المصاريف اللازمة لتشغيل الأعمال' },
  { id: 'salaries_expense', code: '5211', nameEn: 'Salaries Expense', nameAr: 'مصاريف الرواتب', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'رواتب ومكافآت الموظفين' },
  
  // Equity
  { id: 'capital', code: '3111', nameEn: 'Capital', nameAr: 'رأس المال', accountType: 'equity', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'رأس مال الشركة' }
];

// Business-specific account templates
const BUSINESS_SPECIFIC_ACCOUNTS: Record<string, Partial<BusinessTypeAccounts>> = {
  car_rental: {
    assets: [
      { id: 'vehicle_fleet', code: '1511', nameEn: 'Vehicle Fleet', nameAr: 'أسطول المركبات', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'المركبات المملوكة للشركة' },
      { id: 'vehicle_insurance', code: '1521', nameEn: 'Vehicle Insurance Prepaid', nameAr: 'تأمين المركبات المدفوع مقدماً', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'أقساط التأمين المدفوعة مقدماً' },
      { id: 'driver_advances', code: '1231', nameEn: 'Driver Advances', nameAr: 'عهد السائقين', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'العهد والسلف المقدمة للسائقين' },
      { id: 'rental_deposits_receivable', code: '1241', nameEn: 'Rental Deposits Receivable', nameAr: 'ودائع تأجير مستحقة', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'الودائع المستحقة من العملاء' }
    ],
    liabilities: [
      { id: 'customer_deposits', code: '2311', nameEn: 'Customer Deposits', nameAr: 'ودائع العملاء', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', essential: false, recommended: true, description: 'الودائع المقبوضة من العملاء' },
      { id: 'vehicle_maintenance_payable', code: '2121', nameEn: 'Vehicle Maintenance Payable', nameAr: 'صيانة المركبات المستحقة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', essential: false, recommended: true, description: 'مبالغ صيانة المركبات المستحقة' }
    ],
    revenue: [
      { id: 'rental_revenue', code: '4211', nameEn: 'Rental Revenue', nameAr: 'إيرادات التأجير', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'إيرادات تأجير المركبات' },
      { id: 'additional_fees', code: '4221', nameEn: 'Additional Fees', nameAr: 'الرسوم الإضافية', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', essential: false, recommended: true, description: 'رسوم إضافية (وقود، تنظيف، إلخ)' },
      { id: 'insurance_revenue', code: '4231', nameEn: 'Insurance Revenue', nameAr: 'إيرادات التأمين', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', essential: false, recommended: false, description: 'إيرادات من خدمات التأمين' },
      { id: 'late_fees', code: '4241', nameEn: 'Late Fees', nameAr: 'رسوم التأخير', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', essential: false, recommended: true, description: 'رسوم التأخير في الإرجاع' }
    ],
    expenses: [
      { id: 'vehicle_maintenance', code: '5311', nameEn: 'Vehicle Maintenance', nameAr: 'صيانة المركبات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'تكاليف صيانة وإصلاح المركبات' },
      { id: 'fuel_expense', code: '5321', nameEn: 'Fuel Expense', nameAr: 'مصاريف الوقود', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'تكاليف الوقود للمركبات' },
      { id: 'vehicle_insurance_expense', code: '5331', nameEn: 'Vehicle Insurance Expense', nameAr: 'مصاريف تأمين المركبات', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'أقساط تأمين المركبات' },
      { id: 'registration_fees', code: '5341', nameEn: 'Registration Fees', nameAr: 'رسوم الترخيص', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'رسوم تجديد رخص المركبات' },
      { id: 'driver_salaries', code: '5351', nameEn: 'Driver Salaries', nameAr: 'رواتب السائقين', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'رواتب ومكافآت السائقين' }
    ]
  },
  
  professional_services: {
    assets: [
      { id: 'unbilled_services', code: '1251', nameEn: 'Unbilled Services', nameAr: 'خدمات غير مفوترة', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'الخدمات المقدمة وغير المفوترة بعد' },
      { id: 'prepaid_professional_fees', code: '1261', nameEn: 'Prepaid Professional Fees', nameAr: 'رسوم مهنية مدفوعة مقدماً', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: false, recommended: false, description: 'الرسوم المهنية المدفوعة مقدماً' }
    ],
    liabilities: [
      { id: 'deferred_revenue', code: '2321', nameEn: 'Deferred Revenue', nameAr: 'إيرادات مؤجلة', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', essential: false, recommended: true, description: 'أتعاب مقبوضة مقدماً عن خدمات لم تقدم بعد' },
      { id: 'professional_liability', code: '2331', nameEn: 'Professional Liability', nameAr: 'التزامات مهنية', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', essential: false, recommended: false, description: 'التزامات مهنية مستحقة' }
    ],
    revenue: [
      { id: 'consulting_fees', code: '4311', nameEn: 'Consulting Fees', nameAr: 'أتعاب استشارية', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'أتعاب الخدمات الاستشارية' },
      { id: 'legal_fees', code: '4321', nameEn: 'Legal Fees', nameAr: 'أتعاب قانونية', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', essential: false, recommended: true, description: 'أتعاب الخدمات القانونية' },
      { id: 'accounting_services', code: '4331', nameEn: 'Accounting Services', nameAr: 'خدمات محاسبية', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', essential: false, recommended: true, description: 'إيرادات الخدمات المحاسبية' }
    ],
    expenses: [
      { id: 'professional_development', code: '5411', nameEn: 'Professional Development', nameAr: 'التطوير المهني', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'تكاليف التدريب والتطوير المهني' },
      { id: 'professional_subscriptions', code: '5421', nameEn: 'Professional Subscriptions', nameAr: 'الاشتراكات المهنية', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'اشتراكات الجمعيات والمنظمات المهنية' },
      { id: 'travel_expenses', code: '5431', nameEn: 'Travel Expenses', nameAr: 'مصاريف السفر', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: false, recommended: false, description: 'مصاريف السفر والانتقال للعملاء' }
    ]
  },
  
  retail_trade: {
    assets: [
      { id: 'inventory', code: '1311', nameEn: 'Inventory', nameAr: 'المخزون', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'مخزون البضائع' },
      { id: 'retail_customers', code: '1271', nameEn: 'Retail Customers', nameAr: 'عملاء التجزئة', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'مستحقات من عملاء التجزئة' },
      { id: 'wholesale_customers', code: '1281', nameEn: 'Wholesale Customers', nameAr: 'عملاء الجملة', accountType: 'assets', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'مستحقات من عملاء الجملة' }
    ],
    liabilities: [
      { id: 'local_suppliers', code: '2131', nameEn: 'Local Suppliers', nameAr: 'موردون محليون', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', essential: false, recommended: true, description: 'مستحقات للموردين المحليين' },
      { id: 'foreign_suppliers', code: '2141', nameEn: 'Foreign Suppliers', nameAr: 'موردون خارجيون', accountType: 'liabilities', accountLevel: 4, balanceType: 'credit', essential: false, recommended: false, description: 'مستحقات للموردين الخارجيين' }
    ],
    revenue: [
      { id: 'retail_sales', code: '4411', nameEn: 'Retail Sales', nameAr: 'مبيعات التجزئة', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', essential: true, recommended: true, description: 'إيرادات من مبيعات التجزئة' },
      { id: 'wholesale_sales', code: '4421', nameEn: 'Wholesale Sales', nameAr: 'مبيعات الجملة', accountType: 'revenue', accountLevel: 4, balanceType: 'credit', essential: false, recommended: true, description: 'إيرادات من مبيعات الجملة' }
    ],
    expenses: [
      { id: 'cost_of_goods_sold', code: '5511', nameEn: 'Cost of Goods Sold', nameAr: 'تكلفة البضاعة المباعة', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: true, recommended: true, description: 'تكلفة البضائع المباعة' },
      { id: 'shipping_expenses', code: '5521', nameEn: 'Shipping Expenses', nameAr: 'مصاريف الشحن', accountType: 'expenses', accountLevel: 4, balanceType: 'debit', essential: false, recommended: true, description: 'تكاليف شحن ونقل البضائع' }
    ]
  }
};

export const useBusinessTypeAccounts = () => {
  const getAccountsByBusinessType = (businessType: string): BusinessTypeAccounts => {
    return useMemo(() => {
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
    }, [businessType]);
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