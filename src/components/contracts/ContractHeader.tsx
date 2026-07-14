import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Download, FileEdit, Printer, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { cn } from '@/lib/utils';
import type { Contract } from '@/types/contracts';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { ContractStatusBadge } from './ContractStatusBadge';

interface ContractHeaderProps {
  contract: Contract;
  onEdit?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, 'dd MMMM yyyy', { locale: ar });
}

const paymentStatusLabels: Record<string, string> = {
  paid: 'مدفوع',
  partially_paid: 'مدفوع جزئيًا',
  partial: 'مدفوع جزئيًا',
  unpaid: 'غير مدفوع',
  overdue: 'متأخر',
  cancelled: 'ملغى',
};

export const ContractHeader = React.memo<ContractHeaderProps>(({
  contract,
  onEdit,
  onPrint,
  onExport,
  onRefresh,
  isRefreshing = false,
  className,
}) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();

  const contractDuration = useMemo(() => {
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  }, [contract.start_date, contract.end_date]);

  const isExpiringSoon = useMemo(() => {
    const endDate = new Date(contract.end_date);
    if (Number.isNaN(endDate.getTime())) return false;
    const daysUntilExpiry = Math.ceil((endDate.getTime() - Date.now()) / 86_400_000);
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  }, [contract.end_date]);

  const totalPaid = Number(contract.total_paid || 0);
  const balanceDue = Number(contract.balance_due ?? Math.max(0, contract.contract_amount - totalPaid));
  const paymentStatus = contract.payment_status || (balanceDue <= 0.01 ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid');

  return (
    <Card className={cn('w-full', className)} dir="rtl">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="shrink-0 text-muted-foreground">
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة
            </Button>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-bold sm:text-2xl">عقد رقم: {contract.contract_number}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ContractStatusBadge status={contract.status} legalStatus={contract.legal_status} />
                {isExpiringSoon && <Badge variant="outline" className="border-orange-600 text-orange-600">ينتهي قريبًا</Badge>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
                <RefreshCw className={cn('ml-2 h-4 w-4', isRefreshing && 'animate-spin')} />
                تحديث
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <FileEdit className="ml-2 h-4 w-4" />
                تعديل
              </Button>
            )}
            {onPrint && (
              <Button variant="outline" size="sm" onClick={onPrint}>
                <Printer className="ml-2 h-4 w-4" />
                طباعة
              </Button>
            )}
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="ml-2 h-4 w-4" />
                تصدير
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">فترة العقد</p>
            <p className="font-medium">{formatDate(contract.start_date)}</p>
            <p className="text-sm text-muted-foreground">إلى {formatDate(contract.end_date)}</p>
            {contractDuration !== null && <p className="text-xs text-muted-foreground">المدة: {contractDuration} يوم</p>}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">القسط الشهري</p>
            <p className="font-semibold">{formatCurrency(Number(contract.monthly_amount || 0))}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">قيمة العقد</p>
            <p className="text-lg font-bold">{formatCurrency(Number(contract.contract_amount || 0))}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">حالة السداد</p>
            <Badge variant={balanceDue <= 0.01 ? 'secondary' : 'outline'}>
              {paymentStatusLabels[paymentStatus] || paymentStatus}
            </Badge>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">المدفوع</p>
            <p className="font-medium">{formatCurrency(totalPaid)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">الرصيد المستحق</p>
            <p className={cn('font-semibold', balanceDue > 0.01 && 'text-destructive')}>{formatCurrency(balanceDue)}</p>
          </div>

          {contract.customer && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">العميل</p>
              <p className="font-medium">{formatCustomerName(contract.customer)}</p>
              {contract.customer.phone && <p className="text-sm text-muted-foreground" dir="ltr">{contract.customer.phone}</p>}
            </div>
          )}

          {contract.vehicle && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">المركبة</p>
              <p className="font-medium">{contract.vehicle.make} {contract.vehicle.model}</p>
              <p className="text-sm text-muted-foreground">{contract.vehicle.plate_number}</p>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">تاريخ الإنشاء</p>
            <p className="text-sm">{formatDate(contract.created_at)}</p>
          </div>
        </div>

        {contract.description && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground">الوصف</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{contract.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

ContractHeader.displayName = 'ContractHeader';
