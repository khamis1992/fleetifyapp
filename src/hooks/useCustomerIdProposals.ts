import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useUpdateCustomer } from '@/hooks/useCustomers';
import { convertAllPagesToImages } from '@/services/contractPDFExtractor';
import type { CustomerFormData } from '@/types/customer';
import type { Database } from '@/integrations/supabase/types';

type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

export interface ProposedFieldChange {
  field: string;
  current_value: string | null;
  proposed_value: string;
  confidence: number;
  method: 'ocr' | 'normalized' | 'dictionary' | 'llm';
}

export interface CustomerIdProposal {
  id: string;
  company_id: string;
  contract_id: string;
  customer_id: string;
  contract_document_id: string;
  page_number: number | null;
  status: 'pending' | 'accepted' | 'rejected' | 'partial';
  proposed_changes: ProposedFieldChange[];
  overall_confidence: number | null;
  created_at: string;
}

// Table types were added to src/integrations/supabase/types.ts alongside the
// migration (20260729210000_customer_id_scan_proposals).
const proposalsTable = () => supabase.from('customer_id_scan_proposals');

const SCANNABLE_TYPES = ['identity', 'id_card', 'signed_contract_image', 'signed_contract'];

/**
 * Fetch pending ID-scan proposals for a contract.
 */
export function useCustomerIdProposals(contractId?: string) {
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['customer-id-proposals', contractId],
    queryFn: async (): Promise<CustomerIdProposal[]> => {
      if (!contractId) return [];

      const { data, error } = await proposalsTable()
        .select('*')
        .eq('contract_id', contractId)
        .eq('company_id', companyId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as CustomerIdProposal[];
    },
    enabled: !!contractId && !!user && !!companyId,
    staleTime: 30000,
  });
}

/**
 * Count of a contract's documents still waiting for an ID-card scan.
 * Used to trigger the automatic scan when the contract page opens.
 */
export function usePendingIdScanCount(contractId?: string) {
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['pending-id-scan-count', contractId],
    queryFn: async (): Promise<number> => {
      if (!contractId) return 0;

      const { count, error } = await supabase
        .from('contract_documents')
        .select('id', { count: 'exact', head: true })
        .eq('contract_id', contractId)
        .eq('company_id', companyId!)
        .in('document_type', SCANNABLE_TYPES)
        .eq('id_scan_status', 'pending')
        .not('file_path', 'is', null);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!contractId && !!user && !!companyId,
    staleTime: 30000,
  });
}

