import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Download, Trash2, FileText, Upload, Eye, Car, CheckCircle, AlertCircle } from 'lucide-react';
import { useContractDocuments, useCreateContractDocument, useDeleteContractDocument, useDownloadContractDocument } from '@/hooks/useContractDocuments';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isReportViewerOpen, setIsReportViewerOpen] = useState(false);
  const { data: documents = [], isLoading } = useContractDocuments(contractId);
  const createDocument = useCreateContractDocument();
  const deleteDocument = useDeleteContractDocument();
  const downloadDocument = useDownloadContractDocument();

  // Hook لجلب بيانات تقرير حالة المركبة
  const { data: conditionReport } = useQuery({
    queryKey: ['condition-report', selectedReportId],
    queryFn: async () => {
      if (!selectedReportId) return null;
      
      // أولاً، احصل على تقرير الحالة
      const { data: reportData, error: reportError } = await supabase
        .from('vehicle_condition_reports')
        .select('*')
        .eq('id', selectedReportId)
        .maybeSingle();
      
      if (reportError) throw reportError;
      if (!reportData) return null;

      // ثم احصل على بيانات المركبة إذا كان هناك vehicle_id
      let vehicleData = null;
      if (reportData.vehicle_id) {
        const { data: vehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .select('plate_number, make, model, year')
          .eq('id', reportData.vehicle_id)
          .maybeSingle();
        
        if (!vehicleError) {
          vehicleData = vehicle;
        }
      }

      return {
        ...reportData,
        vehicles: vehicleData
      };
    },
    enabled: !!selectedReportId
  });

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

  const handleViewConditionReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setIsReportViewerOpen(true);
  };

  const getDocumentTypeLabel = (type: string) => {
    return documentTypes.find(dt => dt.value === type)?.label || type;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConditionLabel = (condition: string) => {
    const labels: Record<string, string> = {
      excellent: 'ممتازة',
      good: 'جيدة',
      fair: 'مقبولة',
      poor: 'سيئة'
    };
    return labels[condition] || condition;
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
                className={`flex items-center justify-between p-3 border rounded-lg transition-colors dir-rtl ${
                  document.document_type === 'condition_report' && document.condition_report_id
                    ? 'hover:bg-accent/50 cursor-pointer'
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => {
                  if (document.document_type === 'condition_report' && document.condition_report_id) {
                    handleViewConditionReport(document.condition_report_id);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {document.document_type === 'condition_report' && document.condition_report_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewConditionReport(document.condition_report_id!);
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {document.file_path && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(document.file_path!, document.document_name);
                      }}
                      disabled={downloadDocument.isPending}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(document.id);
                    }}
                    disabled={deleteDocument.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    {document.is_required && (
                      <Badge variant="destructive" className="text-xs">
                        مطلوب
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {getDocumentTypeLabel(document.document_type)}
                    </Badge>
                    <h4 className="font-medium">{document.document_name}</h4>
                  </div>
                  
                  <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
                    {document.file_size && (
                      <span>{formatFileSize(document.file_size)}</span>
                    )}
                    <span>
                      {new Date(document.uploaded_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  
                  {document.notes && (
                    <p className="text-sm text-muted-foreground mt-1 text-right">
                      {document.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialog لعرض تقرير حالة المركبة */}
      <Dialog open={isReportViewerOpen} onOpenChange={setIsReportViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              تقرير حالة المركبة
            </DialogTitle>
          </DialogHeader>
          
          {conditionReport && (
            <div className="space-y-6">
              {/* معلومات المركبة */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  معلومات المركبة
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">رقم اللوحة:</span>
                    <p className="font-medium">{conditionReport.vehicles?.plate_number}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الصانع:</span>
                    <p className="font-medium">{conditionReport.vehicles?.make}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الموديل:</span>
                    <p className="font-medium">{conditionReport.vehicles?.model}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">السنة:</span>
                    <p className="font-medium">{conditionReport.vehicles?.year}</p>
                  </div>
                </div>
              </div>

              {/* معلومات التفتيش */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">تاريخ التفتيش</h4>
                  <p className="text-sm">
                    {new Date(conditionReport.inspection_date).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">نوع التفتيش</h4>
                  <p className="text-sm">
                    {conditionReport.inspection_type === 'pre_dispatch' 
                      ? 'قبل التسليم' 
                      : conditionReport.inspection_type === 'post_dispatch'
                      ? 'بعد الاستلام'
                      : 'فحص العقد'
                    }
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">الحالة العامة</h4>
                  <div className="flex items-center gap-2">
                    {conditionReport.overall_condition === 'poor' ? (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    <span className={`text-sm font-medium ${getConditionColor(conditionReport.overall_condition)}`}>
                      {getConditionLabel(conditionReport.overall_condition)}
                    </span>
                  </div>
                </div>
              </div>

              {/* قراءات العداد والوقود */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">قراءة العداد</h4>
                  <p className="text-lg font-medium">
                    {conditionReport.mileage_reading?.toLocaleString()} كم
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">مستوى الوقود</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${conditionReport.fuel_level || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{conditionReport.fuel_level}%</span>
                  </div>
                </div>
              </div>

              {/* عناصر الحالة */}
              {conditionReport.condition_items && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">تفاصيل حالة المركبة</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(conditionReport.condition_items as Record<string, any>).map(([category, items]) => (
                      <div key={category} className="space-y-2">
                        <h5 className="font-medium text-sm capitalize">{category}</h5>
                        {typeof items === 'object' && Object.entries(items).map(([item, condition]) => {
                          // Type assertion for condition object
                          const conditionObj = condition as any;
                          
                          return (
                            <div key={item} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{item}</span>
                              <span className={`font-medium ${
                                typeof conditionObj === 'object' && conditionObj?.condition 
                                  ? getConditionColor(conditionObj.condition)
                                  : typeof conditionObj === 'string'
                                  ? getConditionColor(conditionObj)
                                  : 'text-gray-600'
                              }`}>
                                {typeof conditionObj === 'object' && conditionObj?.condition 
                                  ? getConditionLabel(conditionObj.condition)
                                  : typeof conditionObj === 'string'
                                  ? getConditionLabel(conditionObj)
                                  : '---'
                                }
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ملاحظات */}
              {conditionReport.notes && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">ملاحظات</h4>
                  <p className="text-sm text-muted-foreground">{conditionReport.notes}</p>
                </div>
              )}

              {/* نقاط الضرر */}
              {conditionReport.damage_items && Array.isArray(conditionReport.damage_items) && conditionReport.damage_items.length > 0 && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    نقاط الضرر المكتشفة
                  </h4>
                  <div className="space-y-2">
                    {conditionReport.damage_items.map((damage: any, index: number) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <div className="text-sm">
                          <span className="font-medium">الموقع:</span> {damage.location || 'غير محدد'}
                        </div>
                        {damage.description && (
                          <div className="text-sm mt-1">
                            <span className="font-medium">الوصف:</span> {damage.description}
                          </div>
                        )}
                        {damage.severity && (
                          <div className="text-sm mt-1">
                            <span className="font-medium">الشدة:</span> 
                            <span className={`mr-2 ${
                              damage.severity === 'high' ? 'text-red-600' :
                              damage.severity === 'medium' ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {damage.severity === 'high' ? 'عالية' :
                               damage.severity === 'medium' ? 'متوسطة' : 'منخفضة'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}