import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Zap
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
  gradient: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export function PaymentStatsCardsRedesigned() {
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
      gradient: 'from-emerald-500 to-teal-600',
      bgColor: 'from-emerald-50/80 to-teal-50/50',
      borderColor: 'border-emerald-200/50',
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
      gradient: 'from-blue-500 to-indigo-600',
      bgColor: 'from-blue-50/80 to-indigo-50/50',
      borderColor: 'border-blue-200/50',
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
      gradient: 'from-purple-500 to-pink-600',
      bgColor: 'from-purple-50/80 to-pink-50/50',
      borderColor: 'border-purple-200/50',
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
      gradient: 'from-amber-500 to-orange-600',
      bgColor: 'from-amber-50/80 to-orange-50/50',
      borderColor: 'border-amber-200/50',
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
          <Card key={i} className="animate-pulse overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                  <div className="h-8 bg-slate-200 rounded w-32"></div>
                </div>
                <div className="w-14 h-14 bg-slate-200 rounded-2xl"></div>
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
            <Card className={`group relative overflow-hidden border-2 ${stat.borderColor} bg-gradient-to-br ${stat.bgColor} backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-${stat.gradient.split('-')[1]}-500/10 hover:-translate-y-1`}>
              {/* Animated background gradient */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5`} />
              </motion.div>

              {/* Floating decoration */}
              <motion.div
                className={`absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full blur-2xl`}
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 0],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />

              <CardContent className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  {/* Icon with animated gradient background */}
                  <motion.div
                    className={`p-3 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      animate={{
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </motion.div>
                  </motion.div>

                  {/* Change badge */}
                  <Badge
                    variant={stat.change.trend === 'up' ? 'default' : 'secondary'}
                    className={`flex items-center gap-1 backdrop-blur-sm ${
                      stat.change.trend === 'up'
                        ? 'bg-white/80 text-emerald-700 hover:bg-white'
                        : 'bg-white/80 text-red-700 hover:bg-white'
                    } shadow-sm`}
                  >
                    {stat.change.trend === 'up' ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {stat.change.value}
                  </Badge>
                </div>

                {/* Stats content */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-neutral-600">
                    {stat.title}
                  </h3>
                  <motion.p
                    className="text-3xl font-bold tracking-tight bg-gradient-to-br from-neutral-900 to-neutral-600 bg-clip-text text-transparent"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {stat.value}
                  </motion.p>
                  <p className="text-xs text-neutral-500">
                    {stat.description}
                  </p>
                </div>

                {/* Sparkle decoration on hover */}
                <motion.div
                  className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={{ scale: 0, rotate: -180 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Sparkles className={`h-4 w-4 text-${stat.gradient.split('-')[1]}-500`} />
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
