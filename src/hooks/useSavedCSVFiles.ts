import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SavedCSVFile {
  id: string;
  company_id: string;
  file_name: string;
  original_file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  row_count?: number;
  status: string;
  last_import_at?: string;
  last_import_status?: string;
  last_import_summary?: any;
  upload_method?: string;
  metadata?: any;
  tags?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useSavedCSVFiles = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch saved CSV files
  const { data: savedFiles, isLoading } = useQuery({
    queryKey: ['saved-csv-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_csv_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SavedCSVFile[];
    },
  });

  // Save CSV file to storage and database
  const saveCSVFile = useMutation({
    mutationFn: async ({
      file,
      fileType,
      tags = [],
    }: {
      file: File;
      fileType: string;
      tags?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's company
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('Company not found');
      }

      // Generate unique file name
      const timestamp = new Date().getTime();
      const fileName = `${user.id}/${fileType}_${timestamp}_${file.name}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('saved-csv-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Parse CSV to count rows
      const text = await file.text();
      const rows = text.split('\n').filter(row => row.trim());
      const rowCount = Math.max(0, rows.length - 1); // Excluding header

      // Save metadata to database
      const { data: savedFile, error: dbError } = await supabase
        .from('saved_csv_files')
        .insert({
          company_id: profile.company_id,
          file_name: fileName,
          original_file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          file_type: fileType,
          row_count: rowCount,
          status: 'saved',
          upload_method: 'manual',
          tags,
          created_by: user.id,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return savedFile as SavedCSVFile;
    },
    onSuccess: (data) => {
      toast({
        title: 'تم حفظ الملف بنجاح',
        description: `تم حفظ ملف ${data.original_file_name} بنجاح`,
      });
      queryClient.invalidateQueries({ queryKey: ['saved-csv-files'] });
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ في حفظ الملف',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete saved CSV file
  const deleteCSVFile = useMutation({
    mutationFn: async (fileId: string) => {
      // Get file info first
      const { data: fileInfo, error: getError } = await supabase
        .from('saved_csv_files')
        .select('file_path')
        .eq('id', fileId)
        .single();

      if (getError) throw getError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('saved-csv-files')
        .remove([fileInfo.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('saved_csv_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast({
        title: 'تم حذف الملف بنجاح',
        description: 'تم حذف الملف والبيانات المرتبطة به',
      });
      queryClient.invalidateQueries({ queryKey: ['saved-csv-files'] });
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ في حذف الملف',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Download CSV file
  const downloadCSVFile = async (file: SavedCSVFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('saved-csv-files')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'خطأ في تحميل الملف',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Get CSV file content
  const getCSVContent = async (file: SavedCSVFile): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('saved-csv-files')
      .download(file.file_path);

    if (error) throw error;
    return await data.text();
  };

  // Update file metadata
  const updateFileMetadata = useMutation({
    mutationFn: async ({
      fileId,
      updates,
    }: {
      fileId: string;
      updates: Partial<SavedCSVFile>;
    }) => {
      const { data, error } = await supabase
        .from('saved_csv_files')
        .update(updates)
        .eq('id', fileId)
        .select()
        .single();

      if (error) throw error;
      return data as SavedCSVFile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-csv-files'] });
    },
  });

  return {
    savedFiles: savedFiles || [],
    isLoading,
    saveCSVFile,
    deleteCSVFile,
    downloadCSVFile,
    getCSVContent,
    updateFileMetadata,
    uploadProgress,
  };
};