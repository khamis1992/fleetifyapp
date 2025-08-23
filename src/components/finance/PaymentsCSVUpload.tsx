import { SmartCSVUpload } from "@/components/csv/SmartCSVUpload";
import { PaymentPreviewDialog } from "@/components/csv/PaymentPreviewDialog";
import { CSVDiagnostics } from "@/components/csv/CSVDiagnostics";
import { usePaymentsCSVUpload } from "@/hooks/usePaymentsCSVUpload";
import { useState } from "react";
import { toast } from "sonner";

interface PaymentsCSVUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export function PaymentsCSVUpload({ open, onOpenChange, onUploadComplete }: PaymentsCSVUploadProps) {
  const {
    smartUploadPayments,
    downloadTemplate,
    analyzePaymentData,
    paymentFieldTypes,
    paymentRequiredFields,
  } = usePaymentsCSVUpload();

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);

  const handleUploadWithPreview = async (data: any[], options: any = {}) => {
    console.log('📤 بدء رفع البيانات للمعاينة:', { dataLength: data.length, options });
    
    try {
      // First, get preview data
      const result = await smartUploadPayments(data, { ...options, previewMode: true });
      
      console.log('📊 نتيجة المعاينة:', {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        hasPreviewData: !!result.previewData,
        previewDataLength: result.previewData?.length || 0,
        errors: result.errors?.length || 0
      });
      
      if (result.previewData && result.previewData.length > 0) {
        setPreviewData(result.previewData);
        setShowPreview(true);
        return result;
      } else {
        console.warn('⚠️ لا توجد بيانات معاينة صحيحة');
        
        // Prepare diagnostics data
        const diagnostics = {
          totalRows: result.total || 0,
          validRows: result.successful || 0,
          rejectedRows: result.failed || 0,
          columnMapping: data.length > 0 ? data[0] : {},
          missingColumns: ['payment_date', 'amount'],
          detectedColumns: data.length > 0 ? Object.keys(data[0]) : [],
          commonErrors: result.errors?.map((error: any) => ({
            type: 'حقول مطلوبة مفقودة',
            count: 1,
            description: error.message
          })) || []
        };
        
        setDiagnosticsData(diagnostics);
        setShowDiagnostics(true);
        
        // Show detailed error information
        if (result.errors && result.errors.length > 0) {
          console.error('❌ أخطاء في البيانات:', result.errors);
          toast.error(`فشل في تحليل البيانات: ${result.errors.length} خطأ`);
        } else {
          toast.error('لا توجد بيانات صحيحة للمعاينة. تأكد من وجود الأعمدة المطلوبة: payment_date, amount');
        }
        
        return result;
      }
    } catch (error) {
      console.error('❌ خطأ في معالجة البيانات:', error);
      toast.error(`خطأ في معالجة البيانات: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
      throw error;
    }
  };

  const handleConfirmUpload = async (
    selectedItems: any[], 
    balanceHandling: 'ignore' | 'record_debt' | 'create_invoice'
  ) => {
    setIsProcessing(true);
    try {
      const dataToUpload = selectedItems.map(item => item.data);
      const result = await smartUploadPayments(dataToUpload, { 
        balanceHandling 
      });
      setShowPreview(false);
      onUploadComplete();
      return result;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreviewData([]);
  };

  const handleRetry = () => {
    setShowDiagnostics(false);
    setDiagnosticsData(null);
  };

  const downloadErrorReport = () => {
    if (!diagnosticsData?.commonErrors?.length) return;
    const headers = ['خطأ', 'الوصف', 'عدد المرات'];
    const rows = diagnosticsData.commonErrors.map((e: any) => [e.type, e.description, e.count]);
    const csv = [
      headers.join(','),
      ...rows.map((arr: any[]) => arr.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'payment_upload_errors.csv';
    link.click();
  };

  return (
    <>
      <SmartCSVUpload
        open={open && !showPreview && !showDiagnostics}
        onOpenChange={onOpenChange}
        onUploadComplete={onUploadComplete}
        entityType="payment"
        uploadFunction={handleUploadWithPreview}
        downloadTemplate={downloadTemplate}
        fieldTypes={paymentFieldTypes}
        requiredFields={paymentRequiredFields}
      />
      
      <PaymentPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        items={previewData}
        onConfirm={handleConfirmUpload}
        onCancel={handleCancelPreview}
        isProcessing={isProcessing}
      />

      {showDiagnostics && diagnosticsData && (
        <dialog 
          open={showDiagnostics} 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowDiagnostics(false)}
        >
          <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto p-6 w-full">
            <CSVDiagnostics
              diagnostics={diagnosticsData}
              onDownloadErrorReport={downloadErrorReport}
              onRetry={handleRetry}
            />
          </div>
        </dialog>
      )}
    </>
  );
}
