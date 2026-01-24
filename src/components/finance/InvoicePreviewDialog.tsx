import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, Printer } from "lucide-react";
import { PaymentReceipt } from "@/components/payments/PaymentReceipt";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { extractVehicleNumber, extractCustomerName } from "@/utils/invoiceHelpers";
import { useRef } from "react";

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any | null;
  customerName?: string;
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

export function InvoicePreviewDialog({ open, onOpenChange, invoice, customerName: propCustomerName }: InvoicePreviewDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  // Don't render if invoice is null
  if (!invoice) {
    return null;
  }

  // تحديد حالة الدفع
  const isPaid = invoice.payment_status === 'paid';

  // معالج الطباعة - فتح نافذة جديدة مع المحتوى
  const handlePrint = () => {
    if (!receiptRef.current) return;
    
    const receiptHTML = receiptRef.current.innerHTML;
    
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${isPaid ? 'سند قبض' : 'فاتورة مستحقة'} - ${invoice?.invoice_number || ''}</title>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <style>
          @page {
            size: A4;
            margin: 15mm 20mm 20mm 20mm;
          }
          
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body { margin: 0; padding: 0; }
          }
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: 'Arial', 'Tahoma', sans-serif;
            background: #fff;
            margin: 0;
            padding: 20px;
            direction: rtl;
          }
          
          .print-container {
            max-width: 210mm;
            margin: 0 auto;
            background: #fff;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${receiptHTML}
        </div>
        <script>
          window.onload = function() { 
            setTimeout(function() {
              window.print(); 
            }, 500);
          }
        </script>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };
  
  // تحديد العنوان بناءً على حالة الدفع
  const documentTitle = isPaid 
    ? { ar: 'سند قبض', en: 'PAYMENT VOUCHER' }
    : { ar: 'فاتورة مستحقة', en: 'DUE INVOICE' };

  // الحصول على المبالغ
  const totalAmount = Number(invoice.total_amount) || Number(invoice.amount) || 0;
  const paidAmount = Number(invoice.paid_amount) || 0;
  const remainingAmount = totalAmount - paidAmount;
  
  // المبلغ المعروض في السند (للفواتير المدفوعة نعرض المبلغ المدفوع، للمستحقة نعرض المتبقي)
  const displayAmount = isPaid ? paidAmount : remainingAmount > 0 ? remainingAmount : totalAmount;
  
  // تنسيق التاريخ
  const invoiceDate = invoice.invoice_date || invoice.due_date || new Date().toISOString();
  const formattedDate = format(new Date(invoiceDate), 'dd/MM/yyyy');
  
  // الحصول على اسم العميل (استخدام الاسم الممرر أولاً، ثم الدالة المركزية)
  const customerName = propCustomerName || extractCustomerName(invoice);

  // الحصول على رقم المركبة (باستخدام الدالة المركزية)
  const vehicleNumber = extractVehicleNumber(invoice);

  // وصف الفاتورة
  const description = invoice.description || `فاتورة إيجار شهري - ${format(new Date(invoiceDate), 'MMMM yyyy', { locale: ar })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPaid ? <Receipt className="h-5 w-5 text-green-600" /> : <FileText className="h-5 w-5 text-red-600" />}
            {isPaid ? 'سند قبض' : 'فاتورة مستحقة'} #{invoice?.invoice_number || 'غير محدد'}
          </DialogTitle>
          <DialogDescription>
            {isPaid ? 'معاينة سند القبض قبل الطباعة' : 'معاينة الفاتورة المستحقة قبل الطباعة'}
          </DialogDescription>
        </DialogHeader>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
        </div>

        {/* Receipt Preview with Ref */}
        <div ref={receiptRef} className="p-4 bg-slate-100 rounded-lg overflow-auto" style={{ maxHeight: '65vh' }}>
          <PaymentReceipt
            receiptNumber={invoice.invoice_number || 'غير محدد'}
            date={formattedDate}
            customerName={customerName}
            amountInWords={numberToArabicWords(displayAmount)}
            amount={displayAmount}
            description={description}
            paymentMethod={invoice.payment_method || 'cash'}
            documentTitle={documentTitle}
            hidePaymentMethod={!isPaid}
            totalAmount={totalAmount}
            paidAmount={paidAmount}
            remainingAmount={remainingAmount}
            showPaymentDetails={remainingAmount > 0 || paidAmount > 0}
            vehicleNumber={vehicleNumber}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
