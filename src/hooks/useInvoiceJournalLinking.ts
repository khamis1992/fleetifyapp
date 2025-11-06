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

      // 2. Get all journal entries with reference to invoices
      const { data: journalEntries, error: journalError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('company_id', companyId);

      if (journalError) throw journalError;

      // 3. Build a map of invoice_id to journal_entry
      const invoiceToJournalMap = new Map<string, any>();
      
      journalEntries?.forEach((entry: any) => {
        // Check if the reference field or description contains invoice information
        const refInvoiceId = entry.reference_invoice_id || entry.invoice_id;
        if (refInvoiceId) {
          invoiceToJournalMap.set(refInvoiceId, entry);
        } else if (entry.description) {
          // Try to extract invoice number from description
          const invoiceMatch = entry.description.match(/(?:فاتورة|invoice)[:\s#]*(\d+)/i);
          if (invoiceMatch) {
            const invoiceNum = invoiceMatch[1];
            const matchedInvoice = invoices.find((inv: any) => inv.invoice_number === invoiceNum);
            if (matchedInvoice) {
              invoiceToJournalMap.set(matchedInvoice.id, entry);
            }
          }
        }
      });

      // 4. Build the links array
      const links: InvoiceJournalLink[] = invoices.map((invoice: any) => {
        const journalEntry = invoiceToJournalMap.get(invoice.id);
        const isLinked = !!journalEntry;
        
        // Determine link type
        let linkType: 'automatic' | 'manual' | 'none' = 'none';
        if (isLinked) {
          // If reference_invoice_id exists, it's automatic
          linkType = journalEntry.reference_invoice_id ? 'automatic' : 'manual';
        }

        return {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          customer_name: invoice.customers?.name || 'غير محدد',
          total_amount: Number(invoice.total_amount || 0),
          journal_entry_id: journalEntry?.id || null,
          journal_entry_number: journalEntry?.entry_number || null,
          journal_entry_date: journalEntry?.entry_date || null,
          journal_entry_status: journalEntry?.status || null,
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
        .single();

      if (journalError && journalError.code !== 'PGRST116') throw journalError;

      return journalEntry;
    },
    enabled: !!invoiceId && !!companyId
  });
}

