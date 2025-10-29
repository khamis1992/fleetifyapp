import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, Printer } from "lucide-react";
import { ProfessionalInvoiceTemplate } from "@/components/finance";

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any | null;
}

export function InvoicePreviewDialog({ open, onOpenChange, invoice }: InvoicePreviewDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // This will be handled by the ProfessionalInvoiceTemplate
    console.log('Download requested');
  };

  // Don't render if invoice is null
  if (!invoice) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              معاينة الفاتورة #{invoice?.invoice_number || 'غير محدد'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                طباعة
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                تحميل PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4">
          <ProfessionalInvoiceTemplate 
            invoice={invoice} 
            onPrint={handlePrint}
            onDownload={handleDownload}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}