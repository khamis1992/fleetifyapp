import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Download, Trash2, FileText, Upload, Eye, Car, CheckCircle, AlertCircle, AlertTriangle, FileImage, RefreshCw, PlayCircle, ScanLine, IdCard, FileSpreadsheet, ShieldCheck, CreditCard, Receipt, FileSignature } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  type ContractDocument,
  useContractDocuments,
  useCreateContractDocument,
  useDeleteContractViewDocument,
} from '@/hooks/useContractDocuments';
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
import { invalidateContractDocumentDependents } from '@/utils/contractDocumentQueries';
import { motion, type Variants } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTourGuide } from '@/components/tour-guide';
import {
  SignedContractScannerDialog,
  type SignedContractScanFiles,
} from './SignedContractScannerDialog';
import { CustomerIdProposalsDialog } from './CustomerIdProposalsDialog';
import {
  useCustomerIdProposals,
  usePendingIdScanCount,
  useScanContractDocumentsForId,
} from '@/hooks/useCustomerIdProposals';

interface ContractDocumentsProps {
  contractId: string;
  customerId?: string;
  vehicleId?: string;
}

const documentTypes = [
  { value: 'general', label: 'عام' },
  { value: 'contract', label: 'عقد' },
  { value: 'signed_contract', label: 'عقد موقع' },
  { value: 'signed_contract_image', label: 'صورة عقد موقع' },
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

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
  }
};

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
  }
};

const getContractDocumentPublicUrl = (bucket: string | undefined, filePath?: string | null) =>
  filePath
    ? supabase.storage.from(bucket || 'contract-documents').getPublicUrl(filePath).data.publicUrl
    : '';

type DocumentCategory = 'contract' | 'license' | 'identity' | 'insurance' | 'condition_report' | 'receipt' | 'violations' | 'other';

const categoryMeta: Record<DocumentCategory, { label: string; icon: React.ReactNode; tint: string }> = {
  contract: { label: 'العقود والتوقيعات', icon: <FileSignature className="h-3.5 w-3.5" />, tint: 'bg-[#EEF2FF] text-[#4F46E5]' },
  license: { label: 'الرخص', icon: <CreditCard className="h-3.5 w-3.5" />, tint: 'bg-[#FFFBEB] text-[#B45309]' },
  identity: { label: 'الهوية', icon: <IdCard className="h-3.5 w-3.5" />, tint: 'bg-[#F0F9FF] text-[#0369A1]' },
  insurance: { label: 'التأمين', icon: <ShieldCheck className="h-3.5 w-3.5" />, tint: 'bg-[#ECFDF9] text-[#0E9E7E]' },
  condition_report: { label: 'تقارير حالة المركبة', icon: <Car className="h-3.5 w-3.5" />, tint: 'bg-[#ECFDF9] text-[#0E9E7E]' },
  receipt: { label: 'الإيصالات', icon: <Receipt className="h-3.5 w-3.5" />, tint: 'bg-[#F0F9FF] text-[#0369A1]' },
  violations: { label: 'المخالفات المرورية', icon: <AlertTriangle className="h-3.5 w-3.5" />, tint: 'bg-[#FFF5F6] text-[#BE123C]' },
  other: { label: 'مستندات أخرى', icon: <FileText className="h-3.5 w-3.5" />, tint: 'bg-[#F6F8FB] text-slate-500' },
};

const getCategory = (documentType: string): DocumentCategory => {
  switch (documentType) {
    case 'contract':
    case 'signed_contract':
    case 'signed_contract_image':
    case 'draft_contract':
    case 'signature':
      return 'contract';
    case 'license':
      return 'license';
    case 'identity':
      return 'identity';
    case 'insurance':
      return 'insurance';
    case 'condition_report':
      return 'condition_report';
    case 'receipt':
      return 'receipt';
    case 'violations_proof':
      return 'violations';
    default:
      return 'other';
  }
};

