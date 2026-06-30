import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Printer, Receipt } from "lucide-react";
import { PaymentReceipt } from "@/components/payments/PaymentReceipt";
import { buildOfficialInvoiceReceiptProps } from "@/utils/officialInvoiceReceipt";
import { FeatureTourButton, FeatureTourDialog, type FeatureTourContent } from "@/components/common/FeatureTourGuide";

const invoicePreviewTour = {
  title: "جولة معاينة الفاتورة",
  description: "شرح نافذة معاينة الفاتورة أو سند القبض قبل الطباعة.",
  steps: [
    "راجع رقم الفاتورة واسم العميل والمبلغ قبل الطباعة أو المشاركة.",
    "إذا كانت الفاتورة مدفوعة ستظهر كمعاينة سند قبض، وإذا كانت مستحقة ستظهر كفاتورة.",
    "زر الطباعة يفتح نسخة رسمية جاهزة للطباعة.",
    "استخدم المعاينة للتأكد من صحة البيانات قبل إرسالها للعميل.",
  ],
} satisfies FeatureTourContent;

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any | null;
  customerName?: string;
}

export function InvoicePreviewDialog({ open, onOpenChange, invoice, customerName }: InvoicePreviewDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [activeTour, setActiveTour] = useState<FeatureTourContent | null>(null);

  if (!invoice) {
    return null;
  }

  const isPaid = invoice.payment_status === "paid";
  const receiptProps = buildOfficialInvoiceReceiptProps(invoice, customerName);

  const handlePrint = () => {
    if (!receiptRef.current) return;

    const receiptHTML = receiptRef.current.innerHTML;
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${receiptProps.documentTitle?.ar || "فاتورة"} - ${invoice?.invoice_number || ""}</title>
        <link rel="icon" href="/uploads/7453c280-3175-4ccf-a73b-24921ec5990b.png" type="image/png" />
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

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPaid ? <Receipt className="h-5 w-5 text-green-600" /> : <FileText className="h-5 w-5 text-red-600" />}
            {receiptProps.documentTitle?.ar} #{invoice?.invoice_number || "غير محدد"}
          </DialogTitle>
          <DialogDescription>
            {isPaid ? "معاينة سند القبض قبل الطباعة" : "معاينة الفاتورة المستحقة قبل الطباعة"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <FeatureTourButton tour={invoicePreviewTour} onStart={setActiveTour} />
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
        </div>

        <div ref={receiptRef} className="p-4 bg-slate-100 rounded-lg overflow-auto" style={{ maxHeight: "65vh" }}>
          <PaymentReceipt {...receiptProps} />
        </div>
        <FeatureTourDialog tour={activeTour} onOpenChange={(open) => !open && setActiveTour(null)} />
      </DialogContent>
    </Dialog>
  );
}
