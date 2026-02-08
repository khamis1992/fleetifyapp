import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Download, Trash2, FileText, Upload, Eye, Car, CheckCircle, AlertCircle, AlertTriangle, FileImage, RefreshCw, Pencil } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContractDocuments, useCreateContractDocument, useDeleteContractDocument, useDownloadContractDocument } from '@/hooks/useContractDocuments';
import { DocumentUploadDialog, DocumentUploadData } from './DocumentUploadDialog';
import { ContractHtmlViewer } from './ContractHtmlViewer';
import { ContractPdfData } from '@/utils/contractPdfGenerator';
import { formatDateForContract } from '@/utils/dateFormatter';
import { DocumentSavingProgress } from './DocumentSavingProgress';
import { useContractDocumentSaving } from '@/hooks/useContractDocumentSaving';
import { VehicleConditionDiagram } from '@/components/fleet/VehicleConditionDiagram';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LazyImage } from '@/components/common/LazyImage';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ContractDocumentsProps {
  contractId: string;
  customerId?: string;
  vehicleId?: string;
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
  { value: 'violations_proof', label: 'إثبات مخالفات مرورية' },
  { value: 'other', label: 'أخرى' }
];

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
  }
};

export function ContractDocuments({ contractId, customerId, vehicleId }: ContractDocumentsProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedReportId, setSelectedReportId] = React.useState<string | null>(null);
  const [isReportViewerOpen, setIsReportViewerOpen] = React.useState(false);
  const [selectedDocumentForPreview, setSelectedDocumentForPreview] = React.useState<any>(null);
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [documentToDelete, setDocumentToDelete] = React.useState<string | null>(null);
  const { data: documents = [], isLoading } = useContractDocuments(contractId, customerId, vehicleId);
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

  const handleDocumentUpload = async (data: DocumentUploadData) => {
    try {
      await createDocument.mutateAsync({
        contract_id: contractId,
        document_type: data.document_type,
        document_name: data.document_name,
        file: data.file,
        notes: data.notes,
        is_required: data.is_required
      });
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  };

  const handleDownload = async (filePath: string, fileName: string, sourceBucket: 'contract-documents' | 'documents' = 'contract-documents') => {
    try {
      // Use the correct bucket based on sourceBucket
      const { data, error } = await supabase.storage
        .from(sourceBucket)
        .download(filePath);

      if (error) throw error;
      if (!data) throw new Error('No data received');

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('تم تحميل المستند بنجاح');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('فشل في تحميل المستند');
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
    // تقرير حالة المركبة - نتعامل معه بشكل مختلف
    if (document.document_type === 'condition_report' && document.condition_report_id) {
      handleViewConditionReport(document.condition_report_id);
      return;
    }

    // للمستندات الأخرى، نحتاج file_path
    if (!document.file_path) {
      toast.error('لا يمكن معاينة هذا المستند');
      return;
    }

    try {
      // تحديد الـ bucket الصحيح بناءً على sourceBucket
      const bucket = document.sourceBucket || 'contract-documents';
      
      // إذا كان الملف PDF مرفوع (من صفحة رفع العقود الموقعة)، افتحه مباشرة
      if (document.file_path.startsWith('signed-agreements/') || document.mime_type === 'application/pdf') {
        const { data: signedUrl } = await supabase.storage
          .from(bucket)
          .createSignedUrl(document.file_path, 3600); // 1 hour
        
        if (signedUrl?.signedUrl) {
          window.open(signedUrl.signedUrl, '_blank');
          return;
        } else {
          toast.error('فشل في إنشاء رابط المعاينة');
          return;
        }
      }

      // إذا كان المستند عقد موقع أو مسودة عقد (مُنشأ من النظام)، اجلب بيانات العقد لعرضه كـ HTML
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

  const queryClient = useQueryClient();

  const handleChangeDocumentType = async (documentId: string, newType: string) => {
    try {
      const { error } = await supabase
        .from('contract_documents')
        .update({ document_type: newType })
        .eq('id', documentId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['contract-documents'] });
      toast.success('تم تغيير نوع المستند');
    } catch (error) {
      console.error('Error updating document type:', error);
      toast.error('حدث خطأ في تغيير نوع المستند');
    }
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
      default: return 'text-slate-600';
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
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
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
        <motion.div variants={fadeInUp} className="bg-red-50 border border-red-200 rounded-2xl p-4">
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
        </motion.div>
      )}
      
      {/* Documents List */}
      <motion.div
        variants={fadeInUp}
        className="bg-white rounded-3xl border border-neutral-200 p-8 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-neutral-900">مستندات العقد</h3>
            <p className="text-sm text-neutral-500">{documents.length} مستند</p>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600"
          >
            <Plus className="w-4 h-4" />
            إضافة مستند
          </Button>
        </div>

        {documents.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['العقد الموقع', 'رخصة القيادة', 'الهوية', 'تقرير الحالة'].map((placeholder, idx) => (
              <motion.div
                key={idx}
                variants={scaleIn}
                whileHover={{ y: -4 }}
                onClick={() => setIsDialogOpen(true)}
                className="aspect-[4/3] bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-400 hover:border-teal-300 hover:text-teal-500 transition-all cursor-pointer"
              >
                <FileText className="w-10 h-10 mb-2" />
                <p className="text-xs font-bold">{placeholder}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {documents.map((document) => (
              <motion.div
                key={document.id}
                variants={scaleIn}
                whileHover={{ y: -4 }}
                onClick={() => {
                  if (document.document_type === 'condition_report' && document.condition_report_id) {
                    handleViewConditionReport(document.condition_report_id);
                  } else if (document.file_path) {
                    handlePreviewDocument(document);
                  }
                }}
                className="group relative bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-200 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="aspect-square bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center relative overflow-hidden">
                  {document.document_type === 'condition_report' ? (
                    <Car className="w-12 h-12 text-blue-400" />
                  ) : (document.mime_type?.includes('image') || 
                       document.file_path?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ||
                       document.document_name?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) ? (
                    <img
                      src={`https://qwhunliohlkkahbspfiu.supabase.co/storage/v1/object/public/${document.sourceBucket || 'contract-documents'}/${document.file_path}`}
                      alt={document.document_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // إذا فشل تحميل الصورة، اعرض أيقونة بديلة
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement?.classList.add('fallback-icon');
                      }}
                    />
                  ) : (document.mime_type?.includes('pdf') || document.file_path?.match(/\.pdf$/i)) ? (
                    <FileText className="w-12 h-12 text-red-400" />
                  ) : (
                    <FileImage className="w-12 h-12 text-neutral-400" />
                  )}
                  
                  {document.is_required && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                        مطلوب
                      </Badge>
                    </div>
                  )}
                </div>
                
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-neutral-900 truncate flex-1" title={document.document_name}>
                      {document.document_name}
                    </p>
                  </div>
                  <Select
                    value={document.document_type}
                    onValueChange={(value) => {
                      handleChangeDocumentType(document.id, value);
                    }}
                  >
                    <SelectTrigger 
                      className="h-6 text-[10px] mb-2 max-w-full px-2 border-neutral-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-xs">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-neutral-500 mb-3">
                    {format(new Date(document.uploaded_at), 'dd/MM/yyyy')}
                  </p>
                  
                  {/* أزرار الإجراءات - دائماً مرئية */}
                  <div className="flex items-center gap-2 pt-2 border-t border-neutral-200">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs gap-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (document.document_type === 'condition_report' && document.condition_report_id) {
                          handleViewConditionReport(document.condition_report_id);
                        } else {
                          handlePreviewDocument(document);
                        }
                      }}
                      title="معاينة"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      معاينة
                    </Button>
                    
                    {document.file_path && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(document.file_path, document.document_name, document.sourceBucket || 'contract-documents');
                        }}
                        title="تحميل"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    
                    {/* Only show delete button for contract documents, not customer documents */}
                    {document.sourceBucket === 'contract-documents' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-red-200 hover:bg-red-50 text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(document.id);
                        }}
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

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
                    <div className="w-full bg-slate-200 rounded-full h-2">
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
                          const conditionObj = condition as any;
                          
                          return (
                            <div key={item} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{item}</span>
                              <span className={`font-medium ${
                                typeof conditionObj === 'object' && conditionObj?.condition 
                                  ? getConditionColor(conditionObj.condition)
                                  : typeof conditionObj === 'string'
                                  ? getConditionColor(conditionObj)
                                  : 'text-slate-600'
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
                        src={`https://qwhunliohlkkahbspfiu.supabase.co/storage/v1/object/public/${selectedDocumentForPreview.sourceBucket || 'contract-documents'}/${selectedDocumentForPreview.file_path}`}
                        className="w-full h-[600px]"
                        title="معاينة PDF"
                      />
                    ) : selectedDocumentForPreview.mime_type?.includes('image') ? (
                      <div className="flex justify-center p-4">
                        <LazyImage
                          src={`https://qwhunliohlkkahbspfiu.supabase.co/storage/v1/object/public/${selectedDocumentForPreview.sourceBucket || 'contract-documents'}/${selectedDocumentForPreview.file_path}`}
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
                              handleDownload(selectedDocumentForPreview.file_path, selectedDocumentForPreview.document_name, selectedDocumentForPreview.sourceBucket || 'contract-documents');
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

      {/* Document Upload Dialog */}
      <DocumentUploadDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleDocumentUpload}
        isSubmitting={createDocument.isPending}
      />
    </div>
  );
}
