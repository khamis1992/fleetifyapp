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
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            @page {
                size: A4;
                margin: 2cm;
            }
            
            @media print {
                body { 
                    margin: 0; 
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .no-print { display: none; }
                .page-break { page-break-before: always; }
                table { 
                    page-break-inside: avoid;
                    font-size: 12px;
                }
                th, td { 
                    padding: 8px;
                    border: 1px solid #000 !important;
                }
                th {
                    background-color: #f5f5f5 !important;
                }
            }
            
            body {
                font-family: 'Arial', 'Tahoma', sans-serif;
                margin: 20px;
                direction: rtl;
                text-align: right;
                line-height: 1.4;
                color: #333;
                background: white;
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
            }
            
            .company-name {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #1a1a1a;
            }
            
            .report-title {
                font-size: 22px;
                color: #444;
                margin-bottom: 10px;
                font-weight: 600;
            }
            
            .report-date {
                color: #666;
                font-size: 14px;
                font-weight: normal;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                background: white;
                border: 1px solid #ddd;
            }
            
            th, td {
                border: 1px solid #ddd;
                padding: 12px;
                text-align: right;
                vertical-align: top;
            }
            
            th {
                background-color: #f8f9fa;
                font-weight: bold;
                color: #2c3e50;
                border-bottom: 2px solid #dee2e6;
            }
            
            .total-row {
                background-color: #f1f3f4;
                font-weight: bold;
                border-top: 2px solid #dee2e6;
            }
            
            .positive {
                color: #22c55e;
                font-weight: 600;
            }
            
            .negative {
                color: #ef4444;
                font-weight: 600;
            }
            
            .footer {
                margin-top: 50px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 20px;
            }
            
            .action-buttons {
                position: fixed;
                top: 20px;
                left: 20px;
                z-index: 1000;
                display: flex;
                gap: 10px;
            }
            
            .btn {
                background-color: #007bff;
                color: white;
                border: none;
                padding: 12px 20px;
                cursor: pointer;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                transition: background-color 0.2s;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .btn:hover {
                background-color: #0056b3;
            }
            
            .btn-secondary {
                background-color: #6c757d;
            }
            
            .btn-secondary:hover {
                background-color: #545b62;
            }
            
            .content {
                min-height: 400px;
            }
            
            /* RTL specific adjustments */
            .text-left {
                text-align: left;
            }
            
            .text-center {
                text-align: center;
            }
        </style>
        <script>
            function printReport() {
                window.print();
            }
            
            function closeWindow() {
                window.close();
            }
            
            // Auto-focus for better PDF generation
            window.onload = function() {
                document.body.focus();
            }
        </script>
    </head>
    <body>
        <div class="action-buttons no-print">
            <button class="btn" onclick="printReport()">🖨️ طباعة التقرير</button>
            <button class="btn btn-secondary" onclick="closeWindow()">✕ إغلاق</button>
        </div>
        
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
    </body>
    </html>
  `

  // Open HTML content in new tab instead of downloading
  const newWindow = window.open('', '_blank')
  if (newWindow) {
    newWindow.document.write(htmlContent)
    newWindow.document.close()
    // Focus the new window for better user experience
    newWindow.focus()
  } else {
    // Fallback if popup is blocked - show user instruction
    alert('يرجى السماح للنوافذ المنبثقة لعرض التقرير')
  }
}