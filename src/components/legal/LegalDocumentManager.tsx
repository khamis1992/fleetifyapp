import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useLegalDocuments, useCreateLegalDocument, useDeleteLegalDocument, useDownloadLegalDocument, type LegalDocumentFormData } from '@/hooks/useLegalDocuments';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  FileText, 
  Download, 
  Trash2, 
  Upload, 
  Eye, 
  Lock, 
  Globe,
  Calendar,
  User,
  Filter,
  Search,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

const documentFormSchema = z.object({
  case_id: z.string().min(1, 'معرف القضية مطلوب'),
  document_type: z.string().min(1, 'نوع المستند مطلوب'),
  document_title: z.string().min(1, 'عنوان المستند مطلوب'),
  document_title_ar: z.string().optional(),
  description: z.string().optional(),
  document_date: z.string().optional(),
  is_confidential: z.boolean(),
  is_original: z.boolean(),
  access_level: z.string().min(1, 'مستوى الوصول مطلوب'),
  file: z.any().optional(),
});

interface LegalDocumentManagerProps {
  caseId: string;
  caseName: string;
}

export const LegalDocumentManager: React.FC<LegalDocumentManagerProps> = ({
  caseId,
  caseName,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [accessFilter, setAccessFilter] = useState('');
  const [confidentialFilter, setConfidentialFilter] = useState<boolean | undefined>(undefined);

  const filters = {
    case_id: caseId,
    search: searchTerm || undefined,
    document_type: typeFilter || undefined,
    access_level: accessFilter || undefined,
    is_confidential: confidentialFilter,
  };

  const { data: documents, isLoading } = useLegalDocuments(filters);
  const createMutation = useCreateLegalDocument();
  const deleteMutation = useDeleteLegalDocument();
  const downloadMutation = useDownloadLegalDocument();

  const form = useForm<LegalDocumentFormData>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      case_id: caseId,
      document_type: 'contract',
      document_title: '',
      document_title_ar: '',
      description: '',
      document_date: '',
      is_confidential: false,
      is_original: true,
      access_level: 'internal',
    },
  });

  const onSubmit = (data: LegalDocumentFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        form.reset();
        setIsFormOpen(false);
      },
    });
  };

  const handleDownload = (documentId: string) => {
    downloadMutation.mutate(documentId);
  };

  const handleDelete = (documentId: string, title: string) => {
    if (window.confirm(`هل أنت متأكد من حذف المستند "${title}"؟`)) {
      deleteMutation.mutate(documentId);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'contract': return <FileText className="h-4 w-4" />;
      case 'evidence': return <Eye className="h-4 w-4" />;
      case 'correspondence': return <FileText className="h-4 w-4" />;
      case 'court_filing': return <FileText className="h-4 w-4" />;
      case 'judgment': return <FileText className="h-4 w-4" />;
      case 'settlement': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contract': return 'عقد';
      case 'evidence': return 'دليل';
      case 'correspondence': return 'مراسلة';
      case 'court_filing': return 'مذكرة محكمة';
      case 'judgment': return 'حكم';
      case 'settlement': return 'تسوية';
      default: return type;
    }
  };

  const getAccessLabel = (level: string) => {
    switch (level) {
      case 'public': return 'عام';
      case 'internal': return 'داخلي';
      case 'confidential': return 'سري';
      case 'restricted': return 'مقيد';
      default: return level;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">مستندات القضية</h3>
          <p className="text-muted-foreground">{caseName}</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          إضافة مستند
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            البحث والتصفية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المستندات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="نوع المستند" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">عقد</SelectItem>
                <SelectItem value="evidence">دليل</SelectItem>
                <SelectItem value="correspondence">مراسلة</SelectItem>
                <SelectItem value="court_filing">مذكرة محكمة</SelectItem>
                <SelectItem value="judgment">حكم</SelectItem>
                <SelectItem value="settlement">تسوية</SelectItem>
              </SelectContent>
            </Select>
            <Select value={accessFilter} onValueChange={setAccessFilter}>
              <SelectTrigger>
                <SelectValue placeholder="مستوى الوصول" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">عام</SelectItem>
                <SelectItem value="internal">داخلي</SelectItem>
                <SelectItem value="confidential">سري</SelectItem>
                <SelectItem value="restricted">مقيد</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={confidentialFilter === undefined ? '' : confidentialFilter.toString()} 
              onValueChange={(value) => setConfidentialFilter(value === '' ? undefined : value === 'true')}
            >
              <SelectTrigger>
                <SelectValue placeholder="حالة السرية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">سري</SelectItem>
                <SelectItem value="false">عادي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : documents?.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد مستندات</h3>
            <p className="text-muted-foreground mb-4">لم يتم إضافة أي مستندات لهذه القضية بعد</p>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              إضافة أول مستند
            </Button>
          </div>
        ) : (
          documents?.map((document) => (
            <Card key={document.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1 flex items-center gap-2">
                      {getTypeIcon(document.document_type)}
                      {document.document_title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Badge variant="outline">{getTypeLabel(document.document_type)}</Badge>
                      <Badge variant={document.is_confidential ? 'destructive' : 'secondary'}>
                        {document.is_confidential ? (
                          <>
                            <Lock className="h-3 w-3 mr-1" />
                            سري
                          </>
                        ) : (
                          <>
                            <Globe className="h-3 w-3 mr-1" />
                            عادي
                          </>
                        )}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {document.description && (
                    <p className="text-sm text-muted-foreground">{document.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>مستوى الوصول: {getAccessLabel(document.access_level)}</span>
                  </div>
                  {document.file_size && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>حجم الملف: {formatFileSize(document.file_size)}</span>
                    </div>
                  )}
                  {document.document_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        تاريخ المستند: {format(new Date(document.document_date), 'dd/MM/yyyy', { locale: ar })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>
                      الإصدار {document.version_number} • {format(new Date(document.created_at), 'dd/MM/yyyy', { locale: ar })}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    {document.file_path && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(document.id)}
                        disabled={downloadMutation.isPending}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        تحميل
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(document.id, document.document_title)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      حذف
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Document Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة مستند جديد</DialogTitle>
            <DialogDescription>
              أضف مستند جديد للقضية {caseName}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="document_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع المستند *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع المستند" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="contract">عقد</SelectItem>
                          <SelectItem value="evidence">دليل</SelectItem>
                          <SelectItem value="correspondence">مراسلة</SelectItem>
                          <SelectItem value="court_filing">مذكرة محكمة</SelectItem>
                          <SelectItem value="judgment">حكم</SelectItem>
                          <SelectItem value="settlement">تسوية</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="access_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>مستوى الوصول *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر مستوى الوصول" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="public">عام</SelectItem>
                          <SelectItem value="internal">داخلي</SelectItem>
                          <SelectItem value="confidential">سري</SelectItem>
                          <SelectItem value="restricted">مقيد</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="document_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>عنوان المستند *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="أدخل عنوان المستند" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="document_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ المستند</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="file"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>الملف</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => onChange(e.target.files?.[0] || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-full">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>وصف المستند</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="أدخل وصف للمستند" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_confidential"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">مستند سري</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          هل هذا المستند سري ومحدود الوصول؟
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_original"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">النسخة الأصلية</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          هل هذا هو المستند الأصلي؟
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  <Upload className="h-4 w-4 mr-2" />
                  إضافة المستند
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};