import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Download, Trash2, FileText, Upload } from 'lucide-react';
import { useContractDocuments, useCreateContractDocument, useDeleteContractDocument, useDownloadContractDocument } from '@/hooks/useContractDocuments';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface ContractDocumentsProps {
  contractId: string;
}

interface DocumentFormData {
  document_type: string;
  document_name: string;
  file?: FileList;
  notes?: string;
  is_required: boolean;
}

const documentTypes = [
  { value: 'general', label: 'عام' },
  { value: 'contract', label: 'عقد' },
  { value: 'condition_report', label: 'تقرير حالة المركبة' },
  { value: 'insurance', label: 'تأمين' },
  { value: 'identity', label: 'هوية' },
  { value: 'license', label: 'رخصة' },
  { value: 'receipt', label: 'إيصال' },
  { value: 'other', label: 'أخرى' }
];

export function ContractDocuments({ contractId }: ContractDocumentsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: documents = [], isLoading } = useContractDocuments(contractId);
  const createDocument = useCreateContractDocument();
  const deleteDocument = useDeleteContractDocument();
  const downloadDocument = useDownloadContractDocument();

  const { register, handleSubmit, reset, setValue, watch } = useForm<DocumentFormData>({
    defaultValues: {
      document_type: 'general',
      is_required: false
    }
  });

  const onSubmit = async (data: DocumentFormData) => {
    try {
      await createDocument.mutateAsync({
        contract_id: contractId,
        document_type: data.document_type,
        document_name: data.document_name,
        file: data.file?.[0],
        notes: data.notes,
        is_required: data.is_required
      });
      
      reset();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const blob = await downloadDocument.mutateAsync(filePath);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المستند؟')) {
      try {
        await deleteDocument.mutateAsync(documentId);
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    return documentTypes.find(dt => dt.value === type)?.label || type;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (isLoading) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            مستندات العقد
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                إضافة مستند
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>إضافة مستند جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="document_type">نوع المستند</Label>
                  <Select onValueChange={(value) => setValue('document_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع المستند" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="document_name">اسم المستند</Label>
                  <Input
                    id="document_name"
                    {...register('document_name', { required: true })}
                    placeholder="أدخل اسم المستند"
                  />
                </div>

                <div>
                  <Label htmlFor="file">الملف</Label>
                  <Input
                    id="file"
                    type="file"
                    {...register('file')}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="ملاحظات إضافية (اختياري)"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_required"
                    {...register('is_required')}
                    className="rounded"
                  />
                  <Label htmlFor="is_required">مستند مطلوب</Label>
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={createDocument.isPending}
                    className="flex-1"
                  >
                    {createDocument.isPending ? 'جاري الحفظ...' : 'حفظ'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد مستندات مرفقة</p>
            <p className="text-sm">أضف مستندات للعقد باستخدام الزر أعلاه</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{document.document_name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {getDocumentTypeLabel(document.document_type)}
                    </Badge>
                    {document.is_required && (
                      <Badge variant="destructive" className="text-xs">
                        مطلوب
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {new Date(document.uploaded_at).toLocaleDateString('ar-SA')}
                    </span>
                    {document.file_size && (
                      <span>{formatFileSize(document.file_size)}</span>
                    )}
                  </div>
                  
                  {document.notes && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {document.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {document.file_path && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(document.file_path!, document.document_name)}
                      disabled={downloadDocument.isPending}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(document.id)}
                    disabled={deleteDocument.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}