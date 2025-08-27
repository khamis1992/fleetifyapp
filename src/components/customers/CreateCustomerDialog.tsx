import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreateCustomerWithDuplicateCheck } from './CreateCustomerWithDuplicateCheck';
import { Customer } from '@/types/customer';

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCustomer?: Customer | null;
  onSuccess?: (customer: Customer) => void;
  onCancel?: () => void;
}

export const CreateCustomerDialog: React.FC<CreateCustomerDialogProps> = ({
  open,
  onOpenChange,
  editingCustomer,
  onSuccess,
  onCancel
}) => {
  const handleClose = () => {
    onOpenChange(false);
    if (onCancel) {
      onCancel();
    }
  };

  const handleSuccess = (customer: Customer) => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess(customer);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
          </DialogTitle>
        </DialogHeader>
        
        <CreateCustomerWithDuplicateCheck
          editingCustomer={editingCustomer}
          onSuccess={handleSuccess}
          onCancel={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
};