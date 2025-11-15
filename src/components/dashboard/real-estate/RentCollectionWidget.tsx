import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useRealEstateDashboardStats } from '@/hooks/useRealEstateDashboardStats';
import { usePayments } from '@/hooks/usePayments.unified';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { ExportButton } from '@/components/exports';
import { WidgetSkeleton } from '@/components/ui/skeletons';
import { EmptyStateCompact } from '@/components/ui/EmptyState';
import { EnhancedTooltip, kpiDefinitions } from '@/components/ui/EnhancedTooltip';

export const RentCollectionWidget: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const { data: stats, isLoading: statsLoading } = useRealEstateDashboardStats();
  const { data: paymentsData, isLoading: paymentsLoading } = usePayments();
  const { formatCurrency } = useCurrencyFormatter();
  const navigate = useNavigate();

  const isLoading = statsLoading || paymentsLoading;

  if (isLoading) {
    return <WidgetSkeleton hasChart hasStats statCount={3} />;
  }

  if (!stats) return null;

  // Get current month payments
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const payments = paymentsData?.data || paymentsData || [];

  // Filter payments for current month
  const currentMonthPayments = payments.filter((payment: any) => {
    const paymentDate = new Date(payment.payment_date);
    return paymentDate.getMonth() === currentMonth &&
           paymentDate.getFullYear() === currentYear &&
           payment.payment_type === 'receipt';
  });

  // Calculate rent collected this month
  const rentCollected = currentMonthPayments
    .filter((p: any) => p.payment_status === 'completed')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  // Expected rent from active contracts
  const expectedRent = stats.monthly_revenue || 0;

  // Outstanding rent
  const outstandingRent = Math.max(0, expectedRent - rentCollected);

  // Calculate collection rate
  const collectionRate = expectedRent > 0 ? (rentCollected / expectedRent) * 100 : 0;

  // Calculate overdue payments by aging
  const overduePayments = payments.filter((payment: any) => {
    if (payment.payment_status !== 'pending') return false;
    const dueDate = new Date(payment.payment_date);
    const daysOverdue = Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 0;
  });

  // Aging buckets
  const aging1_30 = overduePayments.filter((p: any) => {
    const dueDate = new Date(p.payment_date);
    const daysOverdue = Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue >= 1 && daysOverdue <= 30;
  });

  const aging31_60 = overduePayments.filter((p: any) => {
    const dueDate = new Date(p.payment_date);
    const daysOverdue = Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue >= 31 && daysOverdue <= 60;
  });

  const aging60Plus = overduePayments.filter((p: any) => {
    const dueDate = new Date(p.payment_date);
    const daysOverdue = Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 60;
  });

  // Calculate amounts for each aging bucket
  const aging1_30Amount = aging1_30.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const aging31_60Amount = aging31_60.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const aging60PlusAmount = aging60Plus.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  // Aging chart data
  const agingData = [
    { name: '1-30 يوم', amount: aging1_30Amount, count: aging1_30.length },
    { name: '31-60 يوم', amount: aging31_60Amount, count: aging31_60.length },
    { name: '60+ يوم', amount: aging60PlusAmount, count: aging60Plus.length },
  ];

  // Prepare export data
  const exportData = useMemo(() => [
    { المؤشر: 'إيجارات محصلة', القيمة: formatCurrency(rentCollected) },
    { المؤشر: 'إيجارات متأخرة', القيمة: formatCurrency(outstandingRent) },
    { المؤشر: 'معدل التحصيل', القيمة: `${collectionRate.toFixed(1)}%` },
    { المؤشر: 'متأخرات 1-30 يوم', القيمة: formatCurrency(aging1_30Amount), 'عدد الدفعات': aging1_30.length },
    { المؤشر: 'متأخرات 31-60 يوم', القيمة: formatCurrency(aging31_60Amount), 'عدد الدفعات': aging31_60.length },
    { المؤشر: 'متأخرات 60+ يوم', القيمة: formatCurrency(aging60PlusAmount), 'عدد الدفعات': aging60Plus.length },
  ], [rentCollected, outstandingRent, collectionRate, aging1_30Amount, aging1_30.length, aging31_60Amount, aging31_60.length, aging60PlusAmount, aging60Plus.length, formatCurrency]);

  // Top late payers (mock for now - would need customer data)
  const topLatePayers = overduePayments
    .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                تتبع تحصيل الإيجارات
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton
                chartRef={chartRef}
                data={exportData}
                filename="rent_collection"
                title="تتبع تحصيل الإيجارات"
                variant="ghost"
                size="sm"
              />
              <button
                onClick={() => navigate('/finance/payments')}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                عرض المدفوعات ←
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent ref={chartRef} className="p-6 space-y-6">
          {/* Collection Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">إيجارات محصلة</span>
              </div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(rentCollected)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-gray-600">إيجارات متأخرة</span>
              </div>
              <div className="text-2xl font-bold text-orange-700">
                {formatCurrency(outstandingRent)}
              </div>
            </div>
          </div>

          {/* Collection Rate */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <EnhancedTooltip kpi={kpiDefinitions.collection_rate}>
                <span className="text-sm text-gray-600">معدل التحصيل</span>
              </EnhancedTooltip>
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                collectionRate >= 90
                  ? 'bg-green-100 text-green-700'
                  : collectionRate >= 70
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                <TrendingUp className="w-3 h-3" />
                {collectionRate >= 90 ? 'ممتاز' : collectionRate >= 70 ? 'جيد' : 'يحتاج تحسين'}
              </div>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {collectionRate.toFixed(1)}%
              </span>
            </div>
            {/* Progress Bar */}
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute top-0 right-0 h-full bg-gradient-to-l from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Overdue Aging Chart */}
          {overduePayments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 text-right">تصنيف المتأخرات حسب المدة</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="amount" fill="url(#colorAmount)" radius={[8, 8, 0, 0]} />
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Overdue Summary */}
          {overduePayments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 text-right">ملخص المتأخرات</h4>
              <div className="space-y-2">
                {agingData.map((bucket, index) => (
                  bucket.count > 0 && (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">{formatCurrency(bucket.amount)}</span>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">{bucket.name}</span>
                        <span className="text-xs text-gray-400 mr-2">({bucket.count} دفعة)</span>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/finance/payments')}
              className="py-2 px-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl text-sm"
            >
              إرسال تذكير
            </button>
            <button
              onClick={() => navigate('/finance/payments')}
              className="py-2 px-4 bg-white border-2 border-emerald-500 text-emerald-600 rounded-lg font-medium hover:bg-emerald-50 transition-all duration-300 text-sm"
            >
              عرض المتأخرات
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
