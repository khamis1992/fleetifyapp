import React, { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Download,
  Trash2,
  Upload,
  FileText,
  Search,
  Filter,
  MoreVertical,
  Eye,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSavedCSVFiles, SavedCSVFile } from '@/hooks/useSavedCSVFiles';
import { CSVPreviewDialog } from './CSVPreviewDialog';

interface SavedCSVManagerProps {
  onImportFromFile?: (file: SavedCSVFile, content: string) => void;
}

export const SavedCSVManager: React.FC<SavedCSVManagerProps> = ({
  onImportFromFile,
}) => {
  const { savedFiles, isLoading, deleteCSVFile, downloadCSVFile, getCSVContent } = useSavedCSVFiles();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    file?: SavedCSVFile;
  }>({ open: false });
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    file?: SavedCSVFile;
    content?: string;
  }>({ open: false });

  const fileTypes = [
    { value: 'all', label: 'جميع الأنواع' },
    { value: 'contracts', label: 'العقود' },
    { value: 'customers', label: 'العملاء' },
    { value: 'vehicles', label: 'المركبات' },
    { value: 'payments', label: 'المدفوعات' },
  ];

  const getStatusBadge = (status: string) => {
    const statusMap = {
      saved: { label: 'محفوظ', variant: 'secondary' as const },
      processing: { label: 'جاري المعالجة', variant: 'default' as const },
      imported: { label: 'تم الاستيراد', variant: 'default' as const },
      error: { label: 'خطأ', variant: 'destructive' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.saved;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getFileTypeLabel = (type: string) => {
    const typeMap = {
      contracts: 'العقود',
      customers: 'العملاء',
      vehicles: 'المركبات',
      payments: 'المدفوعات',
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePreview = async (file: SavedCSVFile) => {
    try {
      const content = await getCSVContent(file);
      setPreviewDialog({ open: true, file, content });
    } catch (error) {
      console.error('Error loading file content:', error);
    }
  };

  const handleImport = async (file: SavedCSVFile) => {
    if (onImportFromFile) {
      try {
        const content = await getCSVContent(file);
        onImportFromFile(file, content);
      } catch (error) {
        console.error('Error loading file for import:', error);
      }
    }
  };

  const filteredFiles = savedFiles.filter((file) => {
    const matchesSearch = file.original_file_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || file.file_type === filterType;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            الملفات المحفوظة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            جاري تحميل الملفات...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            الملفات المحفوظة
          </CardTitle>
          <CardDescription>
            إدارة ملفات CSV المحفوظة واستيراد البيانات منها
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في الملفات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      {fileTypes.find(t => t.value === filterType)?.label}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {fileTypes.map((type) => (
                    <DropdownMenuItem
                      key={type.value}
                      onClick={() => setFilterType(type.value)}
                    >
                      {type.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Files Table */}
          {filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || filterType !== 'all'
                ? 'لا توجد ملفات تطابق البحث'
                : 'لا توجد ملفات محفوظة'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الملف</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>حجم الملف</TableHead>
                  <TableHead>عدد الصفوف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead>العمليات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">
                      {file.original_file_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getFileTypeLabel(file.file_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(file.file_size)}</TableCell>
                    <TableCell>
                      {file.row_count ? file.row_count.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(file.status)}</TableCell>
                    <TableCell>
                      {format(new Date(file.created_at), 'PPP', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePreview(file)}>
                            <Eye className="h-4 w-4 ml-2" />
                            معاينة
                          </DropdownMenuItem>
                          {onImportFromFile && (
                            <DropdownMenuItem onClick={() => handleImport(file)}>
                              <Upload className="h-4 w-4 ml-2" />
                              استيراد
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => downloadCSVFile(file)}>
                            <Download className="h-4 w-4 ml-2" />
                            تحميل
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteDialog({ open: true, file })}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 ml-2" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الملف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الملف "{deleteDialog.file?.original_file_name}"؟
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog.file) {
                  deleteCSVFile.mutate(deleteDialog.file.id);
                  setDeleteDialog({ open: false });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <CSVPreviewDialog
        open={previewDialog.open}
        onOpenChange={(open) => setPreviewDialog({ open })}
        file={previewDialog.file}
        content={previewDialog.content}
      />
    </>
  );
};