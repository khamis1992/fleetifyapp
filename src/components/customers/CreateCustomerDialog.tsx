import React from 'react';
import { EnhancedCustomerDialog } from './EnhancedCustomerForm';
import { Customer } from '@/types/customer';

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCustomer?: Customer | null;
  onSuccess?: (customer: Customer) => void;
  onCancel?: () => void;
}

/**
 * @deprecated Use EnhancedCustomerDialog directly instead
 * This is a legacy wrapper for backward compatibility
 */
export const CreateCustomerDialog: React.FC<CreateCustomerDialogProps> = (props) => {
  console.warn('CreateCustomerDialog is deprecated. Use EnhancedCustomerDialog instead.');
  return (
    <EnhancedCustomerDialog
      {...props}
      context="standalone"
    />
  );
};