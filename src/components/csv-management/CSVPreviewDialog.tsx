import React, { useMemo } from 'react';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SavedCSVFile } from '@/hooks/useSavedCSVFiles';

interface CSVPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file?: SavedCSVFile;
  content?: string;
}

export const CSVPreviewDialog: React.FC<CSVPreviewDialogProps> = ({
  open,
  onOpenChange,
  file,
  content,
}) => {
  const parsedData = useMemo(() => {
    if (!content) return null;

    try {
      const result = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
      });
      
      return {
        headers: result.meta.fields || [],
        rows: result.data.slice(0, 10), // Show first 10 rows
        totalRows: result.data.length,
        errors: result.errors,
      };
    } catch (error) {
      return null;
    }
  }, [content]);

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>معاينة الملف: {file.original_file_name}</DialogTitle>
          <DialogDescription>
            معاينة أول 10 صفوف من الملف
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Info */}
          <div className="flex gap-4 text-sm">
            <Badge variant="outline">
              النوع: {file.file_type}
            </Badge>
            <Badge variant="outline">
              الحجم: {(file.file_size / 1024).toFixed(1)} KB
            </Badge>
            {parsedData && (
              <Badge variant="outline">
                عدد الصفوف: {parsedData.totalRows}
              </Badge>
            )}
            {parsedData && (
              <Badge variant="outline">
                عدد الأعمدة: {parsedData.headers.length}
              </Badge>
            )}
          </div>

          {/* CSV Preview */}
          {parsedData ? (
            <ScrollArea className="h-96 w-full border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    {parsedData.headers.map((header, index) => (
                      <TableHead key={index} className="whitespace-nowrap">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.rows.map((row: any, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {parsedData.headers.map((header, colIndex) => (
                        <TableCell key={colIndex} className="whitespace-nowrap">
                          {row[header] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              خطأ في تحليل محتوى الملف
            </div>
          )}

          {/* Errors */}
          {parsedData?.errors && parsedData.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-destructive">
                أخطاء في التحليل:
              </h4>
              <div className="space-y-1">
                {parsedData.errors.slice(0, 5).map((error, index) => (
                  <div key={index} className="text-xs text-muted-foreground">
                    السطر {error.row}: {error.message}
                  </div>
                ))}
                {parsedData.errors.length > 5 && (
                  <div className="text-xs text-muted-foreground">
                    و {parsedData.errors.length - 5} أخطاء أخرى...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};