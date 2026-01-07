/**
 * نافذة طباعة العقد
 * Contract Print Dialog Component
 * 
 * نافذة منبثقة لمعاينة وطباعة العقد
 */

import { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ContractPrintView } from './ContractPrintView';
import type { Contract } from '@/types/contracts';

interface ContractPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract & {
    customer?: any;
    vehicle?: any;
  };
}

export const ContractPrintDialog: React.FC<ContractPrintDialogProps> = ({
  open,
  onOpenChange,
  contract,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // إنشاء نافذة جديدة للطباعة
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // نسخ المحتوى إلى النافذة الجديدة
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>طباعة العقد - ${contract.contract_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Noto+Kufi+Arabic:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;600&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
        <style>
          ${getContractPrintStyles()}
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          // طباعة تلقائية عند تحميل الصفحة
          window.onload = function() {
            window.print();
            // إغلاق النافذة بعد الطباعة (اختياري)
            // window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto">
        <DialogHeader className="no-print">
          <DialogTitle className="flex items-center justify-between">
            <span>معاينة الطباعة - عقد رقم {contract.contract_number}</span>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrint}
                className="gap-2"
              >
                <Printer size={16} />
                طباعة
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X size={20} />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div ref={printRef} className="print-preview">
          <ContractPrintView contract={contract} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// دالة مساعدة للحصول على أنماط الطباعة
function getContractPrintStyles(): string {
  return `
    /* نسخ جميع أنماط ContractPrintView.css هنا */
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Noto+Kufi+Arabic:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;600&family=Amiri:wght@400;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Kufi Arabic', 'Cairo', sans-serif;
      direction: rtl;
      background: white;
    }
    
    /* يمكن إضافة المزيد من الأنماط هنا أو استيراد ملف CSS كامل */
    .contract-print-view {
      --alaraf-red: #991B1B;
      --alaraf-red-dark: #7F1D1D;
      --alaraf-red-light: #FEE2E2;
      --alaraf-gold: #D97706;
      --alaraf-gold-light: #FEF3C7;
      --status-active: #059669;
      --status-active-bg: #D1FAE5;
      --status-pending: #D97706;
      --status-pending-bg: #FEF3C7;
      --status-paid: #059669;
      --status-paid-bg: #D1FAE5;
      --status-unpaid: #DC2626;
      --status-unpaid-bg: #FEE2E2;
      --text-primary: #111827;
      --text-secondary: #4B5563;
      --text-muted: #6B7280;
      --bg-white: #FFFFFF;
      --bg-slate-50: #F9FAFB;
      --bg-slate-100: #F3F4F6;
      --border-light: #E5E7EB;
      --border-medium: #D1D5DB;
      --font-arabic: 'Noto Kufi Arabic', 'Cairo', sans-serif;
      --font-heading: 'Cairo', 'Noto Kufi Arabic', sans-serif;
      --font-mono: 'Roboto Mono', monospace;
    }
    
    .print-container {
      max-width: 21cm;
      margin: 0 auto;
      padding: 1.5cm;
      background: white;
    }
    
    .print-header {
      text-align: center;
      padding: 2rem 0;
      border-bottom: 3px solid var(--alaraf-red);
      margin-bottom: 2rem;
    }
    
    .company-name {
      font-size: 2rem;
      font-weight: 700;
      color: var(--alaraf-red);
      font-family: var(--font-heading);
      margin-bottom: 0.5rem;
    }
    
    .company-name-en {
      font-size: 1.125rem;
      color: var(--text-secondary);
      font-weight: 500;
      margin-bottom: 1rem;
    }
    
    .company-info {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      flex-wrap: wrap;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    
    .company-info-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .page-break {
      page-break-after: always;
      margin: 2rem 0;
    }
    
    @media print {
      .print-container {
        max-width: 100%;
        padding: 0;
        margin: 0;
      }
      
      .page-break {
        page-break-after: always;
      }
      
      .no-print {
        display: none;
      }
    }
    
    /* يمكن إضافة بقية الأنماط من ContractPrintView.css */
  `;
}

export default ContractPrintDialog;

