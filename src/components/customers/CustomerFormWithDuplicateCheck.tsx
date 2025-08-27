import React, { useState, useEffect } from 'react';
import { useCustomerDuplicateCheck, CustomerData } from '@/hooks/useCustomerDuplicateCheck';
import { DuplicateCustomerDialog } from './DuplicateCustomerDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface CustomerFormWithDuplicateCheckProps {
  customerData: CustomerData;
  onDuplicateDetected?: (hasDuplicates: boolean) => void;
  onProceedWithDuplicates?: () => void;
  children: React.ReactNode;
  enableRealTimeCheck?: boolean;
  excludeCustomerId?: string;
}

export const CustomerFormWithDuplicateCheck: React.FC<CustomerFormWithDuplicateCheckProps> = ({
  customerData,
  onDuplicateDetected,
  onProceedWithDuplicates,
  children,
  enableRealTimeCheck = true,
  excludeCustomerId
}) => {
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showInlineWarning, setShowInlineWarning] = useState(false);

  // Debounce the customer data to avoid too many API calls
  const debouncedCustomerData = useDebounce(customerData, 500);

  const { data: duplicateCheck, isLoading } = useCustomerDuplicateCheck(
    debouncedCustomerData,
    enableRealTimeCheck,
    excludeCustomerId
  );

  useEffect(() => {
    if (duplicateCheck) {
      setShowInlineWarning(duplicateCheck.has_duplicates);
      if (onDuplicateDetected) {
        onDuplicateDetected(duplicateCheck.has_duplicates);
      }
    }
  }, [duplicateCheck, onDuplicateDetected]);

  const handleViewDuplicates = () => {
    setShowDuplicateDialog(true);
  };

  const handleProceedAnyway = () => {
    setShowInlineWarning(false);
    if (onProceedWithDuplicates) {
      onProceedWithDuplicates();
    }
  };

  return (
    <div className="space-y-4">
      {showInlineWarning && duplicateCheck?.has_duplicates && (
        <Alert className="border-warning bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-foreground">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">
                تم العثور على {duplicateCheck.count} عميل(عملاء) مشابه(ين) في النظام
              </span>
              <button
                type="button"
                onClick={handleViewDuplicates}
                className="text-sm underline hover:no-underline font-medium text-primary hover:text-primary/80"
              >
                عرض التفاصيل
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {children}

      {duplicateCheck?.has_duplicates && (
        <DuplicateCustomerDialog
          open={showDuplicateDialog}
          onOpenChange={setShowDuplicateDialog}
          duplicates={duplicateCheck.duplicates}
          onProceedAnyway={handleProceedAnyway}
          allowProceed={true}
        />
      )}
    </div>
  );
};