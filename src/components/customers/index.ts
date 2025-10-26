// نظام إدارة العملاء الموحد - ملف التصدير الرئيسي
export { EnhancedCustomerForm, EnhancedCustomerDialog } from './EnhancedCustomerForm';

// مكونات أساسية للعملاء
export { CreateCustomerDialog } from './CreateCustomerDialog';
export { CustomerFormWithDuplicateCheck } from './CustomerFormWithDuplicateCheck';
export { DuplicateCustomerDialog } from './DuplicateCustomerDialog';
export { QuickCustomerForm } from './QuickCustomerForm';

// مكونات إدارة الحسابات
export { CustomerAccountSelector } from './CustomerAccountSelector';
export { CustomerAccountForm } from './CustomerAccountForm';
export { CustomerAccountsManager } from './CustomerAccountsManager';
export { CustomerAccountBalance } from './CustomerAccountBalance';
export { CustomerAccountStatement } from './CustomerAccountStatement';

// مكونات متقدمة
export { CustomerDetailsDialog } from './CustomerDetailsDialog';
export { CustomerDiagnostics } from './CustomerDiagnostics';
export { CustomerCSVUpload } from './CustomerCSVUpload';
export { BulkDeleteCustomersDialog } from './BulkDeleteCustomersDialog';
export { DriverLicenseManager } from './DriverLicenseManager';

// مكونات مساعدة
export { CustomerDisplayName } from './CustomerDisplayName';
export { MobileCustomerCard } from './MobileCustomerCard';

export { AccountingSettings } from './AccountingSettings';
export { AccountLinking } from './AccountLinking';
export { AccountingSummary } from './AccountingSummary';

// تقارير العملاء
export { CustomerAgingReport } from './CustomerAgingReport';
export { CustomerInvoicesTab } from './CustomerInvoicesTab';

// أدوات الإصلاح والصيانة
export { FixCustomerAccounts } from './FixCustomerAccounts';
export { CreateAccountsForExistingCustomers } from './CreateAccountsForExistingCustomers';