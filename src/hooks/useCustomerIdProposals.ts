import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useUpdateCustomer } from '@/hooks/useCustomers';
import { convertAllPagesToImages, convertPDFToImage } from '@/services/contractPDFExtractor';
import type { CustomerFormData } from '@/types/customer';
import type { Database, Json } from '@/integrations/supabase/types';
import { getCustomerDataIssues } from '@/utils/formatCustomerName';

type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

export interface ProposedFieldChange {
  field: string;
  current_value: string | null;
  proposed_value: string;
  confidence: number;
  method: 'ocr' | 'normalized' | 'dictionary' | 'llm' | 'manual';
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
  evidence_crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: 0 | 90 | 180 | 270;
  } | null;
  evidence_image_bucket?: string | null;
  evidence_image_path?: string | null;
  evidence_label?: string | null;
  extracted_data?: Record<string, unknown> | null;
  overall_confidence: number | null;
  created_at: string;
  updated_at?: string;
}

// Table types were added to src/integrations/supabase/types.ts alongside the
// migration (20260729210000_customer_id_scan_proposals).
const proposalsTable = () => supabase.from('customer_id_scan_proposals');

const SCANNABLE_TYPES = ['identity', 'id_card', 'signed_contract_image', 'signed_contract'];

// Proposal fields that belong to the contract record, not the customer record.
const CONTRACT_PROPOSAL_FIELDS = new Set(['monthly_amount']);

