import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"


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

export interface PayablesData {
  vendor_name: string
  amount: number
  due_date: string
  overdue_days: number
  status: string
}

export interface ReceivablesData {
  customer_name: string
  amount: number
  due_date: string
  overdue_days: number
  status: string
}

export const useCashFlowReport = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["cash-flow-report", startDate, endDate],
    queryFn: async () => {
      // Fetch journal entries for the period
      let query = supabase
        .from("journal_entries")
        .select(`
          *,
          journal_entry_lines(
            *,
            account:chart_of_accounts(account_name, account_type)
          )
        `)
        .eq("status", "posted")

      if (startDate) query = query.gte("entry_date", startDate)
      if (endDate) query = query.lte("entry_date", endDate)

      const { data, error } = await query

      if (error) throw error

      // Process cash flow data
      const cashFlowData: CashFlowData = {
        operating_activities: [],
        investing_activities: [],
        financing_activities: [],
        net_cash_flow: 0
      }

      // Calculate cash flows from operations, investing, and financing
      let operatingCash = 0
      let investingCash = 0
      let financingCash = 0

      data?.forEach(entry => {
        entry.journal_entry_lines?.forEach((line: any) => {
          const amount = Number(line.debit_amount || 0) - Number(line.credit_amount || 0)
          
          // Categorize based on account type and entry reference
          if (entry.reference_type === 'invoice' || entry.reference_type === 'payment') {
            operatingCash += amount
          } else if (entry.reference_type === 'fixed_asset') {
            investingCash += amount
          } else if (entry.reference_type === 'loan' || entry.reference_type === 'equity') {
            financingCash += amount
          }
        })
      })

      cashFlowData.operating_activities.push({ name: "التدفق النقدي من العمليات", amount: operatingCash })
      cashFlowData.investing_activities.push({ name: "التدفق النقدي من الاستثمار", amount: investingCash })
      cashFlowData.financing_activities.push({ name: "التدفق النقدي من التمويل", amount: financingCash })
      cashFlowData.net_cash_flow = operatingCash + investingCash + financingCash

      return cashFlowData
    }
  })
}

export const usePayablesReport = () => {
  return useQuery({
    queryKey: ["payables-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          vendors!vendor_id(vendor_name)
        `)
        .eq("invoice_type", "purchase")
        .neq("payment_status", "paid")

      if (error) throw error

      const payablesData: PayablesData[] = (data || []).map(invoice => {
        const dueDate = new Date(invoice.due_date || invoice.invoice_date)
        const today = new Date()
        const overdueDays = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))

        return {
          vendor_name: invoice.vendors?.vendor_name || 'مورد غير محدد',
          amount: Number(invoice.balance_due || invoice.total_amount),
          due_date: invoice.due_date || invoice.invoice_date,
          overdue_days: overdueDays,
          status: overdueDays > 0 ? 'متأخر' : 'مستحق'
        }
      })

      return payablesData
    }
  })
}

export const useReceivablesReport = () => {
  return useQuery({
    queryKey: ["receivables-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          customers!customer_id(first_name, last_name, company_name)
        `)
        .eq("invoice_type", "sales")
        .neq("payment_status", "paid")

      if (error) throw error

      const receivablesData: ReceivablesData[] = (data || []).map(invoice => {
        const dueDate = new Date(invoice.due_date || invoice.invoice_date)
        const today = new Date()
        const overdueDays = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))

        const customerName = invoice.customers?.company_name || 
                            `${invoice.customers?.first_name || ''} ${invoice.customers?.last_name || ''}`.trim() ||
                            'عميل غير محدد'

        return {
          customer_name: customerName,
          amount: Number(invoice.balance_due || invoice.total_amount),
          due_date: invoice.due_date || invoice.invoice_date,
          overdue_days: overdueDays,
          status: overdueDays > 0 ? 'متأخر' : 'مستحق'
        }
      })

      return receivablesData
    }
  })
}

// HTML Export utilities
export const exportToHTML = (content: string, title: string, companyName?: string) => {
  // Create print-friendly content container
  const printContent = `
    <div id="print-content" style="display: none;">
      <div class="header">
        <div class="company-name">${companyName || 'اسم الشركة'}</div>
        <div class="report-title">${title}</div>
        <div class="report-date">تاريخ التقرير: ${new Date().toLocaleDateString('en-GB')}</div>
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