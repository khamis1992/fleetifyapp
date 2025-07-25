import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Check, 
  DollarSign, 
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { PayrollRecord } from '@/hooks/usePayroll';

interface PayrollActionButtonsProps {
  payroll: PayrollRecord;
  onView: (payroll: PayrollRecord) => void;
  onEdit: (payroll: PayrollRecord) => void;
  onApprove: (payrollId: string) => void;
  onPay: (payrollId: string) => void;
  onDelete: (payrollId: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export default function PayrollActionButtons({
  payroll,
  onView,
  onEdit,
  onApprove,
  onPay,
  onDelete,
  isUpdating,
  isDeleting
}: PayrollActionButtonsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);

  const canEdit = payroll.status === 'draft';
  const canApprove = payroll.status === 'draft';
  const canPay = payroll.status === 'approved';
  const canDelete = payroll.status === 'draft';

  const handleApprove = () => {
    onApprove(payroll.id);
    setShowApproveDialog(false);
  };

  const handlePay = () => {
    onPay(payroll.id);
    setShowPayDialog(false);
  };

  const handleDelete = () => {
    onDelete(payroll.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Quick Action Buttons for Common Actions */}
        {canApprove && (
          <Button
            size="sm"
            variant="default"
            onClick={() => setShowApproveDialog(true)}
            disabled={isUpdating}
          >
            <Check className="h-4 w-4 ml-1" />
            اعتماد
          </Button>
        )}
        
        {canPay && (
          <Button
            size="sm"
            variant="success"
            onClick={() => setShowPayDialog(true)}
            disabled={isUpdating}
          >
            <DollarSign className="h-4 w-4 ml-1" />
            دفع
          </Button>
        )}

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(payroll)}>
              <Eye className="h-4 w-4 ml-2" />
              عرض التفاصيل
            </DropdownMenuItem>
            
            {canEdit && (
              <DropdownMenuItem onClick={() => onEdit(payroll)}>
                <Edit className="h-4 w-4 ml-2" />
                تعديل
              </DropdownMenuItem>
            )}
            
            {canApprove && (
              <DropdownMenuItem onClick={() => setShowApproveDialog(true)}>
                <Check className="h-4 w-4 ml-2" />
                اعتماد
              </DropdownMenuItem>
            )}
            
            {canPay && (
              <DropdownMenuItem onClick={() => setShowPayDialog(true)}>
                <DollarSign className="h-4 w-4 ml-2" />
                دفع
              </DropdownMenuItem>
            )}
            
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 ml-2" />
                  حذف
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              اعتماد الراتب
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من اعتماد راتب الموظف {payroll.employee?.first_name} {payroll.employee?.last_name}؟
              <br />
              <span className="font-medium">رقم الراتب: {payroll.payroll_number}</span>
              <br />
              <span className="font-medium">المبلغ: {payroll.net_amount} د.ك</span>
              <br />
              <br />
              سيتم إنشاء قيد محاسبي تلقائياً عند الاعتماد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApprove}
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUpdating ? 'جارٍ الاعتماد...' : 'اعتماد'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pay Confirmation Dialog */}
      <AlertDialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              دفع الراتب
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من تأكيد دفع راتب الموظف {payroll.employee?.first_name} {payroll.employee?.last_name}؟
              <br />
              <span className="font-medium">رقم الراتب: {payroll.payroll_number}</span>
              <br />
              <span className="font-medium">المبلغ: {payroll.net_amount} د.ك</span>
              <br />
              <span className="font-medium">طريقة الدفع: {
                payroll.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                payroll.payment_method === 'cash' ? 'نقدي' : 'شيك'
              }</span>
              <br />
              <br />
              <span className="text-amber-600">
                ⚠️ لا يمكن التراجع عن هذا الإجراء بعد التأكيد.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePay}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUpdating ? 'جارٍ الدفع...' : 'تأكيد الدفع'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              حذف الراتب
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف راتب الموظف {payroll.employee?.first_name} {payroll.employee?.last_name}؟
              <br />
              <span className="font-medium">رقم الراتب: {payroll.payroll_number}</span>
              <br />
              <br />
              <span className="text-destructive font-medium">
                ⚠️ هذا الإجراء لا يمكن التراجع عنه!
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'جارٍ الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}