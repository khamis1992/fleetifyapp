import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, Download } from 'lucide-react';
import { useCSVArchive, CSVArchiveEntry } from '@/hooks/useCSVArchive';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CSVArchiveSelectorProps {
  entityType: string;
  onFileSelect: (file: File) => void;
}

export const CSVArchiveSelector: React.FC<CSVArchiveSelectorProps> = ({
  entityType,
  onFileSelect
}) => {
  const { archivedFiles, downloadArchivedFile } = useCSVArchive();
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const filteredFiles = archivedFiles?.filter(file => 
    file.upload_type === entityType
  ) || [];

  const handleFileSelect = async (archiveEntry: CSVArchiveEntry) => {
    try {
      if (!archiveEntry.storage_path) {
        console.error('مسار الملف غير متوفر');
        return;
      }

      // Download file from Storage
      const { data, error } = await supabase.storage
        .from('csv-archives')
        .download(archiveEntry.storage_path);

      if (error) throw error;

      const file = new File([data], archiveEntry.original_file_name, { type: 'text/csv' });
      onFileSelect(file);
      setSelectedFileId(archiveEntry.id);
    } catch (error) {
      console.error('Error selecting file from archive:', error);
    }
  };

  if (filteredFiles.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>لا توجد ملفات محفوظة في الأرشيف</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ScrollArea className="h-64">
        <div className="space-y-2">
          {filteredFiles.map((file) => (
            <Card 
              key={file.id} 
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedFileId === file.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleFileSelect(file)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm truncate max-w-[200px]">
                        {file.original_file_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                        {formatDistanceToNow(new Date(file.uploaded_at), { 
                          locale: ar,
                          addSuffix: true 
                        })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {(file.file_size_bytes / 1024).toFixed(1)} KB
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileSelect(file);
                      }}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};