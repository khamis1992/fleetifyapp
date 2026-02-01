import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useDeleteContract } from '@/hooks/useDeleteContract';
import { NumberDisplay } from '@/components/ui/NumberDisplay';
import { formatCustomerName } from '@/utils/formatCustomerName';

interface ContractDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
  onSuccess?: () => void;
}

export const ContractDeleteDialog: React.FC<ContractDeleteDialogProps> = ({
  open,
  onOpenChange,
  contract,
  onSuccess
}) => {
  const deleteContract = useDeleteContract();

  const handleDelete = async () => {
    if (!contract?.id) return;

    try {
      await deleteContract.mutateAsync(contract.id);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const customerName = formatCustomerName(contract?.customers);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            تأكيد حذف العقد
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <Trash2 className="h-4 w-4" />
                <strong>تحذير: هذا الإجراء لا يمكن التراجع عنه!</strong>
              </div>
              <p>
                سيتم حذف العقد رقم <NumberDisplay value={contract?.contract_number} className="inline font-bold" /> 
                الخاص بالعميل "{customerName}" نهائياً من النظام.
              </p>
            </div>
            
            <div className="space-y-2">
              <p><strong>سيتم حذف:</strong></p>
              <ul className="list-disc list-inside text-sm space-y-1 mr-4">
                <li>بيانات العقد الأساسية</li>
                <li>جداول الدفع المرتبطة</li>
                <li>الفواتير المرتبطة</li>
                <li>المستندات المرفقة</li>
                <li>خطوات الموافقة</li>
              </ul>
            </div>

            <p className="text-destructive font-medium">
              هل أنت متأكد من رغبتك في حذف هذا العقد نهائياً؟
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteContract.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteContract.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                جاري الحذف...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                حذف نهائياً
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};