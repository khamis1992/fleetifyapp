/**
 * مكون لوحة التحكم المالية المصغرة - تصميم محسّن
 * عرض ملخص مالي شامل مع تصور بياني محسّن
 * Redesigned with improved UI/UX, better visual hierarchy, and modern card-based layout
 */

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, AlertCircle, Wallet, CheckCircle, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Contract } from '@/types/contracts';

interface FinancialDashboardProps {
  contract: Contract;
  formatCurrency: (amount: number) => string;
}

export const FinancialDashboard = ({ contract, formatCurrency }: FinancialDashboardProps) => {
  // حساب البيانات المالية
  const financialData = useMemo(() => {
    const contractAmount = contract.contract_amount || 0;
    const totalPaid = contract.total_paid || 0;
    const balanceDue = contract.balance_due || (contractAmount - totalPaid);
    const monthlyAmount = contract.monthly_amount || 0;

    // نسبة الدفع
    const paymentPercentage = contractAmount > 0 ? Math.min(100, Math.round((totalPaid / contractAmount) * 100)) : 0;

    // المبالغ الإضافية (إذا تجاوز المدفوع قيمة العقد)
    const extraPayments = Math.max(0, totalPaid - contractAmount);

    // حالة الدفع
    const getPaymentStatus = () => {
      if (paymentPercentage >= 100) return { label: 'مسدد بالكامل', variant: 'default' as const, color: 'text-green-600', bg: 'bg-green-50' };
      if (paymentPercentage >= 50) return { label: 'مسدد جزئياً', variant: 'secondary' as const, color: 'text-amber-600', bg: 'bg-amber-50' };
      return { label: 'مسدد قليلاً', variant: 'secondary' as const, color: 'text-orange-600', bg: 'bg-orange-50' };
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
  }, [contract]);

  // بيانات الرسم البياني الدائري
  const chartData = useMemo(() => {
    const data = [
      {
        name: 'المدفوع',
        value: financialData.totalPaid,
        fill: '#10b981',
      },
    ];

    if (financialData.extraPayments > 0) {
      data.push({
        name: 'إضافي',
        value: financialData.extraPayments,
        fill: '#f97316',
      });
    }

    if (financialData.balanceDue > 0) {
      data.push({
        name: 'المتبقي',
        value: financialData.balanceDue,
        fill: '#e5e7eb',
      });
    }

    return data.filter(item => item.value > 0);
  }, [financialData]);

  return (
    <div className="space-y-6">
      {/* البطاقات الإحصائية العلوية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* بطاقة قيمة العقد */}
        <Card className="border-teal-200/50 hover:border-teal-300 transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 mb-2">قيمة العقد</p>
                <p className="text-2xl font-bold text-slate-900 mb-1">
                  {formatCurrency(financialData.contractAmount)}
                </p>
                {financialData.monthlyAmount > 0 && (
                  <p className="text-xs text-slate-500">
                    {formatCurrency(financialData.monthlyAmount)} / شهر
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* بطاقة المدفوع */}
        <Card className="border-green-200/50 hover:border-green-300 transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 mb-2">المدفوع</p>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(financialData.totalPaid)}
                  </p>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                    {financialData.paymentPercentage}%
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{financialData.paymentStatus.label}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
            </div>
            {/* شريط التقدم */}
            <div className="mt-3">
              <Progress value={financialData.paymentPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* بطاقة المتبقي */}
        <Card className={cn(
          "border transition-all duration-200 hover:shadow-lg",
          financialData.balanceDue > 0
            ? "border-red-200/50 hover:border-red-300"
            : "border-slate-200/50 hover:border-slate-300"
        )}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 mb-2">المتبقي</p>
                <p className={cn(
                  "text-2xl font-bold mb-1",
                  financialData.balanceDue > 0 ? "text-red-600" : "text-slate-400"
                )}>
                  {formatCurrency(financialData.balanceDue)}
                </p>
                {financialData.balanceDue > 0 ? (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <Clock className="w-3 h-3" />
                    <span>قيد الانتظار</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    <span>تم السداد</span>
                  </div>
                )}
              </div>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                financialData.balanceDue > 0
                  ? "bg-gradient-to-br from-red-50 to-red-100"
                  : "bg-gradient-to-br from-slate-50 to-slate-100"
              )}>
                <AlertCircle className={cn(
                  "w-6 h-6",
                  financialData.balanceDue > 0 ? "text-red-600" : "text-slate-400"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* الرسم البياني والتفاصيل */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* الرسم البياني الدائري */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-teal-600" />
              </div>
              توزيع المدفوعات
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-semibold text-slate-900">
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
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              تفاصيل المدفوعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* صف قيمة العقد */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-teal-50 to-teal-50/50 border border-teal-200/50 hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">قيمة العقد الأساسية</p>
                    <p className="text-xs text-slate-500">المبلغ الإجمالي المتفق عليه</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-teal-700">{formatCurrency(financialData.contractAmount)}</p>
                  {financialData.monthlyAmount > 0 && (
                    <p className="text-xs text-slate-500">{formatCurrency(financialData.monthlyAmount)} شهرياً</p>
                  )}
                </div>
              </div>

              {/* صف المدفوع */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-50 to-green-50/50 border border-green-200/50 hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">المدفوع حتى الآن</p>
                    <p className="text-xs text-slate-500">نسبة السداد: {financialData.paymentPercentage}%</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-green-700">{formatCurrency(financialData.totalPaid)}</p>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    {financialData.paymentStatus.label}
                  </Badge>
                </div>
              </div>

              {/* صف المبالغ الإضافية */}
              {financialData.extraPayments > 0 && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-orange-50 to-orange-50/50 border border-orange-200/50 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">مبالغ إضافية</p>
                      <p className="text-xs text-slate-500">فوق قيمة العقد الأساسية</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-orange-700">{formatCurrency(financialData.extraPayments)}</p>
                    <p className="text-xs text-orange-600">+ {formatCurrency(financialData.totalPaid)} إجمالي</p>
                  </div>
                </div>
              )}

              {/* صف المتبقي */}
              {financialData.balanceDue > 0 && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-50 to-red-50/50 border border-red-200/50 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">المبلغ المتبقي</p>
                      <p className="text-xs text-slate-500">يجب سداده</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-red-700">{formatCurrency(financialData.balanceDue)}</p>
                    <Badge variant="outline" className="border-red-200 text-red-600">
                      قيد الانتظار
                    </Badge>
                  </div>
                </div>
              )}

              {/* صف الإجمالي الكلي */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-100 to-slate-100/50 border border-slate-300 hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">الإجمالي الكلي</p>
                    <p className="text-xs text-slate-500">جميع المدفوعات</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(financialData.totalPaid)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
