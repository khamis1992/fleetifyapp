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
  // Added field to distinguish document source bucket
  sourceBucket?: 'contract-documents' | 'documents';
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

export function useContractDocuments(contractId?: string, customerId?: string, vehicleId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['contract-documents', contractId, customerId, vehicleId],
    queryFn: async () => {
      if (!contractId) return [];

      // Run all queries in parallel for better performance
      const [contractResult, customerResult, vehicleResult] = await Promise.all([
        // Fetch contract documents
        supabase
          .from('contract_documents')
          .select('id, company_id, contract_id, document_type, document_name, file_path, file_size, mime_type, uploaded_by, uploaded_at, notes, is_required, condition_report_id, created_at, updated_at')
          .eq('contract_id', contractId)
          .order('created_at', { ascending: false }),
        
        // Fetch customer documents (only if customerId provided)
        customerId
          ? supabase
              .from('customer_documents')
              .select('id, company_id, document_type, document_name, file_path, file_size, mime_type, uploaded_by, uploaded_at, notes, is_required, created_at, updated_at')
              .eq('customer_id', customerId)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: null, error: null }),
        
        // Fetch vehicle documents (only if vehicleId provided)
        vehicleId
          ? supabase
              .from('vehicle_documents')
              .select('id, company_id, document_type, document_name, document_url, created_at, updated_at')
              .eq('vehicle_id', vehicleId)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: null, error: null })
      ]);

      // Handle contract documents
      if (contractResult.error) throw contractResult.error;
      const contractDocuments = (contractResult.data || []).map(doc => ({
        ...doc,
        sourceBucket: 'contract-documents' as const
      }));

      // Handle customer documents
      let customerDocuments: ContractDocument[] = [];
      if (customerResult.data && !customerResult.error) {
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
          sourceBucket: 'documents' as const
        }));
      } else if (customerResult.error) {
        console.error('Error fetching customer documents:', customerResult.error);
      }

      // Handle vehicle documents
      let vehicleDocuments: ContractDocument[] = [];
      if (vehicleResult.data && !vehicleResult.error) {
        vehicleDocuments = vehicleResult.data.map(doc => ({
          id: doc.id,
          company_id: doc.company_id || '',
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
          sourceBucket: 'documents' as const
        }));
      } else if (vehicleResult.error) {
        console.error('Error fetching vehicle documents:', vehicleResult.error);
      }

      // Combine and sort by created_at
      const allDocuments = [...contractDocuments, ...customerDocuments, ...vehicleDocuments].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return allDocuments;
    },
    enabled: !!contractId && !!user,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
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