import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DepositForm } from './DepositForm';

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deposit?: any;
}

export function DepositDialog({ 
  open, 
  onOpenChange, 
  deposit 
}: DepositDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {deposit ? 'تعديل الوديعة' : 'إضافة وديعة جديدة'}
          </DialogTitle>
          <DialogDescription>
            {deposit 
              ? 'تعديل بيانات الوديعة المحددة'
              : 'إضافة وديعة جديدة للعميل'
            }
          </DialogDescription>
        </DialogHeader>
        <DepositForm deposit={deposit} onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}