/**
 * Apply accepted fields to the customer and update the proposal status.
 */export function useRespondToIdProposal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const updateCustomer = useUpdateCustomer();

  return useMutation({
    mutationFn: async ({
      proposal,
      acceptedFields,
    }: {
      proposal: CustomerIdProposal;
      acceptedFields: string[] | null; // null = reject all
    }) => {
      if (!user) throw new Error('المستخدم غير مسجل');

      if (acceptedFields === null) {
        // Reject the whole proposal
        const { error } = await proposalsTable()
          .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
          .eq('id', proposal.id);
        if (error) throw error;
        return { status: 'rejected' as const };
      }

      const acceptedChanges = proposal.proposed_changes.filter((c) =>
        acceptedFields.includes(c.field),
      );
      if (acceptedChanges.length === 0) {
        throw new Error('لم يتم تحديد أي حقول');
      }

      const updateData = Object.fromEntries(
        acceptedChanges.map((c) => [c.field, c.proposed_value]),
      ) as Partial<CustomerFormData>;

      // Apply through the standard customer update flow (cache + logging)
      await updateCustomer.mutateAsync({ customerId: proposal.customer_id, data: updateData });

      const allAccepted = acceptedChanges.length === proposal.proposed_changes.length;
      const { error } = await proposalsTable()
        .update({
          status: allAccepted ? 'accepted' : 'partial',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', proposal.id);
      if (error) throw error;

      return { status: allAccepted ? ('accepted' as const) : ('partial' as const) };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customer-id-proposals'] });
      if (result.status === 'rejected') {
        toast.info('تم رفض المقترح');
      }
      // Success toast for customer update is handled by useUpdateCustomer
    },
    onError: (error) => {
      console.error('Error responding to proposal:', error);
      toast.error('فشل في معالجة المقترح');
    },
  });
}

/**
 * Scan a contract's unprocessed documents for ID cards.
 * - Image documents are sent directly to the edge function.
 * - PDF documents are rasterized client-side (pdfjs) then sent page by page.
 */
export function useScanContractDocumentsForId(contractId?: string) {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async () => {
      if (!contractId || !companyId) throw new Error('بيانات غير مكتملة');

      const { data: documents, error } = await supabase
        .from('contract_documents')
        .select('id, document_type, document_name, file_path, mime_type')
        .eq('contract_id', contractId)
        .eq('company_id', companyId)
        .in('document_type', SCANNABLE_TYPES)
        .eq('id_scan_status', 'pending')
        .not('file_path', 'is', null);

      if (error) throw error;
      if (!documents || documents.length === 0) {
        return { scanned: 0, proposals: 0 };
      }

      let proposals = 0;

      for (const doc of documents) {
        try {
          if (doc.mime_type?.startsWith('image/')) {
            const { data, error: fnError } = await supabase.functions.invoke('contract-id-scanner', {
              body: { mode: 'document', contractDocumentId: doc.id },
            });
            if (fnError) throw fnError;
            if (data?.outcome === 'proposal_created') proposals++;
          } else if (doc.mime_type === 'application/pdf') {
            // Rasterize pages client-side, then let the edge function detect the ID page
            const { data: blob, error: dlError } = await supabase.storage
              .from('contract-documents')
              .download(doc.file_path!);
            if (dlError || !blob) throw dlError || new Error('فشل تحميل الملف');

            const file = new File([blob], doc.document_name || 'document.pdf', { type: 'application/pdf' });
            const pageImages = await convertAllPagesToImages(file, 2, 10);

            const { data, error: fnError } = await supabase.functions.invoke('contract-id-scanner', {
              body: {
                mode: 'pages',
                contractDocumentId: doc.id,
                pages: pageImages.map((imageBase64, i) => ({ pageNumber: i + 1, imageBase64 })),
              },
            });
            if (fnError) throw fnError;
            if (data?.outcome === 'proposal_created') proposals++;
          }
        } catch (docError) {
          console.error(`Error scanning document ${doc.id}:`, docError);
          // Continue with the remaining documents
        }
      }

      return { scanned: documents.length, proposals };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customer-id-proposals', contractId] });
      queryClient.invalidateQueries({ queryKey: ['pending-id-scan-count', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contract-documents', contractId] });
      if (result.scanned === 0) {
        toast.info('لا توجد مستندات جديدة للمسح');
      } else if (result.proposals > 0) {
        toast.success(`تم العثور على ${result.proposals} مقترح لتحديث بيانات العميل`);
      } else {
        toast.info('تم المسح — لم يتم العثور على بطاقة هوية أو اختلافات في البيانات');
      }
    },
    onError: (error) => {
      console.error('Error scanning contract documents:', error);
      toast.error('فشل مسح مستندات العقد');
    },
  });
}

// ---------------------------------------------------------------------------
// Central review center (all pending proposals across the company)
// ---------------------------------------------------------------------------

export interface CustomerIdProposalWithContext extends CustomerIdProposal {
  customers: {
    first_name: string | null;
    last_name: string | null;
    first_name_ar: string | null;
    last_name_ar: string | null;
    customer_code: string | null;
  } | null;
  contracts: { contract_number: string | null } | null;
}

/**
 * Fetch ALL pending ID-scan proposals for the company (central review page).
 */
export function useAllPendingIdProposals() {
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['customer-id-proposals', 'all-pending', companyId],
    queryFn: async (): Promise<CustomerIdProposalWithContext[]> => {
      const { data, error } = await proposalsTable()
        .select(
          '*, customers(first_name, last_name, first_name_ar, last_name_ar, customer_code), contracts(contract_number)',
        )
        .eq('company_id', companyId!)
        .eq('status', 'pending')
        .order('overall_confidence', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as CustomerIdProposalWithContext[];
    },
    enabled: !!user && !!companyId,
    staleTime: 30000,
  });
}

/**
 * Bulk-approve: apply every proposed field with confidence >= threshold
 * across all pending proposals. Updates are grouped per customer (one DB
 * write per customer), then each proposal is marked accepted/partial.
 */
export function useBulkApproveIdProposals() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      proposals,
      threshold = 0.9,
    }: {
      proposals: CustomerIdProposalWithContext[];
      threshold?: number;
    }) => {
      if (!user) throw new Error('المستخدم غير مسجل');

      // 1) Group accepted fields per customer (latest proposal wins per field)
      const perCustomer = new Map<string, Record<string, string>>();
      const perProposal = new Map<string, { accepted: number; total: number }>();

      for (const proposal of proposals) {
        const accepted = proposal.proposed_changes.filter((c) => c.confidence >= threshold);
        if (accepted.length === 0) continue;

        const fields = perCustomer.get(proposal.customer_id) || {};
        for (const change of accepted) fields[change.field] = change.proposed_value;
        perCustomer.set(proposal.customer_id, fields);
        perProposal.set(proposal.id, {
          accepted: accepted.length,
          total: proposal.proposed_changes.length,
        });
      }

      if (perCustomer.size === 0) {
        return { customersUpdated: 0, customersFailed: 0, fieldsApplied: 0, proposalsClosed: 0 };
      }

      // 2) One update per customer — a single failure must not block the rest
      const failedCustomers: string[] = [];
      for (const [customerId, fields] of perCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(fields as CustomerUpdate)
          .eq('id', customerId);
        if (error) {
          console.error(`Bulk approve: failed to update customer ${customerId}:`, error);
          failedCustomers.push(customerId);
        }
      }

      // 3) Close proposals (accepted if all fields approved, partial otherwise).
      //    Skip proposals whose customer update failed so they stay pending.
      const now = new Date().toISOString();
      let proposalsClosed = 0;
      for (const proposal of proposals) {
        const stats = perProposal.get(proposal.id);
        if (!stats) continue;
        if (failedCustomers.includes(proposal.customer_id)) continue;
        const { error } = await proposalsTable()
          .update({
            status: stats.accepted === stats.total ? 'accepted' : 'partial',
            reviewed_by: user.id,
            reviewed_at: now,
          })
          .eq('id', proposal.id);
        if (!error) proposalsClosed++;
      }

      const fieldsApplied = Array.from(perProposal.values()).reduce((s, p) => s + p.accepted, 0);
      return {
        customersUpdated: perCustomer.size - failedCustomers.length,
        customersFailed: failedCustomers.length,
        fieldsApplied,
        proposalsClosed,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customer-id-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (result.customersFailed > 0) {
        toast.warning(
          `تم اعتماد ${result.fieldsApplied} حقل لـ ${result.customersUpdated} عميل، وتعذّر تحديث ${result.customersFailed} عميل (راجع وحدة التحكم)`,
        );
      } else {
        toast.success(
          `تم اعتماد ${result.fieldsApplied} حقل لـ ${result.customersUpdated} عميل (${result.proposalsClosed} مقترح)`,
        );
      }
    },
    onError: (error) => {
      console.error('Bulk approve failed:', error);
      toast.error(error instanceof Error ? error.message : 'فشل الاعتماد الجماعي');
    },
  });
}
