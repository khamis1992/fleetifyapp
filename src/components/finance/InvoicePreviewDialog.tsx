import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileText, Receipt } from "lucide-react";
import { PaymentReceipt } from "@/components/payments/PaymentReceipt";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any | null;
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

export function InvoicePreviewDialog({ open, onOpenChange, invoice }: InvoicePreviewDialogProps) {
  // Don't render if invoice is null
  if (!invoice) {
    return null;
  }

  // تحديد حالة الدفع
  const isPaid = invoice.payment_status === 'paid';
  
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
  
  // الحصول على اسم العميل
  const customerName = invoice.customer?.full_name || 
    invoice.customer?.company_name_ar ||
    `${invoice.customer?.first_name_ar || ''} ${invoice.customer?.last_name_ar || ''}`.trim() ||
    'عميل';

  // الحصول على رقم المركبة من بيانات العقد أو الفاتورة
  const vehicleNumber = invoice.vehicle?.license_plate || 
    invoice.contract?.vehicle?.license_plate ||
    invoice.vehicle_number ||
    invoice.contract?.vehicle_number ||
    '';

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
            {isPaid ? 'معاينة سند القبض قبل الطباعة أو التحميل' : 'معاينة الفاتورة المستحقة قبل الطباعة أو التحميل'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-gray-100 rounded-lg overflow-auto" style={{ maxHeight: '70vh' }}>
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
