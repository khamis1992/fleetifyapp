import { useEffect, useState, type FC } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Loader2, ShieldOff, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBulkDeleteCustomers } from '@/hooks/useBulkDeleteCustomers';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

interface BulkDeleteCustomersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCompanyId?: string;
}

const confirmationPhrase = 'تعطيل جميع العملاء';

export const BulkDeleteCustomersDialog: FC<BulkDeleteCustomersDialogProps> = ({
  open,
  onOpenChange,
  targetCompanyId,
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [completed, setCompleted] = useState(false);
  const { companyId, browsedCompany, isBrowsingMode } = useUnifiedCompanyAccess();
  const { bulkDeleteCustomers, progress, resetProgress } = useBulkDeleteCustomers();
  const actualCompanyId = targetCompanyId || companyId;
  const companyName = isBrowsingMode && browsedCompany ? browsedCompany.name : 'الشركة الحالية';

  const { data: activeCustomerCount = 0, isLoading } = useQuery({
    queryKey: ['active-customers-count', actualCompanyId],
    queryFn: async () => {
      if (!actualCompanyId) return 0;
      const { count, error } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', actualCompanyId)
        .eq('is_active', true);
      if (error) throw error;
      return count || 0;
    },
    enabled: open && Boolean(actualCompanyId),
  });

  useEffect(() => {
    if (!open) {
      setConfirmationText('');
      setCompleted(false);
      resetProgress();
    }
  }, [open]);

  const handleDeactivate = async () => {
    if (confirmationText.trim() !== confirmationPhrase || !actualCompanyId) return;
    await bulkDeleteCustomers.mutateAsync(actualCompanyId);
    setCompleted(true);
  };

  const progressPercentage = progress.total > 0
    ? (progress.processed / progress.total) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-amber-600" />
            تعطيل جميع العملاء
          </DialogTitle>
          <DialogDescription>
            سيتم إخفاء العملاء من العمليات الجديدة مع إبقاء العقود والفواتير والدفعات والمستندات محفوظة.
          </DialogDescription>
        </DialogHeader>

        {!completed && !bulkDeleteCustomers.isPending && (
          <div className="space-y-4">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">الشركة</span>
              <span className="font-medium">{companyName}</span>
              <span className="text-muted-foreground">العملاء النشطون</span>
              <span className="font-medium">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : activeCustomerCount}
              </span>
            </div>

            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                هذه العملية لا تحذف أي سجل مالي ويمكن إعادة تفعيل العميل لاحقًا.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="customer-deactivation-confirmation">
                اكتب &quot;{confirmationPhrase}&quot; للتأكيد
              </Label>
              <Input
                id="customer-deactivation-confirmation"
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
                placeholder={confirmationPhrase}
              />
            </div>
          </div>
        )}

        {bulkDeleteCustomers.isPending && (
          <div className="space-y-3 py-4">
            <div className="flex items-center justify-between text-sm">
              <span>{progress.currentStep}</span>
              <span>{progress.processed} / {progress.total}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {completed && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription>
              تم تعطيل {progress.deleted} عميل مع الحفاظ على جميع بياناتهم التاريخية.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {completed ? 'إغلاق' : 'إلغاء'}
          </Button>
          {!completed && (
            <Button
              onClick={handleDeactivate}
              disabled={
                bulkDeleteCustomers.isPending
                || isLoading
                || activeCustomerCount === 0
                || confirmationText.trim() !== confirmationPhrase
              }
            >
              {bulkDeleteCustomers.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldOff className="h-4 w-4" />
              )}
              تعطيل العملاء
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
