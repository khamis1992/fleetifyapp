import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { ReturnDepositDialog } from './ReturnDepositDialog';

interface DepositDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deposit: any;
}

export function DepositDetailsDialog({ 
  open, 
  onOpenChange, 
  deposit 
}: DepositDetailsDialogProps) {
  const [showReturnDialog, setShowReturnDialog] = useState(false);

  if (!deposit) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'نشط', variant: 'default' as const },
      returned: { label: 'مُسترد', variant: 'secondary' as const },
      partial: { label: 'مُسترد جزئياً', variant: 'outline' as const },
      pending: { label: 'معلق', variant: 'destructive' as const }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const remainingAmount = deposit.amount - (deposit.returned_amount || 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              تفاصيل الوديعة
            </DialogTitle>
            <DialogDescription>
              عرض تفاصيل الوديعة رقم {deposit.deposit_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">المعلومات الأساسية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">رقم الوديعة</label>
                    <p className="font-mono text-lg">{deposit.deposit_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">الحالة</label>
                    <div className="mt-1">
                      {getStatusBadge(deposit.status)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">العميل</label>
                    <p className="text-lg">{deposit.customer_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">نوع الوديعة</label>
                    <p className="text-lg">{deposit.deposit_type_name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">المعلومات المالية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">المبلغ الإجمالي</label>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(deposit.amount)}
                    </p>
                  </div>
                  <div className="p-4 bg-orange-500/5 rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">المبلغ المُسترد</label>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(deposit.returned_amount || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-green-500/5 rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">المبلغ المتبقي</label>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(remainingAmount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">التواريخ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">تاريخ الاستلام</label>
                    <p className="text-lg">
                      {new Date(deposit.received_date).toLocaleDateString('ar-KW')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">تاريخ الاستحقاق</label>
                    <p className="text-lg">
                      {deposit.due_date 
                        ? new Date(deposit.due_date).toLocaleDateString('ar-KW')
                        : 'غير محدد'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">تاريخ الإنشاء</label>
                    <p className="text-lg">
                      {new Date(deposit.created_at).toLocaleDateString('ar-KW')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">آخر تحديث</label>
                    <p className="text-lg">
                      {new Date(deposit.updated_at).toLocaleDateString('ar-KW')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {deposit.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">الملاحظات</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {deposit.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            {deposit.status === 'active' && remainingAmount > 0 && (
              <div className="flex justify-end gap-3">
                <Button 
                  onClick={() => setShowReturnDialog(true)}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  استرداد الوديعة
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ReturnDepositDialog
        open={showReturnDialog}
        onOpenChange={setShowReturnDialog}
        deposit={deposit}
        maxAmount={remainingAmount}
      />
    </>
  );
}