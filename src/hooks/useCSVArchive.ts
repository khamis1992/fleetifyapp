import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CSVArchiveEntry {
  id: string;
  company_id: string;
  file_name: string;
  original_file_name: string;
  file_size_bytes: number;
  file_content: string | null;
  storage_path: string | null;
  upload_type: string;
  uploaded_by: string;
  uploaded_at: string;
  processing_status: string;
  processing_results: any;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  error_details: any[];
  created_contracts_ids: string[];
  is_archived: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface ArchiveCSVParams {
  file: File;
  fileContent: string;
  uploadType: string;
  processingResults?: any;
  totalRows?: number;
  successfulRows?: number;
  failedRows?: number;
  errorDetails?: any[];
  createdContractsIds?: string[];
  metadata?: any;
}

export const useCSVArchive = () => {
  const queryClient = useQueryClient();
  const [isArchiving, setIsArchiving] = useState(false);

  // Fetch archived CSV files
  const { data: archivedFiles, isLoading, error } = useQuery({
    queryKey: ['csv-archives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csv_file_archives')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as CSVArchiveEntry[];
    },
  });

  // Archive a CSV file
  const archiveCSV = useMutation({
    mutationFn: async (params: ArchiveCSVParams) => {
      setIsArchiving(true);
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get user's company
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (!profile?.company_id) throw new Error('User company not found');

        // Generate unique file name
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${params.uploadType}_${timestamp}_${params.file.name}`;

        // Store file content in database
        const { data, error } = await supabase
          .from('csv_file_archives')
          .insert({
            company_id: profile.company_id,
            file_name: fileName,
            original_file_name: params.file.name,
            file_size_bytes: params.file.size,
            file_content: params.fileContent,
            upload_type: params.uploadType,
            uploaded_by: user.id,
            processing_status: 'completed',
            processing_results: params.processingResults || {},
            total_rows: params.totalRows || 0,
            successful_rows: params.successfulRows || 0,
            failed_rows: params.failedRows || 0,
            error_details: params.errorDetails || [],
            created_contracts_ids: params.createdContractsIds || [],
            metadata: {
              ...params.metadata,
              file_type: params.file.type,
              archived_at: new Date().toISOString(),
            },
          })
          .select()
          .single();

        if (error) throw error;

        toast.success('تم حفظ الملف في الأرشيف بنجاح');
        return data;
      } finally {
        setIsArchiving(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csv-archives'] });
    },
    onError: (error: any) => {
      console.error('Error archiving CSV:', error);
      toast.error('فشل في حفظ الملف في الأرشيف');
    },
  });

  // Download archived file
  const downloadArchivedFile = async (archiveEntry: CSVArchiveEntry) => {
    try {
      if (!archiveEntry.file_content) {
        toast.error('محتوى الملف غير متوفر');
        return;
      }

      // Create blob and download
      const blob = new Blob([archiveEntry.file_content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = archiveEntry.original_file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('تم تحميل الملف بنجاح');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('فشل في تحميل الملف');
    }
  };

  // Delete archived file
  const deleteArchivedFile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('csv_file_archives')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csv-archives'] });
      toast.success('تم حذف الملف من الأرشيف');
    },
    onError: (error: any) => {
      console.error('Error deleting archived file:', error);
      toast.error('فشل في حذف الملف');
    },
  });

  return {
    archivedFiles,
    isLoading,
    error,
    isArchiving,
    archiveCSV: archiveCSV.mutate,
    downloadArchivedFile,
    deleteArchivedFile: deleteArchivedFile.mutate,
    isDeleting: deleteArchivedFile.isPending,
  };
};