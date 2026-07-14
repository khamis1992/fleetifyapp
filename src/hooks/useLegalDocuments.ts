import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyFilter } from "@/hooks/useCompanyScope";
import { toast } from "sonner";

export interface LegalDocument {
  id: string;
  case_id: string;
  company_id: string;
  document_type: string;
  document_title: string;
  document_title_ar?: string;
  description?: string;
  file_name?: string;
  file_path?: string;
  file_size?: number;
  file_type?: string;
  document_date?: string;
  is_confidential: boolean;
  is_original: boolean;
  version_number: number;
  parent_document_id?: string;
  access_level: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LegalDocumentFormData {
  case_id: string;
  document_type: string;
  document_title: string;
  document_title_ar?: string;
  description?: string;
  document_date?: string;
  is_confidential: boolean;
  is_original: boolean;
  access_level: string;
  file?: File;
}

interface UseLegalDocumentsFilters {
  case_id?: string;
  document_type?: string;
  access_level?: string;
  is_confidential?: boolean;
  search?: string;
}

export const useLegalDocuments = (filters?: UseLegalDocumentsFilters, enabled: boolean = true) => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();

  return useQuery({
    queryKey: ['legal-documents', companyFilter, filters],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      let query = supabase
        .from('legal_case_documents')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply company filter
      if (companyFilter.company_id) {
        query = query.eq('company_id', companyFilter.company_id);
      }

      // Apply filters
      if (filters?.case_id) {
        query = query.eq('case_id', filters.case_id);
      }
      if (filters?.document_type) {
        query = query.eq('document_type', filters.document_type);
      }
      if (filters?.access_level) {
        query = query.eq('access_level', filters.access_level);
      }
      if (filters?.is_confidential !== undefined) {
        query = query.eq('is_confidential', filters.is_confidential);
      }
      if (filters?.search) {
        query = query.or(`document_title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as LegalDocument[];
    },
    enabled: !!user?.id && enabled,
  });
};

export const useLegalDocument = (documentId: string) => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();

  return useQuery({
    queryKey: ['legal-document', documentId],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      const { data, error } = await supabase
        .from('legal_case_documents')
        .select('*')
        .eq('id', documentId)
        .eq('company_id', companyFilter.company_id || '')
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as LegalDocument;
    },
    enabled: !!user?.id && !!companyFilter.company_id && !!documentId,
  });
};

export const useCreateLegalDocument = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: LegalDocumentFormData) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      let filePath = null;
      let fileName = null;
      let fileSize = null;
      let fileType = null;

      // Handle file upload if provided
      if (formData.file) {
        const fileExt = formData.file.name.split('.').pop();
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const bucketPath = `legal-documents/${profile.company_id}/${formData.case_id}/${uniqueFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(bucketPath, formData.file);

        if (uploadError) throw uploadError;

        filePath = bucketPath;
        fileName = formData.file.name;
        fileSize = formData.file.size;
        fileType = formData.file.type;
      }

      // Find the highest version number for this document
      const { data: existingVersions } = await supabase
        .from('legal_case_documents')
        .select('version_number')
        .eq('case_id', formData.case_id)
        .eq('document_title', formData.document_title)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = existingVersions && existingVersions.length > 0 
        ? (existingVersions[0].version_number ?? 0) + 1
        : 1;

      // استخراج file من formData قبل الإرسال (لا يوجد عمود file في قاعدة البيانات)
      const { file, ...documentData } = formData;

      const { data, error } = await supabase
        .from('legal_case_documents')
        .insert({
          ...documentData,
          company_id: profile.company_id,
          file_name: fileName,
          file_path: filePath,
          file_size: fileSize,
          file_type: fileType,
          version_number: nextVersion,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create activity log
      await supabase
        .from('legal_case_activities')
        .insert({
          case_id: formData.case_id,
          company_id: profile.company_id,
          activity_type: 'document_added',
          activity_title: 'تم إضافة مستند',
          activity_description: `تم إضافة المستند ${formData.document_title}`,
          related_document_id: data.id,
          created_by: user.id,
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      toast.success('تم إضافة المستند بنجاح');
    },
    onError: (error: unknown) => {
      console.error('Error creating legal document:', error);
      toast.error('حدث خطأ أثناء إضافة المستند');
    },
  });
};

export const useDeleteLegalDocument = () => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');
      if (!companyFilter.company_id) throw new Error('تعذر تحديد الشركة');

      const { data: document, error } = await supabase.rpc('soft_delete_legal_document_v1', {
        p_company_id: companyFilter.company_id,
        p_document_id: documentId,
        p_reason: 'Archived from legal documents page',
        p_actor_id: user.id,
      });
      if (error) throw error;
      return document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      toast.success('تمت أرشفة المستند مع الاحتفاظ بملف الإثبات');
    },
    onError: (error: unknown) => {
      console.error('Error deleting legal document:', error);
      toast.error('حدث خطأ أثناء حذف المستند');
    },
  });
};

export const useDownloadLegalDocument = () => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      if (!companyFilter.company_id) throw new Error('Company was not found');

      // Get document details
      const { data: document, error: documentError } = await supabase
        .from('legal_case_documents')
        .select('file_path, file_name')
        .eq('id', documentId)
        .eq('company_id', companyFilter.company_id)
        .is('deleted_at', null)
        .single();

      if (documentError) throw documentError;
      if (!document?.file_path) throw new Error('الملف غير موجود');

      // Get signed URL for download from legal-documents bucket
      const { data, error } = await supabase.storage
        .from('legal-documents')
        .createSignedUrl(document.file_path, 3600); // 1 hour expiry

      if (error) throw error;

      return {
        url: data.signedUrl,
        fileName: document.file_name || 'document'
      };
    },
    onSuccess: (data) => {
      // Trigger download
      const link = document.createElement('a');
      link.href = data.url;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    onError: (error: unknown) => {
      console.error('Error downloading document:', error);
      toast.error('حدث خطأ أثناء تحميل المستند');
    },
  });
};
