/**
 * مكون لوحة التحكم المالية المصغرة
 * عرض رسم بياني دائري وملخص مالي للعقد
 */

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Contract } from '@/types/contracts';

interface FinancialDashboardProps {
  contract: Contract;
  formatCurrency: (amount: number) => string;
}

export const FinancialDashboard = ({ contract, formatCurrency }: FinancialDashboardProps) => {
  const chartData = useMemo(() => {
    const rentAmount = contract.contract_amount || 0;
    const totalPaid = contract.total_paid || 0;
    const extraPayments = Math.max(0, totalPaid - rentAmount);
    const remaining = Math.max(0, rentAmount - totalPaid);

    return [
      {
        name: 'الإيجار المدفوع',
        value: Math.min(rentAmount, totalPaid),
        fill: '#10b981',
      },
      {
        name: 'مبالغ إضافية',
        value: extraPayments,
        fill: '#f97316',
      },
      {
        name: 'المتبقي',
        value: remaining,
        fill: '#d1d5db',
      },
    ].filter(item => item.value > 0);
  }, [contract]);

  const totalAmount = contract.contract_amount || 0;
  const totalPaid = contract.total_paid || 0;
  const paymentPercentage = totalAmount > 0 ? Math.round((Math.min(totalPaid, totalAmount) / totalAmount) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* الرسم البياني الدائري */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            توزيع المدفوعات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              لا توجد بيانات للعرض
            </div>
          )}
        </CardContent>
      </Card>

      {/* ملخص المعلومات المالية */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            ملخص مالي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* صف قيمة العقد */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm text-gray-700">قيمة العقد الأساسية</span>
            <span className="font-semibold text-blue-600">{formatCurrency(totalAmount)}</span>
          </div>

          {/* صف المدفوع */}
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">المدفوع</span>
              <Badge variant="secondary" className="text-xs">
                {paymentPercentage}%
              </Badge>
            </div>
            <span className="font-semibold text-green-600">{formatCurrency(Math.min(totalPaid, totalAmount))}</span>
          </div>

          {/* صف المبالغ الإضافية */}
          {totalPaid > totalAmount && (
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-gray-700">مبالغ إضافية</span>
              </div>
              <span className="font-semibold text-orange-600">{formatCurrency(totalPaid - totalAmount)}</span>
            </div>
          )}

          {/* صف المتبقي */}
          {totalPaid < totalAmount && (
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <span className="text-sm text-gray-700">المتبقي</span>
              <span className="font-semibold text-red-600">{formatCurrency(totalAmount - totalPaid)}</span>
            </div>
          )}

          {/* صف الإجمالي */}
          <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-300 font-bold">
            <span className="text-sm text-gray-800">الإجمالي المدفوع</span>
            <span className="text-gray-800">{formatCurrency(totalPaid)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
