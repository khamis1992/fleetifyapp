import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { contractDocumentsKey, invalidateContractDocumentDependents } from '@/utils/contractDocumentQueries';

export interface ContractDocument {
  id: string;
  company_id: string;
  contract_id: string;
  document_type: string;
  document_name: string;
  file_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_by?: string | null;
  uploaded_at: string | null;
  notes?: string | null;
  is_required: boolean | null;
  condition_report_id?: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Added field to distinguish document source bucket
  sourceBucket?: 'contract-documents' | 'documents';
  /** The table that owns this row. The storage bucket alone is not enough to distinguish it. */
  sourceType?: 'contract' | 'customer' | 'vehicle';
  /** customer_id or vehicle_id for documents inherited from those records. */
  sourceOwnerId?: string;
  preview_url?: string | null;
}

export type ContractViewDocumentDeleteTarget = Pick<
  ContractDocument,
  'id' | 'contract_id' | 'sourceType' | 'sourceOwnerId'
>;

export interface CreateDocumentData {
  contract_id: string;
  document_type: string;
  document_name: string;
  file?: File;
  notes?: string;
  is_required?: boolean;
  condition_report_id?: string;
  suppressSuccessToast?: boolean;
}

export function useContractDocuments(contractId?: string, customerId?: string, vehicleId?: string) {
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: [...contractDocumentsKey(companyId, contractId), customerId, vehicleId],
    queryFn: async () => {
      if (!contractId) return [];
      if (!companyId) throw new Error('تعذر تحديد الشركة الحالية');

      // Run all queries in parallel for better performance
      const [contractResult, customerResult, vehicleResult] = await Promise.all([
        // Fetch contract documents
        supabase
          .from('contract_documents')
          .select('id, company_id, contract_id, document_type, document_name, file_path, file_size, mime_type, uploaded_by, uploaded_at, notes, is_required, condition_report_id, created_at, updated_at')
          .eq('contract_id', contractId)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false }),
        
        // Fetch customer documents (only if customerId provided)
        customerId
          ? supabase
              .from('customer_documents')
              .select('id, company_id, document_type, document_name, file_path, file_size, mime_type, uploaded_by, uploaded_at, notes, is_required, created_at, updated_at')
              .eq('customer_id', customerId)
              .eq('company_id', companyId)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: null, error: null }),
        
        // Fetch vehicle documents (only if vehicleId provided)
        vehicleId
          ? (async () => {
              // vehicle_documents has no company_id; authorize through the parent vehicle.
              const { error: vehicleOwnerError } = await supabase
                .from('vehicles')
                .select('id')
                .eq('id', vehicleId)
                .eq('company_id', companyId)
                .single();
              if (vehicleOwnerError) return { data: null, error: vehicleOwnerError };

              return supabase
                .from('vehicle_documents')
                .select('id, document_type, document_name, document_url, created_at, updated_at')
                .eq('vehicle_id', vehicleId)
                .order('created_at', { ascending: false });
            })()
          : Promise.resolve({ data: null, error: null })
      ]);

      // Handle contract documents
      if (contractResult.error) throw contractResult.error;
      if (customerResult.error) throw customerResult.error;
      if (vehicleResult.error) throw vehicleResult.error;
      const contractDocuments = await Promise.all(
        (contractResult.data || []).map(async (doc) => {
          const isImage = Boolean(doc.mime_type?.startsWith('image/'));
          let previewUrl: string | null = null;

          if (isImage && doc.file_path) {
            const { data: signedData, error: signedUrlError } = await supabase.storage
              .from('contract-documents')
              .createSignedUrl(doc.file_path, 3600);

            if (signedUrlError) {
              console.error('Error creating contract document preview URL:', signedUrlError);
            } else {
              previewUrl = signedData.signedUrl;
            }
          }

          return {
            ...doc,
            contract_id: doc.contract_id || contractId,
            sourceBucket: 'contract-documents' as const,
            sourceType: 'contract' as const,
            preview_url: previewUrl,
          };
        }),
      );

      // Handle customer documents
      let customerDocuments: ContractDocument[] = [];
      if (customerResult.data) {
        customerDocuments = customerResult.data.map(doc => ({
          id: doc.id,
          company_id: doc.company_id,
          contract_id: contractId,
          document_type: doc.document_type,
          document_name: doc.document_name,
          file_path: doc.file_path,
          file_size: doc.file_size,
          mime_type: doc.mime_type,
          uploaded_by: doc.uploaded_by,
          uploaded_at: doc.uploaded_at,
          notes: doc.notes,
          is_required: doc.is_required,
          condition_report_id: undefined,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
          sourceBucket: 'documents' as const,
          sourceType: 'customer' as const,
          sourceOwnerId: customerId,
        }));
      }

      // Handle vehicle documents
      let vehicleDocuments: ContractDocument[] = [];
      if (vehicleResult.data) {
        vehicleDocuments = vehicleResult.data.map(doc => ({
          id: doc.id,
          company_id: companyId || '',
          contract_id: contractId,
          document_type: doc.document_type,
          document_name: doc.document_name || '',
          file_path: doc.document_url || '',
          file_size: 0,
          mime_type: 'image/jpeg',
          uploaded_by: '',
          uploaded_at: doc.created_at || '',
          notes: '',
          is_required: false,
          condition_report_id: undefined,
          created_at: doc.created_at || '',
          updated_at: doc.updated_at || '',
          sourceBucket: 'documents' as const,
          sourceType: 'vehicle' as const,
          sourceOwnerId: vehicleId,
        }));
      }

      // Combine and sort by created_at
      const allDocuments = [...contractDocuments, ...customerDocuments, ...vehicleDocuments].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      return allDocuments;
    },
    enabled: !!contractId && !!user && !!companyId,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });
}

