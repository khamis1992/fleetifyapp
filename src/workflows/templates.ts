/**
 * Workflow Templates
 * 
 * Pre-defined workflow templates for common operations.
 */

import type { WorkflowTemplate } from './types';
import { WorkflowEntityType } from './types';

/**
 * Contract Approval Template
 * Required for contracts > 50,000 QAR
 */
export const contractApprovalTemplate: WorkflowTemplate = {
  id: 'contract-approval',
  name: 'موافقة العقود',
  entity_type: WorkflowEntityType.CONTRACT,
  steps: [
    {
      step_number: 1,
      name: 'مراجعة مدير المبيعات',
      approver_role: ['sales_manager', 'admin'],
      required: true
    },
    {
      step_number: 2,
      name: 'موافقة المدير المالي',
      approver_role: ['financial_manager', 'admin'],
      required: true
    },
    {
      step_number: 3,
      name: 'موافقة المدير العام',
      approver_role: ['general_manager', 'admin'],
      required: true
    }
  ],
  conditions: {
    min_amount: 50000,
    requires_role: ['sales_manager', 'admin']
  }
};

/**
 * Payment Approval Template
 * Required for payments > 10,000 QAR
 */
export const paymentApprovalTemplate: WorkflowTemplate = {
  id: 'payment-approval',
  name: 'موافقة المدفوعات',
  entity_type: WorkflowEntityType.PAYMENT,
  steps: [
    {
      step_number: 1,
      name: 'مراجعة المحاسب',
      approver_role: ['accountant', 'financial_manager', 'admin'],
      required: true
    },
    {
      step_number: 2,
      name: 'موافقة المدير المالي',
      approver_role: ['financial_manager', 'admin'],
      required: true
    }
  ],
  conditions: {
    min_amount: 10000,
    requires_role: ['accountant', 'admin']
  }
};

/**
 * Expense Approval Template
 * Required for all expenses
 */
export const expenseApprovalTemplate: WorkflowTemplate = {
  id: 'expense-approval',
  name: 'موافقة المصروفات',
  entity_type: WorkflowEntityType.EXPENSE,
  steps: [
    {
      step_number: 1,
      name: 'موافقة مدير القسم',
      approver_role: ['department_manager', 'admin'],
      required: true
    },
    {
      step_number: 2,
      name: 'موافقة المحاسب',
      approver_role: ['accountant', 'financial_manager', 'admin'],
      required: false
    }
  ],
  conditions: {
    min_amount: 1000
  }
};

/**
 * Invoice Cancellation Template
 * Required for cancelling invoices
 */
export const invoiceCancellationTemplate: WorkflowTemplate = {
  id: 'invoice-cancellation',
  name: 'إلغاء الفواتير',
  entity_type: WorkflowEntityType.INVOICE,
  steps: [
    {
      step_number: 1,
      name: 'موافقة المدير المالي',
      approver_role: ['financial_manager', 'admin'],
      required: true
    }
  ]
};

/**
 * Purchase Order Approval Template
 */
export const purchaseOrderTemplate: WorkflowTemplate = {
  id: 'purchase-order-approval',
  name: 'موافقة أوامر الشراء',
  entity_type: WorkflowEntityType.PURCHASE_ORDER,
  steps: [
    {
      step_number: 1,
      name: 'مراجعة مدير المشتريات',
      approver_role: ['procurement_manager', 'admin'],
      required: true
    },
    {
      step_number: 2,
      name: 'موافقة المدير المالي',
      approver_role: ['financial_manager', 'admin'],
      required: true
    }
  ],
  conditions: {
    min_amount: 5000
  }
};

/**
 * Get all templates
 */
export const allTemplates: WorkflowTemplate[] = [
  contractApprovalTemplate,
  paymentApprovalTemplate,
  expenseApprovalTemplate,
  invoiceCancellationTemplate,
  purchaseOrderTemplate
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return allTemplates.find(t => t.id === id);
}

/**
 * Get templates by entity type
 */
export function getTemplatesByEntityType(entityType: WorkflowEntityType): WorkflowTemplate[] {
  return allTemplates.filter(t => t.entity_type === entityType);
}

/**
 * Check if workflow is required for an operation
 */
export function isWorkflowRequired(
  entityType: WorkflowEntityType,
  amount?: number,
  userRoles?: string[]
): { required: boolean; template?: WorkflowTemplate } {
  const templates = getTemplatesByEntityType(entityType);
  
  for (const template of templates) {
    // Check amount condition
    if (template.conditions?.min_amount && amount) {
      if (amount >= template.conditions.min_amount) {
        return { required: true, template };
      }
    }

    // Check role condition
    if (template.conditions?.requires_role && userRoles) {
      const hasRequiredRole = template.conditions.requires_role.some(role =>
        userRoles.includes(role)
      );
      if (!hasRequiredRole) {
        return { required: true, template };
      }
    }
  }

  return { required: false };
}

