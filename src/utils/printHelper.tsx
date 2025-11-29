import React from 'react';
import ReactDOM from 'react-dom/client';
import { UnifiedPrintableDocument, PrintableDocumentData } from '@/components/finance/UnifiedPrintableDocument';

/**
 * Print Helper Utility
 * مساعد الطباعة - يوفر وظائف طباعة موحدة للنظام
 */

/**
 * Print a document using the unified template
 * طباعة مستند باستخدام القالب الموحد
 */
export const printDocument = (data: PrintableDocumentData): void => {
  // Create a hidden container
  const printContainer = document.createElement('div');
  printContainer.style.position = 'fixed';
  printContainer.style.top = '-9999px';
  printContainer.style.left = '-9999px';
  document.body.appendChild(printContainer);

  // Render the component
  const root = ReactDOM.createRoot(printContainer);
  root.render(
    <UnifiedPrintableDocument 
      data={data}
      onPrint={() => {
        // Cleanup after print
        setTimeout(() => {
          root.unmount();
          document.body.removeChild(printContainer);
        }, 100);
      }}
    />
  );

  // Wait for render then open print dialog
  setTimeout(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Failed to open print window');
      root.unmount();
      document.body.removeChild(printContainer);
      return;
    }

    // Get the rendered HTML
    const content = printContainer.innerHTML;

    // Write to new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>طباعة - ${data.documentNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            direction: rtl;
            background: white;
          }
          @media print {
            .no-print {
              display: none !important;
            }
            @page {
              margin: 1cm;
              size: A4;
            }
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
        <link rel="stylesheet" href="/src/index.css">
      </head>
      <body>
        ${content}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();

    // Cleanup
    root.unmount();
    document.body.removeChild(printContainer);
  }, 500);
};

/**
 * Generate PDF from document data
 * إنشاء PDF من بيانات المستند
 */
export const generatePDF = async (data: PrintableDocumentData): Promise<Blob> => {
  // This would use a library like jsPDF or html2pdf
  // For now, we'll return a placeholder
  throw new Error('PDF generation not implemented yet');
};

/**
 * Download document as PDF
 * تحميل المستند كـ PDF
 */
export const downloadPDF = async (data: PrintableDocumentData, filename?: string): Promise<void> => {
  try {
    const blob = await generatePDF(data);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${data.documentNumber}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download PDF:', error);
    throw error;
  }
};

/**
 * Convert rental payment receipt to printable document data
 * تحويل إيصال دفع الإيجار إلى بيانات قابلة للطباعة
 */
export interface RentalPaymentReceipt {
  id: string;
  customer_name: string;
  customer_phone?: string;
  vehicle_number?: string;
  month: string;
  payment_date: string;
  rent_amount: number;
  fine: number;
  total_paid: number;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
}

export const convertReceiptToPrintable = (receipt: RentalPaymentReceipt): PrintableDocumentData => {
  return {
    type: 'receipt',
    documentNumber: receipt.reference_number || receipt.id.substring(0, 8).toUpperCase(),
    date: receipt.payment_date,
    customer: {
      name: receipt.customer_name,
      phone: receipt.customer_phone,
      vehicle_number: receipt.vehicle_number
    },
    amount: receipt.total_paid,
    currency: 'QAR',
    paymentMethod: (receipt.payment_method as any) || 'cash',
    breakdown: {
      rentAmount: receipt.rent_amount,
      fineAmount: receipt.fine
    },
    month: receipt.month,
    notes: receipt.notes || `إيجار شهر ${receipt.month}`
  };
};

/**
 * Convert invoice to printable document data
 * تحويل فاتورة إلى بيانات قابلة للطباعة
 */
export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  customer_id: string;
  customer?: {
    first_name_ar?: string;
    last_name_ar?: string;
    full_name?: string;
    company_name_ar?: string;
    phone?: string;
  };
  // Support both field names
  amount?: number;
  total_amount?: number;
  description?: string;
  notes?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

export const convertInvoiceToPrintable = (invoice: Invoice): PrintableDocumentData => {
  // Support multiple customer name fields
  const customerName = invoice.customer?.company_name_ar || 
    invoice.customer?.full_name ||
    `${invoice.customer?.first_name_ar || ''} ${invoice.customer?.last_name_ar || ''}`.trim() ||
    'عميل';

  // Support both amount and total_amount fields
  const invoiceAmount = Number(invoice.amount) || Number(invoice.total_amount) || 0;

  return {
    type: 'invoice',
    documentNumber: invoice.invoice_number || 'غير محدد',
    date: invoice.invoice_date || invoice.due_date || new Date().toISOString(),
    customer: {
      name: customerName,
      phone: invoice.customer?.phone
    },
    amount: invoiceAmount,
    currency: 'QAR',
    items: invoice.items || [{
      description: invoice.description || 'فاتورة إيجار شهري',
      total: invoiceAmount
    }],
    notes: invoice.notes
  };
};

export default {
  printDocument,
  generatePDF,
  downloadPDF,
  convertReceiptToPrintable,
  convertInvoiceToPrintable
};
