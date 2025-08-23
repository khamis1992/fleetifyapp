import React, { useState } from 'react';
import { AlertTriangle, Trash2, Calendar, Filter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBulkDeletePayments } from '@/hooks/usePayments';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface BulkDeletePaymentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  totalPayments: number;
}

export const BulkDeletePaymentsDialog: React.FC<BulkDeletePaymentsDialogProps> = ({
  isOpen,
  onClose,
  totalPayments
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [onlyUnlinked, setOnlyUnlinked] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentType, setPaymentType] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  
  const bulkDeleteMutation = useBulkDeletePayments();
  
  const isConfirmValid = confirmText === 'حذف جميع المدفوعات';
  
  const handleDelete = () => {
    if (!isConfirmValid) return;
    
    bulkDeleteMutation.mutate({
      onlyUnlinked,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      paymentType: paymentType as 'receipt' | 'payment' || undefined,
      paymentMethod: paymentMethod || undefined,
    }, {
      onSuccess: () => {
        onClose();
        setConfirmText('');
        setOnlyUnlinked(true);
        setStartDate('');
        setEndDate('');
        setPaymentType('');
        setPaymentMethod('');
      }
    });
  };

  const handleClose = () => {
    if (bulkDeleteMutation.isPending) return;
    onClose();
    setConfirmText('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            حذف جميع المدفوعات
          </DialogTitle>
          <DialogDescription>
            هذا الإجراء لا يمكن التراجع عنه. سيتم حذف المدفوعات نهائياً من النظام.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* خيارات التصفية */}
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4" />
              خيارات التصفية
            </div>
            
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="only-unlinked"
                checked={onlyUnlinked}
                onCheckedChange={(checked) => setOnlyUnlinked(checked as boolean)}
              />
              <Label htmlFor="only-unlinked" className="text-sm">
                حذف المدفوعات غير المربوطة فقط (الموصى به)
              </Label>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="start-date" className="text-xs">من تاريخ</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end-date" className="text-xs">إلى تاريخ</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">نوع المدفوع</Label>
                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">الكل</SelectItem>
                    <SelectItem value="receipt">إيصال استلام</SelectItem>
                    <SelectItem value="payment">سند صرف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">طريقة الدفع</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">الكل</SelectItem>
                    <SelectItem value="cash">نقد</SelectItem>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
                    <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* إحصائيات */}
          <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200 text-sm font-medium mb-1">
              <Calendar className="h-4 w-4" />
              إحصائيات الحذف
            </div>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              إجمالي المدفوعات: {totalPayments}
            </p>
            {onlyUnlinked && (
              <p className="text-sm text-orange-700 dark:text-orange-300">
                • سيتم حذف المدفوعات غير المربوطة بفواتير أو عقود فقط
              </p>
            )}
            {(startDate || endDate) && (
              <p className="text-sm text-orange-700 dark:text-orange-300">
                • سيتم حذف المدفوعات في النطاق الزمني المحدد فقط
              </p>
            )}
          </div>
          
          {/* تأكيد الحذف */}
          <div className="space-y-2">
            <Label htmlFor="confirm-text" className="text-sm font-medium">
              للتأكيد، اكتب: <span className="font-bold">"حذف جميع المدفوعات"</span>
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="اكتب النص هنا..."
              className="text-center"
            />
          </div>
        </div>
        
        <div className="flex justify-between gap-3 mt-6">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={bulkDeleteMutation.isPending}
          >
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || bulkDeleteMutation.isPending}
            className="flex items-center gap-2"
          >
            {bulkDeleteMutation.isPending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            حذف المدفوعات
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};