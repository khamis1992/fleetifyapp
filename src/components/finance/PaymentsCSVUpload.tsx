import { SmartCSVUpload } from "@/components/csv/SmartCSVUpload";
import { PaymentPreviewDialog } from "@/components/csv/PaymentPreviewDialog";
import { usePaymentsCSVUpload } from "@/hooks/usePaymentsCSVUpload";
import { useState } from "react";

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

  const handleUploadWithPreview = async (data: any[], options: any = {}) => {
    // First, get preview data
    const result = await smartUploadPayments(data, { ...options, previewMode: true });
    
    if (result.previewData) {
      setPreviewData(result.previewData);
      setShowPreview(true);
      return result;
    }
    
    // Fallback to direct upload
    return smartUploadPayments(data, options);
  };

  const handleConfirmUpload = async (selectedItems: any[]) => {
    setIsProcessing(true);
    try {
      const dataToUpload = selectedItems.map(item => item.data);
      const result = await smartUploadPayments(dataToUpload);
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

  return (
    <>
      <SmartCSVUpload
        open={open && !showPreview}
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
    </>
  );
}
