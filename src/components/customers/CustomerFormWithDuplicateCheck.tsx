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
    console.log('🔄 [DUPLICATE_CHECK_UI] Duplicate check result changed:', {
      duplicateCheck,
      hasDuplicates: duplicateCheck?.has_duplicates,
      count: duplicateCheck?.count,
      customerData: debouncedCustomerData,
      excludeCustomerId,
      isLoading
    });
    
    if (duplicateCheck && !isLoading) {
      // تأكد من أن التكرارات المكتشفة لا تتضمن العميل الحالي إذا كان في وضع التعديل
      const validDuplicates = duplicateCheck.duplicates?.filter(duplicate => 
        !excludeCustomerId || duplicate.id !== excludeCustomerId
      ) || [];
      
      const hasValidDuplicates = validDuplicates.length > 0;
      
      console.log('🔄 [DUPLICATE_CHECK_UI] Filtered duplicates:', {
        originalCount: duplicateCheck.duplicates?.length || 0,
        validCount: validDuplicates.length,
        hasValidDuplicates,
        excludeCustomerId,
        showInlineWarning
      });
      
      // Only show warning if there are actual valid duplicates
      const shouldShowWarning = hasValidDuplicates && enableRealTimeCheck;
      setShowInlineWarning(shouldShowWarning);
      
      if (onDuplicateDetected) {
        onDuplicateDetected(hasValidDuplicates);
      }
    } else if (!isLoading && duplicateCheck && !duplicateCheck.has_duplicates) {
      // Clear warnings when no duplicates found
      console.log('✅ [DUPLICATE_CHECK_UI] No duplicates found, clearing warnings');
      setShowInlineWarning(false);
      if (onDuplicateDetected) {
        onDuplicateDetected(false);
      }
    }
  }, [duplicateCheck, onDuplicateDetected, debouncedCustomerData, excludeCustomerId, isLoading, enableRealTimeCheck]);

  const handleViewDuplicates = () => {
    setShowDuplicateDialog(true);
  };

  const handleProceedAnyway = () => {
    console.log('✅ [DUPLICATE_CHECK] User chose to proceed with duplicates');
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
                تم العثور على {duplicateCheck.duplicates?.filter(d => !excludeCustomerId || d.id !== excludeCustomerId).length || 0} عميل(عملاء) مشابه(ين) في النظام
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleViewDuplicates}
                  className="text-sm underline hover:no-underline font-medium text-primary hover:text-primary/80"
                >
                  عرض التفاصيل
                </button>
                <button
                  type="button"
                  onClick={handleProceedAnyway}
                  className="text-sm underline hover:no-underline font-medium text-warning hover:text-warning/80"
                >
                  المتابعة رغم ذلك
                </button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {children}

      {duplicateCheck?.has_duplicates && (
        <DuplicateCustomerDialog
          open={showDuplicateDialog}
          onOpenChange={setShowDuplicateDialog}
          duplicates={duplicateCheck.duplicates?.filter(d => !excludeCustomerId || d.id !== excludeCustomerId) || []}
          onProceedAnyway={handleProceedAnyway}
          allowProceed={true}
        />
      )}
    </div>
  );
};