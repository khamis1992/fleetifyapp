import React from 'react';
import { DollarSign, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateInGregorian } from '@/utils/dateFormatter';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

interface InvoiceCardProps {
  invoice: any;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPay?: () => void;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  onPreview,
  onEdit,
  onDelete,
  onPay
}) => {
  const getPaymentStatusBadge = (paymentStatus: string) => {
    const statusConfig = {
      paid: { label: 'مدفوعة', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      unpaid: { label: 'غير مدفوعة', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
      partially_paid: { label: 'مدفوعة جزئياً', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      overdue: { label: 'متأخرة', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' }
    };
    
    const config = statusConfig[paymentStatus as keyof typeof statusConfig] || 
                   { label: paymentStatus, className: 'bg-slate-100 text-slate-800 hover:bg-slate-100' };
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const canPay = invoice.payment_status === 'unpaid' || invoice.payment_status === 'partially_paid';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          {/* Left side - Actions */}
          <div className="flex items-center gap-2">
            {/* Pay button - only show for unpaid/partial invoices */}
            {canPay && onPay && (
              <Button
                variant="default"
                size="sm"
                onClick={onPay}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <DollarSign className="h-4 w-4 ml-1" />
                دفع الآن
              </Button>
            )}
            
            {/* Action buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
              title="عرض الفاتورة"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            <PermissionGuard permissions={['edit_invoices']}>
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                title="تعديل الفاتورة"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            
            <PermissionGuard permissions={['delete_invoices']}>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                title="حذف الفاتورة"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </PermissionGuard>
          </div>

          {/* Right side - Invoice details */}
          <div className="flex-1 space-y-2 mr-4">
            <div className="flex items-center gap-3 justify-end">
              {getPaymentStatusBadge(invoice.payment_status)}
              <h3 className="font-semibold text-lg">فاتورة رقم {invoice.invoice_number}</h3>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground justify-end">
              <span>تاريخ الإنشاء: {formatDateInGregorian(invoice.invoice_date || invoice.created_at)}</span>
              {invoice.due_date && (
                <span>تاريخ الاستحقاق: {formatDateInGregorian(invoice.due_date)}</span>
              )}
              <span>المبلغ: {invoice.total_amount?.toFixed(3)} د.ك</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};