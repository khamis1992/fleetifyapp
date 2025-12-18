/**
 * Contract Summary Component
 * Displays contract summary with key metrics and statistics
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Contract } from '@/types/contracts';
import type { Invoice } from '@/types/finance.types';

interface ContractSummaryProps {
  contract: Contract;
  invoices: Invoice[];
  className?: string;
}

export const ContractSummary = React.memo<ContractSummaryProps>(({
  contract,
  invoices,
  className
}) => {
  // Calculate contract progress
  const contractProgress = React.useMemo(() => {
    if (!contract.start_date || !contract.end_date) return 0;
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const today = new Date();

    if (isBefore(today, start)) return 0;
    if (isAfter(today, end)) return 100;

    const totalDays = differenceInDays(end, start);
    const elapsedDays = differenceInDays(today, start);

    return Math.round((elapsedDays / totalDays) * 100);
  }, [contract.start_date, contract.end_date]);

  // Calculate financial metrics
  const financialMetrics = React.useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
    const totalPaid = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
    const totalPending = invoices
      .filter(inv => inv.status === 'pending')
      .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
    const totalOverdue = invoices
      .filter(inv => inv.status === 'pending' && new Date(inv.due_date) < new Date())
      .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

    return {
      totalInvoiced,
      totalPaid,
      totalPending,
      totalOverdue,
      remainingAmount: (contract.total_amount || 0) - totalInvoiced,
      paymentProgress: contract.total_amount > 0 ? (totalPaid / contract.total_amount) * 100 : 0
    };
  }, [invoices, contract.total_amount]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      case 'expired': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  // Check for alerts
  const hasAlerts = React.useMemo(() => {
    const alerts = [];

    // Overdue invoices
    if (financialMetrics.totalOverdue > 0) {
      alerts.push({ type: 'overdue', message: 'فواتير متأخرة', value: financialMetrics.totalOverdue });
    }

    // Contract expiring soon
    if (contract.end_date) {
      const daysUntilExpiry = differenceInDays(new Date(contract.end_date), new Date());
      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        alerts.push({ type: 'expiring', message: 'ينتهي العقد قريباً', value: daysUntilExpiry });
      }
    }

    return alerts;
  }, [financialMetrics.totalOverdue, contract.end_date]);

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {/* Contract Status & Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">حالة العقد</CardTitle>
          <div className={cn("w-3 h-3 rounded-full", getStatusColor(contract.status))} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {contract.status === 'active' ? 'نشط' :
             contract.status === 'completed' ? 'مكتمل' :
             contract.status === 'cancelled' ? 'ملغي' :
             contract.status === 'expired' ? 'منتهي' : contract.status}
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>التقدم</span>
              <span>{contractProgress}%</span>
            </div>
            <Progress value={contractProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">الملخص المالي</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {financialMetrics.totalPaid.toLocaleString('ar-SA')} ريال
          </div>
          <p className="text-xs text-muted-foreground">
            مدفوع من {contract.total_amount?.toLocaleString('ar-SA')} ريال
          </p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-green-600">مدفوع</span>
              <span>{financialMetrics.totalPaid.toLocaleString('ar-SA')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-orange-600">معلق</span>
              <span>{financialMetrics.totalPending.toLocaleString('ar-SA')}</span>
            </div>
            {financialMetrics.totalOverdue > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-red-600">متأخر</span>
                <span>{financialMetrics.totalOverdue.toLocaleString('ar-SA')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">الفواتير</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{invoices.length}</div>
          <p className="text-xs text-muted-foreground">
            فاتورة {invoices.length === 1 ? '' : 'فاتير'}
          </p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-green-600">
                <CheckCircle className="inline h-3 w-3 mr-1" />
                مدفوع
              </span>
              <span>{invoices.filter(inv => inv.status === 'paid').length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-blue-600">
                <Clock className="inline h-3 w-3 mr-1" />
                معلق
              </span>
              <span>{invoices.filter(inv => inv.status === 'pending').length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">التنبيهات</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{hasAlerts.length}</div>
          <p className="text-xs text-muted-foreground">
            تنبيه {hasAlerts.length === 1 ? '' : 'تنبيهات'}
          </p>
          <div className="mt-2 space-y-1">
            {hasAlerts.length === 0 ? (
              <div className="text-xs text-green-600">
                <CheckCircle className="inline h-3 w-3 mr-1" />
                لا توجد تنبيهات
              </div>
            ) : (
              hasAlerts.map((alert, index) => (
                <div key={index} className="text-xs">
                  <Badge
                    variant={alert.type === 'overdue' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {alert.message}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});