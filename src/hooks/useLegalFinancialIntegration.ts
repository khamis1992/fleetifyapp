import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CreateLegalInvoiceData {
  caseId: string;
  clientId?: string;
  invoiceType: 'legal_fees' | 'court_fees' | 'expenses';
  amount: number;
  description: string;
  dueDate?: string;
}

interface CreateLegalJournalEntryData {
  caseId: string;
  type: 'expense' | 'payment' | 'fee_accrual';
  amount: number;
  description: string;
  expense_account_id?: string;
  receivable_account_id?: string;
}

export const useCreateLegalInvoice = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLegalInvoiceData) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      // Get case details
      const { data: legalCase } = await supabase
        .from('legal_cases')
        .select('case_number, case_title, client_id, client_name')
        .eq('id', data.caseId)
        .single();

      if (!legalCase) throw new Error('لم يتم العثور على القضية');

      // Generate invoice number
      const invoiceNumber = `INV-LEGAL-${Date.now()}`;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          company_id: profile.company_id,
          customer_id: data.clientId || null,
          invoice_number: invoiceNumber,
          invoice_type: 'service',
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: data.dueDate || null,
          subtotal: data.amount,
          total_amount: data.amount,
          status: 'draft',
          notes: `فاتورة قانونية للقضية ${legalCase.case_number} - ${legalCase.case_title}`,
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const { error: itemError } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          item_description: data.description,
          quantity: 1,
          unit_price: data.amount,
          line_total: data.amount,
          line_number: 1,
        });

      if (itemError) throw itemError;

      // Update legal case payment record
      const { error: paymentError } = await supabase
        .from('legal_case_payments')
        .insert({
          case_id: data.caseId,
          company_id: profile.company_id,
          payment_type: data.invoiceType,
          description: data.description,
          amount: data.amount,
          payment_status: 'pending',
          due_date: data.dueDate || null,
          invoice_id: invoice.id,
          created_by: user.id,
        });

      if (paymentError) throw paymentError;

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم إنشاء الفاتورة القانونية بنجاح');
    },
    onError: (error: any) => {
      console.error('Error creating legal invoice:', error);
      toast.error('حدث خطأ أثناء إنشاء الفاتورة القانونية');
    },
  });
};

export const useCreateLegalJournalEntry = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLegalJournalEntryData) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      // Get case details
      const { data: legalCase } = await supabase
        .from('legal_cases')
        .select('case_number, case_title')
        .eq('id', data.caseId)
        .single();

      if (!legalCase) throw new Error('لم يتم العثور على القضية');

      // Get legal cost center
      const { data: costCenter } = await supabase
        .from('cost_centers')
        .select('id')
        .eq('company_id', profile.company_id)
        .eq('center_code', 'LEGAL')
        .single();

      // Create cost center if it doesn't exist
      let legalCostCenterId = costCenter?.id;
      if (!legalCostCenterId) {
        const { data: newCostCenter, error: costCenterError } = await supabase
          .from('cost_centers')
          .insert({
            company_id: profile.company_id,
            center_code: 'LEGAL',
            center_name: 'Legal Department',
            center_name_ar: 'القسم القانوني',
            description: 'Legal department cost center',
            is_active: true,
          })
          .select()
          .single();

        if (costCenterError) throw costCenterError;
        legalCostCenterId = newCostCenter.id;
      }

      // Get appropriate accounts
      let debitAccountId = data.expense_account_id;
      let creditAccountId = data.receivable_account_id;

      if (!debitAccountId || !creditAccountId) {
        // Find legal expense account
        if (data.type === 'expense') {
          const { data: expenseAccount } = await supabase
            .from('chart_of_accounts')
            .select('id')
            .eq('company_id', profile.company_id)
            .eq('account_type', 'expenses')
            .ilike('account_name', '%legal%')
            .single();

          debitAccountId = expenseAccount?.id;
        }

        // Find accounts receivable account
        const { data: receivableAccount } = await supabase
          .from('chart_of_accounts')
          .select('id')
          .eq('company_id', profile.company_id)
          .eq('account_type', 'assets')
          .ilike('account_name', '%receivable%')
          .single();

        creditAccountId = receivableAccount?.id;
      }

      if (!debitAccountId || !creditAccountId) {
        throw new Error('لم يتم العثور على الحسابات المطلوبة في دليل الحسابات');
      }

      // Generate journal entry number
      const entryNumber = `JE-LEGAL-${Date.now()}`;

      // Create journal entry
      const { data: journalEntry, error: journalError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: profile.company_id,
          entry_number: entryNumber,
          entry_date: new Date().toISOString().split('T')[0],
          description: `${data.description} - القضية ${legalCase.case_number}`,
          total_debit: data.amount,
          total_credit: data.amount,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (journalError) throw journalError;

      // Create journal entry lines
      const journalLines = [
        {
          journal_entry_id: journalEntry.id,
          account_id: debitAccountId,
          cost_center_id: legalCostCenterId,
          line_number: 1,
          line_description: `${data.description} - مدين`,
          debit_amount: data.amount,
          credit_amount: 0,
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: creditAccountId,
          cost_center_id: legalCostCenterId,
          line_number: 2,
          line_description: `${data.description} - دائن`,
          debit_amount: 0,
          credit_amount: data.amount,
        },
      ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(journalLines);

      if (linesError) throw linesError;

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('تم إنشاء قيد المحاسبة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error creating legal journal entry:', error);
      toast.error('حدث خطأ أثناء إنشاء القيد المحاسبي');
    },
  });
};

export const useLegalFinancialSummary = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (caseId: string) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get case financial summary
      const { data: payments } = await supabase
        .from('legal_case_payments')
        .select('*')
        .eq('case_id', caseId);

       const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, status')
        .ilike('notes', `%${caseId}%`);

      const summary = {
        totalExpenses: payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
        pendingPayments: payments?.filter(p => p.payment_status === 'pending').length || 0,
        totalInvoiced: invoices?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0,
        paidInvoices: invoices?.filter(i => i.status === 'paid').length || 0,
        overdueInvoices: invoices?.filter(i => i.status === 'overdue').length || 0,
      };

      return summary;
    },
  });
};