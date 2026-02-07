// @ts-nocheck
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { RentalPaymentReceipt } from '@/hooks/useRentalPayments';

interface DeleteReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: RentalPaymentReceipt | null;
  onConfirm: () => void;
  isDeleting: boolean;
}

const DeleteReceiptDialog: React.FC<DeleteReceiptDialogProps> = ({
  open,
  onOpenChange,
  receipt,
  onConfirm,
  isDeleting,
}) => {
  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            تأكيد حذف الإيصال
          </DialogTitle>
          <DialogDescription>
            هل أنت متأكد من حذف هذا الإيصال؟ لا يمكن التراجع عن هذا الإجراء.
          </DialogDescription>
        </DialogHeader>

        {receipt && (
          <div className="space-y-3 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">العميل:</span>
                <span className="font-semibold">{receipt.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">الشهر:</span>
                <span className="font-semibold">{receipt.month}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">المبلغ:</span>
                <span className="font-bold text-primary">
                  {(receipt.total_paid || 0).toLocaleString('en-US')} ريال
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">تاريخ الدفع:</span>
                <span className="font-semibold">
                  {receipt.payment_date && !isNaN(new Date(receipt.payment_date).getTime())
                    ? format(new Date(receipt.payment_date), 'dd MMMM yyyy', { locale: ar })
                    : 'تاريخ غير متاح'
                  }
                </span>
              </div>
            </div>

            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                <strong>تحذير:</strong> بعد حذف الإيصال، سيتم إضافة الشهر إلى قائمة الأشهر غير المدفوعة.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري الحذف...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 ml-2" />
                حذف الإيصال
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteReceiptDialog;