async function applyContractProposalChanges(
  proposal: CustomerIdProposal,
  changes: ProposedFieldChange[],
  reviewerId: string,
) {
  const updates: Record<string, unknown> = {};
  for (const change of changes) {
    if (change.field === 'monthly_amount') {
      const amount = Number(change.proposed_value);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('قيمة الإيجار الشهري المقترحة غير صالحة');
      }
      updates.monthly_amount = amount;
    }
  }
  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from('contracts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', proposal.contract_id)
    .eq('company_id', proposal.company_id);
  if (error) throw error;

  await supabase.from('contract_operations_log').insert({
    contract_id: proposal.contract_id,
    company_id: proposal.company_id,
    operation_type: 'contract_fields_updated_from_id_review',
    operation_details: {
      proposal_id: proposal.id,
      applied_fields: changes.map((change) => ({
        field: change.field,
        from: change.current_value,
        to: change.proposed_value,
        confidence: change.confidence,
        method: change.method,
      })),
    },
    notes: 'اعتمدت قيم مستخرجة من مستند العقد بعد مراجعة بشرية',
    performed_by: reviewerId,
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);base64/)?.[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function uploadEvidencePageImage(params: {
  companyId: string;
  documentId: string;
  pageNumber: number;
  imageBase64: string;
}) {
  const path = `id-scan-evidence/${params.companyId}/${params.documentId}/page-${params.pageNumber}.png`;
  const { error } = await supabase.storage
    .from('contract-documents')
    .upload(path, dataUrlToBlob(params.imageBase64), {
      contentType: 'image/png',
      upsert: true,
    });
  if (error) throw error;
  return path;
}

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
      manualValues = {},
    }: {
      proposal: CustomerIdProposal;
      acceptedFields: string[] | null; // null = reject all
      manualValues?: Record<string, string>;
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

      if (!proposal.evidence_image_path) {
        throw new Error('يجب تجهيز صورة الاسم من المستند قبل اعتماد التعديل');
      }

      const acceptedChanges = proposal.proposed_changes.filter((c) =>
        acceptedFields.includes(c.field),
      ).map((change) => {
        const manualValue = manualValues[change.field]?.trim();
        return manualValue && manualValue !== change.proposed_value
          ? { ...change, proposed_value: manualValue, confidence: 1, method: 'manual' as const }
          : change;
      });
      if (acceptedChanges.length === 0) {
        throw new Error('لم يتم تحديد أي حقول');
      }

      const customerChanges = acceptedChanges.filter((c) => !CONTRACT_PROPOSAL_FIELDS.has(c.field));
      const contractChanges = acceptedChanges.filter((c) => CONTRACT_PROPOSAL_FIELDS.has(c.field));

      if (customerChanges.length > 0) {
        const updateData = Object.fromEntries(
          customerChanges.map((c) => [c.field, c.proposed_value]),
        ) as Partial<CustomerFormData>;
        if (updateData.first_name_ar) updateData.first_name = updateData.first_name_ar;
        if (updateData.last_name_ar) updateData.last_name = updateData.last_name_ar;

        // Apply through the standard customer update flow (cache + logging)
        await updateCustomer.mutateAsync({ customerId: proposal.customer_id, data: updateData });
      }

      if (contractChanges.length > 0) {
        await applyContractProposalChanges(proposal, contractChanges, user.id);
      }

      const allAccepted = acceptedChanges.length === proposal.proposed_changes.length;
      const finalChanges = proposal.proposed_changes.map((change) =>
        acceptedChanges.find((accepted) => accepted.field === change.field) || change,
      );
      const appliedManualValues = Object.fromEntries(
        acceptedChanges
          .filter((change) => change.method === 'manual')
          .map((change) => [change.field, change.proposed_value]),
      );
      const { error } = await proposalsTable()
        .update({
          status: allAccepted ? 'accepted' : 'partial',
          proposed_changes: finalChanges as unknown as Json,
          extracted_data: ({
            ...(proposal.extracted_data || {}),
            manual_review: {
              original_proposed_changes: proposal.proposed_changes,
              applied_values: appliedManualValues,
              reviewed_by: user.id,
              reviewed_at: new Date().toISOString(),
            },
          }) as unknown as Json,
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
            const pages = await Promise.all(
              pageImages.map(async (imageBase64, i) => ({
                pageNumber: i + 1,
                imageBase64,
                evidenceImagePath: await uploadEvidencePageImage({
                  companyId,
                  documentId: doc.id,
                  pageNumber: i + 1,
                  imageBase64,
                }),
              })),
            );

            const { data, error: fnError } = await supabase.functions.invoke('contract-id-scanner', {
              body: {
                mode: 'pages',
                contractDocumentId: doc.id,
                pages,
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

type NameAuditProposal = CustomerIdProposal & {
  customers: {
    first_name: string | null;
    last_name: string | null;
    first_name_ar: string | null;
    last_name_ar: string | null;
  } | null;
};

const normalizeNameForAudit = (value: string) => value
  .normalize('NFKC')
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[إأآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/[^\u0600-\u06FF\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const isPlausibleAuditedName = (value: string) => {
  const words = value.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 7 && words.every((word) => /^[\u0600-\u06FF]+$/.test(word));
};

export interface AuditedNameCandidate {
  firstName: string;
  lastName: string;
  confidence: number;
  proposalIds: string[];
}

export function selectAuditedNameCandidate(
  candidates: AuditedNameCandidate[],
): AuditedNameCandidate | null {
  const ranked = [...candidates].sort((a, b) =>
    b.confidence - a.confidence || b.proposalIds.length - a.proposalIds.length);
  const best = ranked[0];
  const runnerUp = ranked[1];
  const hasUnresolvedTie = !!runnerUp &&
    runnerUp.confidence === best?.confidence &&
    runnerUp.proposalIds.length === best?.proposalIds.length;

  return best && best.confidence >= 0.95 && !hasUnresolvedTie ? best : null;
}

/**
 * Re-scan every contract document, then automatically apply only a uniquely
 * supported Arabic name with confidence >= 95%. Tied/conflicting readings
 * remain pending for human review with their evidence image.
 */
export function useScanAllPendingContractDocumentsForId() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { user } = useAuth();
  const updateCustomer = useUpdateCustomer();

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('بيانات الشركة غير مكتملة');

      const documents: Array<{
        id: string;
        contract_id: string | null;
        document_type: string;
        document_name: string;
        file_path: string | null;
        mime_type: string | null;
      }> = [];
      const pageSize = 500;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from('contract_documents')
          .select('id, contract_id, document_type, document_name, file_path, mime_type')
          .eq('company_id', companyId)
          .in('document_type', SCANNABLE_TYPES)
          .not('file_path', 'is', null)
          .order('created_at', { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        documents.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }

      if (!documents?.length) return { scanned: 0, proposals: 0, failed: 0 };

      let proposals = 0;
      let failed = 0;

      for (const doc of documents) {
        try {
          if (doc.mime_type?.startsWith('image/')) {
            const { data, error: fnError } = await supabase.functions.invoke('contract-id-scanner', {
              body: { mode: 'document', contractDocumentId: doc.id },
            });
            if (fnError) throw fnError;
            if (data?.outcome === 'proposal_created') proposals++;
            continue;
          }

          if (doc.mime_type === 'application/pdf') {
            const { data: blob, error: dlError } = await supabase.storage
              .from('contract-documents')
              .download(doc.file_path!);
            if (dlError || !blob) throw dlError || new Error('فشل تحميل الملف');

            const file = new File([blob], doc.document_name || 'document.pdf', { type: 'application/pdf' });
            const pageImages = await convertAllPagesToImages(file, 2, 10);
            const pages = await Promise.all(
              pageImages.map(async (imageBase64, i) => ({
                pageNumber: i + 1,
                imageBase64,
                evidenceImagePath: await uploadEvidencePageImage({
                  companyId,
                  documentId: doc.id,
                  pageNumber: i + 1,
                  imageBase64,
                }),
              })),
            );

            const { data, error: fnError } = await supabase.functions.invoke('contract-id-scanner', {
              body: { mode: 'pages', contractDocumentId: doc.id, pages },
            });
            if (fnError) throw fnError;
            if (data?.outcome === 'proposal_created') proposals++;
          }
        } catch (docError) {
          failed++;
          console.error(`Error scanning document ${doc.id}:`, docError);
        }
      }

      const { data: pendingRows, error: proposalError } = await proposalsTable()
        .select('*, customers(first_name, last_name, first_name_ar, last_name_ar)')
        .eq('company_id', companyId)
        .in('status', ['pending', 'partial']);
      if (proposalError) throw proposalError;

      const byCustomer = new Map<string, NameAuditProposal[]>();
      for (const proposal of (pendingRows || []) as unknown as NameAuditProposal[]) {
        if (!proposal.evidence_image_path) continue;
        const nameChanges = proposal.proposed_changes.filter((change) =>
          change.field === 'first_name_ar' || change.field === 'last_name_ar');
        if (!nameChanges.length) continue;
        const list = byCustomer.get(proposal.customer_id) || [];
        list.push(proposal);
        byCustomer.set(proposal.customer_id, list);
      }

      let namesUpdated = 0;
      let namesNeedingReview = 0;
      for (const [customerId, customerProposals] of byCustomer) {
        const current = customerProposals[0]?.customers;
        if (!current) continue;

        const candidates = new Map<string, AuditedNameCandidate>();

        for (const proposal of customerProposals) {
          const firstChange = proposal.proposed_changes.find((change) => change.field === 'first_name_ar');
          const lastChange = proposal.proposed_changes.find((change) => change.field === 'last_name_ar');
          const nameChanges = [firstChange, lastChange].filter(Boolean) as ProposedFieldChange[];
          const firstName = firstChange?.proposed_value || current.first_name_ar || '';
          const lastName = lastChange?.proposed_value || current.last_name_ar || '';
          const fullName = `${firstName} ${lastName}`.trim();
          const key = normalizeNameForAudit(fullName);
          if (!key || !isPlausibleAuditedName(fullName)) continue;
          const confidence = Math.min(...nameChanges.map((change) => change.confidence));
          const existing = candidates.get(key);
          candidates.set(key, {
            firstName,
            lastName,
            confidence: Math.max(existing?.confidence || 0, confidence),
            proposalIds: [...(existing?.proposalIds || []), proposal.id],
          });
        }

        const best = selectAuditedNameCandidate([...candidates.values()]);
        if (!best) {
          namesNeedingReview++;
          continue;
        }

        try {
          await updateCustomer.mutateAsync({
            customerId,
            data: {
              first_name_ar: best.firstName,
              last_name_ar: best.lastName,
              first_name: best.firstName,
              last_name: best.lastName,
            },
          });

          const now = new Date().toISOString();
          for (const proposal of customerProposals.filter((item) => best.proposalIds.includes(item.id))) {
            const onlyNameFields = proposal.proposed_changes.every((change) =>
              change.field === 'first_name_ar' || change.field === 'last_name_ar');
            await proposalsTable()
              .update({
                status: onlyNameFields ? 'accepted' : 'partial',
                reviewed_by: user?.id || null,
                reviewed_at: now,
              })
              .eq('id', proposal.id)
              .eq('company_id', companyId);
          }
          namesUpdated++;
        } catch (customerError) {
          namesNeedingReview++;
          console.error(`Automatic name audit failed for customer ${customerId}:`, customerError);
        }
      }

      return { scanned: documents.length, proposals, failed, namesUpdated, namesNeedingReview };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customer-id-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['contract-documents'] });
      if (result.scanned === 0) {
        toast.info('لا توجد مستندات عقود قابلة للتدقيق');
      } else {
        toast.success(
          `تم تدقيق ${result.scanned} مستند وتحديث أسماء ${result.namesUpdated || 0} عميل تلقائياً`,
        );
        if ((result.namesNeedingReview || 0) > 0) {
          toast.info(`${result.namesNeedingReview} عميل يحتاج مراجعة بشرية بسبب تعارض أو انخفاض الثقة`);
        }
        if (result.failed > 0) toast.warning(`تعذر مسح ${result.failed} مستند`);
      }
    },
    onError: (error) => {
      console.error('Bulk document scan failed:', error);
      toast.error(error instanceof Error ? error.message : 'فشل مسح العقود');
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
  contract_documents: {
    document_name: string | null;
    file_path: string | null;
    mime_type: string | null;
  } | null;
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
          '*, customers(first_name, last_name, first_name_ar, last_name_ar, customer_code), contracts(contract_number), contract_documents(document_name, file_path, mime_type)',
        )
        .eq('company_id', companyId!)
        .in('status', ['pending', 'partial'])
        .order('overall_confidence', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as CustomerIdProposalWithContext[];
    },
    enabled: !!user && !!companyId,
    staleTime: 30000,
  });
}

export function useBackfillProposalEvidence() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (proposals: CustomerIdProposalWithContext[]) => {
      if (!companyId) throw new Error('بيانات الشركة غير مكتملة');

      const missing = proposals.filter((proposal) => !proposal.evidence_image_path);
      let processed = 0;
      let cropped = 0;
      let failed = 0;

      for (const proposal of missing) {
        try {
          const document = proposal.contract_documents;
          if (!document?.file_path || !proposal.contract_document_id || !proposal.page_number) {
            throw new Error('بيانات المستند أو رقم الصفحة غير مكتملة');
          }

          const { data: blob, error: downloadError } = await supabase.storage
            .from('contract-documents')
            .download(document.file_path);
          if (downloadError || !blob) {
            throw downloadError || new Error('تعذر تحميل مستند العقد');
          }

          let imageBase64: string;
          if (document.mime_type === 'application/pdf') {
            const file = new File([blob], document.document_name || 'contract.pdf', {
              type: 'application/pdf',
            });
            imageBase64 = await convertPDFToImage(file, proposal.page_number, 2.5);
          } else if (document.mime_type?.startsWith('image/')) {
            imageBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(reader.error || new Error('تعذر قراءة الصورة'));
              reader.readAsDataURL(blob);
            });
          } else {
            throw new Error('نوع المستند غير مدعوم');
          }

          const evidenceImagePath = await uploadEvidencePageImage({
            companyId,
            documentId: proposal.contract_document_id,
            pageNumber: proposal.page_number,
            imageBase64,
          });

          const proposedValue = (field: string) =>
            proposal.proposed_changes.find((change) => change.field === field)?.proposed_value || '';
          const evidenceLabel = [
            proposedValue('first_name_ar'),
            proposedValue('last_name_ar'),
          ].filter(Boolean).join(' ') || [
            proposedValue('first_name'),
            proposedValue('last_name'),
          ].filter(Boolean).join(' ');

          const { error: updateError } = await proposalsTable()
            .update({
              evidence_image_bucket: 'contract-documents',
              evidence_image_path: evidenceImagePath,
              evidence_crop: null,
              evidence_label: evidenceLabel || null,
            })
            .eq('id', proposal.id)
            .eq('company_id', companyId);
          if (updateError) throw updateError;

          processed++;
        } catch (error) {
          failed++;
          console.error(`Failed to generate evidence for proposal ${proposal.id}:`, error);
        }
      }

      return { processed, cropped, failed, requested: missing.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customer-id-proposals'] });
      if (result.processed > 0) {
        toast.success(`تم تجهيز صور المراجعة لـ ${result.processed} مهمة`);
      }
      if (result.failed > 0) {
        toast.warning(`تعذر تجهيز صورة ${result.failed} مهمة`);
      }
    },
    onError: (error) => {
      console.error('Proposal evidence backfill failed:', error);
      toast.error(error instanceof Error ? error.message : 'فشل تجهيز صور المراجعة');
    },
  });
}

