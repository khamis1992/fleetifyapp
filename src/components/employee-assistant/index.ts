/**
 * تصدير مكونات مساعد الموظف
 */

export { EmployeeAssistant } from './EmployeeAssistant';
export { FloatingAssistant } from './FloatingAssistant';

// تصدير جميع الـ workflows
export { contractWorkflow } from './workflows/contractWorkflow';
export { paymentWorkflow } from './workflows/paymentWorkflow';
export { vehicleReturnWorkflow } from './workflows/vehicleReturnWorkflow';
export { newCustomerWorkflow } from './workflows/newCustomerWorkflow';
export { invoiceWorkflow } from './workflows/invoiceWorkflow';

export type * from './types';

