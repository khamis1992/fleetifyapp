/**
 * Contract Header Component
 * Displays contract basic information with status and actions
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Printer, Download, FileEdit, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContractStatusBadge } from './ContractStatusBadge';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Contract } from '@/types/contracts';

interface ContractHeaderProps {
  contract: Contract;
  onEdit?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export const ContractHeader = React.memo<ContractHeaderProps>(({
  contract,
  onEdit,
  onPrint,
  onExport,
  onRefresh,
  isRefreshing = false,
  className
}) => {
  const navigate = useNavigate();

  // Calculate contract duration
  const contractDuration = useMemo(() => {
    if (!contract.start_date || !contract.end_date) return null;
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  }, [contract.start_date, contract.end_date]);

  // Check if contract is expiring soon
  const isExpiringSoon = useMemo(() => {
    if (!contract.end_date) return false;
    const today = new Date();
    const endDate = new Date(contract.end_date);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  }, [contract.end_date]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-muted-foreground"
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              العودة
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-right">
                عقد رقم: {contract.contract_number}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <ContractStatusBadge status={contract.status} legalStatus={contract.legal_status} />
                {isExpiringSoon && (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    ينتهي قريباً
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              تحديث
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
            >
              <FileEdit className="h-4 w-4 ml-2" />
              تعديل
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onPrint}
            >
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
            >
              <Download className="h-4 w-4 ml-2" />
              تصدير
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Contract Period */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              فترة العقد
            </label>
            <div className="text-right">
              <div className="font-medium">
                {format(new Date(contract.start_date), 'dd MMMM yyyy', { locale: ar })}
              </div>
              <div className="text-sm text-muted-foreground">
                إلى {format(new Date(contract.end_date), 'dd MMMM yyyy', { locale: ar })}
              </div>
              {contractDuration && (
                <div className="text-xs text-muted-foreground mt-1">
                  المدة: {contractDuration} يوم
                </div>
              )}
            </div>
          </div>

          {/* Daily Rate */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              سعر اليومي
            </label>
            <div className="text-right">
              <div className="font-medium">
                {((contract as any).daily_rate || 0).toLocaleString('ar-SA')} ريال
              </div>
            </div>
          </div>

          {/* Total Amount */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              الإجمالي
            </label>
            <div className="text-right">
              <div className="font-bold text-lg">
                {((contract as any).total_amount || contract.contract_amount || 0).toLocaleString('ar-SA')} ريال
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              طريقة الدفع
            </label>
            <div className="text-right">
              <Badge variant="secondary">
                {contract.payment_method === 'cash' ? 'نقدي' :
                 contract.payment_method === 'card' ? 'بطاقة' :
                 contract.payment_method === 'transfer' ? 'تحويل بنكي' :
                 contract.payment_method || 'غير محدد'}
              </Badge>
            </div>
          </div>

          {/* Customer Info */}
          {contract.customer && (
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">
                العميل
              </label>
              <div className="text-right">
                <div className="font-medium">
                  {formatCustomerName(contract.customer)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {String((contract.customer as any).phone || '')}
                </div>
              </div>
            </div>
          )}

          {/* Vehicle Info */}
          {contract.vehicle && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">
                المركبة
              </label>
              <div className="text-right">
                <div className="font-medium">
                  {String((contract.vehicle as any).make || '')} {String((contract.vehicle as any).model || '')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {String((contract.vehicle as any).plate_number || '')}
                </div>
              </div>
            </div>
          )}

          {/* Created At */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              تاريخ الإنشاء
            </label>
            <div className="text-right text-sm">
              {format(new Date(contract.created_at), 'dd MMMM yyyy HH:mm', { locale: ar })}
            </div>
          </div>
        </div>

        {/* Notes */}
        {contract.notes && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <label className="text-sm font-medium text-muted-foreground">
              ملاحظات
            </label>
            <p className="text-sm mt-1 text-right">{contract.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});