import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

interface StatCard {
  title: string;
  value: string;
  change: {
    value: string;
    trend: 'up' | 'down';
  };
  icon: React.ElementType;
  color: string;
  description: string;
}

export function PaymentStatsCards() {
  const { companyId } = useUnifiedCompanyAccess();
  const [stats, setStats] = useState({
    todayPayments: 0,
    monthPayments: 0,
    totalCustomers: 0,
    pendingInvoices: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentStats();
  }, [companyId]);

  const fetchPaymentStats = async () => {
    if (!companyId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

      // Today's payments
      const { data: todayPaymentsData } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', companyId)
        .eq('payment_date', today)
        .eq('payment_status', 'completed');

      // Month's payments
      const { data: monthPaymentsData } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', companyId)
        .gte('payment_date', startOfMonthStr)
        .eq('payment_status', 'completed');

      // Active customers with unpaid invoices
      const { data: customersData } = await supabase
        .from('invoices')
        .select('customer_id')
        .eq('company_id', companyId)
        .in('payment_status', ['unpaid', 'partial']);

      // Pending invoices count
      const { data: pendingInvoicesData } = await supabase
        .from('invoices')
        .select('id')
        .eq('company_id', companyId)
        .in('payment_status', ['unpaid', 'partial']);

      setStats({
        todayPayments: todayPaymentsData?.reduce((sum, p) => sum + p.amount, 0) || 0,
        monthPayments: monthPaymentsData?.reduce((sum, p) => sum + p.amount, 0) || 0,
        totalCustomers: new Set(customersData?.map(c => c.customer_id)).size || 0,
        pendingInvoices: pendingInvoicesData?.length || 0
      });
    } catch (error) {
      console.error('Error fetching payment stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const statsCards: StatCard[] = [
    {
      title: 'دفعات اليوم',
      value: formatCurrency(stats.todayPayments),
      change: {
        value: '+12.5%',
        trend: 'up'
      },
      icon: DollarSign,
      color: 'from-green-500/10 to-green-600/5 border-green-200/50',
      description: 'إجمالي الدفعات المسجلة اليوم'
    },
    {
      title: 'إجمالي الشهر',
      value: formatCurrency(stats.monthPayments),
      change: {
        value: '+8.2%',
        trend: 'up'
      },
      icon: TrendingUp,
      color: 'from-blue-500/10 to-blue-600/5 border-blue-200/50',
      description: 'إجمالي الدفعات هذا الشهر'
    },
    {
      title: 'العملاء النشطين',
      value: stats.totalCustomers.toString(),
      change: {
        value: '+5.3%',
        trend: 'up'
      },
      icon: Users,
      color: 'from-purple-500/10 to-purple-600/5 border-purple-200/50',
      description: 'عدد العملاء ذوي الفواتير المستحقة'
    },
    {
      title: 'الفواتير المعلقة',
      value: stats.pendingInvoices.toString(),
      change: {
        value: '-2.1%',
        trend: 'down'
      },
      icon: Calendar,
      color: 'from-orange-500/10 to-orange-600/5 border-orange-200/50',
      description: 'عدد الفواتير غير المدفوعة'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-20"></div>
                  <div className="h-8 bg-slate-200 rounded w-32"></div>
                </div>
                <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {statsCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div key={stat.title} variants={itemVariants}>
            <Card className={`relative overflow-hidden border-2 bg-gradient-to-br ${stat.color} hover:shadow-lg transition-all duration-300`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-white/50`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge
                    variant={stat.change.trend === 'up' ? 'default' : 'secondary'}
                    className={`flex items-center gap-1 ${
                      stat.change.trend === 'up'
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {stat.change.trend === 'up' ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {stat.change.value}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </h3>
                  <p className="text-2xl font-bold tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </div>

                {/* Subtle animated background effect */}
                <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-xl"></div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}