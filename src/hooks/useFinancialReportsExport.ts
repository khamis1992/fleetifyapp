import { useQuery } from "@tanstack/react-query"
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess'
import { financeToday, requireFinanceCompany } from '@/services/financialReporting'
import { readOutstandingInvoiceReport, requireInvoiceReportDate, type InvoiceReportKind, type OutstandingInvoiceRow } from '@/services/financialInvoiceReports'

export interface CashFlowData {
  operating_activities: {
    name: string
    amount: number
  }[]
  investing_activities: {
    name: string
    amount: number
  }[]
  financing_activities: {
    name: string
    amount: number
  }[]
  net_cash_flow: number
}

export type PayablesData = OutstandingInvoiceRow

export type ReceivablesData = OutstandingInvoiceRow

export const useCashFlowReport = (startDate?: string, endDate?: string) => {
  const { companyId, user, isInitializing, isAuthenticating, authError } = useUnifiedCompanyAccess()
  const asOf = endDate ?? financeToday()
  return useQuery({
    queryKey: ["cash-flow-report", companyId, user?.id, startDate, asOf],
    enabled: !isInitializing && !isAuthenticating,
    retry: false,
    queryFn: async (): Promise<CashFlowData> => {
      if (authError || !user) throw new Error('يلزم تسجيل الدخول لقراءة التقارير المالية.')
      requireFinanceCompany(companyId)
      requireInvoiceReportDate(asOf)
      if (startDate) requireInvoiceReportDate(startDate)
      // Summing both sides of a balanced journal falsely reports zero cash flow.
      // The configured statement package owns cash-account mappings and review.
      throw new Error('يلزم إعداد تصنيفات التدفقات النقدية ومراجعتها في حزمة القوائم المالية (/finance/reports/financial-statements).')
    },
  })
}

function useOutstandingInvoiceReport(kind: InvoiceReportKind, cutoff?: string) {
  const { companyId, user, isInitializing, isAuthenticating, authError } = useUnifiedCompanyAccess()
  const asOf = cutoff ?? financeToday()
  const query = useQuery({
    queryKey: [`${kind}-report`, companyId, user?.id, asOf],
    enabled: !isInitializing && !isAuthenticating,
    retry: false,
    staleTime: 0,
    queryFn: async () => {
      if (authError || !user) throw new Error('يلزم تسجيل الدخول لقراءة التقارير المالية.')
      requireFinanceCompany(companyId)
      return readOutstandingInvoiceReport(companyId, kind, asOf)
    },
  })
  return {
    ...query,
    // A refetch error must not leave the last successful dataset exportable.
    data: query.isError || isInitializing || isAuthenticating ? undefined : query.data,
    isLoading: query.isLoading || isInitializing || isAuthenticating,
    reportMetadata: {
      asOf,
      defaultAsOf: 'today_in_qatar' as const,
      dateSource: 'invoice_date' as const,
      balanceBasis: 'current_invoice_balance' as const,
      isHistoricalBalance: false as const,
      retrievedAt: query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toISOString() : null,
      description: 'أرصدة الفواتير الحالية وقت القراءة للفواتير غير الملغاة بتاريخ الفاتورة حتى تاريخ القطع. تُحسب أيام التأخر عند تاريخ القطع؛ يستخدم تاريخ الفاتورة عند غياب تاريخ الاستحقاق. لا يعيد هذا الكشف بناء رصيد تاريخي من السداد.',
    },
  }
}

export const usePayablesReport = (asOf?: string) => useOutstandingInvoiceReport('payables', asOf)

export const useReceivablesReport = (asOf?: string) => useOutstandingInvoiceReport('receivables', asOf)

// HTML Export utilities
export interface FinancialPrintMetadata {
  asOf: string
  description: string
  retrievedAt?: string | null
}

const escapePrintText = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character] ?? character)

export const exportToHTML = (content: string, title: string, companyName?: string, reportMetadata?: FinancialPrintMetadata) => {
  // Create print-friendly content container
  const printContent = `
    <div id="print-content" style="display: none;">
      <div class="header">
        <div class="company-name">${escapePrintText(companyName || 'اسم الشركة')}</div>
        <div class="report-title">${escapePrintText(title)}</div>
        <div class="report-date">تاريخ الإنشاء: ${new Date().toLocaleDateString('en-GB')}</div>
        ${reportMetadata ? `<div class="report-date">تاريخ قطع الفواتير: ${escapePrintText(requireInvoiceReportDate(reportMetadata.asOf))}</div><div class="report-date">${escapePrintText(reportMetadata.description)}</div>${reportMetadata.retrievedAt ? `<div class="report-date">وقت قراءة المصدر: ${escapePrintText(reportMetadata.retrievedAt)}</div>` : ''}` : ''}
      </div>
      
      <div class="content">
        ${content}
      </div>
      
      <div class="footer">
        <p>تم إنشاء هذا التقرير بواسطة النظام المالي - ${new Date().toLocaleString('en-GB')}</p>
      </div>
    </div>
  `;

  // Create print styles
  const printStyles = `
    <style id="print-styles">
      @media print {
        body * {
          visibility: hidden;
        }
        
        #print-content, #print-content * {
          visibility: visible;
        }
        
        #print-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          display: block !important;
          font-family: 'Arial', 'Tahoma', sans-serif;
          direction: rtl;
          text-align: right;
          line-height: 1.4;
          color: #333;
          background: white;
        }
        
        #print-content .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        
        #print-content .company-name {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #1a1a1a;
        }
        
        #print-content .report-title {
          font-size: 22px;
          color: #444;
          margin-bottom: 10px;
          font-weight: 600;
        }
        
        #print-content .report-date {
          color: #666;
          font-size: 14px;
          font-weight: normal;
        }
        
        #print-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          background: white;
          border: 1px solid #ddd;
          page-break-inside: avoid;
          font-size: 12px;
        }
        
        #print-content th, #print-content td {
          border: 1px solid #000 !important;
          padding: 8px;
          text-align: right;
          vertical-align: top;
        }
        
        #print-content th {
          background-color: #f5f5f5 !important;
          font-weight: bold;
          color: #2c3e50;
          border-bottom: 2px solid #dee2e6;
        }
        
        #print-content .total-row {
          background-color: #f1f3f4 !important;
          font-weight: bold;
          border-top: 2px solid #dee2e6;
        }
        
        #print-content .positive {
          color: #22c55e;
          font-weight: 600;
        }
        
        #print-content .negative {
          color: #ef4444;
          font-weight: 600;
        }
        
        #print-content .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        
        @page {
          size: A4;
          margin: 2cm;
        }
      }
    </style>
  `;

  // Add content and styles to current page
  document.head.insertAdjacentHTML('beforeend', printStyles);
  document.body.insertAdjacentHTML('beforeend', printContent);

  // Print directly
  window.print();

  // Clean up after print
  setTimeout(() => {
    const printStylesElement = document.getElementById('print-styles');
    const printContentElement = document.getElementById('print-content');
    if (printStylesElement) printStylesElement.remove();
    if (printContentElement) printContentElement.remove();
  }, 1000);
}
