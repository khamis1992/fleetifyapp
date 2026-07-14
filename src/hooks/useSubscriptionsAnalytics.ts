import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type SubscriptionTransaction = Database['public']['Tables']['subscription_transactions']['Row'];

export interface SubscriptionsAnalytics {
  monthlyRevenue: number;
  activeSubscriptions: number;
  averageSubscriptionValue: number;
  renewalRate: number;
  revenueGrowth: number;
  subscriptionGrowth: number;
  avgValueGrowth: number;
  renewalRateChange: number;
  revenueByPlan: Array<{ plan: string; revenue: number; count: number }>;
  monthlyTrend: Array<{ month: string; revenue: number; subscriptions: number }>;
}

const transactionTimestamp = (transaction: SubscriptionTransaction): number => {
  const value = transaction.processed_at || transaction.created_at;
  return value ? new Date(value).getTime() : 0;
};

const percentageChange = (current: number, previous: number) =>
  previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

const periodRanges = (period: 'month' | 'quarter' | 'year', now = new Date()) => {
  if (period === 'year') {
    return {
      currentStart: new Date(now.getFullYear(), 0, 1),
      previousStart: new Date(now.getFullYear() - 1, 0, 1),
      previousEnd: new Date(now.getFullYear(), 0, 1),
    };
  }
  if (period === 'quarter') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return {
      currentStart: new Date(now.getFullYear(), quarterStartMonth, 1),
      previousStart: new Date(now.getFullYear(), quarterStartMonth - 3, 1),
      previousEnd: new Date(now.getFullYear(), quarterStartMonth, 1),
    };
  }
  return {
    currentStart: new Date(now.getFullYear(), now.getMonth(), 1),
    previousStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    previousEnd: new Date(now.getFullYear(), now.getMonth(), 1),
  };
};

const completionRate = (transactions: SubscriptionTransaction[]) => {
  const terminal = transactions.filter(transaction => ['completed', 'failed'].includes(transaction.status));
  if (!terminal.length) return 0;
  return terminal.filter(transaction => transaction.status === 'completed').length / terminal.length * 100;
};

export const useSubscriptionsAnalytics = (period: 'month' | 'quarter' | 'year' = 'month') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscriptions-analytics', user?.id, period],
    queryFn: async (): Promise<SubscriptionsAnalytics> => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');
      if (!user.roles?.includes('super_admin')) throw new Error('صلاحيات غير كافية');

      const [transactionsResult, plansResult, companiesResult] = await Promise.all([
        supabase.from('subscription_transactions').select('*').order('created_at', { ascending: true }),
        supabase.from('subscription_plans').select('id,name,name_ar,plan_code'),
        supabase.from('companies').select('id,subscription_status,created_at'),
      ]);
      if (transactionsResult.error) throw transactionsResult.error;
      if (plansResult.error) throw plansResult.error;
      if (companiesResult.error) throw companiesResult.error;

      const transactions = transactionsResult.data || [];
      const plans = plansResult.data || [];
      const companies = companiesResult.data || [];
      const now = new Date();
      const ranges = periodRanges(period, now);
      const currentStart = ranges.currentStart.getTime();
      const previousStart = ranges.previousStart.getTime();
      const previousEnd = ranges.previousEnd.getTime();
      const nowTime = now.getTime();

      const currentTransactions = transactions.filter(transaction => {
        const time = transactionTimestamp(transaction);
        return time >= currentStart && time <= nowTime;
      });
      const previousTransactions = transactions.filter(transaction => {
        const time = transactionTimestamp(transaction);
        return time >= previousStart && time < previousEnd;
      });
      const currentCompleted = currentTransactions.filter(transaction => transaction.status === 'completed');
      const previousCompleted = previousTransactions.filter(transaction => transaction.status === 'completed');
      const currentRevenue = currentCompleted.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      const previousRevenue = previousCompleted.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      const currentAverage = currentCompleted.length ? currentRevenue / currentCompleted.length : 0;
      const previousAverage = previousCompleted.length ? previousRevenue / previousCompleted.length : 0;
      const currentRenewalRate = completionRate(currentTransactions);
      const previousRenewalRate = completionRate(previousTransactions);

      const activeCompanies = companies.filter(company => company.subscription_status === 'active');
      const currentNewSubscriptions = activeCompanies.filter(company => {
        const created = company.created_at ? new Date(company.created_at).getTime() : 0;
        return created >= currentStart && created <= nowTime;
      }).length;
      const previousNewSubscriptions = activeCompanies.filter(company => {
        const created = company.created_at ? new Date(company.created_at).getTime() : 0;
        return created >= previousStart && created < previousEnd;
      }).length;

      const planMap = new Map(plans.map(plan => [plan.id, plan.name_ar || plan.name || plan.plan_code || 'غير محدد']));
      const planTotals = new Map<string, { revenue: number; count: number }>();
      currentCompleted.forEach(transaction => {
        const plan = planMap.get(transaction.subscription_plan_id) || 'خطة غير معروفة';
        const current = planTotals.get(plan) || { revenue: 0, count: 0 };
        current.revenue += Number(transaction.amount || 0);
        current.count += 1;
        planTotals.set(plan, current);
      });

      const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
        const offset = 5 - index;
        const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
        const completed = transactions.filter(transaction => {
          const time = transactionTimestamp(transaction);
          return transaction.status === 'completed' && time >= start.getTime() && time < end.getTime();
        });
        return {
          month: start.toLocaleDateString('ar-QA', { month: 'short', year: 'numeric' }),
          revenue: completed.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
          subscriptions: completed.length,
        };
      });

      return {
        monthlyRevenue: currentRevenue,
        activeSubscriptions: activeCompanies.length,
        averageSubscriptionValue: currentAverage,
        renewalRate: currentRenewalRate,
        revenueGrowth: percentageChange(currentRevenue, previousRevenue),
        subscriptionGrowth: percentageChange(currentNewSubscriptions, previousNewSubscriptions),
        avgValueGrowth: percentageChange(currentAverage, previousAverage),
        renewalRateChange: currentRenewalRate - previousRenewalRate,
        revenueByPlan: [...planTotals.entries()].map(([plan, totals]) => ({ plan, ...totals })),
        monthlyTrend,
      };
    },
    enabled: !!user?.id && user.roles?.includes('super_admin'),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};