/**
 * Run the Kimi K3 agent over open proposals. The agent only marks proposals
 * (verified / ready, uncertain, or incorrect); it never applies changes.
 */
export function useAiReviewProposals() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation<
    {
      reviewed: number;
      ready: number;
      uncertain: number;
      incorrect: number;
      failed: number;
      conflicts?: number;
      autoApproved?: number;
    },
    Error,
    number | undefined
  >({
    mutationFn: async (limit = 25) => {
      if (!companyId) throw new Error('بيانات الشركة غير مكتملة');
      const { data, error } = await supabase.functions.invoke('customer-proposal-ai-reviewer', {
        body: { mode: 'batch', companyId, limit },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || 'فشل تدقيق الوكيل');
      return data as {
        reviewed: number;
        ready: number;
        uncertain: number;
        incorrect: number;
        failed: number;
        conflicts?: number;
        autoApproved?: number;
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customer-id-proposals'] });
      if (result.reviewed === 0) {
        toast.info('لا توجد مقترحات معلقة للتدقيق');
        return;
      }
      toast.success(
        `راجع الوكيل ${result.reviewed} مقترحاً: ${result.ready} جاهز للاعتماد`,
        {
          description: [
            (result.autoApproved || 0) > 0 ? `${result.autoApproved} اعتمد آلياً` : '',
            (result.conflicts || 0) > 0 ? `${result.conflicts} متعارض بين المستندات` : '',
            result.uncertain > 0 ? `${result.uncertain} غير مؤكد` : '',
            result.incorrect > 0 ? `${result.incorrect} غير صحيح` : '',
            result.failed > 0 ? `${result.failed} فشل` : '',
          ].filter(Boolean).join(' · ') || undefined,
        },
      );
    },
    onError: (error) => {
      console.error('AI proposal review failed:', error);
      toast.error(error instanceof Error ? error.message : 'فشل تدقيق الوكيل الذكي');
    },
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
      const perContract = new Map<string, { proposal: CustomerIdProposalWithContext; changes: ProposedFieldChange[] }>();
      const perProposal = new Map<string, { accepted: number; total: number }>();

      for (const proposal of proposals) {
        if (!proposal.evidence_image_path) continue;
        const accepted = proposal.proposed_changes.filter((c) => c.confidence >= threshold);
        if (accepted.length === 0) continue;

        const customerAccepted = accepted.filter((c) => !CONTRACT_PROPOSAL_FIELDS.has(c.field));
        const contractAccepted = accepted.filter((c) => CONTRACT_PROPOSAL_FIELDS.has(c.field));

        const fields = perCustomer.get(proposal.customer_id) || {};
        for (const change of customerAccepted) fields[change.field] = change.proposed_value;
        if (fields.first_name_ar) fields.first_name = fields.first_name_ar;
        if (fields.last_name_ar) fields.last_name = fields.last_name_ar;
        if (Object.keys(fields).length > 0) perCustomer.set(proposal.customer_id, fields);

        if (contractAccepted.length > 0) {
          perContract.set(proposal.id, { proposal, changes: contractAccepted });
        }
        perProposal.set(proposal.id, {
          accepted: accepted.length,
          total: proposal.proposed_changes.length,
        });
      }

      if (perCustomer.size === 0 && perContract.size === 0) {
        return { customersUpdated: 0, customersFailed: 0, fieldsApplied: 0, proposalsClosed: 0 };
      }

      // 2) One update per customer — a single failure must not block the rest
      const failedCustomers: string[] = [];
      for (const [customerId, fields] of perCustomer) {
        const { data: existingCustomer, error: fetchError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .maybeSingle();

        if (fetchError || !existingCustomer) {
          console.error(`Bulk approve: failed to fetch customer ${customerId}:`, fetchError);
          failedCustomers.push(customerId);
          continue;
        }

        const customerDataIssues = getCustomerDataIssues({
          ...existingCustomer,
          ...fields,
        });

        if (customerDataIssues.length > 0) {
          console.warn(`Bulk approve: skipped customer ${customerId} because official Arabic data is incomplete:`, customerDataIssues);
          failedCustomers.push(customerId);
          continue;
        }

        const { error } = await supabase
          .from('customers')
          .update(fields as CustomerUpdate)
          .eq('id', customerId);
        if (error) {
          console.error(`Bulk approve: failed to update customer ${customerId}:`, error);
          failedCustomers.push(customerId);
        }
      }

      // 3) Contract-targeted fields (e.g. monthly rent) update the contract,
      //    not the customer.
      const failedContracts: string[] = [];
      for (const { proposal, changes } of perContract.values()) {
        try {
          await applyContractProposalChanges(proposal, changes, user.id);
        } catch (contractError) {
          console.error(`Bulk approve: failed to update contract ${proposal.contract_id}:`, contractError);
          failedContracts.push(proposal.id);
        }
      }

      // 4) Close proposals (accepted if all fields approved, partial otherwise).
      //    Skip proposals whose customer/contract update failed so they stay pending.
      const now = new Date().toISOString();
      let proposalsClosed = 0;
      for (const proposal of proposals) {
        const stats = perProposal.get(proposal.id);
        if (!stats) continue;
        if (failedCustomers.includes(proposal.customer_id)) continue;
        if (failedContracts.includes(proposal.id)) continue;
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
