import React from 'react';
import { ProfessionalInvoiceTemplate } from '@/components/finance';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { toast } from 'sonner';

const ProfessionalInvoiceDemo = () => {
  // Sample invoice data for demonstration
  const sampleInvoice = {
    id: "inv_12345",
    invoice_number: "INV-2025-001",
    invoice_date: "2025-01-15",
    due_date: "2025-02-15",
    invoice_type: "sales",
    status: "paid",
    currency: "KWD",
    subtotal: 300.000,
    tax_amount: 15.000,
    discount_amount: 0,
    total_amount: 315.000,
    terms: "الدفع خلال 30 يوماً من تاريخ الفاتورة",
    notes: "شكراً لثقتكم في خدماتنا",
    customer_name: "شركة النور التجارية",
    items: [
      {
        id: 1,
        description: 'خدمة استشارية شهرية',
        quantity: 2,
        unit_price: 150.000,
        tax_rate: 5,
        total: 315.000
      }
    ]
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // In a real implementation, this would generate a PDF
    toast.info('سيتم تحميل الفاتورة كملف PDF');
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">نموذج الفاتورة الاحترافية</h1>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          <Button variant="outline" onClick={handleDownload} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            تحميل PDF
          </Button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-lg print:shadow-none">
        <ProfessionalInvoiceTemplate 
          invoice={sampleInvoice}
          onPrint={handlePrint}
          onDownload={handleDownload}
        />
      </div>
      
      <div className="mt-8 p-4 bg-slate-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">معلومات عن القالب</h2>
        <p className="text-slate-700">
          هذا القالب يتضمن تصميم احترافي للفواتير يتضمن:
        </p>
        <ul className="list-disc list-inside mt-2 text-slate-700">
          <li>تصميم حديث وأنيق مع ألوان متناسقة</li>
          <li>عرض واضح لجميع تفاصيل الفاتورة</li>
          <li>دعم الطباعة وتحميل PDF</li>
          <li>تصميم متجاوب يعمل على جميع الأجهزة</li>
          <li>دعم اللغتين العربية والإنجليزية</li>
        </ul>
      </div>
    </div>
  );
};

export default ProfessionalInvoiceDemo;