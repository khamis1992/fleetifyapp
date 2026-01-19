import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ContractDocument {
  id: string;
  company_id: string;
  contract_id: string;
  document_type: string;
  document_name: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  uploaded_at: string;
  notes?: string;
  is_required: boolean;
  condition_report_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentData {
  contract_id: string;
  document_type: string;
  document_name: string;
  file?: File;
  notes?: string;
  is_required?: boolean;
  condition_report_id?: string;
}

export function useContractDocuments(contractId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['contract-documents', contractId],
    queryFn: async () => {
      if (!contractId) return [];

      const { data, error } = await supabase
        .from('contract_documents')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContractDocument[];
    },
    enabled: !!contractId && !!user
  });
}

export function useExportConditionDiagram() {
  const { user } = useAuth();

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
      if (!user) throw new Error('User not authenticated');

      // Upload image to storage
      const fileName = `${contractId}/${conditionReportId}/vehicle-diagram-${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('vehicle-condition-diagrams')
        .upload(fileName, imageBlob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Create document record
      const { data: document, error } = await supabase
        .from('contract_documents')
        .insert({
          company_id: profile.company_id,
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
    }
  });
}

export function useCreateContractDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateDocumentData) => {
      if (!user) throw new Error('User not authenticated');

      let filePath: string | undefined;

      // Upload file if provided
      if (data.file) {
        const fileExt = data.file.name.split('.').pop();
        const fileName = `${data.contract_id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('contract-documents')
          .upload(fileName, data.file);

        if (uploadError) throw uploadError;
        filePath = fileName;
      }

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Create document record
      const { data: document, error } = await supabase
        .from('contract_documents')
        .insert({
          company_id: profile.company_id,
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
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ['contract-documents', document.contract_id] });
      toast.success('تم إضافة المستند بنجاح');
    },
    onError: (error) => {
      console.error('Error creating document:', error);
      toast.error('فشل في إضافة المستند');
    }
  });
}

export function useDeleteContractDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      // Get document info first
      const { data: document } = await supabase
        .from('contract_documents')
        .select('file_path, contract_id')
        .eq('id', documentId)
        .single();

      // Delete file from storage if exists
      if (document?.file_path) {
        await supabase.storage
          .from('contract-documents')
          .remove([document.file_path]);
      }

      // Delete document record
      const { error } = await supabase
        .from('contract_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
      return document;
    },
    onSuccess: (document) => {
      if (document) {
        queryClient.invalidateQueries({ queryKey: ['contract-documents', document.contract_id] });
      }
      toast.success('تم حذف المستند بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting document:', error);
      toast.error('فشل في حذف المستند');
    }
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