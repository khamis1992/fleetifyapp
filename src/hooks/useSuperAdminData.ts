import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

export interface SystemStats {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  totalRevenue: number;
  pendingPayments: number;
  activeCompanyRate: number;
}

export interface CompanyOverview {
  id: string;
  name: string;
  status: string;
  subscriptionPlan: string;
  lastActive: string;
  userCount: number;
  monthlyRevenue: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  name_ar?: string | null;
  price: number;
  billing_cycle: string;
  features: Json | null;
  max_users?: number | null;
  is_active: boolean | null;
}

export const useSuperAdminData = () => {
  const [stats, setStats] = useState<SystemStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    activeCompanyRate: 0
  });
  const [companies, setCompanies] = useState<CompanyOverview[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSystemStats = useCallback(async () => {
    try {
      // Fetch company counts
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, subscription_status');

      if (companiesError) throw companiesError;

      const totalCompanies = companiesData?.length || 0;
      const activeCompanies = companiesData?.filter(c => c.subscription_status === 'active').length || 0;

      // Fetch user count via profiles
      const { count: userCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Fetch revenue from subscription transactions
      const { data: revenueData, error: revenueError } = await supabase
        .from('subscription_transactions')
        .select('amount')
        .eq('status', 'completed');

      if (revenueError) throw revenueError;

      const totalRevenue = revenueData?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

      // Fetch pending payments
      const { count: pendingCount, error: pendingError } = await supabase
        .from('subscription_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      setStats({
        totalCompanies,
        activeCompanies,
        totalUsers: userCount || 0,
        totalRevenue,
        pendingPayments: pendingCount || 0,
        activeCompanyRate: totalCompanies > 0
          ? Math.round((activeCompanies / totalCompanies) * 100)
          : 0
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      toast({
        title: "Error",
        description: "Failed to load system statistics",
        variant: "destructive"
      });
    }
  }, [toast]);

  const fetchCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          subscription_status,
          subscription_plan,
          updated_at,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const companyIds = (data || []).map(company => company.id);
      if (companyIds.length === 0) {
        setCompanies([]);
        return;
      }

      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);

      const [profilesResult, transactionsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('company_id')
          .in('company_id', companyIds),
        supabase
          .from('subscription_transactions')
          .select('company_id, amount')
          .in('company_id', companyIds)
          .eq('status', 'completed')
          .gte('created_at', monthStart.toISOString())
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (transactionsResult.error) throw transactionsResult.error;

      const userCounts = new Map<string, number>();
      for (const profile of profilesResult.data || []) {
        if (!profile.company_id) continue;
        userCounts.set(profile.company_id, (userCounts.get(profile.company_id) || 0) + 1);
      }

      const monthlyRevenueByCompany = new Map<string, number>();
      for (const transaction of transactionsResult.data || []) {
        monthlyRevenueByCompany.set(
          transaction.company_id,
          (monthlyRevenueByCompany.get(transaction.company_id) || 0) + Number(transaction.amount || 0)
        );
      }

      const companiesWithCounts = (data || []).map(company => ({
        id: company.id,
        name: company.name,
        status: company.subscription_status || 'active',
        subscriptionPlan: company.subscription_plan || 'Basic',
        lastActive: company.updated_at || company.created_at,
        userCount: userCounts.get(company.id) || 0,
        monthlyRevenue: monthlyRevenueByCompany.get(company.id) || 0
      }));

      setCompanies(companiesWithCounts);
    } catch (error) {
      // Log error in development only
      if (import.meta.env.DEV) {
        console.error('Error fetching companies:', error);
      }
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive"
      });
    }
  }, [toast]);

  const fetchSubscriptionPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;

      setSubscriptionPlans(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching subscription plans:', error);
      }
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchSystemStats(),
        fetchCompanies(),
        fetchSubscriptionPlans()
      ]);
      setLoading(false);
    };

    loadData();
  }, [fetchCompanies, fetchSubscriptionPlans, fetchSystemStats]);

  const refreshData = useCallback(() => {
    fetchSystemStats();
    fetchCompanies();
    fetchSubscriptionPlans();
  }, [fetchCompanies, fetchSubscriptionPlans, fetchSystemStats]);

  return {
    stats,
    companies,
    subscriptionPlans,
    loading,
    refreshData
  };
};
