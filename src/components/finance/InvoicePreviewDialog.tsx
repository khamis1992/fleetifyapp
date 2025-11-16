import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileText } from "lucide-react";
import { UnifiedPrintableDocument } from "@/components/finance";
import { convertInvoiceToPrintable } from "@/utils/printHelper";

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any | null;
}

export function InvoicePreviewDialog({ open, onOpenChange, invoice }: InvoicePreviewDialogProps) {
  // Don't render if invoice is null
  if (!invoice) {
    return null;
  }

  // Convert invoice to printable format
  const printableData = convertInvoiceToPrintable(invoice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            معاينة الفاتورة #{invoice?.invoice_number || 'غير محدد'}
          </DialogTitle>
          <DialogDescription>
            معاينة تفاصيل الفاتورة قبل الطباعة أو التحميل
          </DialogDescription>
        </DialogHeader>

        <div className="p-4">
          <UnifiedPrintableDocument 
            data={printableData}
            onPrint={() => {
              console.log('Invoice printed');
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
