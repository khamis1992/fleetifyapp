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
  const { deleteAccount, getAllAccountsDeletionPreview, deleteAllAccounts } = useEnhancedAccountDeletion();

  const isSuperAdmin = user?.roles?.includes('super_admin');
  const isValidConfirmation = confirmationInput === CONFIRMATION_TEXT;
  const hasSystemAccounts = previewData?.system_accounts > 0;
  const canProceed = isValidConfirmation && (!hasSystemAccounts || forceDeleteSystem);

  // Load preview data when dialog opens - initial load only
  useEffect(() => {
    if (open) {
      const loadPreview = async () => {
        try {
          console.log('[DELETE_ALL] Loading initial deletion preview');
          const preview = await getAllAccountsDeletionPreview.mutateAsync({
            forceDeleteSystem: false // Always start with false for initial load
          });
          console.log('[DELETE_ALL] Preview loaded:', preview);
          setPreviewData(preview);
        } catch (error: any) {
          console.error('[DELETE_ALL] Failed to load preview:', error);
          toast.error('فشل في تحميل معاينة الحذف: ' + error.message);
          onOpenChange(false);
        }
      };

      loadPreview();
    } else {
      // Reset state when dialog closes
      setConfirmationInput('');
      setForceDeleteSystem(false);
      setPreviewData(null);
      setCurrentStep(1);
      setIsDeleting(false);
      setDeletionProgress(0);
      setDeletionResults({ successful: [], failed: [], completed: false });
    }
  }, [open]); // Remove getAllAccountsDeletionPreview from dependencies

  // Reload preview when force delete option changes - separate effect without function in dependencies
  useEffect(() => {
    if (open && previewData) {
      const reloadPreview = async () => {
        try {
          console.log('[DELETE_ALL] Reloading preview with force_delete_system:', forceDeleteSystem);
          const preview = await getAllAccountsDeletionPreview.mutateAsync({
            forceDeleteSystem: forceDeleteSystem
          });
          setPreviewData(preview);
        } catch (error: any) {
          console.error('[DELETE_ALL] Failed to reload preview:', error);
          toast.error('فشل في إعادة تحميل معاينة الحذف: ' + error.message);
        }
      };

      reloadPreview();
    }
  }, [forceDeleteSystem]); // Only depend on forceDeleteSystem to avoid infinite loop

  const handleDeleteAll = async () => {
    if (!canProceed) return;

    setIsDeleting(true);
    setCurrentStep(3);
    setDeletionResults({ successful: [], failed: [], completed: false });
    
    try {
      console.log('[DELETE_ALL] Starting enhanced deletion process using unified system');
      
      const result = await deleteAllAccounts.mutateAsync({
        confirmationText: CONFIRMATION_TEXT,
        forceDeleteSystem: forceDeleteSystem
      });
      
      console.log('[DELETE_ALL] Delete all result:', result);
      
      // Parse results from the unified system
      const successful = result.success_details?.map((detail: any) => ({
        code: detail.account_code || 'Unknown',
        name: detail.account_name || 'Unknown'
      })) || [];
      
      const failed = result.error_details?.map((detail: any) => ({
        code: detail.account_code || 'Unknown',
        name: detail.account_name || 'Unknown',
        error: detail.error || 'خطأ غير معروف'
      })) || [];
      
      setDeletionResults({ successful, failed, completed: true });
      setDeletionProgress(100);
      
      // Show success message
      console.log('[DELETE_ALL] All accounts processed');
      toast.success(`تمت معالجة الحسابات: ${successful.length} تم حذفها، ${failed.length} فشل`);
      onSuccess?.();
      
    } catch (error: any) {
      console.error('[DELETE_ALL] Enhanced deletion process failed:', error);
      
      // Extract error details if available
      const errorMessage = error?.message || 'خطأ غير معروف في عملية الحذف';
      const failed = [{
        code: 'ALL',
        name: 'جميع الحسابات',
        error: errorMessage
      }];
      
      setDeletionResults({ 
        successful: [], 
        failed, 
        completed: true 
      });
      
      toast.error('فشل في عملية الحذف: ' + errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = isDeleting;

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

            {/* System Accounts Warning */}
            {hasSystemAccounts && (
              <Alert className="border-orange-500 bg-orange-50">
                <Shield className="h-4 w-4 text-orange-500" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium text-orange-800">
                      تم العثور على {previewData.system_accounts} حساب نظامي
                    </p>
                    <p className="text-orange-700 text-sm">
                      {previewData.warning_message}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Force Delete System Accounts Option */}
            {hasSystemAccounts && (
              <div className="space-y-3 p-4 border-2 border-red-200 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="force-delete-system"
                    checked={forceDeleteSystem}
                    onCheckedChange={(checked) => setForceDeleteSystem(checked as boolean)}
                  />
                  <Label
                    htmlFor="force-delete-system"
                    className="text-sm font-medium text-red-800 cursor-pointer flex items-center gap-2"
                  >
                    <Skull className="h-4 w-4" />
                    حذف الحسابات النظامية قسرياً (خطير جداً!)
                  </Label>
                </div>
                <Alert className="border-red-500 bg-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 text-sm">
                    <strong>تحذير شديد الخطورة:</strong> تفعيل هذا الخيار سيحذف الحسابات النظامية نهائياً! 
                    هذا قد يؤدي إلى عطل في النظام وفقدان البيانات المهمة. استخدم هذا الخيار فقط إذا كنت متأكداً تماماً 
                    وتخطط لإعادة بناء دليل الحسابات من الصفر.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <Database className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <div className="font-bold text-lg">{previewData.total_accounts}</div>
                <div className="text-sm text-muted-foreground">إجمالي الحسابات</div>
              </div>
              
              <div className="p-4 border rounded-lg text-center">
                <Trash2 className="h-6 w-6 mx-auto mb-2 text-red-500" />
                <div className="font-bold text-lg text-red-600">
                  {previewData.will_be_deleted}
                </div>
                <div className="text-sm text-muted-foreground">سيتم حذفها</div>
              </div>
              
              <div className="p-4 border rounded-lg text-center">
                <Archive className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                <div className="font-bold text-lg text-yellow-600">
                  {previewData.will_be_deactivated}
                </div>
                <div className="text-sm text-muted-foreground">سيتم إلغاء تفعيلها</div>
              </div>
              
              {hasSystemAccounts && (
                <div className="p-4 border rounded-lg text-center border-orange-200 bg-orange-50">
                  <Shield className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                  <div className="font-bold text-lg text-orange-600">
                    {previewData.system_accounts}
                  </div>
                  <div className="text-sm text-orange-700">حسابات نظام</div>
                </div>
              )}
            </div>

            {/* Regular Accounts Preview */}
            {previewData.sample_accounts && previewData.sample_accounts.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  الحسابات العادية التي ستحذف:
                  <Badge variant="outline">عينة من {previewData.sample_accounts.length}</Badge>
                </h4>
                
                <ScrollArea className="h-32 border rounded-lg">
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {previewData.sample_accounts.map((account: any, index: number) => (
                        <div 
                          key={index} 
                          className="p-2 rounded border border-red-200 bg-red-50 text-xs"
                        >
                          <div className="font-medium">{account.account_code}</div>
                          <div className="text-muted-foreground truncate">{account.account_name}</div>
                          <Badge variant="destructive" className="text-xs mt-1">
                            {account.action === 'will_be_deleted' ? 'سيتم حذفه' : 'حذف قسري'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* System Accounts Preview */}
            {previewData.system_accounts_sample && previewData.system_accounts_sample.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-orange-600">
                  <Shield className="h-4 w-4" />
                  الحسابات النظامية:
                  <Badge variant="outline" className="border-orange-300">
                    عينة من {previewData.system_accounts_sample.length}
                  </Badge>
                </h4>
                
                <ScrollArea className="h-32 border rounded-lg border-orange-200">
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {previewData.system_accounts_sample.map((account: any, index: number) => (
                        <div 
                          key={index} 
                          className={`p-2 rounded border text-xs ${
                            account.action === 'will_be_force_deleted' 
                              ? 'border-red-200 bg-red-50' 
                              : 'border-orange-200 bg-orange-50'
                          }`}
                        >
                          <div className="font-medium">{account.account_code}</div>
                          <div className="text-muted-foreground truncate">{account.account_name}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge 
                              variant={account.action === 'will_be_force_deleted' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {account.action === 'will_be_force_deleted' ? 'حذف قسري' : 'إلغاء تفعيل'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              نظامي
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </div>
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