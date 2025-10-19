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
  error_details: unknown[];
  created_contracts_ids: string[];
  is_archived: boolean;
  metadata: Record<string, unknown>;
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
  errorDetails?: unknown[];
  createdContractsIds?: string[];
  metadata?: any;
}

export const useCSVArchive = () => {
  const queryClient = useQueryClient();
  const [isArchiving, setIsArchiving] = useState(false);

  // Fetch archived CSV files from Storage
  const { data: archivedFiles, isLoading, error } = useQuery({
    queryKey: ['csv-archives'],
    queryFn: async () => {
      try {
        // Get current user's company
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (!profile?.company_id) throw new Error('User company not found');

        console.log('🔍 Fetching CSV archives for user:', user.id, 'company:', profile.company_id);

        // List files from user's company folder
        const { data: userFiles, error: userError } = await supabase.storage
          .from('csv-archives')
          .list(`${user.id}/${profile.company_id}`, {
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        console.log('📁 User files result:', { userFiles, userError });

        // List files from root (like templates)
        const { data: rootFiles, error: rootError } = await supabase.storage
          .from('csv-archives')
          .list('', {
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        console.log('📋 Root files result:', { rootFiles, rootError });

        // Combine both file lists, but ignore errors if one location doesn't exist
        const userFilesWithFlag = (userFiles || []).map(file => ({ 
          ...file, 
          isUserFile: true,
          fileType: 'user-uploaded'
        }));
        
        const rootFilesWithFlag = (rootFiles || [])
          .filter(file => !file.name?.includes('/') && file.name?.endsWith('.csv'))
          .map(file => ({ 
            ...file, 
            isUserFile: false,
            fileType: 'template'
          }));

        const allFiles = [...userFilesWithFlag, ...rootFilesWithFlag];

        console.log('🔗 Combined files:', allFiles);

        // Map storage files to CSVArchiveEntry format with better error handling
        const mappedFiles: CSVArchiveEntry[] = [];
        
        for (const file of allFiles) {
          try {
            console.log('🔄 Processing file:', file.name, 'Type:', file.fileType);
            
            // Safe file name parsing for user files
            let originalFileName = file.name;
            let uploadType = 'template';
            
            if (file.isUserFile && file.name) {
              const nameParts = file.name.split('_');
              if (nameParts.length >= 3) {
                uploadType = nameParts[0] || 'unknown';
                originalFileName = nameParts.slice(2).join('_');
              }
            } else if (!file.isUserFile) {
              // For template files, determine type from filename
              if (file.name.includes('contract')) uploadType = 'contracts';
              else if (file.name.includes('customer')) uploadType = 'customers';
              else if (file.name.includes('vehicle')) uploadType = 'vehicles';
              else if (file.name.includes('invoice')) uploadType = 'invoices';
              else if (file.name.includes('payment')) uploadType = 'payments';
            }

            const mappedFile: CSVArchiveEntry = {
              id: file.id || file.name || `temp_${Date.now()}`,
              company_id: profile.company_id,
              file_name: file.name || 'unknown.csv',
              original_file_name: originalFileName,
              file_size_bytes: file.metadata?.size || 0,
              file_content: null,
              storage_path: file.isUserFile 
                ? `${user.id}/${profile.company_id}/${file.name}` 
                : file.name,
              upload_type: uploadType,
              uploaded_by: user.id,
              uploaded_at: file.created_at || new Date().toISOString(),
              processing_status: file.isUserFile ? 'completed' : 'template',
              processing_results: file.isUserFile ? {} : { isTemplate: true },
              total_rows: 0,
              successful_rows: 0,
              failed_rows: 0,
              error_details: [],
              created_contracts_ids: [],
              is_archived: true,
              metadata: {
                ...file.metadata,
                fileType: file.fileType,
                isTemplate: !file.isUserFile
              },
              created_at: file.created_at || new Date().toISOString(),
              updated_at: file.updated_at || new Date().toISOString(),
            };

            mappedFiles.push(mappedFile);
            console.log('✅ Successfully mapped file:', file.name);
            
          } catch (fileError) {
            console.error('❌ Error mapping file:', file.name, fileError);
            // Continue with other files even if one fails
          }
        }

        console.log('📊 Final mapped files count:', mappedFiles.length);
        return mappedFiles;
        
      } catch (error) {
        console.error('💥 Error in CSV archive fetch:', error);
        throw error;
      }
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
        const filePath = `${user.id}/${profile.company_id}/${fileName}`;

        // Upload file to Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('csv-archives')
          .upload(filePath, params.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        toast.success('تم حفظ الملف في الأرشيف بنجاح');
        return {
          id: fileName,
          file_name: fileName,
          storage_path: filePath,
          ...params
        };
      } finally {
        setIsArchiving(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csv-archives'] });
    },
    onError: (error: unknown) => {
      console.error('Error archiving CSV:', error);
      toast.error('فشل في حفظ الملف في الأرشيف');
    },
  });

  // Download archived file
  const downloadArchivedFile = async (archiveEntry: CSVArchiveEntry) => {
    try {
      if (!archiveEntry.storage_path) {
        toast.error('مسار الملف غير متوفر');
        return;
      }

      // Download file from Storage
      const { data, error } = await supabase.storage
        .from('csv-archives')
        .download(archiveEntry.storage_path);

      if (error) throw error;

      // Create blob and download
      const url = URL.createObjectURL(data);
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
    mutationFn: async (storage_path: string) => {
      const { error } = await supabase.storage
        .from('csv-archives')
        .remove([storage_path]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csv-archives'] });
      toast.success('تم حذف الملف من الأرشيف');
    },
    onError: (error: unknown) => {
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