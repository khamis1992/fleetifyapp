import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface InvoiceJournalLink {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  total_amount: number;
  journal_entry_id: string | null;
  journal_entry_number: string | null;
  journal_entry_date: string | null;
  journal_entry_status: string | null;
  journal_entry_reversed_at: string | null;
  is_linked: boolean;
  link_type: 'automatic' | 'manual' | 'none';
  invoice_status: string;
  payment_status: string;
}

export interface InvoiceJournalStats {
  totalInvoices: number;
  linkedInvoices: number;
  unlinkedInvoices: number;
  automaticLinks: number;
  manualLinks: number;
  linkingPercentage: number;
}

/**
 * Hook لجلب بيانات ربط الفواتير بالقيود المحاسبية
 */
export function useInvoiceJournalLinking(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['invoice-journal-linking', companyId, startDate, endDate],
    queryFn: async (): Promise<{ links: InvoiceJournalLink[]; stats: InvoiceJournalStats } | null> => {
      if (!companyId) return null;

      // 1. Get all invoices with customer data
      let invoicesQuery = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          total_amount,
          status,
          payment_status,
          journal_entry_id,
          journal_entries!invoices_journal_entry_id_fkey (
            id,
            entry_number,
            entry_date,
            status,
            reference_type,
            reference_id,
            reversed_at
          ),
          customers (
            id,
            name
          )
        `)
        .eq('company_id', companyId)
        .order('invoice_date', { ascending: false });

      if (startDate) {
        invoicesQuery = invoicesQuery.gte('invoice_date', startDate);
      }
      if (endDate) {
        invoicesQuery = invoicesQuery.lte('invoice_date', endDate);
      }

      const { data: invoices, error: invoicesError } = await invoicesQuery;

      if (invoicesError) throw invoicesError;
      if (!invoices) return null;

      // 2. Prefer the invoice FK. Only use an exact invoice reference as fallback.
      const invoiceToJournalMap = new Map<string, any>();
      for (const invoice of invoices as any[]) {
        const relation = Array.isArray(invoice.journal_entries)
          ? invoice.journal_entries[0]
          : invoice.journal_entries;
        if (invoice.journal_entry_id && relation?.id === invoice.journal_entry_id) {
          invoiceToJournalMap.set(invoice.id, relation);
        }
      }

      const missingInvoiceIds = (invoices as any[])
        .filter((invoice) => !invoiceToJournalMap.has(invoice.id))
        .map((invoice) => invoice.id as string);

      for (let index = 0; index < missingInvoiceIds.length; index += 100) {
        const invoiceIdBatch = missingInvoiceIds.slice(index, index + 100);
        const { data: referencedEntries, error: journalError } = await supabase
          .from('journal_entries')
          .select('id,entry_number,entry_date,status,reference_type,reference_id,reversed_at,created_at')
          .eq('company_id', companyId)
          .eq('reference_type', 'invoice')
          .in('reference_id', invoiceIdBatch)
          .order('created_at', { ascending: true });

        if (journalError) throw journalError;
        for (const entry of referencedEntries || []) {
          if (entry.reference_id && !invoiceToJournalMap.has(entry.reference_id)) {
            invoiceToJournalMap.set(entry.reference_id, entry);
          }
        }
      }

      // 4. Build the links array
      const links: InvoiceJournalLink[] = invoices.map((invoice: any) => {
        const journalEntry = invoiceToJournalMap.get(invoice.id);
        const isLinked = !!journalEntry;
        
        const linkType: 'automatic' | 'manual' | 'none' = isLinked ? 'automatic' : 'none';

        return {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          customer_name: invoice.customers?.name || 'غير محدد',
          total_amount: Number(invoice.total_amount || 0),
          journal_entry_id: journalEntry?.id || null,
          journal_entry_number: journalEntry?.entry_number || null,
          journal_entry_date: journalEntry?.entry_date || null,
          journal_entry_status: journalEntry?.reversed_at ? 'reversed' : journalEntry?.status || null,
          journal_entry_reversed_at: journalEntry?.reversed_at || null,
          is_linked: isLinked,
          link_type: linkType,
          invoice_status: invoice.status,
          payment_status: invoice.payment_status
        };
      });

      // 5. Calculate statistics
      const totalInvoices = links.length;
      const linkedInvoices = links.filter(l => l.is_linked).length;
      const unlinkedInvoices = totalInvoices - linkedInvoices;
      const automaticLinks = links.filter(l => l.link_type === 'automatic').length;
      const manualLinks = links.filter(l => l.link_type === 'manual').length;
      const linkingPercentage = totalInvoices > 0 ? (linkedInvoices / totalInvoices) * 100 : 0;

      const stats: InvoiceJournalStats = {
        totalInvoices,
        linkedInvoices,
        unlinkedInvoices,
        automaticLinks,
        manualLinks,
        linkingPercentage
      };

      return { links, stats };
    },
    enabled: !!companyId
  });
}

/**
 * Hook للحصول على تفاصيل القيد المحاسبي لفاتورة معينة
 */
export function useInvoiceJournalDetails(invoiceId: string | null) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['invoice-journal-details', invoiceId],
    queryFn: async () => {
      if (!invoiceId || !companyId) return null;

      // Get journal entry for this invoice
      const { data: journalEntry, error: journalError } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines (
            *,
            chart_of_accounts (
              account_code,
              account_name
            )
          )
        `)
        .eq('company_id', companyId)
        .or(`reference_invoice_id.eq.${invoiceId},invoice_id.eq.${invoiceId}`)
        .maybeSingle();

      if (journalError && journalError.code !== 'PGRST116') throw journalError;

      return journalEntry;
    },
    enabled: !!invoiceId && !!companyId
  });
}
