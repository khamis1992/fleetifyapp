import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Upload, Calendar, User, Download, Archive } from "lucide-react";
import { useCSVArchive, CSVArchiveEntry } from "@/hooks/useCSVArchive";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface CSVArchiveSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelected: (file: File, archiveEntry: CSVArchiveEntry) => void;
  uploadType?: string;
}

export function CSVArchiveSelector({ 
  open, 
  onOpenChange, 
  onFileSelected,
  uploadType 
}: CSVArchiveSelectorProps) {
  const { archivedFiles, isLoading, downloadArchivedFile } = useCSVArchive();
  const [selectedEntry, setSelectedEntry] = useState<CSVArchiveEntry | null>(null);

  // فلترة الملفات حسب نوع الرفع إذا تم تحديده
  const filteredFiles = archivedFiles?.filter(file => 
    !uploadType || file.upload_type === uploadType
  ) || [];

  const handleSelectFile = async (entry: CSVArchiveEntry) => {
    try {
      if (!entry.file_content) {
        toast.error('محتوى الملف غير متوفر');
        return;
      }

      // إنشاء ملف من المحتوى المحفوظ
      const blob = new Blob([entry.file_content], { type: 'text/csv' });
      const file = new File([blob], entry.original_file_name, { type: 'text/csv' });
      
      onFileSelected(file, entry);
      onOpenChange(false);
      toast.success(`تم اختيار الملف: ${entry.original_file_name}`);
    } catch (error) {
      console.error('Error selecting archived file:', error);
      toast.error('فشل في اختيار الملف من الأرشيف');
    }
  };

  const handleDownload = async (entry: CSVArchiveEntry) => {
    await downloadArchivedFile(entry);
  };

  const getUploadTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'contracts': 'العقود',
      'customers': 'العملاء',
      'vehicles': 'المركبات',
      'payments': 'المدفوعات',
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            اختيار ملف من الأرشيف
          </DialogTitle>
          <DialogDescription>
            اختر ملف محفوظ مسبقاً لإعادة رفعه ومعالجته
            {uploadType && ` (ملفات ${getUploadTypeLabel(uploadType)})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">جاري تحميل الملفات المحفوظة...</div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8">
              <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <div className="text-muted-foreground mb-3">
                {uploadType 
                  ? `لا توجد ملفات محفوظة لـ ${getUploadTypeLabel(uploadType)}`
                  : 'لا توجد ملفات محفوظة'
                }
              </div>
              <div className="text-sm text-muted-foreground">
                لحفظ الملفات في الأرشيف، تأكد من تفعيل خيار "حفظ الملف في الأرشيف" عند رفع الملفات
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="grid gap-4">
                {filteredFiles.map((entry) => (
                  <Card 
                    key={entry.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedEntry?.id === entry.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {entry.original_file_name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {getUploadTypeLabel(entry.upload_type)}
                          </Badge>
                          <Badge className={getStatusColor(entry.processing_status)}>
                            {entry.processing_status === 'completed' ? 'مكتمل' : entry.processing_status}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(entry.uploaded_at), { 
                            addSuffix: true,
                            locale: ar 
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          تم الرفع بواسطة المستخدم
                        </span>
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">إجمالي الصفوف:</span>
                          <div className="font-medium">{entry.total_rows}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">نجح:</span>
                          <div className="font-medium text-green-600">{entry.successful_rows}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">فشل:</span>
                          <div className="font-medium text-red-600">{entry.failed_rows}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">حجم الملف:</span>
                          <div className="font-medium">
                            {(entry.file_size_bytes / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>

                      {entry.error_details && entry.error_details.length > 0 && (
                        <div className="mt-3 p-2 bg-red-50 rounded text-sm">
                          <span className="text-red-700 font-medium">
                            تحتوي على {entry.error_details.length} خطأ
                          </span>
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectFile(entry);
                          }}
                          className="flex-1"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          اختيار للرفع
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(entry);
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          تحميل
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            {selectedEntry && (
              <Button onClick={() => handleSelectFile(selectedEntry)}>
                <Upload className="h-4 w-4 mr-2" />
                استخدام الملف المحدد
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}