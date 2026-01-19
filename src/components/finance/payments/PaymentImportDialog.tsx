import React from 'react';
import { Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UnifiedPaymentUpload } from '../payment-upload/UnifiedPaymentUpload';

interface PaymentImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PaymentImportDialog: React.FC<PaymentImportDialogProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            استيراد المدفوعات
          </DialogTitle>
        </DialogHeader>
        
        <UnifiedPaymentUpload 
          open={isOpen}
          onOpenChange={onClose}
          onUploadComplete={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
};