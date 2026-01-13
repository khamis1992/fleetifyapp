import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileWarning,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Car,
  Users,
  AlertTriangle,
  Send,
  Bell
} from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useSendBulkViolationReminders } from '@/hooks/useTrafficViolationWhatsApp';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

// Import the TrafficViolation type
import { TrafficViolation } from '@/hooks/useTrafficViolations';

interface TrafficViolationsSmartDashboardProps {
  violations: TrafficViolation[];
}

// Hook to fetch ALL violations for accurate dashboard stats
const useTrafficViolationsDashboardStats = () => {
  return useQuery({
    queryKey: ['traffic-violations-dashboard-stats'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('المستخدم غير مسجل الدخول');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على بيانات المستخدم');

      // Fetch ALL violations for stats (no limit)
      const { data: violations, error } = await supabase
        .from('penalties')
        .select(`
          id,
          status,
          payment_status,
          amount,
          penalty_date,
          vehicle_id,
          vehicle_plate,
          customer_id
        `)
        .eq('company_id', profile.company_id);

      if (error) throw error;

      return violations as any[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });
};

// Health Score Display Component
const HealthScoreDisplay: React.FC<{ score: number }> = ({ score }) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return { text: 'text-green-600', bg: 'bg-green-500', label: 'ممتاز' };
    if (s >= 60) return { text: 'text-blue-600', bg: 'bg-blue-500', label: 'جيد' };
    if (s >= 40) return { text: 'text-amber-600', bg: 'bg-amber-500', label: 'متوسط' };
    return { text: 'text-red-600', bg: 'bg-red-500', label: 'ضعيف' };
  };

  const { text, bg, label } = getScoreColor(score);

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 transform -rotate-90">
          <circle
            cx="28"
            cy="28"
            r="24"
            stroke="currentColor"
            strokeWidth="5"
            fill="transparent"
            className="text-neutral-200"
          />
          <circle
            cx="28"
            cy="28"
            r="24"
            stroke="currentColor"
            strokeWidth="5"
            fill="transparent"
            strokeDasharray={`${score * 1.51} 151`}
            className={text}
            strokeLinecap="round"
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center font-bold text-sm ${text}`}>
          {score}
        </div>
      </div>
      <div>
        <div className={`text-sm font-bold ${text}`}>{label}</div>
        <div className="text-[10px] text-neutral-500">مؤشر الإدارة</div>
      </div>
    </div>
  );
};

// Smart Stat Card Component
interface SmartStatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
}

const SmartStatCard: React.FC<SmartStatCardProps> = ({
  title,
  value,
  subValue,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
}) => (
  <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100 hover:shadow-lg transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs text-neutral-500 mb-1">{title}</p>
        <p className="text-2xl font-black text-neutral-900">{value}</p>
        {subValue && (
          <p className="text-xs text-neutral-400 mt-1">{subValue}</p>
        )}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            <span>{trend.value}% {trend.label}</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  </div>
);

// Quick Summary Component
const QuickSummary: React.FC<{
  pendingCount: number;
  confirmedCount: number;
  cancelledCount: number;
  repeatedVehicles: number;
  repeatedCustomers: number;
}> = ({ pendingCount, confirmedCount, cancelledCount, repeatedVehicles, repeatedCustomers }) => (
  <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
    <h3 className="text-sm font-bold text-neutral-700 mb-4 flex items-center gap-2">
      <FileWarning className="w-4 h-4 text-rose-500" />
      ملخص سريع
    </h3>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="text-center p-3 bg-amber-50 rounded-xl">
        <div className="text-lg font-bold text-amber-600">{pendingCount.toLocaleString('en-US')}</div>
        <div className="text-[10px] text-amber-500">قيد المراجعة</div>
      </div>
      <div className="text-center p-3 bg-green-50 rounded-xl">
        <div className="text-lg font-bold text-green-600">{confirmedCount.toLocaleString('en-US')}</div>
        <div className="text-[10px] text-green-500">مؤكدة</div>
      </div>
      <div className="text-center p-3 bg-neutral-50 rounded-xl">
        <div className="text-lg font-bold text-neutral-600">{cancelledCount.toLocaleString('en-US')}</div>
        <div className="text-[10px] text-neutral-500">ملغاة</div>
      </div>
      <div className="text-center p-3 bg-rose-50 rounded-xl">
        <div className="text-lg font-bold text-coral-600">{repeatedVehicles.toLocaleString('en-US')}</div>
        <div className="text-[10px] text-rose-500">مركبات متكررة</div>
      </div>
      <div className="text-center p-3 bg-purple-50 rounded-xl">
        <div className="text-lg font-bold text-purple-600">{repeatedCustomers.toLocaleString('en-US')}</div>
        <div className="text-[10px] text-purple-500">عملاء متكررين</div>
      </div>
    </div>
  </div>
);

// Main Dashboard Component
export const TrafficViolationsSmartDashboard: React.FC<TrafficViolationsSmartDashboardProps> = ({ violations }) => {
  const { formatCurrency } = useCurrencyFormatter();
  const sendBulkReminders = useSendBulkViolationReminders();

  // Fetch ALL violations for accurate dashboard stats
  const { data: allViolations = [], isLoading: isLoadingStats } = useTrafficViolationsDashboardStats();

  // Calculate stats from ALL violations (not just paginated ones)
  const stats = useMemo(() => {
    // Use allViolations for stats if available, otherwise fall back to props
    const violationsData = allViolations.length > 0 ? allViolations : violations;

    const totalViolations = violationsData.length;
    const totalAmount = violationsData.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);

    const paidViolations = violationsData.filter(v => v.payment_status === 'paid');
    const unpaidViolations = violationsData.filter(v => v.payment_status === 'unpaid');
    const partiallyPaidViolations = violationsData.filter(v => v.payment_status === 'partially_paid');

    const paidAmount = paidViolations.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
    const unpaidAmount = unpaidViolations.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);

    const collectionRate = totalAmount > 0
      ? Math.round((paidAmount / totalAmount) * 100)
      : 0;

    const averageViolationAmount = totalViolations > 0
      ? totalAmount / totalViolations
      : 0;

    // Calculate health score
    const violationsHealthScore = totalViolations > 0
      ? Math.round((paidViolations.length / totalViolations) * 100)
      : 100;

    // Status counts
    const pendingCount = violationsData.filter(v => v.status === 'pending').length;
    const confirmedCount = violationsData.filter(v => v.status === 'confirmed').length;
    const cancelledCount = violationsData.filter(v => v.status === 'cancelled').length;

    // Repeated violations
    const vehicleCounts = violationsData.reduce((acc, v) => {
      const key = v.vehicle_id || v.vehicle_plate || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const repeatedVehicles = Object.values(vehicleCounts).filter(count => count > 1).length;

    const customerCounts = violationsData.reduce((acc, v) => {
      if (v.customer_id) {
        acc[v.customer_id] = (acc[v.customer_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const repeatedCustomers = Object.values(customerCounts).filter(count => count > 1).length;

    // Overdue violations (more than 30 days old)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const overdueViolations = violationsData.filter(v => {
      const penaltyDate = v.penalty_date ? new Date(v.penalty_date) : null;
      return penaltyDate && penaltyDate < thirtyDaysAgo && v.payment_status !== 'paid';
    }).length;

    // High value violations (above 500 QAR)
    const highValueViolations = violationsData.filter(v => Number(v.amount) > 500).length;

    // Violations without customers
    const violationsWithoutCustomers = violationsData.filter(v => !v.customer_id);
    const violationsWithoutCustomersCount = violationsWithoutCustomers.length;
    const violationsWithoutCustomersAmount = violationsWithoutCustomers.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);

    // Violations with customers (linked to customers)
    const violationsWithCustomers = violationsData.filter(v => v.customer_id);
    const violationsWithCustomersCount = violationsWithCustomers.length;
    const violationsWithCustomersAmount = violationsWithCustomers.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);

    // Monthly data
    const today = new Date();
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const thisMonthCount = violationsData.filter(v => {
      const penaltyDate = v.penalty_date ? new Date(v.penalty_date) : null;
      return penaltyDate && penaltyDate >= startOfThisMonth;
    }).length;

    const lastMonthCount = violationsData.filter(v => {
      const penaltyDate = v.penalty_date ? new Date(v.penalty_date) : null;
      return penaltyDate && penaltyDate >= startOfLastMonth && penaltyDate < startOfThisMonth;
    }).length;

    return {
      totalViolations,
      totalAmount,
      unpaidAmount,
      unpaidCount: unpaidViolations.length,
      paidAmount,
      paidCount: paidViolations.length,
      collectionRate,
      averageViolationAmount,
      violationsHealthScore,
      pendingCount,
      confirmedCount,
      cancelledCount,
      repeatedVehicles,
      repeatedCustomers,
      overdueViolations,
      highValueViolations,
      thisMonthCount,
      lastMonthCount,
      violationsWithoutCustomersCount,
      violationsWithoutCustomersAmount,
      violationsWithCustomersCount,
      violationsWithCustomersAmount
    };
  }, [allViolations, violations]);

  // Calculate month-over-month change
  const monthChange = stats.lastMonthCount > 0
    ? Math.round(((stats.thisMonthCount - stats.lastMonthCount) / stats.lastMonthCount) * 100)
    : 0;

  const handleSendBulkReminders = () => {
    if (window.confirm('هل تريد إرسال تذكيرات WhatsApp لجميع المخالفات غير المسددة (أكثر من 7 أيام)؟')) {
      sendBulkReminders.mutate({ daysOverdue: 7 });
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Violations Amount */}
        <SmartStatCard
          title="إجمالي المخالفات"
          value={formatCurrency(stats.totalAmount)}
          subValue={`${stats.totalViolations.toLocaleString('en-US')} مخالفة`}
          icon={FileWarning}
          iconBg="bg-rose-50"
          iconColor="text-coral-600"
          trend={monthChange !== 0 ? {
            value: Math.abs(monthChange),
            isPositive: monthChange < 0,
            label: monthChange < 0 ? 'انخفاض' : 'زيادة'
          } : undefined}
        />

        {/* Violations With Customers */}
        <SmartStatCard
          title="مخالفات مربوطة بعملاء"
          value={formatCurrency(stats.violationsWithCustomersAmount)}
          subValue={`${stats.violationsWithCustomersCount} مخالفة`}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        {/* Paid Amount */}
        <SmartStatCard
          title="مبالغ مسددة"
          value={formatCurrency(stats.paidAmount)}
          subValue={`${stats.paidCount} مخالفة`}
          icon={CheckCircle}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />

        {/* Violations Without Customers */}
        <SmartStatCard
          title="مخالفات بدون عملاء"
          value={formatCurrency(stats.violationsWithoutCustomersAmount)}
          subValue={`${stats.violationsWithoutCustomersCount} مخالفة`}
          icon={Users}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Alerts Summary - Only show if there are issues */}
      {(stats.overdueViolations > 0 || stats.highValueViolations > 0) && (
        <div className="bg-red-50 rounded-[1.25rem] p-4 border border-red-100">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div className="flex-1">
              <span className="text-sm font-bold text-red-700">تنبيهات هامة: </span>
              {stats.overdueViolations > 0 && (
                <span className="text-sm text-red-600 mr-3">
                  🔴 {stats.overdueViolations} مخالفة متأخرة (&gt;30 يوم)
                </span>
              )}
              {stats.highValueViolations > 0 && (
                <span className="text-sm text-red-600 mr-3">
                  🟠 {stats.highValueViolations} مخالفة بمبلغ عالي
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendBulkReminders}
              disabled={sendBulkReminders.isPending}
              className="border-red-200 text-red-600 hover:bg-red-100 rounded-xl"
            >
              <Send className="w-4 h-4 ml-2" />
              {sendBulkReminders.isPending ? 'جاري الإرسال...' : 'إرسال تذكيرات'}
            </Button>
          </div>
        </div>
      )}

      {/* Quick Summary */}
      <QuickSummary
        pendingCount={stats.pendingCount}
        confirmedCount={stats.confirmedCount}
        cancelledCount={stats.cancelledCount}
        repeatedVehicles={stats.repeatedVehicles}
        repeatedCustomers={stats.repeatedCustomers}
      />
    </div>
  );
};

export default TrafficViolationsSmartDashboard;

