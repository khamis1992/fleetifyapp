/**
 * مكون جدول الدفعات المحسّن
 * يتضمن فلاتر سريعة ومعاينة سريعة
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PaymentFilters, type PaymentStatus } from './PaymentFilters';
import { QuickPreviewModal } from './QuickPreviewModal';
import { Eye, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Contract } from '@/types/contracts';

interface EnhancedPaymentScheduleTabProps {
  contract: Contract;
  formatCurrency: (amount: number) => string;
  payments?: any[];
}

export const EnhancedPaymentScheduleTab = ({
  contract,
  formatCurrency,
  payments = [],
}: EnhancedPaymentScheduleTabProps) => {
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus>('all');
  const [searchText, setSearchText] = useState('');
  const [previewPayment, setPreviewPayment] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const totalAmount = contract.contract_amount || 0;
    const totalPaid = contract.total_paid || 0;
    const balanceDue = totalAmount - totalPaid;
    const paidCount = payments.filter((p) => p.status === 'paid').length;
    const pendingCount = payments.filter((p) => p.status === 'pending').length;
    const overdueCount = payments.filter((p) => p.status === 'overdue').length;

    return {
      totalAmount,
      totalPaid,
      balanceDue,
      paidCount,
      pendingCount,
      overdueCount,
      progressPercentage: totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0,
    };
  }, [contract, payments]);

  // تصفية الدفعات
  const filteredPayments = useMemo(() => {
    let filtered = [...payments];

    // تصفية حسب الحالة
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((p) => {
        if (selectedStatus === 'completed') return p.status === 'paid';
        if (selectedStatus === 'pending') return p.status === 'pending';
        if (selectedStatus === 'overdue') return p.status === 'overdue';
        return true;
      });
    }

    // تصفية حسب البحث
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter((p) => {
        return (
          p.payment_number?.toLowerCase().includes(search) ||
          p.reference_number?.toLowerCase().includes(search) ||
          p.payment_method?.toLowerCase().includes(search)
        );
      });
    }

    return filtered;
  }, [payments, selectedStatus, searchText]);

  const handlePreview = (payment: any) => {
    setPreviewPayment(payment);
    setIsPreviewOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-50';
      case 'overdue':
        return 'bg-red-50';
      case 'pending':
        return 'bg-yellow-50';
      default:
        return 'bg-slate-50';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      paid: { variant: 'default', label: '✓ مدفوع' },
      pending: { variant: 'secondary', label: '⏳ معلق' },
      overdue: { variant: 'destructive', label: '⚠ متأخر' },
      upcoming: { variant: 'outline', label: 'قادم' },
    };
    const mapped = statusMap[status] || { variant: 'secondary', label: status };
    return <Badge variant={mapped.variant as any}>{mapped.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* الفلاتر السريعة */}
      <PaymentFilters
        onStatusChange={setSelectedStatus}
        onSearchChange={setSearchText}
        totalCount={payments.length}
        filteredCount={filteredPayments.length}
      />

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">إجمالي القيمة</div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">المدفوع</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalPaid)}
            </div>
            <div className="text-xs text-green-600 mt-1">{stats.paidCount} دفعة</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">المتبقي</div>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.balanceDue)}
            </div>
            <div className="text-xs text-orange-600 mt-1">
              {payments.length - stats.paidCount} دفعة
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">نسبة الإنجاز</div>
            <div className="text-2xl font-bold text-blue-600">{stats.progressPercentage}%</div>
            <Progress value={stats.progressPercentage} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* جدول الدفعات */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">جدول الدفعات</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>لا توجد دفعات تطابق معايير البحث</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                      #
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                      تاريخ الاستحقاق
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                      تاريخ الدفع
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                      المبلغ
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                      الحالة
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayments.map((payment, index) => (
                    <tr
                      key={payment.id || index}
                      className={cn('hover:bg-slate-50 transition-colors', getStatusColor(payment.status))}
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {payment.due_date
                          ? format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: ar })
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {payment.payment_date ? (
                          <span className="text-green-600 font-medium">
                            {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {formatCurrency(payment.amount || payment.total_amount)}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(payment.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(payment)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            عرض
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* معاينة سريعة */}
      <QuickPreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        type="payment"
        data={previewPayment}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};