export function useExportConditionDiagram() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({ 
      contractId, 
      conditionReportId, 
      imageBlob 
    }: { 
      contractId: string; 
      conditionReportId: string; 
      imageBlob: Blob; 
    }) => {
      if (!user || !companyId) throw new Error('User or company is not available');

      // Upload image to storage
      const fileName = `${contractId}/${conditionReportId}/vehicle-diagram-${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('vehicle-condition-diagrams')
        .upload(fileName, imageBlob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Create document record
      const { data: document, error } = await supabase
        .from('contract_documents')
        .insert({
          company_id: companyId,
          contract_id: contractId,
          document_type: 'condition_diagram',
          document_name: 'Vehicle Condition Diagram',
          file_path: fileName,
          file_size: imageBlob.size,
          mime_type: 'image/png',
          uploaded_by: user.id,
          notes: 'Auto-generated vehicle condition diagram',
          is_required: false,
          condition_report_id: conditionReportId
        })
        .select()
        .single();

      if (error) throw error;
      return document;
    },
    onError: (error) => {
      console.error('Error exporting diagram:', error);
      toast.error('فشل في تصدير المخطط');
    },
    onSuccess: (document) => invalidateContractDocumentDependents(queryClient, document.company_id, document.contract_id),
  });
}

export function useCreateContractDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (data: CreateDocumentData) => {
      if (!user || !companyId) throw new Error('User or company is not available');

      let filePath: string | undefined;

      // Upload file if provided
      if (data.file) {
        const fileExt = data.file.name.split('.').pop();
        const fileName = `${data.contract_id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('contract-documents')
          .upload(fileName, data.file);

        if (uploadError) throw uploadError;
        filePath = fileName;
      }

      // Create document record
      const { data: document, error } = await supabase
        .from('contract_documents')
        .insert({
          company_id: companyId,
          contract_id: data.contract_id,
          document_type: data.document_type,
          document_name: data.document_name,
          file_path: filePath,
          file_size: data.file?.size,
          mime_type: data.file?.type,
          uploaded_by: user.id,
          notes: data.notes,
          is_required: data.is_required || false,
          condition_report_id: data.condition_report_id
        })
        .select()
        .single();

      if (error) throw error;
      return document;
    },
    onSuccess: async (document, variables) => {
      await invalidateContractDocumentDependents(queryClient, document.company_id, document.contract_id);
      if (!variables.suppressSuccessToast) {
        toast.success('تم إضافة المستند بنجاح');
      }
    },
    onError: (error) => {
      console.error('Error creating document:', error);
      toast.error('فشل في إضافة المستند');
    }
  });
}

