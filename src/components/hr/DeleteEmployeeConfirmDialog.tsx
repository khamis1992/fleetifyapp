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

interface DeleteEmployeeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  employeeName: string;
}

export default function DeleteEmployeeConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  employeeName
}: DeleteEmployeeConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>تأكيد حذف الموظف</AlertDialogTitle>
          <AlertDialogDescription>
            هل أنت متأكد من رغبتك في حذف الموظف "{employeeName}"؟
            <br />
            <br />
            سيتم إلغاء تفعيل الموظف ولن يظهر في القوائم النشطة، ولكن ستبقى بياناته محفوظة في النظام.
            <br />
            <strong>لا يمكن التراجع عن هذا الإجراء.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>إلغاء</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'جاري الحذف...' : 'حذف الموظف'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}