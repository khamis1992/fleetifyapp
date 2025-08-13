import { SmartCSVUpload } from "@/components/csv/SmartCSVUpload";
import { usePaymentsCSVUpload } from "@/hooks/usePaymentsCSVUpload";

interface PaymentsCSVUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export function PaymentsCSVUpload({ open, onOpenChange, onUploadComplete }: PaymentsCSVUploadProps) {
  const {
    smartUploadPayments,
    downloadTemplate,
    paymentFieldTypes,
    paymentRequiredFields,
  } = usePaymentsCSVUpload();

  return (
    <SmartCSVUpload
      open={open}
      onOpenChange={onOpenChange}
      onUploadComplete={onUploadComplete}
      entityType="payment"
      uploadFunction={smartUploadPayments}
      downloadTemplate={downloadTemplate}
      fieldTypes={paymentFieldTypes}
      requiredFields={paymentRequiredFields}
    />
  );
}
