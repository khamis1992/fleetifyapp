import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-rar-compressed',
  'text/plain',
  'application/json',
]);

export interface CreateDocumentData {
  contract_id: string;
  document_type: string;
  document_name: string;
  file?: File;
  notes?: string;
  is_required?: boolean;
  condition_report_id?: string;
}

export interface DocumentOperationResult {
  success: boolean;
  document_id?: string;
  error?: string;
  warnings?: string[];
}

export interface DocumentOperationLog {
  id: string;
  operation_type: string;
  operation_status: string;
  error_message?: string;
  error_code?: string;
  retry_count: number;
  file_path?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
}

type LogError = { message?: string; code?: string } | Error | null | undefined;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'حدث خطأ غير متوقع';
}

function getErrorCode(error: LogError): string | undefined {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined;
}

function getSafeExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName) return fromName.slice(0, 10);
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('image/')) return file.type.slice(6).replace('jpeg', 'jpg');
  return 'bin';
}

function asMetadata(value: Json | null): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function useEnhancedContractDocuments() {
  const queryClient = useQueryClient();
  const { user, companyId } = useUnifiedCompanyAccess();

  const logOperation = async (
    operationType: string,
    status: string,
    metadata: Record<string, Json | undefined>,
    contractId?: string,
    documentId?: string,
    filePath?: string,
    error?: LogError,
  ) => {
    if (!companyId) return;

    const cleanMetadata = Object.fromEntries(
      Object.entries(metadata).filter((entry): entry is [string, Json] => entry[1] !== undefined),
    ) as Record<string, Json>;

    const { error: logError } = await supabase.from('contract_document_operation_log').insert({
      company_id: companyId,
      operation_type: operationType,
      operation_status: status,
      contract_id: contractId,
      document_id: documentId,
      file_path: filePath,
      error_message: error?.message,
      error_code: getErrorCode(error),
      metadata: cleanMetadata,
      performed_by: user?.id,
      completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : undefined,
    });

    if (logError) console.error('Failed to log contract document operation:', logError);
  };

  const createDocumentWithRollback = useMutation({
    mutationFn: async (data: CreateDocumentData): Promise<DocumentOperationResult> => {
      if (!user?.id || !companyId) throw new Error('يجب تسجيل الدخول واختيار الشركة');
      if (!data.contract_id || !data.document_name.trim() || !data.document_type.trim()) {
        throw new Error('بيانات المستند غير مكتملة');
      }
      if (data.file && data.file.size > MAX_FILE_SIZE) throw new Error('حجم الملف يتجاوز 100 ميجابايت');
      if (data.file?.type && !ALLOWED_MIME_TYPES.has(data.file.type)) throw new Error('نوع الملف غير مسموح');

      const operationId = crypto.randomUUID();
      const filePath = data.file
        ? `${companyId}/${data.contract_id}/${operationId}.${getSafeExtension(data.file)}`
        : undefined;
      let documentId: string | undefined;

      try {
        await logOperation('create_document', 'started', {
          operation_id: operationId,
          document_type: data.document_type,
          document_name: data.document_name,
          notes: data.notes,
          is_required: data.is_required,
          condition_report_id: data.condition_report_id,
          file_size: data.file?.size,
          mime_type: data.file?.type,
        }, data.contract_id, undefined, filePath);

        const { data: createdDocumentId, error: dbError } = await supabase.rpc(
          'create_contract_document_with_rollback',
          {
            p_company_id: companyId,
            p_contract_id: data.contract_id,
            p_document_type: data.document_type,
            p_document_name: data.document_name.trim(),
            p_file_path: filePath,
            p_file_size: data.file?.size,
            p_mime_type: data.file?.type,
            p_notes: data.notes,
            p_is_required: data.is_required ?? false,
            p_condition_report_id: data.condition_report_id,
          },
        );

        if (dbError) throw dbError;
        documentId = createdDocumentId;

        if (data.file && filePath) {
          const { error: uploadError } = await supabase.storage
            .from('contract-documents')
            .upload(filePath, data.file, { cacheControl: '3600', upsert: false });

          if (uploadError) {
            const { error: rollbackError } = await supabase
              .from('contract_documents')
              .delete()
              .eq('id', documentId)
              .eq('company_id', companyId)
              .eq('contract_id', data.contract_id);

            if (rollbackError) {
              await logOperation('create_document_rollback', 'failed', {
                operation_id: operationId,
                rollback_error: rollbackError.message,
              }, data.contract_id, documentId, filePath, rollbackError);
            }
            throw uploadError;
          }
        }

        await logOperation('create_document', 'completed', {
          operation_id: operationId,
          has_file: Boolean(data.file),
        }, data.contract_id, documentId, filePath);

        return { success: true, document_id: documentId };
      } catch (error) {
        await logOperation('create_document', 'failed', {
          operation_id: operationId,
          document_id: documentId,
        }, data.contract_id, documentId, filePath, error as LogError);
        return { success: false, error: getErrorMessage(error) };
      }
    },
    onSuccess: (result) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: ['contract-documents'] });
        toast.success('تمت إضافة المستند بنجاح');
      } else {
        toast.error(result.error || 'فشلت إضافة المستند');
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const retryFailedOperation = useMutation({
    mutationFn: async (logId: string): Promise<DocumentOperationResult> => {
      if (!companyId) throw new Error('لم يتم اختيار الشركة');

      const { data: log, error } = await supabase
        .from('contract_document_operation_log')
        .select('*')
        .eq('id', logId)
        .eq('company_id', companyId)
        .single();

      if (error || !log) throw new Error('تعذر العثور على العملية الفاشلة');
      const metadata = asMetadata(log.metadata);
      if (!log.contract_id || !metadata.document_type || !metadata.document_name) {
        throw new Error('لا تحتوي العملية على بيانات كافية لإعادة المحاولة');
      }

      await supabase
        .from('contract_document_operation_log')
        .update({ retry_count: (log.retry_count ?? 0) + 1 })
        .eq('id', logId)
        .eq('company_id', companyId);

      return createDocumentWithRollback.mutateAsync({
        contract_id: log.contract_id,
        document_type: String(metadata.document_type),
        document_name: String(metadata.document_name),
        notes: typeof metadata.notes === 'string' ? metadata.notes : undefined,
        is_required: typeof metadata.is_required === 'boolean' ? metadata.is_required : undefined,
        condition_report_id: typeof metadata.condition_report_id === 'string' ? metadata.condition_report_id : undefined,
      });
    },
  });

  const cleanupOrphanedFiles = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('cleanup_orphaned_contract_files');
      if (error) throw error;
      return data;
    },
  });

  const getOperationLogs = async (contractId?: string, limit = 50): Promise<DocumentOperationLog[]> => {
    if (!companyId) return [];
    let query = supabase
      .from('contract_document_operation_log')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 200));

    if (contractId) query = query.eq('contract_id', contractId);
    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((log) => ({
      id: log.id,
      operation_type: log.operation_type,
      operation_status: log.operation_status,
      error_message: log.error_message ?? undefined,
      error_code: log.error_code ?? undefined,
      retry_count: log.retry_count ?? 0,
      file_path: log.file_path ?? undefined,
      metadata: asMetadata(log.metadata),
      created_at: log.created_at || '',
      completed_at: log.completed_at ?? undefined,
    }));
  };

  return {
    createDocument: createDocumentWithRollback.mutateAsync,
    isCreating: createDocumentWithRollback.isPending,
    retryOperation: retryFailedOperation.mutateAsync,
    isRetrying: retryFailedOperation.isPending,
    cleanupOrphanedFiles: cleanupOrphanedFiles.mutateAsync,
    isCleaningUp: cleanupOrphanedFiles.isPending,
    getOperationLogs,
  };
}
