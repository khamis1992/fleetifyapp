import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  AlertTriangle, 
  Trash2, 
  Archive, 
  Shield, 
  Database,
  Skull,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";
import { useEnhancedAccountDeletion } from "@/hooks/useEnhancedAccountDeletion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface DeleteAllAccountsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CONFIRMATION_TEXT = "DELETE ALL ACCOUNTS PERMANENTLY";

export const DeleteAllAccountsDialog: React.FC<DeleteAllAccountsDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [forceDeleteSystem, setForceDeleteSystem] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState(0);
  const [deletionResults, setDeletionResults] = useState<{
    successful: Array<{code: string, name: string}>;
    failed: Array<{code: string, name: string, error: string}>;
    completed: boolean;
  }>({ successful: [], failed: [], completed: false });
  const { user } = useAuth();
  
  const { data: allAccounts } = useChartOfAccounts();
  const { analyzeAccount, deleteAccount } = useEnhancedAccountDeletion();

  const isSuperAdmin = user?.roles?.includes('super_admin');
  const isValidConfirmation = confirmationInput === CONFIRMATION_TEXT;
  const canProceed = isValidConfirmation && (previewData?.summary?.system_accounts === 0 || forceDeleteSystem);

  useEffect(() => {
    if (open && allAccounts) {
      // Create preview data from all accounts
      const systemAccounts = allAccounts.filter(acc => acc.is_system);
      const regularAccounts = allAccounts.filter(acc => !acc.is_system);
      
      setPreviewData({
        summary: {
          total_accounts: allAccounts.length,
          system_accounts: systemAccounts.length,
          will_be_deleted_permanently: regularAccounts.length,
          will_be_deleted_soft: 0
        },
        preview_accounts: allAccounts.slice(0, 50).map(acc => ({
          account_code: acc.account_code,
          account_name: acc.account_name,
          is_system: acc.is_system,
          deletion_type: acc.is_system ? 'soft' : 'permanent'
        })),
        showing_sample: allAccounts.length > 50
      });
    } else if (!open) {
      // Reset state when dialog closes
      setConfirmationInput('');
      setForceDeleteSystem(false);
      setPreviewData(null);
      setCurrentStep(1);
      setIsDeleting(false);
      setDeletionProgress(0);
      setDeletionResults({ successful: [], failed: [], completed: false });
    }
  }, [open, allAccounts]);

  const handleDeleteAll = async () => {
    if (!canProceed || !allAccounts) return;

    setIsDeleting(true);
    setCurrentStep(3);
    setDeletionResults({ successful: [], failed: [], completed: false });
    
    try {
      console.log('[DELETE_ALL] Starting enhanced deletion process for all accounts');
      
      // Get root accounts (those without parents) first
      const rootAccounts = allAccounts.filter(acc => !acc.parent_account_id);
      const totalAccounts = rootAccounts.length;
      let processedCount = 0;
      const successful: Array<{code: string, name: string}> = [];
      const failed: Array<{code: string, name: string, error: string}> = [];

      console.log(`[DELETE_ALL] Found ${totalAccounts} root accounts to delete`);

      for (const account of rootAccounts) {
        console.log(`[DELETE_ALL] Processing account ${account.account_code}`);
        
        try {
          // Use force delete for all accounts
          const result = await deleteAccount.mutateAsync({
            accountId: account.id,
            options: { force_delete: true }
          });
          
          console.log(`[DELETE_ALL] Successfully deleted account ${account.account_code}:`, result);
          successful.push({ 
            code: account.account_code, 
            name: account.account_name 
          });
          
        } catch (error: any) {
          console.error(`[DELETE_ALL] Failed to delete account ${account.account_code}:`, error);
          failed.push({ 
            code: account.account_code, 
            name: account.account_name, 
            error: error?.message || 'خطأ غير معروف'
          });
        }
        
        processedCount++;
        setDeletionProgress((processedCount / totalAccounts) * 100);
      }
      
      // Update results
      setDeletionResults({ successful, failed, completed: true });
      
      // Show appropriate message based on results
      if (failed.length === 0) {
        console.log('[DELETE_ALL] All accounts deleted successfully');
        toast.success(`تم حذف جميع الحسابات بنجاح (${successful.length} حساب)`);
        onSuccess?.();
        onOpenChange(false);
      } else if (successful.length === 0) {
        console.log('[DELETE_ALL] All deletions failed');
        toast.error(`فشل في حذف جميع الحسابات (${failed.length} حساب)`);
      } else {
        console.log('[DELETE_ALL] Partial success');
        toast.warning(`تم حذف ${successful.length} حساب بنجاح، فشل في حذف ${failed.length} حساب`);
      }
      
    } catch (error: any) {
      console.error('[DELETE_ALL] Enhanced deletion process failed:', error);
      toast.error('فشل في عملية الحذف: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = isDeleting;
  const hasSystemAccounts = previewData?.summary?.system_accounts > 0;

  const getStepStatus = (step: number) => {
    if (currentStep > step) return 'completed';
    if (currentStep === step) return 'active';
    return 'pending';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Skull className="h-5 w-5" />
            حذف جميع الحسابات - عملية خطيرة
          </DialogTitle>
        </DialogHeader>

        {!allAccounts ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin ml-2" />
            <span>جاري تحميل الحسابات...</span>
          </div>
        ) : isDeleting ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin ml-2" />
              <span>جاري حذف الحسابات...</span>
            </div>
            <Progress value={deletionProgress} className="w-full" />
            <p className="text-center text-sm text-muted-foreground">
              تم الانتهاء من {Math.round(deletionProgress)}%
            </p>
          </div>
        ) : deletionResults.completed ? (
          <div className="space-y-6">
            {/* Deletion Results */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold text-lg">نتائج عملية الحذف</h3>
              </div>
              
              {/* Results Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg text-center border-green-200 bg-green-50">
                  <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <div className="font-bold text-lg text-green-600">
                    {deletionResults.successful.length}
                  </div>
                  <div className="text-sm text-green-700">تم حذفها بنجاح</div>
                </div>
                
                <div className="p-4 border rounded-lg text-center border-red-200 bg-red-50">
                  <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                  <div className="font-bold text-lg text-red-600">
                    {deletionResults.failed.length}
                  </div>
                  <div className="text-sm text-red-700">فشل في حذفها</div>
                </div>
                
                <div className="p-4 border rounded-lg text-center">
                  <Database className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <div className="font-bold text-lg">
                    {deletionResults.successful.length + deletionResults.failed.length}
                  </div>
                  <div className="text-sm text-muted-foreground">إجمالي المعالج</div>
                </div>
              </div>

              {/* Failed Deletions Details */}
              {deletionResults.failed.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-red-600 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    الحسابات التي فشل حذفها ({deletionResults.failed.length}):
                  </h4>
                  
                  <ScrollArea className="h-64 border rounded-lg border-red-200">
                    <div className="p-4 space-y-2">
                      {deletionResults.failed.map((account, index) => (
                        <div 
                          key={index}
                          className="p-3 border border-red-200 bg-red-50 rounded text-sm"
                        >
                          <div className="font-medium text-red-800">
                            {account.code} - {account.name}
                          </div>
                          <div className="text-red-600 mt-1">
                            <strong>السبب:</strong> {account.error}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Successful Deletions */}
              {deletionResults.successful.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-green-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    الحسابات المحذوفة بنجاح ({deletionResults.successful.length}):
                  </h4>
                  
                  <ScrollArea className="h-32 border rounded-lg border-green-200">
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {deletionResults.successful.map((account, index) => (
                          <div 
                            key={index}
                            className="p-2 border border-green-200 bg-green-50 rounded text-xs"
                          >
                            <div className="font-medium text-green-800">
                              {account.code} - {account.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeletionResults({ successful: [], failed: [], completed: false });
                    setCurrentStep(1);
                  }}
                >
                  إعادة المحاولة
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                >
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        ) : previewData ? (
          <div className="space-y-6">
            {/* Progress Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  getStepStatus(1) === 'completed' ? 'bg-green-500 text-white' :
                  getStepStatus(1) === 'active' ? 'bg-blue-500 text-white' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {getStepStatus(1) === 'completed' ? <CheckCircle className="h-3 w-3" /> : '1'}
                </div>
                <span className="text-sm">معاينة</span>
              </div>
              <div className="flex-1 h-px bg-gray-300 mx-2" />
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  getStepStatus(2) === 'completed' ? 'bg-green-500 text-white' :
                  getStepStatus(2) === 'active' ? 'bg-blue-500 text-white' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {getStepStatus(2) === 'completed' ? <CheckCircle className="h-3 w-3" /> : '2'}
                </div>
                <span className="text-sm">تأكيد</span>
              </div>
              <div className="flex-1 h-px bg-gray-300 mx-2" />
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  getStepStatus(3) === 'completed' ? 'bg-red-500 text-white' :
                  getStepStatus(3) === 'active' ? 'bg-red-500 text-white' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {getStepStatus(3) === 'completed' ? <CheckCircle className="h-3 w-3" /> : '3'}
                </div>
                <span className="text-sm">حذف</span>
              </div>
            </div>

            {/* Critical Warning */}
            <Alert className="border-destructive bg-destructive/10">
              <Skull className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive font-medium">
                <strong>تحذير شديد الخطورة:</strong> هذه العملية ستحذف جميع الحسابات في دليل الحسابات! 
                الحسابات التي لا تحتوي على قيود محاسبية ستُحذف نهائياً ولا يمكن استرداجها.
              </AlertDescription>
            </Alert>

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <Database className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <div className="font-bold text-lg">{previewData.summary.total_accounts}</div>
                <div className="text-sm text-muted-foreground">إجمالي الحسابات</div>
              </div>
              
              <div className="p-4 border rounded-lg text-center">
                <Trash2 className="h-6 w-6 mx-auto mb-2 text-red-500" />
                <div className="font-bold text-lg text-red-600">
                  {previewData.summary.will_be_deleted_permanently}
                </div>
                <div className="text-sm text-muted-foreground">حذف نهائي</div>
              </div>
              
              <div className="p-4 border rounded-lg text-center">
                <Archive className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                <div className="font-bold text-lg text-yellow-600">
                  {previewData.summary.will_be_deleted_soft}
                </div>
                <div className="text-sm text-muted-foreground">حذف مؤقت</div>
              </div>
              
              {hasSystemAccounts && (
                <div className="p-4 border rounded-lg text-center border-orange-200 bg-orange-50">
                  <Shield className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                  <div className="font-bold text-lg text-orange-600">
                    {previewData.summary.system_accounts}
                  </div>
                  <div className="text-sm text-orange-700">حسابات نظام</div>
                </div>
              )}
            </div>

            {/* Preview Table */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Database className="h-4 w-4" />
                معاينة الحسابات التي ستتأثر:
                {previewData.showing_sample && (
                  <Badge variant="outline">عرض أول 50 حساب</Badge>
                )}
              </h4>
              
              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {previewData.preview_accounts?.map((account: any, index: number) => (
                      <div 
                        key={index} 
                        className={`p-2 rounded border text-xs ${
                          account.deletion_type === 'permanent' 
                            ? 'border-red-200 bg-red-50' 
                            : 'border-yellow-200 bg-yellow-50'
                        }`}
                      >
                        <div className="font-medium">{account.account_code}</div>
                        <div className="text-muted-foreground truncate">{account.account_name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <Badge 
                            variant={account.deletion_type === 'permanent' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {account.deletion_type === 'permanent' ? 'حذف نهائي' : 'حذف مؤقت'}
                          </Badge>
                          {account.is_system && (
                            <Shield className="h-3 w-3 text-orange-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* System Accounts Warning */}
            {hasSystemAccounts && (
              <Alert className="border-orange-200 bg-orange-50">
                <Shield className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>تحذير حسابات النظام:</strong> يوجد {previewData.summary.system_accounts} حساب نظام.
                  حذف هذه الحسابات قد يؤثر على وظائف النظام الأساسية.
                  {!isSuperAdmin && " (متاح للمدير العام فقط)"}
                </AlertDescription>
              </Alert>
            )}

            {/* Confirmation Input */}
            <div className="space-y-4">
              <Separator />
              <h4 className="font-semibold text-destructive">تأكيد الحذف:</h4>
              <p className="text-sm text-muted-foreground">
                لتأكيد حذف جميع الحسابات، يرجى كتابة النص التالي بالضبط:
              </p>
              <div className="p-3 bg-muted rounded border font-mono text-center">
                {CONFIRMATION_TEXT}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmation">اكتب النص أعلاه للتأكيد:</Label>
                <Input
                  id="confirmation"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder="DELETE ALL ACCOUNTS PERMANENTLY"
                  className={`font-mono ${
                    confirmationInput && !isValidConfirmation 
                      ? 'border-destructive' 
                      : isValidConfirmation 
                      ? 'border-green-500' 
                      : ''
                  }`}
                />
                {confirmationInput && !isValidConfirmation && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    النص غير صحيح
                  </p>
                )}
                {isValidConfirmation && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    تم التأكيد
                  </p>
                )}
              </div>
            </div>

            {/* System Accounts Override */}
            {hasSystemAccounts && isSuperAdmin && (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="forceSystem"
                    checked={forceDeleteSystem}
                    onCheckedChange={(checked) => setForceDeleteSystem(!!checked)}
                  />
                  <label htmlFor="forceSystem" className="text-sm text-destructive font-medium">
                    أؤكد حذف حسابات النظام أيضاً (خطير جداً - قد يعطل النظام)
                  </label>
                </div>
              </div>
            )}

            {/* Final Warning */}
            {isValidConfirmation && (
              <Alert className="border-destructive bg-destructive/5">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription>
                  <strong>تحذير أخير:</strong> بمجرد النقر على "حذف جميع الحسابات"، ستبدأ العملية فوراً.
                  الحسابات التي ليس بها قيود محاسبية ستُحذف نهائياً ولا يمكن استرداجها!
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          
          <Button
            variant="destructive"
            onClick={handleDeleteAll}
            disabled={isLoading || !canProceed}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري الحذف...
              </>
            ) : (
              <>
                <Skull className="h-4 w-4 ml-2" />
                حذف جميع الحسابات نهائياً
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};