export function useDeleteContractDocument() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!companyId) throw new Error('تعذر تحديد الشركة');
      // Get document info first
      const { data: document, error: documentError } = await supabase
        .from('contract_documents')
        .select('file_path, contract_id, company_id')
        .eq('id', documentId)
        .eq('company_id', companyId)
        .single();
      if (documentError || !document) throw documentError || new Error('المستند غير موجود');

      const { error } = await supabase
        .from('contract_documents')
        .delete()
        .eq('id', documentId)
        .eq('company_id', companyId)
        .select('id')
        .single();

      if (error) throw error;

      // Delete file from storage if exists
      if (document.file_path) {
        const { error: storageError } = await supabase.storage
          .from('contract-documents')
          .remove([document.file_path]);
        if (storageError) {
          console.warn('[useDeleteContractDocument] orphaned storage file', storageError.message);
        }
      }
      return document;
    },
    onSuccess: async (document) => {
      if (document) {
        await invalidateContractDocumentDependents(queryClient, document.company_id, document.contract_id);
      }
      toast.success('تم حذف المستند بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting document:', error);
      const message = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message || '')
          : '';

      if (message.includes('SIGNED_CONTRACT_REPLACEMENT_REQUIRED')) {
        toast.error('لا يمكن حذف النسخة أثناء الإجراء القانوني دون بديل صالح. ارفع نسخة أخرى وتأكد من اجتياز مطابقة الهوية أولاً.');
        return;
      }

      if (message.includes('SIGNED_CONTRACT_EVIDENCE_BUSY')) {
        toast.error('يجري تعديل مستندات العقد في عملية أخرى. حدّث الصفحة ثم أعد المحاولة.');
        return;
      }

      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23503') {
        toast.error('لا يمكن حذف المستند لأنه مرتبط بسجلات أخرى في النظام. لم يُحذف الملف؛ راجع ارتباطاته من الملف المعني.');
        return;
      }

      toast.error('فشل في حذف المستند');
    }
  });
}

/**
 * Deletes any document shown in the contract documents view from its actual owner table.
 * Customer and vehicle documents are shared records, so the caller must confirm that wider
 * effect in the UI before invoking this mutation.
 */
