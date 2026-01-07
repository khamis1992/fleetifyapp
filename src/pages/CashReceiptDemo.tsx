import React from 'react';
import { CashReceiptVoucher } from '@/components/finance';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { EnhancedPaymentData } from '@/schemas/payment.schema';

const CashReceiptDemo = () => {
  // Sample payment data for demonstration
  const samplePayment: EnhancedPaymentData = {
    payment_number: "REC-2025-00144",
    payment_date: new Date().toISOString().split('T')[0],
    amount: 1500.00,
    payment_method: 'cash',
    currency: 'QAR',
    notes: "إيجار شهر يناير 2025",
    type: 'receipt',
    customer_id: "cust-123",
    payment_status: 'completed'
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">نموذج سند القبض</h1>
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          طباعة السند
        </Button>
      </div>
      
      <div className="print:shadow-none">
        <CashReceiptVoucher 
          payment={samplePayment} 
          onPrint={handlePrint}
        />
      </div>
      
      <div className="mt-8 p-4 bg-slate-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">معلومات عن السند</h2>
        <p className="text-slate-700">
          هذا السند تم إنشاؤه وفقًا لتصميم شركة العراف لتأجير السيارات. 
          يتضمن جميع العناصر المطلوبة مثل: رقم السند، تاريخ الدفع، اسم العميل، 
          المبلغ بالأرقام والحروف، طريقة الدفع، والتوقيعات المطلوبة.
        </p>
      </div>
    </div>
  );
};

export default CashReceiptDemo;