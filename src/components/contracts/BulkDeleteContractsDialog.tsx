import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useBulkDeleteContracts } from '@/hooks/useBulkDeleteContracts';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';

interface BulkDeleteContractsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCompanyId?: string;
}

export const BulkDeleteContractsDialog: React.FC<BulkDeleteContractsDialogProps> = ({
  open,
  onOpenChange,
  targetCompanyId
}) => {
  const [confirmationText, setConfirmationText] = React.useState('');
  const [step, setStep] = React.useState<'warning' | 'processing' | 'completed'>('warning');
  
  const { companyId, browsedCompany, isBrowsingMode } = useUnifiedCompanyAccess();
  const { bulkDeleteContracts, progress, resetProgress } = useBulkDeleteContracts();
  const { logAudit } = useAuditLog();
  
  const actualCompanyId = targetCompanyId || companyId;
  const companyName = isBrowsingMode && browsedCompany ? browsedCompany.name : 'الشركة الحالية';

  // Get contracts count for the target company
  const { data: contractsInfo, isLoading: isLoadingInfo, error: contractsError } = useQuery({
    queryKey: ['contracts-count', actualCompanyId],
    queryFn: async () => {
      if (!actualCompanyId) {
        console.warn('🔍 [BULK_DELETE_CONTRACTS] No company ID provided');
        return null;
      }
      
      console.log('🔍 [BULK_DELETE_CONTRACTS] Querying contracts for company:', actualCompanyId);
      
      const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_number, customer_id')
        .eq('company_id', actualCompanyId);
      
      console.log('🔍 [BULK_DELETE_CONTRACTS] Query result:', { 
        data: data?.length || 0, 
        error: error?.message,
        actualCompanyId 
      });
      
      if (error) {
        console.error('🔍 [BULK_DELETE_CONTRACTS] Query error:', error);
        throw error;
      }
      
      // Count unique customers
      const uniqueCustomers = new Set(data?.map(c => c.customer_id) || []).size;
      
      const result = {
        total: data?.length || 0,
        uniqueCustomers,
        contracts: data || []
      };
      
      console.log('🔍 [BULK_DELETE_CONTRACTS] Final result:', result);
      return result;
    },
    enabled: open && !!actualCompanyId,
    retry: 1,
    staleTime: 0 // Always fetch fresh data
  });

  const requiredConfirmationText = 'حذف جميع العقود';
  const isConfirmationValid = confirmationText.trim() === requiredConfirmationText;

  React.useEffect(() => {
    if (!open) {
      setStep('warning');
      setConfirmationText('');
      resetProgress();
    }
  }, [open]);

  const handleConfirmDelete = async () => {
    if (!isConfirmationValid) return;
    
    setStep('processing');
    try {
      await bulkDeleteContracts.mutateAsync(actualCompanyId);
      
      // Log audit trail
      await logAudit({
        action: 'DELETE',
        resource_type: 'contract',
        entity_name: `Bulk delete all contracts for ${companyName}`,
        changes_summary: `Deleted ${contractsInfo?.total || 0} contracts`,
        metadata: {
          company_id: actualCompanyId,
          total_deleted: contractsInfo?.total || 0,
          unique_customers: contractsInfo?.uniqueCustomers || 0,
        },
        severity: 'critical',
      });
      
      setStep('completed');
    } catch (error) {
      setStep('warning');
      console.error('Bulk delete failed:', error);
      
      // Log failed attempt
      await logAudit({
        action: 'DELETE',
        resource_type: 'contract',
        entity_name: `Failed bulk delete for ${companyName}`,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        severity: 'high',
      });
    }
  };

  const handleClose = () => {
    if (step === 'processing') return; // Prevent closing during processing
    onOpenChange(false);
  };

  const progressPercentage = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            حذف جميع العقود
          </DialogTitle>
          <DialogDescription>
            {step === 'warning' && 'عملية خطيرة! سيتم حذف جميع العقود نهائياً'}
            {step === 'processing' && 'جاري حذف العقود...'}
            {step === 'completed' && 'اكتملت عملية الحذف'}
          </DialogDescription>
        </DialogHeader>

        {step === 'warning' && (
          <div className="space-y-4">
            {/* Company Info */}
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">الشركة:</span>
                    <Badge variant="outline">{companyName}</Badge>
                  </div>
                  
                  {isLoadingInfo ? (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 animate-spin" />
                      <span className="text-sm">جاري تحميل معلومات العقود...</span>
                    </div>
                   ) : contractsError ? (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        خطأ في تحميل العقود: {contractsError.message}
                      </AlertDescription>
                    </Alert>
                  ) : contractsInfo ? (
                    contractsInfo.total > 0 ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">عدد العقود:</span>
                          <Badge variant="destructive">{contractsInfo.total} عقد</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">عدد العملاء المرتبطين:</span>
                          <Badge variant="outline">{contractsInfo.uniqueCustomers} عميل</Badge>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          لا توجد عقود في هذه الشركة
                        </div>
                        <div className="text-xs text-muted-foreground">
                          لا يمكن تنفيذ عملية الحذف الجماعي
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-center text-muted-foreground">
                      لا توجد عقود للحذف
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Warning Messages */}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">تحذير شديد!</p>
                  <div className="text-sm space-y-1">
                    <div>• سيتم حذف جميع العقود نهائياً ولا يمكن التراجع</div>
                    <div>• سيتم حذف جميع البيانات المرتبطة (الفواتير، جداول الدفع، التقارير)</div>
                    <div>• هذه العملية قد تستغرق عدة دقائق</div>
                    <div>• تأكد من وجود نسخة احتياطية من البيانات</div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Confirmation Input */}
            <div className="space-y-2">
              <Label htmlFor="confirmation">
                اكتب "{requiredConfirmationText}" للتأكيد:
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={requiredConfirmationText}
                className={isConfirmationValid ? 'border-destructive' : ''}
              />
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>تقدم العملية</span>
                <span>{progress.processed} / {progress.total}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="text-sm font-medium">{progress.currentStep}</div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">محذوف</span>
                      </div>
                      <div className="text-lg font-bold text-green-600">{progress.deleted}</div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">معالج</span>
                      </div>
                      <div className="text-lg font-bold text-blue-600">{progress.processed}</div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium">فاشل</span>
                      </div>
                      <div className="text-lg font-bold text-red-600">{progress.failed}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {progress.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">أخطاء العملية:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {progress.errors.slice(0, 5).map((error, index) => (
                        <div key={index} className="text-xs">
                          {error.error}
                        </div>
                      ))}
                      {progress.errors.length > 5 && (
                        <div className="text-xs text-muted-foreground">
                          و {progress.errors.length - 5} أخطاء أخرى...
                        </div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'completed' && (
          <div className="space-y-4">
            <Alert variant={progress.failed === 0 ? 'default' : 'destructive'}>
              {progress.failed === 0 ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>
                {progress.failed === 0 ? (
                  <div>
                    <p className="font-semibold text-green-600">تم حذف جميع العقود بنجاح!</p>
                    <p className="text-sm">تم حذف {progress.deleted} عقد بنجاح</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold">اكتملت العملية مع بعض الأخطاء</p>
                    <p className="text-sm">تم حذف {progress.deleted} عقد، فشل {progress.failed} عقد</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {progress.errors.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">تفاصيل الأخطاء:</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {progress.errors.map((error, index) => (
                        <div key={index} className="text-xs text-muted-foreground">
                          {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'warning' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                إلغاء
              </Button>
              <PermissionGuard permission="DELETE_CONTRACT">
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={
                    !isConfirmationValid || 
                    isLoadingInfo || 
                    !contractsInfo?.total || 
                    !!contractsError
                  }
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  حذف جميع العقود
                </Button>
              </PermissionGuard>
            </>
          )}
          
          {step === 'processing' && (
            <Button disabled>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              جاري الحذف...
            </Button>
          )}
          
          {step === 'completed' && (
            <Button onClick={handleClose}>
              إغلاق
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};