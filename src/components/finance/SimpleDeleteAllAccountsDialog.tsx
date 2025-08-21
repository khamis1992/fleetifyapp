import React, { useState } from 'react';
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

import { 
  Loader2, 
  AlertTriangle, 
  Skull,
  CheckCircle,
  XCircle,
  Shield,
  ArrowRight,
  Trash2
} from "lucide-react";
import { useDirectBulkAccountDeletion, useDirectDeletionPreview } from "@/hooks/useDirectAccountDeletion";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AccountDeletionStats from "./AccountDeletionStats";

interface SimpleDeleteAllAccountsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CONFIRMATION_TEXT = "DELETE ALL ACCOUNTS PERMANENTLY";

export const SimpleDeleteAllAccountsDialog: React.FC<SimpleDeleteAllAccountsDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [forceDeleteSystem, setForceDeleteSystem] = useState(false);
  const [deletionMode, setDeletionMode] = useState<'soft' | 'auto' | 'force'>('soft');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  const { user } = useAuth();
  const { data: allAccounts, isLoading: accountsLoading } = useChartOfAccounts();
  const deleteAllAccounts = useDirectBulkAccountDeletion();
  const previewMutation = useDirectDeletionPreview();

  const isSuperAdmin = user?.roles?.includes('super_admin');
  const isValidConfirmation = confirmationInput === CONFIRMATION_TEXT;
  const totalAccounts = allAccounts?.length || 0;
  const systemAccounts = allAccounts?.filter(acc => acc.is_system).length || 0;
  const regularAccounts = totalAccounts - systemAccounts;

  const handleDeleteAll = async () => {
    if (!isValidConfirmation) {
      toast.error('يرجى كتابة نص التأكيد بشكل صحيح');
      return;
    }

    setIsDeleting(true);
    setDeletionProgress(0);
    setShowResults(false);

    try {
      console.log('[SIMPLE_DELETE_ALL] بدء عملية الحذف الجماعي');
      
      // محاكاة التقدم
      const progressInterval = setInterval(() => {
        setDeletionProgress(prev => {
          if (prev < 90) return prev + 10;
          return prev;
        });
      }, 500);

      const result = await deleteAllAccounts.mutateAsync({
        confirmationText: CONFIRMATION_TEXT,
        forceDeleteSystem: forceDeleteSystem,
        deletionMode: deletionMode
      });

      clearInterval(progressInterval);
      setDeletionProgress(100);
      
      console.log('[SIMPLE_DELETE_ALL] نتيجة الحذف:', result);
      
      setResults(result);
      setShowResults(true);
      
      if (result.success) {
        toast.success(result.message);
        onSuccess?.();
      }
      
    } catch (error: any) {
      console.error('[SIMPLE_DELETE_ALL] فشل الحذف:', error);
      setResults({
        success: false,
        error: error.message,
        deleted_count: 0,
        deactivated_count: 0,
        error_count: 1
      });
      setShowResults(true);
      toast.error('فشل في حذف الحسابات: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmationInput('');
    setForceDeleteSystem(false);
    setDeletionMode('soft');
    setIsDeleting(false);
    setDeletionProgress(0);
    setShowResults(false);
    setResults(null);
    onOpenChange(false);
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

        {accountsLoading ? (
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
        ) : showResults ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              {results?.success ? (
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              ) : (
                <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              )}
              
              <h3 className="text-lg font-semibold mb-2">
                {results?.success ? 'تمت العملية بنجاح' : 'فشلت العملية'}
              </h3>
              
              {results?.success ? (
                <div className="space-y-2">
                  <p className="text-green-600">{results.message}</p>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center">
                      <div className="font-bold text-lg text-red-600">{results.deleted_count || 0}</div>
                      <div className="text-sm">تم حذفها</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-yellow-600">{results.deactivated_count || 0}</div>
                      <div className="text-sm">تم إلغاء تفعيلها</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-blue-600">{results.total_processed || 0}</div>
                      <div className="text-sm">إجمالي المعالج</div>
                    </div>
                  </div>
                  
                  {/* معلومات إضافية */}
                  {(results.failed_count || 0) > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        ⚠️ فشل في معالجة {results.failed_count} حساب. قد تحتاج لمراجعة هذه الحسابات يدوياً.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-red-600">{results?.error || 'حدث خطأ غير معروف'}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-center">
              <Button onClick={handleClose}>
                إغلاق
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* إحصائيات الحذف */}
            <AccountDeletionStats
              totalAccounts={totalAccounts}
              deletedCount={results?.deleted_count || 0}
              deactivatedCount={results?.deactivated_count || 0}
              failedCount={results?.error_count || 0}
              systemAccounts={systemAccounts}
              isProcessing={isDeleting}
            />

            {/* تحذير خطير */}
            <Alert className="border-destructive bg-destructive/10">
              <Skull className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive font-medium">
                <strong>تحذير شديد الخطورة:</strong> هذه العملية ستحذف جميع الحسابات في دليل الحسابات! 
                الحسابات التي لا تحتوي على قيود محاسبية ستُحذف نهائياً ولا يمكن استرداجها.
              </AlertDescription>
            </Alert>

            {/* معلومات الحسابات */}
            <div className="space-y-3 p-4 border rounded-lg bg-blue-50">
              <h4 className="font-semibold text-blue-800">إحصائيات الحسابات:</h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">إجمالي الحسابات:</span>
                  <span className="mr-2">{totalAccounts}</span>
                </div>
                <div>
                  <span className="font-medium">الحسابات النظامية:</span>
                  <span className="mr-2">{systemAccounts}</span>
                </div>
                <div>
                  <span className="font-medium">الحسابات العادية:</span>
                  <span className="mr-2">{regularAccounts}</span>
                </div>
                <div>
                  <span className="font-medium">سيتم المعالجة:</span>
                  <span className="mr-2">{forceDeleteSystem ? totalAccounts : regularAccounts}</span>
                </div>
              </div>
              
              <p className="text-sm text-blue-700">
                💡 ملاحظة: الحسابات التي تحتوي على قيود محاسبية سيتم إلغاء تفعيلها فقط
              </p>
            </div>

            {/* خيارات نمط الحذف */}
            <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
              <h4 className="font-semibold text-blue-800">اختر نمط الحذف:</h4>
              
              <div className="space-y-2">
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    deletionMode === 'soft' ? 'border-blue-500 bg-blue-100' : 'border-gray-200 bg-white'
                  }`}
                  onClick={() => setDeletionMode('soft')}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">إلغاء التفعيل (آمن)</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    إخفاء الحسابات دون حذف البيانات - الخيار الأكثر أماناً
                  </p>
                </div>

                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    deletionMode === 'auto' ? 'border-yellow-500 bg-yellow-100' : 'border-gray-200 bg-white'
                  }`}
                  onClick={() => setDeletionMode('auto')}
                >
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">حذف ذكي (تلقائي)</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    يقرر النظام بذكاء: حذف الحسابات الفارغة وإلغاء تفعيل التي تحتوي على بيانات
                  </p>
                </div>

                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    deletionMode === 'force' ? 'border-red-500 bg-red-100' : 'border-gray-200 bg-white'
                  }`}
                  onClick={() => setDeletionMode('force')}
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="font-medium">حذف قسري (خطير!)</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    حذف جميع الحسابات والبيانات المرتبطة نهائياً - لا يمكن التراجع!
                  </p>
                </div>
              </div>
            </div>

            {/* خيار الحسابات النظامية */}
            {systemAccounts > 0 && (
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
                    <strong>تحذير:</strong> تفعيل هذا الخيار سيحذف الحسابات النظامية نهائياً!
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* تأكيد الحذف */}
            <div className="space-y-4">
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

            {/* تحذير أخير */}
            {isValidConfirmation && (
              <Alert className="border-destructive bg-destructive/5">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription>
                  <strong>تحذير أخير:</strong> بمجرد النقر على "حذف جميع الحسابات"، ستبدأ العملية فوراً.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            إلغاء
          </Button>
          
          {!showResults && (
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={isDeleting || !isValidConfirmation || accountsLoading}
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleDeleteAllAccountsDialog;