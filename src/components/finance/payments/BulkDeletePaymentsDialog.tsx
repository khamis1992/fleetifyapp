import React, { useState } from 'react';
import { AlertTriangle, Trash2, Calendar, Filter, Eye, Copy, CheckCircle } from 'lucide-react';
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
import { useBulkDeletePayments, usePayments } from '@/hooks/usePayments';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

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
  const [deleteAll, setDeleteAll] = useState(false);
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentType, setPaymentType] = useState<string>('all');
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [showPreview, setShowPreview] = useState(false);
  
  const bulkDeleteMutation = useBulkDeletePayments();
  
  // Preview query to count matching payments
  const previewFilters = deleteAll ? {} : {
    ...(onlyUnlinked && { onlyUnlinked: true }),
    ...(startDate && { payment_date_gte: startDate }),
    ...(endDate && { payment_date_lte: endDate }),
    ...(paymentType !== 'all' && { type: paymentType }),
    ...(paymentMethod !== 'all' && { method: paymentMethod }),
  };
  
  const { data: previewPayments } = usePayments(previewFilters);
  const previewCount = deleteAll ? totalPayments : (previewPayments?.length || 0);
  
  const isConfirmValid = confirmText === 'حذف جميع المدفوعات';
  
  const handleDelete = () => {
    if (!isConfirmValid) return;
    
    if (previewCount === 0) {
      toast.error('لا توجد مدفوعات تطابق المعايير المحددة للحذف');
      return;
    }
    
    const deleteParams = deleteAll ? {
      deleteAll: true
    } : {
      onlyUnlinked,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      paymentType: paymentType === 'all' ? undefined : paymentType,
      paymentMethod: paymentMethod === 'all' ? undefined : paymentMethod,
    };
    
    bulkDeleteMutation.mutate(deleteParams, {
      onSuccess: (result) => {
        if (result.deletedCount === 0) {
          toast.error('لم يتم حذف أي مدفوعات. تحقق من المعايير المحددة.');
        } else {
          toast.success(`تم حذف ${result.deletedCount} مدفوع بنجاح`);
        }
        onClose();
        resetForm();
      },
      onError: (error) => {
        toast.error(`خطأ في حذف المدفوعات: ${error.message}`);
      }
    });
  };
  
  const resetForm = () => {
    setConfirmText('');
    setDeleteAll(false);
    setOnlyUnlinked(false);
    setStartDate('');
    setEndDate('');
    setPaymentType('all');
    setPaymentMethod('all');
    setShowPreview(false);
  };
  
  const copyConfirmText = () => {
    navigator.clipboard.writeText('حذف جميع المدفوعات');
    toast.success('تم نسخ النص');
  };

  const handleClose = () => {
    if (bulkDeleteMutation.isPending) return;
    onClose();
    resetForm();
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
            ⚠️ هذا الإجراء لا يمكن التراجع عنه. سيتم حذف المدفوعات نهائياً من النظام.
            {!onlyUnlinked && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-200 text-sm">
                <strong>تحذير:</strong> سيتم حذف جميع المدفوعات بما في ذلك المربوطة بالعقود والفواتير!
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] overflow-y-auto">
          <div className="space-y-4 px-1">
            {/* خيار حذف الكل */}
            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="delete-all"
                  checked={deleteAll}
                  onCheckedChange={(checked) => {
                    setDeleteAll(checked as boolean);
                    if (checked) {
                      setOnlyUnlinked(false);
                      setStartDate('');
                      setEndDate('');
                      setPaymentType('all');
                      setPaymentMethod('all');
                    }
                  }}
                />
                <Label htmlFor="delete-all" className="text-sm font-medium text-red-800 dark:text-red-200">
                  حذف جميع المدفوعات (بدون استثناء) - خطر!
                </Label>
              </div>
              {deleteAll && (
                <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                  ⚠️ سيتم حذف جميع الـ {totalPayments} مدفوع من النظام نهائياً!
                </p>
              )}
            </div>

            {/* خيارات التصفية */}
            <div className={`bg-muted p-4 rounded-lg space-y-3 ${deleteAll ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                خيارات التصفية {deleteAll && '(معطلة)'}
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="only-unlinked"
                  checked={onlyUnlinked}
                  onCheckedChange={(checked) => setOnlyUnlinked(checked as boolean)}
                  disabled={deleteAll}
                />
                <Label htmlFor="only-unlinked" className="text-sm">
                  حذف المدفوعات غير المربوطة فقط (أكثر أماناً)
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
                    disabled={deleteAll}
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
                    disabled={deleteAll}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">نوع المدفوع</Label>
                  <Select value={paymentType} onValueChange={setPaymentType} disabled={deleteAll}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="cash">نقد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">طريقة الدفع</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={deleteAll}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="received">مستلم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* معاينة النتائج */}
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="w-full flex items-center gap-2"
                type="button"
              >
                <Eye className="h-4 w-4" />
                {showPreview ? 'إخفاء المعاينة' : 'معاينة المدفوعات التي سيتم حذفها'}
              </Button>
              
              {showPreview && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    نتائج المعاينة
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="flex justify-between">
                      <span>إجمالي المدفوعات في النظام:</span>
                      <span className="font-medium">{totalPayments}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>المدفوعات التي تطابق المعايير:</span>
                      <span className={`font-medium ${previewCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {previewCount}
                      </span>
                    </p>
                  </div>
                  
                  {previewCount === 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ لا توجد مدفوعات تطابق المعايير المحددة
                      </p>
                    </div>
                  )}
                  
                   <div className="text-xs text-muted-foreground space-y-1">
                     <p><strong>المعايير المطبقة:</strong></p>
                     {deleteAll ? (
                       <p className="text-red-600 dark:text-red-400 font-medium">• حذف جميع المدفوعات (بدون استثناء)</p>
                     ) : (
                       <>
                         {!onlyUnlinked && !startDate && !endDate && paymentType === 'all' && paymentMethod === 'all' && (
                           <p className="text-red-600 dark:text-red-400 font-medium">• جميع المدفوعات (بدون قيود)</p>
                         )}
                         {onlyUnlinked && <p>• المدفوعات غير المربوطة فقط</p>}
                         {startDate && <p>• من تاريخ: {startDate}</p>}
                         {endDate && <p>• إلى تاريخ: {endDate}</p>}
                         {paymentType !== 'all' && <p>• نوع المدفوع: {paymentType}</p>}
                         {paymentMethod !== 'all' && <p>• طريقة الدفع: {paymentMethod}</p>}
                       </>
                     )}
                   </div>
                </div>
              )}
            </div>
            
            {/* تأكيد الحذف */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="confirm-text" className="text-sm font-medium">
                  للتأكيد، اكتب: <span className="font-bold">"حذف جميع المدفوعات"</span>
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyConfirmText}
                  className="h-6 px-2"
                  type="button"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="اكتب النص هنا..."
                  className="text-center pr-10"
                />
                {isConfirmValid && (
                  <CheckCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>
              {previewCount === 0 && confirmText && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  تحذير: لا توجد مدفوعات تطابق المعايير المحددة
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
        
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
            disabled={!isConfirmValid || bulkDeleteMutation.isPending || previewCount === 0}
            className="flex items-center gap-2"
          >
            {bulkDeleteMutation.isPending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {deleteAll ? 'حذف جميع المدفوعات' : `حذف ${previewCount} مدفوع`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};