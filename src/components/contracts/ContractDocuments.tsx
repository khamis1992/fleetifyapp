import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Download, Trash2, FileText, Upload, Eye, Car, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { useContractDocuments, useCreateContractDocument, useDeleteContractDocument, useDownloadContractDocument } from '@/hooks/useContractDocuments';
import { ContractHtmlViewer } from './ContractHtmlViewer';
import { ContractPdfData } from '@/utils/contractPdfGenerator';
import { formatDateForContract } from '@/utils/dateFormatter';
import { DocumentSavingProgress } from './DocumentSavingProgress';
import { useContractDocumentSaving } from '@/hooks/useContractDocumentSaving';
import { VehicleConditionDiagram } from '@/components/fleet/VehicleConditionDiagram';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LazyImage } from '@/components/common/LazyImage';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

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
  { value: 'signed_contract', label: 'عقد موقع' },
  { value: 'draft_contract', label: 'مسودة عقد' },
  { value: 'condition_report', label: 'تقرير حالة المركبة' },
  { value: 'signature', label: 'توقيع' },
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
  const [selectedDocumentForPreview, setSelectedDocumentForPreview] = useState<any>(null);
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const { data: documents = [], isLoading } = useContractDocuments(contractId);
  const createDocument = useCreateContractDocument();
  const deleteDocument = useDeleteContractDocument();
  const downloadDocument = useDownloadContractDocument();
  const { companyId } = useUnifiedCompanyAccess();
  
  // Enhanced document saving with progress tracking
  const { 
    savingSteps, 
    isProcessing: isSavingDocuments,
    retryStep,
    documentSavingErrors,
    clearErrors 
  } = useContractDocumentSaving();

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
        .eq('company_id', companyId)
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
          .eq('company_id', companyId)
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

  const handleDelete = (documentId: string) => {
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (documentToDelete) {
      try {
        await deleteDocument.mutateAsync(documentToDelete);
        setDeleteDialogOpen(false);
        setDocumentToDelete(null);
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const handleViewConditionReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setIsReportViewerOpen(true);
  };

  const handlePreviewDocument = async (document: any) => {
    if (!document.file_path) {
      toast.error('لا يمكن معاينة هذا المستند');
      return;
    }

    try {
      // إذا كان المستند عقد موقع أو مسودة عقد، اجلب بيانات العقد لعرضه كـ HTML
      if (document.document_type === 'signed_contract' || document.document_type === 'draft_contract') {
        const { data: contractData, error } = await supabase
          .from('contracts')
          .select(`
            *,
            customers (
              customer_type,
              first_name,
              last_name,
              company_name
            )
          `)
          .eq('id', contractId)
          .eq('company_id', companyId)
          .single();

        if (error) {
          console.error('Error fetching contract data:', error);
          toast.error('حدث خطأ في جلب بيانات العقد');
          return;
        }

        // تحويل بيانات العقد لتنسيق ContractPdfData
        const customerName = contractData.customers?.customer_type === 'individual' 
          ? `${contractData.customers?.first_name} ${contractData.customers?.last_name}`
          : contractData.customers?.company_name || '';

        // جلب بيانات المركبة منفصلة إذا كان هناك vehicle_id
        let vehicleInfo = '';
        if (contractData.vehicle_id) {
          const { data: vehicleData } = await supabase
            .from('vehicles')
            .select('make, model, year, plate_number')
            .eq('id', contractData.vehicle_id)
            .eq('company_id', companyId)
            .maybeSingle();
          
          if (vehicleData) {
            vehicleInfo = `${vehicleData.make} ${vehicleData.model} ${vehicleData.year} - ${vehicleData.plate_number}`;
          }
        }

        // جلب تقرير فحص المركبة المرتبط بالعقد
        let conditionReportData = null;
        
        // البحث أولاً في مستندات العقد عن تقرير الحالة
        const { data: conditionReportDocs } = await supabase
          .from('contract_documents')
          .select('condition_report_id')
          .eq('contract_id', contractId)
          .eq('company_id', companyId)
          .eq('document_type', 'condition_report')
          .not('condition_report_id', 'is', null)
          .limit(1);
        
        if (conditionReportDocs && conditionReportDocs.length > 0) {
          const reportId = conditionReportDocs[0].condition_report_id;
          if (reportId) {
            const { data: reportData } = await supabase
              .from('vehicle_condition_reports')
              .select('*')
              .eq('id', reportId)
              .eq('company_id', companyId)
              .maybeSingle();
            
            if (reportData) {
              conditionReportData = reportData;
              console.log('📄 [CONDITION_REPORT] Found condition report:', reportData);
            }
          }
        }

        const contractPdfData: ContractPdfData = {
          contract_number: contractData.contract_number,
          contract_type: contractData.contract_type,
          customer_name: customerName,
          vehicle_info: vehicleInfo,
          start_date: contractData.start_date,
          end_date: contractData.end_date,
          contract_amount: contractData.contract_amount,
          monthly_amount: contractData.monthly_amount,
          terms: contractData.terms || '',
          customer_signature: '', // التوقيع سيتم جلبه من المستندات
          company_signature: '', // التوقيع سيتم جلبه من المستندات
          company_name: 'الشركة',
          created_date: formatDateForContract(contractData.created_at)
        };

        setSelectedDocumentForPreview({
          ...document,
          contractData: contractPdfData,
          conditionReportData: conditionReportData,
          isContract: true
        });
      } else {
        setSelectedDocumentForPreview(document);
      }
      
      setIsDocumentPreviewOpen(true);
    } catch (error) {
      console.error('Error preparing document preview:', error);
      toast.error('حدث خطأ في تحضير المعاينة');
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
    <div className="space-y-4">
      {/* Document Saving Progress */}
      {(savingSteps.length > 0 || isSavingDocuments) && (
        <DocumentSavingProgress 
          steps={savingSteps} 
          isProcessing={isSavingDocuments}
          onRetry={(stepId) => {
            console.log('📄 [RETRY_REQUEST] Retrying step:', stepId)
            // We need contract data to retry - this would be passed from parent
            toast.info('سيتم إعادة المحاولة قريباً')
          }}
          showRetryButton={true}
        />
      )}
      
      {/* Document Saving Errors Summary */}
      {documentSavingErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  {documentSavingErrors.length} خطأ في حفظ المستندات
                </span>
              </div>
              <Button
                variant="outline" 
                size="sm"
                onClick={clearErrors}
                className="text-xs"
              >
                مسح الأخطاء
              </Button>
            </div>
            <div className="mt-2 text-xs text-red-700">
              اضغط على زر "إعادة المحاولة" بجانب الخطوات الفاشلة أعلاه
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Documents List */}
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
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.csv,.xlsx,.xls,.json,.txt,.zip,.rar"
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
                         handlePreviewDocument(document);
                       }}
                       className="text-blue-600 hover:text-blue-700"
                     >
                       <Eye className="h-4 w-4" />
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

              {/* مخطط حالة المركبة */}
              {conditionReport.damage_items && Array.isArray(conditionReport.damage_items) && conditionReport.damage_items.length > 0 && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    مخطط حالة المركبة
                  </h4>
                  <VehicleConditionDiagram
                    damagePoints={conditionReport.damage_items.map((damage: any, index: number) => ({
                      id: `damage_${index}`,
                      x: damage.x || 50,
                      y: damage.y || 50,
                      severity: damage.severity === 'high' ? 'severe' : 
                               damage.severity === 'medium' ? 'moderate' : 'minor',
                      description: damage.description || damage.location || 'ضرر غير محدد'
                    }))}
                    readOnly={true}
                  />
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

      {/* Dialog لمعاينة المستندات */}
      <Dialog open={isDocumentPreviewOpen} onOpenChange={setIsDocumentPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              معاينة المستند: {selectedDocumentForPreview?.document_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDocumentForPreview && (
            <div className="space-y-4">
              {/* معلومات المستند */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">نوع المستند:</span>
                    <p className="font-medium">{getDocumentTypeLabel(selectedDocumentForPreview.document_type)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">تاريخ الرفع:</span>
                    <p className="font-medium">
                      {new Date(selectedDocumentForPreview.uploaded_at).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">حجم الملف:</span>
                    <p className="font-medium">{formatFileSize(selectedDocumentForPreview.file_size)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">النوع:</span>
                    <p className="font-medium">{selectedDocumentForPreview.mime_type}</p>
                  </div>
                </div>
                {selectedDocumentForPreview.notes && (
                  <div className="mt-3">
                    <span className="text-muted-foreground">ملاحظات:</span>
                    <p className="font-medium mt-1">{selectedDocumentForPreview.notes}</p>
                  </div>
                )}
              </div>

              {/* معاينة المحتوى */}
              <div className="border rounded-lg overflow-hidden min-h-[500px]">
                {selectedDocumentForPreview.isContract && selectedDocumentForPreview.contractData ? (
                  <ContractHtmlViewer 
                    contractData={selectedDocumentForPreview.contractData} 
                    conditionReportData={selectedDocumentForPreview.conditionReportData}
                  />
                ) : selectedDocumentForPreview.file_path && (
                  <>
                    {selectedDocumentForPreview.mime_type?.includes('pdf') ? (
                      <iframe
                        src={`https://qwhunliohlkkahbspfiu.supabase.co/storage/v1/object/public/contract-documents/${selectedDocumentForPreview.file_path}`}
                        className="w-full h-[600px]"
                        title="معاينة PDF"
                      />
                    ) : selectedDocumentForPreview.mime_type?.includes('image') ? (
                      <div className="flex justify-center p-4">
                        <LazyImage
                          src={`https://qwhunliohlkkahbspfiu.supabase.co/storage/v1/object/public/contract-documents/${selectedDocumentForPreview.file_path}`}
                          alt={selectedDocumentForPreview.document_name}
                          className="max-w-full max-h-[600px] object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                        <FileText className="h-16 w-16 mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">لا يمكن معاينة هذا النوع من الملفات</p>
                        <p className="text-sm">يمكنك تحميل الملف لعرضه في التطبيق المناسب</p>
                        <Button
                          className="mt-4"
                          onClick={() => {
                            if (selectedDocumentForPreview.file_path) {
                              handleDownload(selectedDocumentForPreview.file_path, selectedDocumentForPreview.document_name);
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          تحميل الملف
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* مربع حوار تأكيد الحذف */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المستند؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </Card>
    </div>
  );
}