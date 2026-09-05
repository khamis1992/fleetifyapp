/**
 * مكون لوحة التحكم المالية المصغرة - تصميم محسّن
 * عرض ملخص مالي شامل مع تصور بياني محسّن
 * Redesigned with improved UI/UX, better visual hierarchy, and modern card-based layout
 */

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, AlertCircle, Wallet, CheckCircle, Clock, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Contract } from '@/types/contracts';
import type { ContractFinancialSnapshot } from './contract-details-v3/tokens';

interface FinancialDashboardProps {
  contract: Contract;
  formatCurrency: (amount: number) => string;
  snapshot: ContractFinancialSnapshot;
}

export const FinancialDashboard = ({ contract, formatCurrency, snapshot }: FinancialDashboardProps) => {
  // جميع بطاقات الصفحة تعتمد اللقطة المالية المركزية نفسها.
  const financialData = useMemo(() => {
    const contractAmount = snapshot.contractTotal;
    const monthlyAmount = contract.monthly_amount || 0;
    const totalPaid = snapshot.paidTotal;
    const balanceDue = snapshot.remainingTotal;

    // نسبة الدفع
    const paymentPercentage = contractAmount > 0 ? Math.min(balanceDue > 0 ? 99 : 100, Math.floor((totalPaid / contractAmount) * 100)) : 0;

    // المبالغ الإضافية (إذا تجاوز المدفوع قيمة العقد)
    const extraPayments = Math.max(0, snapshot.activePaymentsTotal - contractAmount);

    // حالة الدفع
    const getPaymentStatus = () => {
      if (snapshot.financialReviewRequired) return { label: 'يحتاج مطابقة', variant: 'secondary' as const, color: 'text-[#B45309]', bg: 'bg-[#FFFBEB]' };
      if (contractAmount > 0 && balanceDue === 0) return { label: 'مسدد بالكامل', variant: 'default' as const, color: 'text-[#0E9E7E]', bg: 'bg-[#ECFDF9]' };
      if (paymentPercentage >= 50) return { label: 'مسدد جزئياً', variant: 'secondary' as const, color: 'text-[#B45309]', bg: 'bg-[#FFFBEB]' };
      if (totalPaid <= 0.01) return { label: 'غير مسدد', variant: 'secondary' as const, color: 'text-[#BE123C]', bg: 'bg-[#FFF5F6]' };
      return { label: 'مسدد قليلاً', variant: 'secondary' as const, color: 'text-[#B45309]', bg: 'bg-[#FFFBEB]' };
    };

    return {
      contractAmount,
      totalPaid,
      balanceDue,
      monthlyAmount,
      paymentPercentage,
      extraPayments,
      paymentStatus: getPaymentStatus(),
    };
  }, [contract.monthly_amount, snapshot]);

  // بيانات الرسم البياني الدائري
  const chartData = useMemo(() => {
    const data = [
      {
        name: 'المدفوع',
        value: financialData.totalPaid,
        fill: '#22C7A1',
      },
    ];

    if (financialData.extraPayments > 0) {
      data.push({
        name: 'إضافي',
        value: financialData.extraPayments,
        fill: '#F59E0B',
      });
    }

    if (financialData.balanceDue > 0) {
      data.push({
        name: 'المتبقي',
        value: financialData.balanceDue,
        fill: '#E5EAF1',
      });
    }

    return data.filter(item => item.value > 0);
  }, [financialData]);

  return (
    <div className="space-y-5">
      {!snapshot.hasFinancialCoverage && (
        <div className="flex items-start gap-3 rounded-xl border border-[#F59E0B]/35 bg-[#FFFBEB] p-4 text-sm text-[#92400E]">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-black">البيانات المالية غير مكتملة</p>
            <p className="mt-1">
              يوجد {snapshot.missingInvoiceMonthsCount} قسطاً بلا فاتورة شهرية؛ لذلك لا تعني الفواتير الصفرية أن العقد مسدد.
            </p>
          </div>
        </div>
      )}

      {/* البطاقات الإحصائية العلوية */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* بطاقة قيمة العقد */}
        <div className="rounded-2xl border border-[#E5EAF1] bg-white p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-bold text-slate-500 mb-2">قيمة العقد</p>
              <p className="text-base font-black text-[#0F172A] mb-1">
                {formatCurrency(financialData.contractAmount)}
              </p>
              {financialData.monthlyAmount > 0 && (
                <p className="text-xs text-slate-500">
                  {formatCurrency(financialData.monthlyAmount)} / شهر
                </p>
              )}
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* بطاقة المدفوع */}
        <div className="rounded-2xl border border-[#E5EAF1] bg-white p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-bold text-slate-500 mb-2">المدفوع</p>
              <div className="flex items-center gap-2 mb-1">
                <p className={cn('text-base font-black', financialData.totalPaid > 0 ? 'text-[#0E9E7E]' : 'text-[#BE123C]')}>
                  {formatCurrency(financialData.totalPaid)}
                </p>
                <Badge variant="secondary" className={cn('text-xs', financialData.paymentStatus.bg, financialData.paymentStatus.color)}>
                  {financialData.paymentPercentage}%
                </Badge>
              </div>
              <div className={cn('flex items-center gap-1 text-xs', financialData.paymentStatus.color)}>
                <ArrowUpRight className="w-3 h-3" />
                <span>{financialData.paymentStatus.label}</span>
              </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ECFDF9] text-[#0E9E7E]">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          {/* شريط التقدم */}
          <div className="mt-3">
            <Progress value={financialData.paymentPercentage} className="h-2" />
          </div>
        </div>

        {/* بطاقة المتبقي */}
        <div className={cn(
          "rounded-2xl border bg-white p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]",
          financialData.balanceDue > 0
            ? "border-[#FB6B7A]/40"
            : "border-[#E5EAF1]"
        )}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-bold text-slate-500 mb-2">المتبقي</p>
              <p className={cn(
                "text-base font-black mb-1",
                financialData.balanceDue > 0 ? "text-[#BE123C]" : "text-slate-400"
              )}>
                {formatCurrency(financialData.balanceDue)}
              </p>
              {financialData.balanceDue > 0 ? (
                <div className="flex items-center gap-1 text-xs text-[#BE123C]">
                  <Clock className="w-3 h-3" />
                  <span>قيد الانتظار</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-[#0E9E7E]">
                  <CheckCircle className="w-3 h-3" />
                  <span>{snapshot.financialReviewRequired ? 'يحتاج مطابقة' : financialData.contractAmount > 0 ? 'تم السداد' : 'القيمة غير محددة'}</span>
                </div>
              )}
            </div>
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              financialData.balanceDue > 0
                ? "bg-[#FFF5F6] text-[#BE123C]"
                : "bg-[#ECFDF9] text-[#0E9E7E]"
            )}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

      </div>

      {/* الرسم البياني والتفاصيل */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* الرسم البياني الدائري */}
        <Card className="rounded-2xl border-[#E5EAF1] shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)] lg:col-span-1">
          <div className="flex items-center gap-3 border-b border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Overview</p>
              <h3 className="text-sm font-black text-[#0F172A]">توزيع المدفوعات</h3>
            </div>
          </div>
          <CardContent className="p-4">
            {chartData.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      className="text-sm"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #E5EAF1',
                        borderRadius: '12px',
                        padding: '12px',
                        boxShadow: '0 10px 30px -22px rgba(15,23,42,0.25)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend مخصص */}
                <div className="space-y-2">
                  {chartData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-slate-500">{item.name}</span>
                      </div>
                      <span className="font-black text-[#0F172A]">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-slate-500">
                <Wallet className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm">لا توجد بيانات للعرض</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ملخص تفصيلي */}
        <Card className="rounded-2xl border-[#E5EAF1] shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)] lg:col-span-2">
          <div className="flex items-center gap-3 border-b border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ECFDF9] text-[#0E9E7E]">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Breakdown</p>
              <h3 className="text-sm font-black text-[#0F172A]">تفاصيل المدفوعات</h3>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* صف قيمة العقد */}
              <div className="flex items-center justify-between rounded-xl border border-[#E5EAF1] bg-[#F6F8FB] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">قيمة العقد الأساسية</p>
                    <p className="text-xs text-slate-500">المبلغ الإجمالي المتفق عليه</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-lg font-black text-[#0E9E7E]">{formatCurrency(financialData.contractAmount)}</p>
                  {financialData.monthlyAmount > 0 && (
                    <p className="text-xs text-slate-500">{formatCurrency(financialData.monthlyAmount)} شهرياً</p>
                  )}
                </div>
              </div>

              {/* صف المدفوع */}
              <div className="flex items-center justify-between rounded-xl border border-[#E5EAF1] bg-[#F6F8FB] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ECFDF9] text-[#0E9E7E]">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">المدفوع حتى الآن</p>
                    <p className="text-xs text-slate-500">نسبة السداد: {financialData.paymentPercentage}%</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={cn('text-lg font-black', financialData.totalPaid > 0 ? 'text-[#0E9E7E]' : 'text-[#BE123C]')}>{formatCurrency(financialData.totalPaid)}</p>
                  <Badge className={cn(financialData.paymentStatus.bg, financialData.paymentStatus.color)}>
                    {financialData.paymentStatus.label}
                  </Badge>
                </div>
              </div>

              {/* صف المبالغ الإضافية */}
              {financialData.extraPayments > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-[#F59E0B]/30 bg-[#FFFBEB] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#B45309]">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">مبالغ إضافية</p>
                      <p className="text-xs text-slate-500">فوق قيمة العقد الأساسية</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-black text-[#B45309]">{formatCurrency(financialData.extraPayments)}</p>
                    <p className="text-xs text-[#B45309]">{formatCurrency(snapshot.activePaymentsTotal)} إجمالي المخصص للعقد</p>
                  </div>
                </div>
              )}

              {/* صف المتبقي */}
              {financialData.balanceDue > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-[#FB6B7A]/30 bg-[#FFF5F6] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFF5F6] text-[#BE123C]">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">المبلغ المتبقي</p>
                      <p className="text-xs text-slate-500">يجب سداده</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-black text-[#BE123C]">{formatCurrency(financialData.balanceDue)}</p>
                    <Badge variant="outline" className="border-[#FB6B7A]/40 text-[#BE123C]">
                      قيد الانتظار
                    </Badge>
                  </div>
                </div>
              )}

              {/* صف الإجمالي الكلي */}
              <div className="flex items-center justify-between rounded-xl border border-[#E5EAF1] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ECFDF9] text-[#0E9E7E]">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#0F172A]">الإجمالي الكلي</p>
                    <p className="text-xs text-slate-500">مجموع الدفعات المخصصة للعقد</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xl font-black text-[#0F172A]">{formatCurrency(snapshot.activePaymentsTotal)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
