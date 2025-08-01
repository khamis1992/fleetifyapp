import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubscriptionsAnalytics {
  monthlyRevenue: number;
  activeSubscriptions: number;
  averageSubscriptionValue: number;
  renewalRate: number;
  revenueGrowth: number;
  subscriptionGrowth: number;
  avgValueGrowth: number;
  renewalRateChange: number;
  revenueByPlan: Array<{
    plan: string;
    revenue: number;
    count: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    subscriptions: number;
  }>;
}

export const useSubscriptionsAnalytics = (period: 'month' | 'quarter' | 'year' = 'month') => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['subscriptions-analytics', user?.id, period],
    queryFn: async (): Promise<SubscriptionsAnalytics> => {
      console.log('🔍 [ANALYTICS] Starting subscription analytics fetch', { userId: user?.id, roles: user?.roles });
      
      if (!user?.id) {
        console.error('🔍 [ANALYTICS] No user ID found');
        throw new Error('المستخدم غير مصرح له');
      }

      // Check if user is super admin
      if (!user.roles?.includes('super_admin')) {
        console.error('🔍 [ANALYTICS] User does not have super_admin role', { roles: user.roles });
        throw new Error('صلاحيات غير كافية');
      }
      
      console.log('🔍 [ANALYTICS] User authenticated as super_admin, fetching companies...');

      // Get companies data with subscription info
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          subscription_status,
          subscription_plan,
          subscription_expires_at,
          created_at,
          updated_at
        `);

      console.log('🔍 [ANALYTICS] Companies query response:', { 
        companiesCount: companies?.length || 0, 
        error: companiesError,
        sampleCompany: companies?.[0] 
      });

      if (companiesError) {
        console.error('🔍 [ANALYTICS] Error fetching companies:', companiesError);
        throw companiesError;
      }

      // Calculate analytics based on companies data
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const activeCompanies = companies?.filter(c => c.subscription_status === 'active') || [];
      const lastMonthActive = companies?.filter(c => 
        c.subscription_status === 'active' && 
        new Date(c.created_at) < currentMonth
      ) || [];

      // Mock pricing data - in real app this would come from subscription_plans table
      const planPricing = {
        'basic': 25,
        'premium': 50,
        'enterprise': 100
      };

      const monthlyRevenue = activeCompanies.reduce((total, company) => {
        const plan = company.subscription_plan || 'basic';
        return total + (planPricing[plan as keyof typeof planPricing] || 25);
      }, 0);

      const lastMonthRevenue = lastMonthActive.reduce((total, company) => {
        const plan = company.subscription_plan || 'basic';
        return total + (planPricing[plan as keyof typeof planPricing] || 25);
      }, 0);

      const revenueByPlan = Object.entries(planPricing).map(([plan, price]) => {
        const count = activeCompanies.filter(c => c.subscription_plan === plan).length;
        return {
          plan,
          revenue: count * price,
          count
        };
      });

      // Generate monthly trend data for the last 6 months
      const monthlyTrend = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('ar', { month: 'short', year: 'numeric' });
        
        // Mock data for trend - in real app this would be calculated from historical data
        const subscriptions = Math.max(1, activeCompanies.length - i * 2);
        const revenue = subscriptions * 40; // Average price
        
        monthlyTrend.push({
          month: monthName,
          revenue,
          subscriptions
        });
      }

      const result = {
        monthlyRevenue,
        activeSubscriptions: activeCompanies.length,
        averageSubscriptionValue: monthlyRevenue / Math.max(activeCompanies.length, 1),
        renewalRate: 94.5, // Mock data
        revenueGrowth: lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0,
        subscriptionGrowth: lastMonthActive.length > 0 ? ((activeCompanies.length - lastMonthActive.length) / lastMonthActive.length * 100) : 0,
        avgValueGrowth: 5.2, // Mock data
        renewalRateChange: 2.1, // Mock data
        revenueByPlan,
        monthlyTrend
      };
      
      console.log('🔍 [ANALYTICS] Final analytics result:', result);
      return result;
    },
    enabled: !!user?.id && user.roles?.includes('super_admin'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Log errors and success manually
  if (query.error) {
    console.error('🔍 [ANALYTICS] Query error:', query.error);
  }
  
  if (query.data) {
    console.log('🔍 [ANALYTICS] Query success:', query.data);
  }

  return query;
};