const getFileTypeMeta = (document: any): { icon: React.ReactNode; tint: string } => {
  const isImage = document.mime_type?.includes('image') ||
    document.file_path?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ||
    document.document_name?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
  const isPdf = document.mime_type?.includes('pdf') || document.file_path?.match(/\.pdf$/i);

  if (document.document_type === 'condition_report') {
    return { icon: <Car className="h-5 w-5" />, tint: 'bg-[#ECFDF9] text-[#0E9E7E]' };
  }
  if (isImage) {
    return { icon: <FileImage className="h-5 w-5" />, tint: 'bg-[#F0F9FF] text-[#0369A1]' };
  }
  if (isPdf) {
    return { icon: <FileText className="h-5 w-5" />, tint: 'bg-[#FFF5F6] text-[#BE123C]' };
  }
  if (document.document_type === 'receipt') {
    return { icon: <Receipt className="h-5 w-5" />, tint: 'bg-[#F0F9FF] text-[#0369A1]' };
  }
  if (document.document_type === 'insurance') {
    return { icon: <ShieldCheck className="h-5 w-5" />, tint: 'bg-[#ECFDF9] text-[#0E9E7E]' };
  }
  if (document.document_type === 'license' || document.document_type === 'identity') {
    return { icon: <IdCard className="h-5 w-5" />, tint: 'bg-[#FFFBEB] text-[#B45309]' };
  }
  if (document.document_type === 'violations_proof') {
    return { icon: <AlertTriangle className="h-5 w-5" />, tint: 'bg-[#FFF5F6] text-[#BE123C]' };
  }
  return { icon: <FileSpreadsheet className="h-5 w-5" />, tint: 'bg-[#EEF2FF] text-[#4F46E5]' };
};

