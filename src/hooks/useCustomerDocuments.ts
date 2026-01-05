import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';

export interface CustomerDocument {
  id: string;
  company_id: string;
  customer_id: string;
  document_type: string;
  document_name: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  uploaded_at: string;
  notes?: string;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerDocumentData {
  customer_id: string;
  document_type: string;
  document_name: string;
  file: File;
  notes?: string;
  is_required?: boolean;
}

/**
 * Hook for managing customer documents
 */
export function useCustomerDocuments(customerId?: string) {
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['customer-documents', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomerDocument[];
    },
    enabled: !!customerId && !!user && !!companyId
  });
}

/**
 * Hook for uploading customer documents
 */
export function useUploadCustomerDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (data: CreateCustomerDocumentData) => {
      console.log('[useUploadCustomerDocument] Starting upload...', {
        customer_id: data.customer_id,
        document_type: data.document_type,
        file_name: data.file.name,
        file_size: data.file.size,
        user_id: user?.id,
        company_id: companyId
      });

      if (!user) {
        console.error('[useUploadCustomerDocument] User not authenticated');
        throw new Error('المستخدم غير مصادق');
      }

      if (!companyId) {
        console.error('[useUploadCustomerDocument] Company ID missing');
        throw new Error('معرف الشركة مفقود');
      }

      let documentId: string | undefined;
      let filePath: string | undefined;

      try {
        // Step 1: Create database record first
        console.log('[useUploadCustomerDocument] Step 1: Creating database record...');
        const { data: document, error: dbError } = await supabase
          .from('customer_documents')
          .insert({
            company_id: companyId,
            customer_id: data.customer_id,
            document_type: data.document_type,
            document_name: data.document_name,
            file_size: data.file.size,
            mime_type: data.file.type,
            notes: data.notes,
            is_required: data.is_required || false,
            uploaded_by: user.id,
          })
          .select()
          .single();

        if (dbError) {
          console.error('[useUploadCustomerDocument] Database creation failed:', dbError);
          throw new Error(`فشل إنشاء سجل قاعدة البيانات: ${dbError.message}`);
        }

        console.log('[useUploadCustomerDocument] Database record created:', document.id);
        documentId = document.id;

        // Step 2: Upload file to storage
        console.log('[useUploadCustomerDocument] Step 2: Uploading file to storage...');
        const fileExt = data.file.name.split('.').pop();
        const fileName = `${data.customer_id}/${documentId}.${fileExt}`;
        console.log('[useUploadCustomerDocument] File path:', fileName);
        
        const { error: uploadError } = await supabase.storage
          .from('customer-documents')
          .upload(fileName, data.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('[useUploadCustomerDocument] File upload failed:', uploadError);
          
          // Rollback: Delete the database record
          await supabase
            .from('customer_documents')
            .delete()
            .eq('id', documentId);

          throw new Error(`فشل رفع الملف: ${uploadError.message}`);
        }

        filePath = fileName;
        console.log('[useUploadCustomerDocument] File uploaded successfully');

        // Step 3: Update database record with file path
        console.log('[useUploadCustomerDocument] Step 3: Updating database with file path...');
        const { error: updateError } = await supabase
          .from('customer_documents')
          .update({ 
            file_path: fileName,
            updated_at: new Date().toISOString()
          })
          .eq('id', documentId);

        if (updateError) {
          console.error('[useUploadCustomerDocument] Database update failed:', updateError);
          
          // Rollback: Delete both file and database record
          await supabase.storage
            .from('customer-documents')
            .remove([fileName]);

          await supabase
            .from('customer_documents')
            .delete()
            .eq('id', documentId);

          throw new Error(`فشل تحديث قاعدة البيانات: ${updateError.message}`);
        }

        console.log('[useUploadCustomerDocument] Upload complete!', document);
        return document;
      } catch (error) {
        console.error('[useUploadCustomerDocument] Upload customer document error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-documents', data.customer_id] });
      toast.success('تم رفع المستند بنجاح');
    },
    onError: (error: Error) => {
      console.error('Upload failed:', error);
      toast.error(error.message || 'فشل رفع المستند');
    }
  });
}

/**
 * Hook for deleting customer documents
 */
export function useDeleteCustomerDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      // First get the document to get the file path
      const { data: document, error: fetchError } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Delete file from storage if it exists
      if (document.file_path) {
        const { error: storageError } = await supabase.storage
          .from('customer-documents')
          .remove([document.file_path]);

        if (storageError) {
          console.error('Storage deletion failed:', storageError);
        }
      }

      // Delete database record
      const { error: deleteError } = await supabase
        .from('customer_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;

      return document;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-documents', data.customer_id] });
      toast.success('تم حذف المستند بنجاح');
    },
    onError: (error: Error) => {
      console.error('Delete failed:', error);
      toast.error('فشل حذف المستند');
    }
  });
}

/**
 * Hook for downloading customer documents
 */
export function useDownloadCustomerDocument() {
  return useMutation({
    mutationFn: async (document: CustomerDocument) => {
      if (!document.file_path) {
        throw new Error('مسار الملف غير موجود');
      }

      const { data, error } = await supabase.storage
        .from('customer-documents')
        .download(document.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.document_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return data;
    },
    onSuccess: () => {
      toast.success('تم تحميل المستند بنجاح');
    },
    onError: (error: Error) => {
      console.error('Download failed:', error);
      toast.error('فشل تحميل المستند');
    }
  });
}

