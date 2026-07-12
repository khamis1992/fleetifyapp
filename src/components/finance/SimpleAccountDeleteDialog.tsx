import { useEffect, useState, type FC } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Shield, ShieldOff } from 'lucide-react';
import {
  useSimpleAccountAnalysis,
  useSimpleAccountDeletion,
  type SimpleAccountAnalysis,
} from '@/hooks/useSimpleAccountDeletion';

interface SimpleAccountDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
  accountCode: string;
}

export const SimpleAccountDeleteDialog: FC<SimpleAccountDeleteDialogProps> = ({
  isOpen,
  onClose,
  accountId,
  accountName,
  accountCode,
}) => {
  const [analysis, setAnalysis] = useState<SimpleAccountAnalysis | null>(null);
  const analyzeAccount = useSimpleAccountAnalysis();
  const disableAccount = useSimpleAccountDeletion();

  useEffect(() => {
    if (!isOpen || !accountId) return;

    setAnalysis(null);
    analyzeAccount.mutate(accountId, {
      onSuccess: (result) => setAnalysis(result),
    });
  }, [isOpen, accountId]);

  const handleClose = () => {
    setAnalysis(null);
    onClose();
  };

  const handleDisable = async () => {
    await disableAccount.mutateAsync({ accountId, deletionMode: 'soft' });
    handleClose();
  };

  const hasDependencies = Boolean(
    analysis?.has_journal_entries
    || analysis?.has_child_accounts
    || analysis?.has_fixed_assets
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-amber-600" />
            تعطيل الحساب {accountCode}
          </DialogTitle>
        </DialogHeader>

        {analyzeAccount.isPending && (
          <div className="flex items-center justify-center gap-3 py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>جاري فحص الارتباطات المالية...</span>
          </div>
        )}

        {analyzeAccount.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{analyzeAccount.error.message}</AlertDescription>
          </Alert>
        )}

        {analysis && (
          <div className="space-y-4">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">الحساب</span>
              <span className="font-medium">{accountName}</span>
              <span className="text-muted-foreground">النوع</span>
              <span><Badge variant="outline">{analysis.account_info.type}</Badge></span>
              <span className="text-muted-foreground">قيود محاسبية</span>
              <span>{analysis.journal_entries_count}</span>
              <span className="text-muted-foreground">حسابات فرعية</span>
              <span>{analysis.child_accounts_count}</span>
              <span className="text-muted-foreground">أصول ثابتة</span>
              <span>{analysis.fixed_assets_count}</span>
            </div>

            <Alert variant={hasDependencies ? 'destructive' : 'default'}>
              {hasDependencies ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              <AlertDescription>
                سيتم تعطيل الحساب فقط. لن تُحذف أو تُنقل القيود أو الأصول أو الدفعات المرتبطة به.
              </AlertDescription>
            </Alert>

            {analysis.account_info.is_system && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>هذا حساب نظامي ولا يمكن تعطيله.</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <div className="flex w-full gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              إلغاء
            </Button>
            <Button
              onClick={handleDisable}
              disabled={!analysis || analysis.account_info.is_system || disableAccount.isPending}
              className="flex-1"
            >
              {disableAccount.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldOff className="h-4 w-4" />
              )}
              تعطيل الحساب
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleAccountDeleteDialog;