export function ContractDocuments({ contractId, customerId, vehicleId }: ContractDocumentsProps) {
  const { startTour } = useTourGuide();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [selectedReportId, setSelectedReportId] = React.useState<string | null>(null);
  const [isReportViewerOpen, setIsReportViewerOpen] = React.useState(false);
  const [selectedDocumentForPreview, setSelectedDocumentForPreview] = React.useState<any>(null);
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [documentToDelete, setDocumentToDelete] = React.useState<ContractDocument | null>(null);
  const {
    data: documents = [],
    isLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useContractDocuments(contractId, customerId, vehicleId);
  const createDocument = useCreateContractDocument();
  const deleteDocument = useDeleteContractViewDocument();
  const { companyId } = useUnifiedCompanyAccess();

  // Vision OCR: ID card scan proposals
  const [isProposalsOpen, setIsProposalsOpen] = React.useState(false);
  const { data: idProposals = [] } = useCustomerIdProposals(contractId);
  const { data: pendingScanCount = 0 } = usePendingIdScanCount(contractId);
  const scanDocumentsForId = useScanContractDocumentsForId(contractId);
  const autoScanTriggeredRef = React.useRef(false);

  // Auto-scan unprocessed documents once when the panel loads.
  // (Cron also scans image documents every 15 minutes; PDFs are rasterized
  //  client-side here because servers cannot rasterize PDFs.)
  React.useEffect(() => {
    if (autoScanTriggeredRef.current || isLoading || documentsError) return;
    if (pendingScanCount > 0) {
      autoScanTriggeredRef.current = true;
      scanDocumentsForId.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingScanCount, isLoading, documentsError]);
  
  // Enhanced document saving with progress tracking
  const { 
    savingSteps, 
    isProcessing: isSavingDocuments,
    documentSavingErrors,
    clearErrors 
  } = useContractDocumentSaving();

  // Hook لجلب بيانات تقرير حالة المركبة
  const { data: conditionReport } = useQuery({
    queryKey: ['condition-report', selectedReportId],
    queryFn: async () => {
      if (!selectedReportId || !companyId) return null;
      
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
    enabled: !!selectedReportId && !!companyId
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

  const handleSignedContractScan = async ({
    pdfFile,
    pageImages,
  }: SignedContractScanFiles) => {
    const scannedAt = format(new Date(), 'yyyy-MM-dd HH-mm');

    await createDocument.mutateAsync({
      contract_id: contractId,
      document_type: 'signed_contract',
      document_name: `نسخة العقد الموقع المجمعة - ${scannedAt}`,
      file: pdfFile,
      notes: pageImages.length > 0
        ? `نسخة PDF مجمعة من ${pageImages.length} صفحة مصورة بالكاميرا`
        : 'تم رفع ملف PDF جاهز كنسخة العقد الموقع',
      is_required: true,
      suppressSuccessToast: true,
    });

  };

  const handleDownload = async (filePath: string | null | undefined, fileName: string, sourceBucket: 'contract-documents' | 'documents' = 'contract-documents') => {
    try {
      if (!filePath) throw new Error('Document file path is missing');
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

  const handleDelete = (document: ContractDocument) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (documentToDelete) {
      try {
        await deleteDocument.mutateAsync({
          id: documentToDelete.id,
          contract_id: documentToDelete.contract_id,
          sourceType: documentToDelete.sourceType,
          sourceOwnerId: documentToDelete.sourceOwnerId,
        });
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
    if (!companyId) {
      toast.error('تعذر تحديد الشركة الحالية');
      return;
    }
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
        const { data: signedUrl, error: signedUrlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(document.file_path, 3600); // 1 hour

        if (signedUrlError) throw signedUrlError;
        if (signedUrl?.signedUrl) {
          setSelectedDocumentForPreview({
            ...document,
            preview_url: signedUrl.signedUrl,
          });
          setIsDocumentPreviewOpen(true);
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

  const handleChangeDocumentType = async (document: ContractDocument, newType: string) => {
    try {
      if (!companyId) throw new Error('تعذر تحديد الشركة الحالية');
      const sourceType = document.sourceType || 'contract';
      let error: { message: string } | null = null;

      if (sourceType === 'customer') {
        if (!document.sourceOwnerId) throw new Error('تعذر تحديد العميل مالك المستند');
        ({ error } = await supabase
          .from('customer_documents')
          .update({ document_type: newType })
          .eq('id', document.id)
          .eq('customer_id', document.sourceOwnerId)
          .eq('company_id', companyId)
          .select('id')
          .single());
      } else if (sourceType === 'vehicle') {
        if (!document.sourceOwnerId) throw new Error('تعذر تحديد المركبة مالكة المستند');
        const { error: vehicleError } = await supabase
          .from('vehicles')
          .select('id')
          .eq('id', document.sourceOwnerId)
          .eq('company_id', companyId)
          .single();
        if (vehicleError) throw vehicleError;
        ({ error } = await supabase
          .from('vehicle_documents')
          .update({ document_type: newType })
          .eq('id', document.id)
          .eq('vehicle_id', document.sourceOwnerId)
          .select('id')
          .single());
      } else {
        ({ error } = await supabase
          .from('contract_documents')
          .update({ document_type: newType })
          .eq('id', document.id)
          .eq('contract_id', contractId)
          .eq('company_id', companyId)
          .select('id')
          .single());
      }
      
      if (error) throw error;
      
      await invalidateContractDocumentDependents(queryClient, companyId, contractId);
      if (sourceType === 'customer' && document.sourceOwnerId) {
        await queryClient.invalidateQueries({ queryKey: ['customer-documents', document.sourceOwnerId] });
      }
      if (sourceType === 'vehicle' && document.sourceOwnerId) {
        await queryClient.invalidateQueries({ queryKey: ['vehicle-document-files', companyId, document.sourceOwnerId] });
      }
      toast.success('تم تغيير نوع المستند');
    } catch (error) {
      console.error('Error updating document type:', error);
      const message = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message || '')
          : '';
      if (message.includes('SIGNED_CONTRACT_REPLACEMENT_REQUIRED')) {
        toast.error('لا يمكن تغيير نوع آخر نسخة عقد موقعة أثناء الإجراء القانوني. ارفع النسخة البديلة أولاً.');
        return;
      }
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

  const groupedDocuments = React.useMemo(() => {
    const groups: Record<DocumentCategory, any[]> = {
      contract: [],
      license: [],
      identity: [],
      insurance: [],
      condition_report: [],
      receipt: [],
      violations: [],
      other: [],
    };
    documents.forEach((doc) => {
      groups[getCategory(doc.document_type)].push(doc);
    });
    return (Object.keys(groups) as DocumentCategory[])
      .filter((key) => groups[key].length > 0)
      .map((key) => ({ category: key, items: groups[key] }));
  }, [documents]);

  const conditionReportDocs = React.useMemo(
    () => documents.filter((d) => d.document_type === 'condition_report'),
    [documents]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-[#22C7A1]" />
      </div>
    );
  }

  if (documentsError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
        <h3 className="mt-3 font-black text-rose-950">تعذر التحقق من مستندات العقد</h3>
        <p className="mt-1 text-sm leading-6 text-rose-800">
          لم يعتبر النظام فشل التحميل دليلاً على أن المستندات ناقصة. أعد المحاولة لاستكمال التحقق.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 gap-2 border-rose-300 bg-white"
          onClick={() => void refetchDocuments()}
        >
          <RefreshCw className="h-4 w-4" />
          إعادة تحميل المستندات
        </Button>
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
        <motion.div variants={fadeInUp} className="rounded-2xl border border-[#FB6B7A]/30 bg-[#FFF5F6] p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#BE123C]" />
              <span className="text-sm font-bold text-[#BE123C]">
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
          <div className="mt-2 text-xs text-[#BE123C]/80">
            اضغط على زر "إعادة المحاولة" بجانب الخطوات الفاشلة أعلاه
          </div>
        </motion.div>
      )}
      
      {/* Documents Panel */}
      <motion.div
        variants={fadeInUp}
        className="rounded-2xl border border-[#E5EAF1] bg-white shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]"
      >
        {/* Panel header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ECFDF9] text-[#0E9E7E]">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Documents</p>
              <h3 className="text-sm font-black text-[#0F172A]">مستندات العقد</h3>
            </div>
            <Badge variant="secondary" className="mr-1 rounded-full bg-white text-[10px] font-bold text-slate-500">
              {documents.length} مستند
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {idProposals.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setIsProposalsOpen(true)}
                className="gap-2 rounded-lg border-[#F59E0B]/30 bg-[#FFFBEB] text-[#B45309] hover:bg-[#FFFBEB]"
              >
                <IdCard className="h-4 w-4" />
                مقترحات البطاقة
                <Badge className="bg-[#B45309] text-white hover:bg-[#B45309]">
                  {idProposals.length}
                </Badge>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => scanDocumentsForId.mutate()}
              disabled={scanDocumentsForId.isPending}
              className="gap-2 rounded-lg border-[#22C7A1]/30 bg-[#ECFDF9] text-[#0E9E7E] hover:bg-[#ECFDF9]"
            >
              {scanDocumentsForId.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <IdCard className="h-4 w-4" />
              )}
              فحص البطاقات
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsScannerOpen(true)}
              className="gap-2 rounded-lg border-[#22C7A1]/30 bg-[#ECFDF9] text-[#0E9E7E] hover:bg-[#ECFDF9]"
            >
              <ScanLine className="h-4 w-4" />
              مسح العقد بالكاميرا
            </Button>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="gap-2 rounded-lg bg-[#22C7A1] text-white hover:bg-[#0E9E7E]"
            >
              <Plus className="w-4 h-4" />
              إضافة مستند
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* Upload zone */}
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#E5EAF1] bg-[#F6F8FB] px-6 py-10 text-center transition-colors hover:border-[#22C7A1] hover:bg-[#ECFDF9]/40"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#22C7A1] shadow-sm transition-transform group-hover:scale-105">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-black text-[#0F172A]">اسحب المستندات هنا أو انقر للرفع</p>
              <p className="mt-1 text-xs text-slate-500">PDF، صور، أو أي ملف آخر — سيتم تصنيفه تلقائياً</p>
            </div>
          </button>

          {documents.length === 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {['العقد الموقع', 'رخصة القيادة', 'الهوية', 'تقرير الحالة'].map((placeholder, idx) => (
                <motion.div
                  key={idx}
                  variants={scaleIn}
                  whileHover={{ y: -4 }}
                  onClick={() => setIsDialogOpen(true)}
                  className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5EAF1] bg-[#F6F8FB] text-slate-400 transition-colors hover:border-[#22C7A1] hover:text-[#0E9E7E]"
                >
                  <FileText className="mb-2 h-10 w-10" />
                  <p className="text-xs font-bold">{placeholder}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {groupedDocuments.map(({ category, items }) => {
                const meta = categoryMeta[category];
                return (
                  <div key={category}>
                    <div className="mb-3 flex items-center gap-2">
                      <div className={cn('flex h-6 w-6 items-center justify-center rounded-md', meta.tint)}>
                        {meta.icon}
                      </div>
                      <span className="text-xs font-black text-[#0F172A]">{meta.label}</span>
                      <span className="text-[10px] font-bold text-slate-400">{items.length}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((document) => {
                        const fileMeta = getFileTypeMeta(document);
                        return (
                          <motion.div
                            key={document.id}
                            variants={scaleIn}
                            whileHover={{ y: -2 }}
                            onClick={() => {
                              if (document.document_type === 'condition_report' && document.condition_report_id) {
                                handleViewConditionReport(document.condition_report_id);
                              } else if (document.file_path) {
                                handlePreviewDocument(document);
                              }
                            }}
                            className="group relative cursor-pointer rounded-2xl border border-[#E5EAF1] bg-white p-3 transition-colors hover:border-[#22C7A1]/50 hover:shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', fileMeta.tint)}>
                                {fileMeta.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="truncate text-xs font-black text-[#0F172A]" title={document.document_name}>
                                    {document.document_name}
                                  </p>
                                  {document.is_required && (
                                    <Badge variant="destructive" className="h-5 shrink-0 px-1.5 text-[10px]">
                                      مطلوب
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                                  <span>{formatFileSize(document.file_size) || '—'}</span>
                                  <span className="text-slate-300">•</span>
                                  <span>{document.uploaded_at ? format(new Date(document.uploaded_at), 'dd/MM/yyyy') : '-'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3">
                              <Select
                                value={document.document_type}
                                onValueChange={(value) => {
                                  handleChangeDocumentType(document, value);
                                }}
                              >
                                <SelectTrigger
                                  className="h-6 max-w-full border-[#E5EAF1] px-2 text-[10px]"
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
                            </div>

                            {/* Actions — always visible (touch-friendly) */}
                            <div className="mt-3 flex items-center gap-2 border-t border-[#E5EAF1] pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 flex-1 gap-1 border-[#E5EAF1] bg-white text-xs text-[#0F172A] hover:bg-[#F6F8FB]"
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
                                <Eye className="h-3.5 w-3.5" />
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
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 border-[#FB6B7A]/30 p-0 text-[#BE123C] hover:bg-[#FFF5F6]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(document);
                                }}
                                disabled={deleteDocument.isPending}
                                aria-label={`حذف ${document.document_name}`}
                                title="حذف"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Condition report section */}
      {conditionReportDocs.length > 0 && (
        <motion.div
          variants={fadeInUp}
          className="rounded-2xl border border-[#E5EAF1] bg-white shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]"
        >
          <div className="flex items-center gap-3 border-b border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ECFDF9] text-[#0E9E7E]">
              <Car className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Condition Reports</p>
              <h3 className="text-sm font-black text-[#0F172A]">تقارير حالة المركبة</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {conditionReportDocs.map((document) => (
              <motion.div
                key={document.id}
                variants={scaleIn}
                whileHover={{ y: -2 }}
                onClick={() => {
                  if (document.condition_report_id) {
                    handleViewConditionReport(document.condition_report_id);
                  }
                }}
                className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-[#E5EAF1] bg-white p-3 transition-colors hover:border-[#22C7A1]/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF9] text-[#0E9E7E]">
                  <Car className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-[#0F172A]" title={document.document_name}>
                    {document.document_name}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#22C7A1]" />
                      تقرير حالة
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>{document.uploaded_at ? format(new Date(document.uploaded_at), 'dd/MM/yyyy') : '-'}</span>
                  </div>
                </div>
                <Eye className="h-4 w-4 text-slate-300 transition-colors group-hover:text-[#0E9E7E]" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

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
                        src={selectedDocumentForPreview.preview_url || getContractDocumentPublicUrl(selectedDocumentForPreview.sourceBucket, selectedDocumentForPreview.file_path)}
                        className="w-full h-[600px]"
                        title="معاينة PDF"
                      />
                    ) : selectedDocumentForPreview.mime_type?.includes('image') ? (
                      <div className="flex justify-center p-4">
                        <LazyImage
                          src={selectedDocumentForPreview.preview_url || getContractDocumentPublicUrl(selectedDocumentForPreview.sourceBucket, selectedDocumentForPreview.file_path)}
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
        <AlertDialogContent data-tour="contract-document-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription data-tour="contract-document-delete-warning">
              هل أنت متأكد من حذف «{documentToDelete?.document_name || 'هذا المستند'}»؟
              {documentToDelete?.sourceType === 'customer' && (
                <span className="mt-2 block font-bold text-amber-700">
                  هذا مستند مشترك من ملف العميل، وسيُحذف من ملف العميل وجميع العقود التي تعرضه.
                </span>
              )}
              {documentToDelete?.sourceType === 'vehicle' && (
                <span className="mt-2 block font-bold text-amber-700">
                  هذا مستند مشترك من ملف المركبة، وسيُحذف من ملف المركبة وجميع العقود التي تعرضه.
                </span>
              )}
              <span className="mt-2 block">لا يمكن التراجع عن هذا الإجراء.</span>
            </AlertDialogDescription>
            <Button
              type="button"
              variant="outline"
              onClick={() => startTour('contract-document-delete')}
              className="mt-2 h-9 w-fit gap-2 rounded-lg border-emerald-200 bg-emerald-50 font-bold text-emerald-700 hover:bg-emerald-100"
              data-tour="contract-document-delete-tour-start"
            >
              <PlayCircle className="h-4 w-4" />
              ابدأ الجولة التعريفية
            </Button>
          </AlertDialogHeader>
          <AlertDialogFooter data-tour="contract-document-delete-actions">
            <AlertDialogCancel disabled={deleteDocument.isPending}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteDocument.isPending}>
              {deleteDocument.isPending ? 'جارٍ الحذف…' : 'حذف المستند'}
            </AlertDialogAction>
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
      <SignedContractScannerDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onSubmit={handleSignedContractScan}
        isSubmitting={createDocument.isPending}
      />
      <CustomerIdProposalsDialog
        contractId={contractId}
        open={isProposalsOpen}
        onOpenChange={setIsProposalsOpen}
      />
    </div>
  );
}
