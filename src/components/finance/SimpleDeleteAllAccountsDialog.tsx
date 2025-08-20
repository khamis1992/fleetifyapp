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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Loader2, 
  AlertTriangle, 
  Trash2, 
  Skull,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useDirectBulkAccountDeletion, useDiagnoseAccountDeletionFailures, useCleanupAllReferences } from "@/hooks/useDirectAccountDeletion";
import { useChartOfAccounts, useDeleteAccount } from "@/hooks/useChartOfAccounts";
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  const { user } = useAuth();
  const { data: allAccounts, isLoading: accountsLoading } = useChartOfAccounts();
  const deleteAllAccounts = useDirectBulkAccountDeletion();
  const diagnoseFailures = useDiagnoseAccountDeletionFailures();
  const cleanupReferences = useCleanupAllReferences();
  const deleteSingleAccount = useDeleteAccount();

  const isSuperAdmin = user?.roles?.includes('super_admin');
  const isValidConfirmation = confirmationInput === CONFIRMATION_TEXT;
  const totalAccounts = allAccounts?.length || 0;
  const systemAccounts = allAccounts?.filter(acc => acc.is_system).length || 0;
  const regularAccounts = totalAccounts - systemAccounts;

  const handleDeleteSingle = async (accountId: string, accountCode: string) => {
    if (!accountId) return;
    
    setDeletingAccountId(accountId);
    
    try {
      console.log('[DELETE_SINGLE] حذف حساب منفرد:', { accountId, accountCode });
      
      await deleteSingleAccount.mutateAsync(accountId);
      
      toast.success(`تم حذف الحساب ${accountCode} بنجاح`);
      
    } catch (error: any) {
      console.error('[DELETE_SINGLE] فشل حذف الحساب:', error);
      toast.error(`فشل في حذف الحساب ${accountCode}: ${error.message}`);
    } finally {
      setDeletingAccountId(null);
    }
  };

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
        forceDeleteSystem: forceDeleteSystem
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
    setIsDeleting(false);
    setDeletionProgress(0);
    setShowResults(false);
    setResults(null);
    setDeletingAccountId(null);
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
                   
                   {/* زر تشخيص الأخطاء */}
                   {(results.error_count || 0) > 0 && (
                     <div className="mt-4">
                       <Button
                         variant="outline"
                         onClick={async () => {
                           try {
                             const diagnosis = await diagnoseFailures.mutateAsync();
                             console.log('🔍 تشخيص مفصل للأخطاء:', diagnosis);
                             
                              const summary = (diagnosis as any)?.analysis_summary;
                              let message = 'أسباب الفشل:\n';
                              if (summary?.vendor_account_issues > 0) {
                                message += `• ${summary.vendor_account_issues} حساب مرتبط بحسابات التجار\n`;
                              }
                              if (summary?.customer_account_issues > 0) {
                                message += `• ${summary.customer_account_issues} حساب مرتبط بحسابات العملاء\n`;
                              }
                              if (summary?.mapping_issues > 0) {
                                message += `• ${summary.mapping_issues} حساب مرتبط بتخصيصات الحسابات\n`;
                              }
                              if (summary?.maintenance_issues > 0) {
                                message += `• ${summary.maintenance_issues} حساب مرتبط بحسابات الصيانة\n`;
                              }
                             
                             toast.info(message);
                           } catch (error: any) {
                             toast.error('فشل في التشخيص: ' + error.message);
                           }
                         }}
                         disabled={diagnoseFailures.isPending}
                         className="w-full"
                       >
                         {diagnoseFailures.isPending ? (
                           <Loader2 className="h-4 w-4 animate-spin mr-2" />
                         ) : (
                           <AlertTriangle className="h-4 w-4 mr-2" />
                         )}
                         تشخيص أسباب الفشل
                       </Button>
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

                           {/* قائمة الحسابات مع أزرار الحذف المنفرد */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  قائمة الحسابات ({totalAccounts} حساب)
                </h4>
                
                <ScrollArea className="h-64 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رمز الحساب</TableHead>
                        <TableHead className="text-right">اسم الحساب</TableHead>
                        <TableHead className="text-center">النوع</TableHead>
                        <TableHead className="text-center">الحالة</TableHead>
                        <TableHead className="text-center">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allAccounts?.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-mono text-sm">
                            {account.account_code}
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <div className="font-medium">
                                {account.account_name_ar || account.account_name}
                              </div>
                              {account.account_name_ar && (
                                <div className="text-xs text-muted-foreground">
                                  {account.account_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs">
                                {account.account_type === 'asset' ? 'أصول' :
                                 account.account_type === 'liability' ? 'خصوم' :
                                 account.account_type === 'equity' ? 'حقوق ملكية' :
                                 account.account_type === 'revenue' ? 'إيرادات' :
                                 account.account_type === 'expense' ? 'مصروفات' :
                                 account.account_type}
                              </Badge>
                              {account.is_system && (
                                <Badge variant="destructive" className="text-xs">
                                  نظامي
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={account.is_active ? 'default' : 'secondary'}>
                              {account.is_active ? 'نشط' : 'غير نشط'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSingle(account.id, account.account_code)}
                              disabled={deletingAccountId === account.id || isDeleting}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deletingAccountId === account.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                
                <p className="text-sm text-muted-foreground">
                  💡 يمكنك حذف الحسابات واحد تلو الآخر، أو استخدام "حذف جميع الحسابات" أدناه
                </p>
              </div>

              {/* أدوات التحضير */}
              <div className="space-y-3 p-4 border rounded-lg bg-blue-50">
                <h4 className="font-semibold text-blue-800">أدوات التحضير (موصى بها قبل الحذف):</h4>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await cleanupReferences.mutateAsync();
                      } catch (error: any) {
                        console.error('فشل التنظيف:', error);
                      }
                    }}
                    disabled={cleanupReferences.isPending}
                    className="flex-1"
                  >
                    {cleanupReferences.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    تنظيف المراجع المعلقة
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const diagnosis = await diagnoseFailures.mutateAsync();
                        console.log('🔍 تشخيص شامل:', diagnosis);
                        
                         const summary = (diagnosis as any)?.analysis_summary;
                         let message = `تحليل ${(diagnosis as any)?.total_issues || 0} مشكلة:\n`;
                         message += `• ${summary?.vendor_account_issues || 0} مشكلة في حسابات التجار\n`;
                         message += `• ${summary?.customer_account_issues || 0} مشكلة في حسابات العملاء\n`;
                         message += `• ${summary?.mapping_issues || 0} مشكلة في ربط الحسابات\n`;
                         message += `• ${summary?.maintenance_issues || 0} مشكلة في حسابات الصيانة`;
                        
                        toast.info(message);
                      } catch (error: any) {
                        console.error('فشل التشخيص:', error);
                      }
                    }}
                    disabled={diagnoseFailures.isPending}
                    className="flex-1"
                  >
                    {diagnoseFailures.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mr-2" />
                    )}
                    تشخيص الحسابات
                  </Button>
                </div>
                
                <p className="text-sm text-blue-700">
                  💡 نصيحة: قم بتشغيل "تنظيف المراجع المعلقة" أولاً لتقليل أخطاء الحذف
                </p>
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
