import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Trash2, AlertTriangle, Database, ArrowRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartOfAccount } from '@/hooks/useChartOfAccounts';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { 
  useEnhancedAccountDeletion, 
  DeletionAnalysis, 
  DeletionOptions 
} from '@/hooks/useEnhancedAccountDeletion';

interface AccountDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: ChartOfAccount | null;
  onSuccess?: () => void;
}

const AccountDeleteConfirmDialog = ({ open, onOpenChange, account, onSuccess }: AccountDeleteConfirmDialogProps) => {
  const [deletionType, setDeletionType] = useState<'normal' | 'force_delete' | 'transfer'>('normal');
  const [transferToAccountId, setTransferToAccountId] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<DeletionAnalysis | null>(null);
  
  console.log('[DELETE_DIALOG_RENDER] Enhanced dialog rendered with:', {
    open,
    account: account ? {
      id: account.id,
      code: account.account_code,
      name: account.account_name,
      isSystem: account.is_system,
      isActive: account.is_active
    } : null,
    deletionType,
    transferToAccountId,
    analysisData: !!analysisData
  });
  
  const { data: accountsData } = useChartOfAccounts();
  const { 
    analyzeAccount, 
    deleteAccount, 
    isAnalyzing, 
    isDeleting,
    analysisData: hookAnalysisData,
    analysisError,
    deletionError
  } = useEnhancedAccountDeletion();

  // Fetch analysis when dialog opens
  useEffect(() => {
    if (open && account?.id && !isAnalyzing) {
      console.log('[DELETE_DIALOG] Fetching enhanced analysis for account:', account.id);
      analyzeAccount.mutate(account.id);
    }
  }, [open, account?.id]);

  // Update local analysis data when hook data changes
  useEffect(() => {
    if (hookAnalysisData) {
      console.log('[DELETE_DIALOG] Analysis data received:', hookAnalysisData);
      setAnalysisData(hookAnalysisData);
    }
  }, [hookAnalysisData]);

  const handleDelete = async () => {
    if (!account?.id) return;

    console.log('[DELETE_DIALOG] Starting enhanced deletion process:', {
      accountId: account.id,
      deletionType,
      transferToAccountId,
      currentDeletionType: deletionType
    });

    const options: DeletionOptions = {};

    // Set deletion options based on type
    if (deletionType === 'force_delete') {
      options.force_delete = true;
    } else if (deletionType === 'transfer') {
      if (!transferToAccountId) {
        console.error('[DELETE_DIALOG] Transfer account not selected');
        return;
      }
      options.force_delete = true; // يحتاج force_delete ليتم النقل
      options.transfer_to_account_id = transferToAccountId;
    }
    // For normal deletion, no special options needed

    console.log('[DELETE_DIALOG] Options being passed:', options);

    try {
      await deleteAccount.mutateAsync({
        accountId: account.id,
        options
      });
      
      console.log('[DELETE_DIALOG] Enhanced deletion completed successfully');
      onSuccess?.();
    } catch (error) {
      console.error('[DELETE_DIALOG] Enhanced deletion failed:', error);
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-100 text-blue-800';
      case 'liability': return 'bg-red-100 text-red-800';
      case 'equity': return 'bg-green-100 text-green-800';
      case 'revenue': return 'bg-yellow-100 text-yellow-800';
      case 'expense': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTableDisplayName = (tableName: string) => {
    const tableNames: Record<string, string> = {
      'journal_entry_lines': 'قيود اليومية',
      'contracts': 'العقود',
      'payments': 'المدفوعات',
      'invoices': 'الفواتير',
      'customers': 'العملاء',
      'budget_items': 'بنود الميزانية',
      'customer_accounts': 'حسابات العملاء',
      'essential_account_mappings': 'ربط الحسابات الأساسية',
      'account_mappings': 'ربط الحسابات'
    };
    return tableNames[tableName] || tableName;
  };

  const availableAccounts = accountsData?.filter(acc => 
    acc.id !== account?.id && 
    acc.is_active && 
    !acc.is_header &&
    acc.account_level >= 4
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" style={{ zIndex: 9999 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            معالجة الحساب
            {account && (
              <Badge variant="outline" className="text-xs">
                {account.account_code}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {!account ? (
          <div className="py-8 text-center">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                لم يتم تحديد الحساب المراد حذفه. يرجى المحاولة مرة أخرى.
              </AlertDescription>
            </Alert>
          </div>
        ) : isAnalyzing ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="mr-2">جاري تحليل الحساب والبيانات المرتبطة...</span>
          </div>
        ) : analysisError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              فشل في تحليل الحساب: {analysisError.message}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Account Information */}
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Database className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{account.account_name}</span>
                  <Badge variant="outline">{account.account_code}</Badge>
                  {account.is_system && (
                    <Badge variant="destructive">حساب نظام</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {account.account_name_ar || account.account_name}
                </p>
              </div>
            </div>

            {/* Analysis Results */}
            {analysisData && (
              <div className="space-y-4">
                {!analysisData.can_delete ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">هذا الحساب يحتوي على بيانات مرتبطة:</p>
                        <div className="space-y-1">
                          {analysisData.linked_tables?.map((table) => (
                            <div key={table} className="flex items-center gap-2">
                              <span>{getTableDisplayName(table)}</span>
                              <Badge variant="secondary">
                                {analysisData.table_counts?.[table] || 0} سجل
                              </Badge>
                            </div>
                          )) || []}
                        </div>
                        {(analysisData.child_accounts_count || 0) > 0 && (
                          <p className="text-sm">
                            عدد الحسابات الفرعية: {analysisData.child_accounts_count}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                          {analysisData.message || 'يمكنك اختيار نقل البيانات إلى حساب آخر أو الحذف القسري.'}
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <Database className="h-4 w-4" />
                    <AlertDescription>
                      هذا الحساب آمن للحذف - لا توجد بيانات مرتبطة به.
                      {(analysisData.child_accounts_count || 0) > 0 && (
                        <span> سيتم حذف {analysisData.child_accounts_count} حساب فرعي معه.</span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {analysisData?.account_info?.is_system && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  تحذير: هذا حساب نظام. حذفه قد يؤثر على وظائف النظام الأساسية.
                </AlertDescription>
              </Alert>
            )}

            {/* Deletion Options */}
            <div className="space-y-4">
              <Label className="text-base font-medium">خيارات الحذف</Label>
              <RadioGroup 
                value={deletionType} 
                onValueChange={(value) => setDeletionType(value as 'normal' | 'force_delete' | 'transfer')}
              >
                {analysisData?.can_delete && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal" id="normal" />
                    <Label htmlFor="normal" className="cursor-pointer">
                      حذف عادي - آمن للحسابات بدون بيانات مرتبطة
                    </Label>
                  </div>
                )}
                
                {analysisData && !analysisData.can_delete && (
                  <>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="transfer" id="transfer" />
                      <Label htmlFor="transfer" className="cursor-pointer">
                        نقل البيانات إلى حساب آخر ثم حذف الحساب
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="force_delete" id="force_delete" />
                      <Label htmlFor="force_delete" className="cursor-pointer text-destructive">
                        حذف قسري (خطر - سيتم فقدان جميع البيانات المرتبطة)
                      </Label>
                    </div>
                  </>
                )}
              </RadioGroup>

              {/* Transfer Account Selection */}
              {deletionType === 'transfer' && (
                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <Label>اختر الحساب المراد النقل إليه:</Label>
                  <Select value={transferToAccountId} onValueChange={setTransferToAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر حساب..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          <div className="flex items-center gap-2">
                            <span>{acc.account_code}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span>{acc.account_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {deletionType === 'force_delete' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>تحذير خطير:</strong> سيتم حذف جميع البيانات المرتبطة بهذا الحساب نهائياً ولا يمكن استرجاعها.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Enhanced Preview Data */}
            {deletionType === 'transfer' && transferToAccountId && (
              <Alert>
                <ArrowRight className="h-4 w-4" />
                <AlertDescription>
                  سيتم نقل جميع البيانات المرتبطة إلى الحساب المحدد ثم حذف الحساب الحالي نهائياً.
                </AlertDescription>
              </Alert>
            )}

            {deletionType === 'normal' && analysisData?.can_delete && (
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  سيتم حذف الحساب نهائياً من قاعدة البيانات.
                  {(analysisData.child_accounts_count || 0) > 0 && (
                    <span> سيتم حذف {analysisData.child_accounts_count} حساب فرعي معه.</span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Separator />

        <div className="flex justify-end gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            إلغاء
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={
              isDeleting ||
              (deletionType === 'transfer' && !transferToAccountId) ||
              (deletionError !== null)
            }
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 ml-2" />
                {deletionType === 'normal' && 'حذف الحساب'}
                {deletionType === 'transfer' && 'نقل وحذف'}
                {deletionType === 'force_delete' && 'حذف قسري'}
              </>
            )}
          </Button>
        </div>

        {deletionError && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              خطأ في العملية: {deletionError.message}
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { AccountDeleteConfirmDialog };