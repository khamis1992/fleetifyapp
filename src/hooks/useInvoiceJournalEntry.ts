/**
 * useInvoiceJournalEntry Hook
 * Hook للتعامل مع ربط الفواتير بالقيود المحاسبية
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { 
  createJournalEntryFromInvoice, 
  linkExistingInvoicesToJournalEntries,
  checkInvoiceJournalEntry,
  InvoiceJournalEntryData
} from '@/utils/journalEntryGenerator';
import { toast } from 'sonner';

/**
 * Hook لإنشاء قيد محاسبي من فاتورة
 */
export function useCreateInvoiceJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InvoiceJournalEntryData) => {
      const journalEntryId = await createJournalEntryFromInvoice(data);
      if (!journalEntryId) {
        throw new Error('فشل إنشاء القيد المحاسبي');
      }
      return journalEntryId;
    },
    onSuccess: (_, variables) => {
      toast.success(`تم إنشاء القيد المحاسبي للفاتورة ${variables.invoiceNumber} بنجاح`);
      
      // تحديث الكاش
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-journal-entry', variables.invoiceId] });
    },
    onError: (error: any) => {
      console.error('Error creating journal entry:', error);
      toast.error(error.message || 'حدث خطأ أثناء إنشاء القيد المحاسبي');
    }
  });
}

/**
 * Hook لربط جميع الفواتير الموجودة بقيود محاسبية (بأثر رجعي)
 */
export function useLinkExistingInvoices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      if (!user?.id) {
        throw new Error('المستخدم غير مسجل دخول');
      }

      const results = await linkExistingInvoicesToJournalEntries(
        companyId,
        user.id
      );

      return results;
    },
    onSuccess: (results) => {
      toast.success(
        `تم ربط ${results.success} فاتورة بنجاح`,
        {
          description: `نجح: ${results.success} | فشل: ${results.failed} | من أصل: ${results.total}`
        }
      );
      
      // تحديث الكاش
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-financial-reports'] });
    },
    onError: (error: any) => {
      console.error('Error linking existing invoices:', error);
      toast.error('حدث خطأ أثناء ربط الفواتير');
    }
  });
}

/**
 * Hook للتحقق من وجود قيد محاسبي لفاتورة
 */
export function useInvoiceJournalEntry(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoice-journal-entry', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      return await checkInvoiceJournalEntry(invoiceId);
    },
    enabled: !!invoiceId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

