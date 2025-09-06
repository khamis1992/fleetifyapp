import * as React from 'react';
import type { DuplicateContract } from '@/hooks/useContractDuplicateCheck';
import { useContractDuplicateCheck, ContractData } from '@/hooks/useContractDuplicateCheck';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, FileText, User, Calendar } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ContractFormWithDuplicateCheckProps {
  contractData: ContractData;
  onDuplicateDetected?: (hasDuplicates: boolean) => void;
  onProceedWithDuplicates?: () => void;
  children: React.ReactNode;
  enableRealTimeCheck?: boolean;
}

export const ContractFormWithDuplicateCheck: React.FC<ContractFormWithDuplicateCheckProps> = ({
  contractData,
  onDuplicateDetected,
  onProceedWithDuplicates,
  children,
  enableRealTimeCheck = true
}) => {
  const [showDuplicateDialog, setShowDuplicateDialog] = React.useState(false);
  const [showInlineWarning, setShowInlineWarning] = React.useState(false);
  const [forceProceed, setForceProceed] = React.useState(false);

  // Debounce the contract data to avoid too many API calls
  const debouncedContractData = useDebounce(contractData, 500);

  const { data: duplicateCheck, isLoading } = useContractDuplicateCheck(
    debouncedContractData,
    enableRealTimeCheck
  );

  React.useEffect(() => {
    console.log('🔄 [CONTRACT_DUPLICATE_CHECK_UI] Duplicate check result changed:', {
      duplicateCheck,
      hasDuplicates: duplicateCheck?.has_duplicates,
      count: duplicateCheck?.count,
      contractData: debouncedContractData
    });
    
    if (duplicateCheck) {
      const hasValidDuplicates = duplicateCheck.has_duplicates && !forceProceed;
      
      console.log('🔄 [CONTRACT_DUPLICATE_CHECK_UI] Filtered duplicates:', {
        originalCount: duplicateCheck.duplicates?.length || 0,
        hasValidDuplicates,
        forceProceed
      });
      
      setShowInlineWarning(hasValidDuplicates);
      if (onDuplicateDetected) {
        onDuplicateDetected(hasValidDuplicates);
      }
    }
  }, [duplicateCheck, onDuplicateDetected, debouncedContractData, forceProceed]);

  const handleViewDuplicates = () => {
    setShowDuplicateDialog(true);
  };

  const handleProceedAnyway = () => {
    setForceProceed(true);
    setShowInlineWarning(false);
    if (onProceedWithDuplicates) {
      onProceedWithDuplicates();
    }
  };

  // Reset forceProceed when contract data changes
  React.useEffect(() => {
    setForceProceed(false);
  }, [debouncedContractData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">جاري التحقق من التكرار...</div>
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showInlineWarning && duplicateCheck?.has_duplicates && (
        <Alert className="border-warning bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-foreground">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">
                تم العثور على {duplicateCheck.duplicates?.length || 0} عقد(عقود) مشابه(ة) في النظام
              </span>
              <button
                type="button"
                onClick={handleViewDuplicates}
                className="text-sm underline hover:no-underline font-medium text-primary hover:text-primary/80"
              >
                عرض التفاصيل
              </button>
            </div>
            {duplicateCheck.duplicates && duplicateCheck.duplicates.length > 0 && (
              <div className="mt-2 text-sm">
                <ul className="list-disc list-inside">
                  {duplicateCheck.duplicates.slice(0, 3).map((dup, index) => (
                    <li key={index}>
                      العقد رقم: {dup.contract_number} - العميل: {dup.customer_name}
                    </li>
                  ))}
                  {duplicateCheck.duplicates.length > 3 && (
                    <li>... و{duplicateCheck.duplicates.length - 3} عقود إضافية</li>
                  )}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {children}

      {duplicateCheck?.has_duplicates && (
        <DuplicateContractDialog
          open={showDuplicateDialog}
          onOpenChange={setShowDuplicateDialog}
          duplicates={duplicateCheck.duplicates || []}
          onProceedAnyway={handleProceedAnyway}
        />
      )}
    </div>
  );
};

interface DuplicateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: DuplicateContract[];
  onProceedAnyway?: () => void;
}

const DuplicateContractDialog: React.FC<DuplicateContractDialogProps> = ({
  open,
  onOpenChange,
  duplicates,
  onProceedAnyway
}) => {
  const handleProceed = () => {
    if (onProceedAnyway) {
      onProceedAnyway();
    }
    onOpenChange(false);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ar });
    } catch {
      return dateString;
    }
  };

  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case 'daily_rental': return 'إيجار يومي';
      case 'weekly_rental': return 'إيجار أسبوعي';
      case 'monthly_rental': return 'إيجار شهري';
      case 'yearly_rental': return 'إيجار سنوي';
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            تم العثور على عقود مشابهة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-muted-foreground">
            تم العثور على {duplicates.length} عقد(عقود) مشابه(ة) في النظام. يرجى مراجعة البيانات قبل المتابعة.
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {duplicates.map((duplicate, index) => (
              <div key={`${duplicate.id}-${index}`} className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium">{duplicate.contract_number}</span>
                  </div>
                  <Badge variant={duplicate.status === 'active' ? 'default' : 'secondary'}>
                    {duplicate.status === 'active' ? 'نشط' : 'معلق'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <User className="h-4 w-4" />
                  <span>{duplicate.customer_name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>النوع: {getContractTypeLabel(duplicate.contract_type)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>من: {formatDate(duplicate.start_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>إلى: {formatDate(duplicate.end_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">المبلغ: {duplicate.contract_amount.toLocaleString()} د.ك</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-warning text-sm font-medium mb-1">
              <AlertTriangle className="h-4 w-4" />
              تحذير
            </div>
            <div className="text-sm text-muted-foreground">
              يمكنك المتابعة مع إنشاء العقد على الرغم من وجود بيانات مشابهة، لكن ننصح بمراجعة العقود الموجودة أولاً.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          
          <Button 
            variant="destructive" 
            onClick={handleProceed}
            className="bg-warning hover:bg-warning/90"
          >
            متابعة على أي حال
          </Button>
          
          <Button variant="default" onClick={() => onOpenChange(false)}>
            مراجعة العقود الموجودة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};