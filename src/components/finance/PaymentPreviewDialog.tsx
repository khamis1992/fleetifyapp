import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CreditCard } from "lucide-react";
import { UnifiedPrintableDocument, PrintableDocumentData } from "@/components/finance/UnifiedPrintableDocument";

interface PaymentData {
  id?: string;
  payment_number?: string;
  payment_date?: string;
  amount?: number;
  payment_method?: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'debit_card';
  reference_number?: string;
  check_number?: string;
  bank_account?: string;
  currency?: string;
  notes?: string;
  customer_name?: string;
  customer_phone?: string;
  contract_number?: string;
  vehicle_number?: string;
  customer_id?: string;
}

interface PaymentPreviewDialogProps {
  payment: PaymentData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaymentPreviewDialog: React.FC<PaymentPreviewDialogProps> = ({
  payment,
  open,
  onOpenChange
}) => {
  // Convert payment data to printable format
  const printableData: PrintableDocumentData | null = useMemo(() => {
    if (!payment) return null;

    return {
      type: 'voucher' as const,
      documentNumber: payment.payment_number || payment.reference_number || payment.id?.substring(0, 8).toUpperCase() || '00000',
      date: payment.payment_date || new Date().toISOString(),
      customer: {
        name: payment.customer_name || 'عميل',
        phone: payment.customer_phone,
        vehicle_number: payment.vehicle_number,
      },
      amount: payment.amount || 0,
      currency: payment.currency || 'QAR',
      paymentMethod: payment.payment_method === 'bank_transfer' ? 'bank_transfer' 
        : payment.payment_method === 'credit_card' ? 'credit_card'
        : payment.payment_method === 'check' ? 'check'
        : payment.payment_method === 'debit_card' ? 'credit_card'
        : 'cash',
      checkDetails: payment.payment_method === 'check' ? {
        checkNumber: payment.check_number,
        bankName: payment.bank_account,
      } : undefined,
      notes: payment.notes || (payment.contract_number ? `إيجار - عقد رقم ${payment.contract_number}` : 'دفعة إيجار'),
      reference: payment.contract_number,
    };
  }, [payment]);

  if (!payment || !printableData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            سند قبض #{payment.payment_number || payment.reference_number || ''}
          </DialogTitle>
          <DialogDescription>
            معاينة سند القبض قبل الطباعة
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4">
          <UnifiedPrintableDocument data={printableData} />
        </div>
      </DialogContent>
    </Dialog>
  );
};