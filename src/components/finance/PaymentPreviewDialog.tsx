import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText } from "lucide-react";
import { CashReceiptVoucher } from "@/components/finance";
import { EnhancedPaymentData } from "@/schemas/payment.schema";

interface PaymentPreviewDialogProps {
  payment: EnhancedPaymentData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaymentPreviewDialog: React.FC<PaymentPreviewDialogProps> = ({
  payment,
  open,
  onOpenChange
}) => {
  const handlePrint = () => {
    window.print();
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>معاينة سند القبض</DialogTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="print:shadow-none">
          <CashReceiptVoucher payment={payment} />
        </div>
      </DialogContent>
    </Dialog>
  );
};