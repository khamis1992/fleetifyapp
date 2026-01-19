import { useState } from "react";
import { useCSVArchive, CSVArchiveEntry } from "@/hooks/useCSVArchive";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, 
  Trash2, 
  FileText, 
  Calendar, 
  User, 
  Target, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Search,
  Filter,
  Archive,
  Eye
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";

interface CSVArchiveManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CSVArchiveManager({ open, onOpenChange }: CSVArchiveManagerProps) {
  const { archivedFiles, isLoading, downloadArchivedFile, deleteArchivedFile, isDeleting } = useCSVArchive();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<CSVArchiveEntry | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  // تصفية الملفات
  const filteredFiles = archivedFiles?.filter(file => {
    const matchesSearch = file.original_file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || file.processing_status === statusFilter;
    const matchesType = typeFilter === "all" || file.upload_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive",
      processing: "secondary",
      pending: "outline"
    };
    
    const labels: Record<string, string> = {
      completed: "مكتمل",
      failed: "فشل",
      processing: "قيد المعالجة",
      pending: "في الانتظار"
    };

    return (
      <Badge variant={variants[status] || "outline"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {labels[status] || status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      contracts: "عقود",
      customers: "عملاء",
      vehicles: "مركبات",
      payments: "مدفوعات"
    };

    return (
      <Badge variant="outline">
        {labels[type] || type}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (file: CSVArchiveEntry) => {
    downloadArchivedFile(file);
  };

  const handleDelete = (fileId: string) => {
    setFileToDelete(fileId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (fileToDelete) {
      deleteArchivedFile(fileToDelete);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              أرشيف ملفات CSV
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="mr-2">جاري تحميل الأرشيف...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            أرشيف ملفات CSV
          </DialogTitle>
          <DialogDescription>
            عرض وإدارة جميع ملفات CSV المحفوظة في الأرشيف
          </DialogDescription>
        </DialogHeader>

        {/* أدوات البحث والتصفية */}
        <div className="flex flex-col sm:flex-row gap-4 py-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في أسماء الملفات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="حالة المعالجة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="failed">فشل</SelectItem>
              <SelectItem value="processing">قيد المعالجة</SelectItem>
              <SelectItem value="pending">في الانتظار</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="نوع الملف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              <SelectItem value="contracts">عقود</SelectItem>
              <SelectItem value="customers">عملاء</SelectItem>
              <SelectItem value="vehicles">مركبات</SelectItem>
              <SelectItem value="payments">مدفوعات</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 max-h-[50vh]">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد ملفات محفوظة في الأرشيف</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFiles.map((file) => (
                <Card key={file.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate">{file.original_file_name}</span>
                          {getTypeBadge(file.upload_type)}
                          {getStatusBadge(file.processing_status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true, locale: ar })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            <span>{file.total_rows} صف</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-success" />
                            <span>{file.successful_rows} نجح</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-destructive" />
                            <span>{file.failed_rows} فشل</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFile(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(file.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between items-center pt-4">
          <span className="text-sm text-muted-foreground">
            {filteredFiles.length} من أصل {archivedFiles?.length || 0} ملف
          </span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </div>
      </DialogContent>

      {/* مربع حوار تفاصيل الملف */}
      {selectedFile && (
        <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                تفاصيل الملف: {selectedFile.original_file_name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">اسم الملف</label>
                  <p className="text-sm text-muted-foreground">{selectedFile.original_file_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">حجم الملف</label>
                  <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.file_size_bytes)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">نوع الرفع</label>
                  <p className="text-sm text-muted-foreground">{getTypeBadge(selectedFile.upload_type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">حالة المعالجة</label>
                  <p className="text-sm text-muted-foreground">{getStatusBadge(selectedFile.processing_status)}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{selectedFile.total_rows}</div>
                  <div className="text-sm text-muted-foreground">إجمالي الصفوف</div>
                </div>
                <div className="text-center p-4 bg-success/10 rounded-lg">
                  <div className="text-2xl font-bold text-success">{selectedFile.successful_rows}</div>
                  <div className="text-sm text-muted-foreground">نجح</div>
                </div>
                <div className="text-center p-4 bg-destructive/10 rounded-lg">
                  <div className="text-2xl font-bold text-destructive">{selectedFile.failed_rows}</div>
                  <div className="text-sm text-muted-foreground">فشل</div>
                </div>
              </div>

              {selectedFile.error_details && selectedFile.error_details.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">تفاصيل الأخطاء</label>
                  <ScrollArea className="h-32 w-full border rounded-md p-3">
                    <div className="space-y-2">
                      {selectedFile.error_details.map((error: unknown, index) => (
                        <div key={index} className="text-sm p-2 bg-destructive/10 rounded border-r-2 border-destructive">
                          <span className="font-medium">صف {error.row}:</span> {error.message}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedFile(null)}>
                  إغلاق
                </Button>
                <Button onClick={() => handleDownload(selectedFile)}>
                  <Download className="h-4 w-4 mr-2" />
                  تحميل الملف
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* مربع حوار تأكيد الحذف */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الملف من الأرشيف؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}