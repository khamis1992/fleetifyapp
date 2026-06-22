import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { NativeCard, NativeCardContent } from '@/components/ui/native';
import { Users, TrendingUp, Package, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesOpportunities } from '@/hooks/useSalesOpportunities';
import { useLowStockItems } from '@/hooks/useInventoryItems';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';

interface QuickStat {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  href: string;
}

export const QuickStatsRow: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useSimpleBreakpoint();

  // Fetch sales leads count
  const { data: leadsCount } = useQuery({
    queryKey: ['sales-leads-count', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return 0;

      const { count, error } = await supabase
        .from('sales_leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.profile?.company_id,
  });

  // Fetch active opportunities
  const { data: opportunities } = useSalesOpportunities({ is_active: true });
  const activeOpportunitiesCount = opportunities?.length || 0;

  // Fetch low stock items
  const { data: lowStockItems } = useLowStockItems();
  const lowStockCount = lowStockItems?.length || 0;

  // Fetch active vendors count
  const { data: vendorsCount } = useQuery({
    queryKey: ['vendors-count', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return 0;

      const { count, error } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.profile?.company_id,
  });

  const stats: QuickStat[] = [
    {
      label: 'إجمالي العملاء المحتملين',
      value: leadsCount || 0,
      icon: Users,
      color: 'text-blue-500',
      href: '/sales/leads',
    },
    {
      label: 'الفرص النشطة',
      value: activeOpportunitiesCount,
      icon: TrendingUp,
      color: 'text-purple-500',
      href: '/sales/pipeline',
    },
    {
      label: 'أصناف مخزون منخفض',
      value: lowStockCount,
      icon: Package,
      color: 'text-orange-500',
      href: '/inventory',
    },
    {
      label: 'الموردين النشطين',
      value: vendorsCount || 0,
      icon: Building,
      color: 'text-green-500',
      href: '/finance/vendors',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => {
        const StatCard = isMobile ? NativeCard : Card;
        
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ y: -2 }}
          >
            {isMobile ? (
              <NativeCard
                pressable
                ripple
                variant="elevated"
                onClick={() => navigate(stat.href)}
              >
                <NativeCardContent className="flex items-center justify-between py-4">
                  <div className="space-y-1 flex-1">
                    <p className="native-caption">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-muted/30 ${stat.color}`}>
                    <stat.icon size={20} />
                  </div>
                </NativeCardContent>
              </NativeCard>
            ) : (
              <Card
                className="p-4 cursor-pointer bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md"
                onClick={() => navigate(stat.href)}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1">
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-muted/30 ${stat.color}`}>
                    <stat.icon size={20} />
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