export function useDeleteContractViewDocument() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (target: ContractViewDocumentDeleteTarget) => {
      if (!companyId) throw new Error('تعذر تحديد الشركة');

      const sourceType = target.sourceType || 'contract';
      let filePath: string | null = null;

      if (sourceType === 'contract') {
        const { data: document, error: fetchError } = await supabase
          .from('contract_documents')
          .select('file_path, contract_id, company_id')
          .eq('id', target.id)
          .eq('contract_id', target.contract_id)
          .eq('company_id', companyId)
          .single();
        if (fetchError || !document) throw fetchError || new Error('المستند غير موجود');

        const { error: deleteError } = await supabase
          .from('contract_documents')
          .delete()
          .eq('id', target.id)
          .eq('contract_id', target.contract_id)
          .eq('company_id', companyId)
          .select('id')
          .single();
        if (deleteError) throw deleteError;
        filePath = document.file_path;
      } else if (sourceType === 'customer') {
        if (!target.sourceOwnerId) throw new Error('تعذر تحديد العميل مالك المستند');

        const { data: document, error: fetchError } = await supabase
          .from('customer_documents')
          .select('file_path, customer_id, company_id')
          .eq('id', target.id)
          .eq('customer_id', target.sourceOwnerId)
          .eq('company_id', companyId)
          .single();
        if (fetchError || !document) throw fetchError || new Error('المستند غير موجود');

        const { error: deleteError } = await supabase
          .from('customer_documents')
          .delete()
          .eq('id', target.id)
          .eq('customer_id', target.sourceOwnerId)
          .eq('company_id', companyId)
          .select('id')
          .single();
        if (deleteError) throw deleteError;
        filePath = document.file_path;
      } else {
        if (!target.sourceOwnerId) throw new Error('تعذر تحديد المركبة مالكة المستند');

        // vehicle_documents has no company_id, so authorize through its parent vehicle first.
        const { error: vehicleError } = await supabase
          .from('vehicles')
          .select('id')
          .eq('id', target.sourceOwnerId)
          .eq('company_id', companyId)
          .single();
        if (vehicleError) throw vehicleError;

        const { data: document, error: fetchError } = await supabase
          .from('vehicle_documents')
          .select('document_url, vehicle_id')
          .eq('id', target.id)
          .eq('vehicle_id', target.sourceOwnerId)
          .single();
        if (fetchError || !document) throw fetchError || new Error('المستند غير موجود');

        const { error: deleteError } = await supabase
          .from('vehicle_documents')
          .delete()
          .eq('id', target.id)
          .eq('vehicle_id', target.sourceOwnerId)
          .select('id')
          .single();
        if (deleteError) throw deleteError;
        filePath = document.document_url;
      }

      if (filePath) {
        const bucket = sourceType === 'contract' ? 'contract-documents' : 'documents';
        const { error: storageError } = await supabase.storage.from(bucket).remove([filePath]);
        if (storageError) {
          console.warn('[useDeleteContractViewDocument] orphaned storage file', storageError.message);
        }
      }

      return { ...target, sourceType, companyId };
    },
    onSuccess: async (result) => {
      await invalidateContractDocumentDependents(queryClient, result.companyId, result.contract_id);

      if (result.sourceType === 'customer' && result.sourceOwnerId) {
        await queryClient.invalidateQueries({ queryKey: ['customer-documents', result.sourceOwnerId] });
      }
      if (result.sourceType === 'vehicle' && result.sourceOwnerId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['vehicle-document-files', result.companyId, result.sourceOwnerId] }),
          queryClient.invalidateQueries({ queryKey: ['vehicle-documents'] }),
          queryClient.invalidateQueries({ queryKey: ['fleet-insurance-registration-report'] }),
        ]);
      }

      toast.success('تم حذف المستند بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting document from contract view:', error);
      const message = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message || '')
          : '';

      if (message.includes('SIGNED_CONTRACT_REPLACEMENT_REQUIRED')) {
        toast.error('لا يمكن حذف النسخة أثناء الإجراء القانوني دون بديل صالح. ارفع نسخة أخرى وتأكد من اجتياز مطابقة الهوية أولاً.');
        return;
      }
      if (message.includes('SIGNED_CONTRACT_EVIDENCE_BUSY')) {
        toast.error('يجري تعديل مستندات العقد في عملية أخرى. حدّث الصفحة ثم أعد المحاولة.');
        return;
      }
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23503') {
        toast.error('لا يمكن حذف المستند لأنه مرتبط بسجلات أخرى في النظام. لم يُحذف الملف؛ راجع ارتباطاته من الملف المعني.');
        return;
      }

      toast.error(message || 'فشل في حذف المستند');
    },
  });
}

export function useDownloadContractDocument() {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const { data, error } = await supabase.storage
        .from('contract-documents')
        .download(filePath);

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error('Error downloading document:', error);
      toast.error('فشل في تحميل المستند');
    }
  });
}
