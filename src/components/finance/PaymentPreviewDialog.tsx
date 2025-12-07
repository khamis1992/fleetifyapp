import React, { useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt, Download, Printer, Loader2 } from "lucide-react";
import { PaymentReceipt } from "@/components/payments/PaymentReceipt";
import { generateReceiptPDF, downloadPDF } from "@/utils/receiptGenerator";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";

interface PaymentData {
  id?: string;
  payment_number?: string;
  payment_date?: string;
  amount?: number;
  payment_method?: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'other';
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
  // Relations from usePayments hook
  customers?: {
    first_name?: string;
    last_name?: string;
    company_name?: string;
    customer_type?: string;
    phone?: string;
  };
  contracts?: {
    contract_number?: string;
  };
  invoices?: {
    invoice_number?: string;
  };
}

interface PaymentPreviewDialogProps {
  payment: PaymentData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// دالة تحويل الرقم إلى كلمات عربية
function numberToArabicWords(amount: number): string {
  const arabicOnes = [
    "", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة",
    "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", 
    "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"
  ];
  
  const arabicTens = [
    "", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"
  ];
  
  const arabicHundreds = [
    "", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة", 
    "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"
  ];
  
  if (amount === 0) return "صفر ريال قطري فقط";
  
  const intAmount = Math.floor(amount);
  const decimal = Math.round((amount - intAmount) * 100);
  
  const convertLessThanThousand = (num: number): string => {
    if (num === 0) return "";
    
    if (num < 20) {
      return arabicOnes[num];
    } else if (num < 100) {
      const ten = Math.floor(num / 10);
      const unit = num % 10;
      if (unit === 0) {
        return arabicTens[ten];
      } else {
        return arabicOnes[unit] + " و " + arabicTens[ten];
      }
    } else {
      const hundred = Math.floor(num / 100);
      const remainder = num % 100;
      if (remainder === 0) {
        return arabicHundreds[hundred];
      } else {
        return arabicHundreds[hundred] + " و " + convertLessThanThousand(remainder);
      }
    }
  };
  
  let result = "";
  
  if (intAmount < 1000) {
    result = convertLessThanThousand(intAmount);
  } else {
    const thousands = Math.floor(intAmount / 1000);
    const remainder = intAmount % 1000;
    
    if (thousands > 0) {
      let thousandWord = "";
      if (thousands === 1) {
        thousandWord = "ألف";
      } else if (thousands === 2) {
        thousandWord = "ألفان";
      } else if (thousands > 2 && thousands < 11) {
        thousandWord = arabicOnes[thousands] + " آلاف";
      } else {
        thousandWord = convertLessThanThousand(thousands) + " ألف";
      }
      
      result = thousandWord;
      if (remainder > 0) {
        result += " و " + convertLessThanThousand(remainder);
      }
    } else {
      result = convertLessThanThousand(intAmount);
    }
  }
  
  result += " ريال قطري";
  
  if (decimal > 0) {
    result += " و " + decimal + " درهم";
  }
  
  result += " فقط لا غير";
  
  return result;
}

export const PaymentPreviewDialog: React.FC<PaymentPreviewDialogProps> = ({
  payment,
  open,
  onOpenChange
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // تحويل بيانات الدفعة إلى صيغة PaymentReceipt
  const receiptData = useMemo(() => {
    if (!payment) return null;

    const amount = payment.amount || 0;
    const paymentDate = payment.payment_date || new Date().toISOString();
    const formattedDate = format(new Date(paymentDate), 'dd/MM/yyyy');
    
    // تحديد طريقة الدفع
    let paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'other' = 'cash';
    if (payment.payment_method === 'check') {
      paymentMethod = 'check';
    } else if (payment.payment_method === 'bank_transfer') {
      paymentMethod = 'bank_transfer';
    } else if (payment.payment_method === 'credit_card' || payment.payment_method === 'debit_card') {
      paymentMethod = 'other';
    }

    // استخراج اسم العميل من البيانات المتاحة
    let customerName = payment.customer_name;
    if (!customerName && payment.customers) {
      // إذا كان العميل شركة
      if (payment.customers.company_name) {
        customerName = payment.customers.company_name;
      } 
      // إذا كان العميل فرد
      else if (payment.customers.first_name || payment.customers.last_name) {
        customerName = `${payment.customers.first_name || ''} ${payment.customers.last_name || ''}`.trim();
      }
    }
    customerName = customerName || 'عميل';

    // استخراج رقم العقد
    const contractNumber = payment.contract_number || payment.contracts?.contract_number;

    // وصف الدفعة
    const description = payment.notes || 
      (contractNumber ? `إيجار - عقد رقم ${contractNumber}` : 
       `دفعة إيجار - ${format(new Date(paymentDate), 'MMMM yyyy', { locale: ar })}`);

    return {
      receiptNumber: payment.payment_number || payment.reference_number || payment.id?.substring(0, 8).toUpperCase() || '00000',
      date: formattedDate,
      customerName: customerName,
      amountInWords: numberToArabicWords(amount),
      amount: amount,
      description: description,
      paymentMethod: paymentMethod,
      vehicleNumber: payment.vehicle_number,
    };
  }, [payment]);

  // Download receipt as PDF
  const handleDownload = async () => {
    if (!receiptRef.current || !receiptData) return;
    
    setIsDownloading(true);
    try {
      const blob = await generateReceiptPDF(receiptRef.current, `سند-قبض-${receiptData.receiptNumber}.pdf`);
      downloadPDF(blob, `سند-قبض-${receiptData.receiptNumber}.pdf`);
      toast.success('تم تحميل سند القبض بنجاح');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('حدث خطأ أثناء تحميل السند');
    } finally {
      setIsDownloading(false);
    }
  };

  // Print receipt
  const handlePrint = () => {
    if (!receiptRef.current) return;
    
    const printContent = receiptRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>سند قبض - ${receiptData?.receiptNumber}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, Tahoma, sans-serif; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  if (!payment || !receiptData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-green-600" />
            سند قبض #{receiptData.receiptNumber}
          </DialogTitle>
          <DialogDescription>
            معاينة سند القبض قبل الطباعة أو التحميل
          </DialogDescription>
        </DialogHeader>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="w-4 h-4" />
            طباعة
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            تحميل PDF
          </Button>
        </div>

        <div ref={receiptRef} className="p-4 bg-gray-100 rounded-lg overflow-auto" style={{ maxHeight: '60vh' }}>
          <PaymentReceipt
            receiptNumber={receiptData.receiptNumber}
            date={receiptData.date}
            customerName={receiptData.customerName}
            amountInWords={receiptData.amountInWords}
            amount={receiptData.amount}
            description={receiptData.description}
            paymentMethod={receiptData.paymentMethod}
            vehicleNumber={receiptData.vehicleNumber}
            documentTitle={{ ar: 'سند قبض', en: 'PAYMENT VOUCHER' }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};