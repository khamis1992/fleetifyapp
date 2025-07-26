import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemStats {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  totalRevenue: number;
  pendingPayments: number;
  systemUsage: number;
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
  name_ar?: string;
  price: number;
  billing_cycle: string;
  features: any; // JSON type from database
  max_users?: number;
  is_active: boolean;
}

export const useSuperAdminData = () => {
  const [stats, setStats] = useState<SystemStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    systemUsage: 0
  });
  const [companies, setCompanies] = useState<CompanyOverview[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSystemStats = async () => {
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

      const totalRevenue = revenueData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

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
        systemUsage: 75 // Mock system usage percentage
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      toast({
        title: "Error",
        description: "Failed to load system statistics",
        variant: "destructive"
      });
    }
  };

  const fetchCompanies = async () => {
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

      // Get user counts for each company
      const companiesWithCounts = await Promise.all(
        (data || []).map(async (company) => {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

          return {
            id: company.id,
            name: company.name,
            status: company.subscription_status || 'active',
            subscriptionPlan: company.subscription_plan || 'Basic',
            lastActive: company.updated_at,
            userCount: count || 0,
            monthlyRevenue: 100 // Mock data
          };
        })
      );

      setCompanies(companiesWithCounts);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive"
      });
    }
  };

  const fetchSubscriptionPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;

      setSubscriptionPlans(data || []);
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
    }
  };

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
  }, []);

  const refreshData = () => {
    fetchSystemStats();
    fetchCompanies();
    fetchSubscriptionPlans();
  };

  return {
    stats,
    companies,
    subscriptionPlans,
    loading,
    refreshData
  };
};