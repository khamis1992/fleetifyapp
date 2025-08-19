import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertTriangle, Trash2, Archive, FileX } from "lucide-react";
import { useAccountDeletionPreview, useCascadeDeleteAccount, useDeleteAccount } from "@/hooks/useChartOfAccounts";
import type { ChartOfAccount } from "@/hooks/useChartOfAccounts";
import { toast } from "sonner";

interface AccountDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: ChartOfAccount | null;
  onSuccess?: () => void;
}

export const AccountDeleteConfirmDialog: React.FC<AccountDeleteConfirmDialogProps> = ({
  open,
  onOpenChange,
  account,
  onSuccess,
}) => {
  const [deletionType, setDeletionType] = useState<'soft' | 'cascade'>('soft');
  const [forceDelete, setForceDelete] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  
  const previewMutation = useAccountDeletionPreview();
  const cascadeDeleteMutation = useCascadeDeleteAccount();
  const softDeleteMutation = useDeleteAccount();

  useEffect(() => {
    if (open && account) {
      previewMutation.mutate(account.id, {
        onSuccess: (data) => {
          setPreviewData(data);
        },
      });
    } else {
      setPreviewData(null);
      setDeletionType('soft');
      setForceDelete(false);
    }
  }, [open, account]);

  const handleDelete = async () => {
    if (!account || !deletionType) return;

    console.log('🗑️ [DELETE_DIALOG] Starting deletion:', { 
      accountId: account.id, 
      accountName: account.account_name,
      deletionType, 
      forceDelete 
    });

    try {
      if (deletionType === 'cascade') {
        console.log('🗑️ [DELETE_DIALOG] Performing cascade deletion...');
        await cascadeDeleteMutation.mutateAsync({
          accountId: account.id,
          forceDelete
        });
      } else {
        console.log('🗑️ [DELETE_DIALOG] Performing soft deletion...');
        await softDeleteMutation.mutateAsync(account.id);
      }
      
      console.log('✅ [DELETE_DIALOG] Deletion successful');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('❌ [DELETE_DIALOG] Delete error:', error);
      toast.error(`خطأ في حذف الحساب: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  };

  const isLoading = cascadeDeleteMutation.isPending || softDeleteMutation.isPending;
  const hasChildren = previewData?.total_children > 0;
  const canDeletePermanently = previewData?.can_delete_permanently;

  const getAccountTypeColor = (accountType: string) => {
    const colors = {
      assets: 'bg-blue-500/10 text-blue-700 border-blue-200',
      liabilities: 'bg-red-500/10 text-red-700 border-red-200',
      equity: 'bg-purple-500/10 text-purple-700 border-purple-200',
      revenue: 'bg-green-500/10 text-green-700 border-green-200',
      expenses: 'bg-orange-500/10 text-orange-700 border-orange-200',
    };
    return colors[accountType as keyof typeof colors] || 'bg-gray-500/10 text-gray-700 border-gray-200';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            حذف الحساب
          </DialogTitle>
        </DialogHeader>

        {previewMutation.isPending ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="mr-2">جاري تحليل الحساب...</span>
          </div>
        ) : previewData && account ? (
          <div className="space-y-4">
            {/* Account Info */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{account.account_name}</h3>
                <Badge className={getAccountTypeColor(account.account_type)}>
                  {account.account_type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                كود الحساب: {account.account_code} | المستوى: {account.account_level}
              </p>
              {previewData.account.is_system && (
                <Badge variant="outline" className="mt-2 text-yellow-700 border-yellow-300">
                  حساب نظام
                </Badge>
              )}
            </div>

            {/* Deletion Options */}
            <div className="space-y-3">
              <h4 className="font-medium">نوع الحذف:</h4>
              
              <div className="space-y-3">
                {/* Soft Delete Option */}
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    deletionType === 'soft' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setDeletionType('soft')}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="deletionType"
                      checked={deletionType === 'soft'}
                      onChange={() => setDeletionType('soft')}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Archive className="h-4 w-4" />
                        <span className="font-medium">حذف مؤقت (إلغاء تفعيل)</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        سيتم إخفاء الحساب مع الحفاظ على البيانات. يمكن إعادة تفعيله لاحقاً.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cascade Delete Option */}
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    deletionType === 'cascade' 
                      ? 'border-destructive bg-destructive/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setDeletionType('cascade')}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="deletionType"
                      checked={deletionType === 'cascade'}
                      onChange={() => setDeletionType('cascade')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        <span className="font-medium">حذف كامل مع الفروع</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        حذف الحساب وجميع الحسابات الفرعية. الحسابات التي لها قيود ستحذف مؤقتاً، والباقي نهائياً.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Children Preview */}
            {hasChildren && deletionType === 'cascade' && (
              <div className="space-y-2">
                <h4 className="font-medium text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  الحسابات الفرعية التي ستتأثر ({previewData.total_children}):
                </h4>
                <ScrollArea className="h-32 border rounded-lg">
                  <div className="p-3 space-y-2">
                    {previewData.child_accounts?.map((child: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{child.account_code} - {child.account_name}</span>
                        <Badge variant={child.has_transactions ? "secondary" : "destructive"}>
                          {child.has_transactions ? "حذف مؤقت" : "حذف نهائي"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* System Account Warning */}
            {previewData.account.is_system && deletionType === 'cascade' && (
              <div className="space-y-3">
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    هذا حساب نظام. حذفه قد يؤثر على وظائف النظام.
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="forceDelete"
                    checked={forceDelete}
                    onCheckedChange={(checked) => setForceDelete(!!checked)}
                  />
                  <label htmlFor="forceDelete" className="text-sm text-destructive font-medium">
                    أؤكد أنني أريد حذف حساب النظام رغم التحذير
                  </label>
                </div>
              </div>
            )}

            {/* Warning Messages */}
            {deletionType === 'cascade' && (
              <Alert className="border-destructive/50 bg-destructive/5">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription>
                  <strong>تحذير:</strong> الحذف الكامل لا يمكن التراجع عنه للحسابات التي لا تحتوي على قيود محاسبية.
                  تأكد من صحة قرارك قبل المتابعة.
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
            onClick={handleDelete}
            disabled={
              isLoading || 
              !previewData || 
              (previewData.account.is_system && deletionType === 'cascade' && !forceDelete)
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري الحذف...
              </>
            ) : (
              <>
                {deletionType === 'soft' ? (
                  <Archive className="h-4 w-4 ml-2" />
                ) : (
                  <Trash2 className="h-4 w-4 ml-2" />
                )}
                {deletionType === 'soft' ? 'إلغاء تفعيل' : 'حذف نهائي'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};