/**
 * مكون المعاينة السريعة (Modal)
 * عرض تفاصيل الفاتورة أو الدفعة في نافذة منبثقة
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface QuickPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'invoice' | 'payment';
  data: any;
  formatCurrency: (amount: number) => string;
  onPreview?: () => void;
  onDownload?: () => void;
  onPrint?: () => void;
}

export const QuickPreviewModal = ({
  open,
  onOpenChange,
  type,
  data,
  formatCurrency,
  onPreview,
  onDownload,
  onPrint,
}: QuickPreviewModalProps) => {
  if (!data) return null;

  const isInvoice = type === 'invoice';
  const title = isInvoice ? `فاتورة #${data.invoice_number}` : `دفعة #${data.payment_number}`;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      paid: { variant: 'default', label: 'مدفوعة' },
      unpaid: { variant: 'destructive', label: 'غير مدفوعة' },
      pending: { variant: 'secondary', label: 'معلقة' },
      overdue: { variant: 'destructive', label: 'متأخرة' },
      completed: { variant: 'default', label: 'مكتملة' },
    };
    const mapped = statusMap[status] || { variant: 'secondary', label: status };
    return <Badge variant={mapped.variant as any}>{mapped.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{title}</span>
            {getStatusBadge(data.status || data.payment_status)}
          </DialogTitle>
          <DialogDescription>
            معاينة سريعة لتفاصيل {isInvoice ? 'الفاتورة' : 'الدفعة'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* المعلومات الأساسية */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">المعلومات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">التاريخ</p>
                  <p className="font-semibold">
                    {format(
                      new Date(data.invoice_date || data.payment_date),
                      'dd MMMM yyyy',
                      { locale: ar }
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">المبلغ</p>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(data.total_amount || data.amount)}
                  </p>
                </div>
                {isInvoice && data.due_date && (
                  <div>
                    <p className="text-xs text-slate-500">تاريخ الاستحقاق</p>
                    <p className="font-semibold">
                      {format(new Date(data.due_date), 'dd MMMM yyyy', { locale: ar })}
                    </p>
                  </div>
                )}
                {!isInvoice && data.reference_number && (
                  <div>
                    <p className="text-xs text-slate-500">رقم المرجع</p>
                    <p className="font-semibold">{data.reference_number}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* التفاصيل الإضافية */}
          {isInvoice && data.description && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">الوصف</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{data.description}</p>
              </CardContent>
            </Card>
          )}

          {!isInvoice && data.payment_method && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">طريقة الدفع</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-semibold">{data.payment_method}</p>
              </CardContent>
            </Card>
          )}

          {/* الملاحظات */}
          {data.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">ملاحظات</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{data.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
          {onPrint && (
            <Button variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="w-4 h-4" />
              طباعة
            </Button>
          )}
          {onDownload && (
            <Button variant="outline" onClick={onDownload} className="gap-2">
              <Download className="w-4 h-4" />
              تحميل
            </Button>
          )}
          {onPreview && (
            <Button onClick={onPreview} className="gap-2 bg-red-600 hover:bg-red-700">
              <Eye className="w-4 h-4" />
              عرض التفاصيل
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
