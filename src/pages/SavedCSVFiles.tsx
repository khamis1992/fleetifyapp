import React from 'react';
import { SavedCSVManager } from '@/components/csv-management/SavedCSVManager';
import { ContractCSVUpload } from '@/components/contracts/ContractCSVUpload';
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';
import { useState } from 'react';
import { useSavedCSVFiles } from '@/hooks/useSavedCSVFiles';
import { useToast } from '@/hooks/use-toast';

export default function SavedCSVFiles() {
  const [showUpload, setShowUpload] = useState(false);
  const { getCSVContent } = useSavedCSVFiles();
  const { toast } = useToast();

  const handleImportFromFile = async (file: any, content: string) => {
    try {
      // Create a File object from the content for compatibility with existing upload logic
      const blob = new Blob([content], { type: 'text/csv' });
      const csvFile = new File([blob], file.original_file_name, { type: 'text/csv' });
      
      // Here you can trigger the contract upload process
      toast({
        title: 'بدء الاستيراد',
        description: `سيتم استيراد البيانات من ملف ${file.original_file_name}`,
      });
      
      // You can integrate with the contract upload logic here
      setShowUpload(true);
      
    } catch (error: any) {
      toast({
        title: 'خطأ في الاستيراد',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الملفات المحفوظة</h1>
          <p className="text-muted-foreground">
            إدارة ملفات CSV المحفوظة واستيراد البيانات منها
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          رفع ملف جديد
        </Button>
      </div>

      <SavedCSVManager onImportFromFile={handleImportFromFile} />

      <ContractCSVUpload
        open={showUpload}
        onOpenChange={setShowUpload}
        onUploadComplete={() => {
          setShowUpload(false);
          // Refresh the saved files list if needed
        }}
      />
    </div>
  );
}