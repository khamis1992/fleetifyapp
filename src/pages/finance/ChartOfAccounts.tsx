/**
 * صفحة دليل الحسابات - تصميم جديد متوافق مع الداشبورد
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { EnhancedChartOfAccountsManagement } from '@/components/finance/EnhancedChartOfAccountsManagement';
import { ChartOfAccountsErrorBoundary } from '@/components/finance/ChartOfAccountsErrorBoundary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import {
  ListTree,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  PiggyBank,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  delay = 0,
}) => (
  <motion.div
    className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-slate-100"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <p className="text-sm text-neutral-500 mb-1">{title}</p>
    <p className="text-2xl font-bold text-neutral-900">{value}</p>
    {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
  </motion.div>
);

const ChartOfAccounts = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: accounts, isLoading, refetch } = useChartOfAccounts();

  // Calculate statistics
  const stats = useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return {
        totalAccounts: 0,
        activeAccounts: 0,
        assetAccounts: 0,
        liabilityAccounts: 0,
        equityAccounts: 0,
        revenueAccounts: 0,
        expenseAccounts: 0,
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
      };
    }

    const activeAccounts = accounts.filter(a => a.is_active !== false);
    const assetAccounts = accounts.filter(a => a.account_type === 'assets');
    const liabilityAccounts = accounts.filter(a => a.account_type === 'liabilities');
    const equityAccounts = accounts.filter(a => a.account_type === 'equity');
    const revenueAccounts = accounts.filter(a => a.account_type === 'revenue');
    const expenseAccounts = accounts.filter(a => a.account_type === 'expenses');

    const totalAssets = assetAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
    const totalEquity = equityAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);

    return {
      totalAccounts: accounts.length,
      activeAccounts: activeAccounts.length,
      assetAccounts: assetAccounts.length,
      liabilityAccounts: liabilityAccounts.length,
      equityAccounts: equityAccounts.length,
      revenueAccounts: revenueAccounts.length,
      expenseAccounts: expenseAccounts.length,
      totalAssets,
      totalLiabilities,
      totalEquity,
    };
  }, [accounts]);

  return (
    <ChartOfAccountsErrorBoundary
      error={null}
      isLoading={false}
      onRetry={() => window.location.reload()}
    >
      <div className="min-h-screen bg-[#f0efed] p-6" dir="rtl">
        {/* Hero Header */}
        <motion.div
          className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl p-6 mb-6 text-white shadow-lg"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <ListTree className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">دليل الحسابات</h1>
                <p className="text-white/80 text-sm mt-1">
                  نظام ذكي لإدارة وتنظيم شجرة الحسابات المحاسبية
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => refetch()}
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
              <Button
                onClick={() => navigate('/finance/accounting')}
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                <ArrowLeft className="h-4 w-4 ml-2" />
                العودة
              </Button>
            </div>
          </div>

          {/* Quick Financial Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">إجمالي الحسابات</p>
              <p className="text-2xl font-bold mt-1">{stats.totalAccounts}</p>
              <p className="text-xs text-white/60">{stats.activeAccounts} حساب نشط</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">الأصول</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalAssets)}</p>
              <p className="text-xs text-white/60">{stats.assetAccounts} حساب</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">الخصوم</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalLiabilities)}</p>
              <p className="text-xs text-white/60">{stats.liabilityAccounts} حساب</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">حقوق الملكية</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalEquity)}</p>
              <p className="text-xs text-white/60">{stats.equityAccounts} حساب</p>
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="حسابات الأصول"
            value={stats.assetAccounts}
            subtitle="Assets"
            icon={TrendingUp}
            iconBg="bg-gradient-to-br from-green-500 to-emerald-500"
            delay={0.1}
          />
          <StatCard
            title="حسابات الخصوم"
            value={stats.liabilityAccounts}
            subtitle="Liabilities"
            icon={TrendingDown}
            iconBg="bg-gradient-to-br from-red-500 to-rose-500"
            delay={0.15}
          />
          <StatCard
            title="حقوق الملكية"
            value={stats.equityAccounts}
            subtitle="Equity"
            icon={Building2}
            iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
            delay={0.2}
          />
          <StatCard
            title="حسابات الإيرادات"
            value={stats.revenueAccounts}
            subtitle="Revenue"
            icon={Wallet}
            iconBg="bg-gradient-to-br from-purple-500 to-indigo-500"
            delay={0.25}
          />
          <StatCard
            title="حسابات المصروفات"
            value={stats.expenseAccounts}
            subtitle="Expenses"
            icon={Receipt}
            iconBg="bg-gradient-to-br from-rose-500 to-orange-500"
            delay={0.3}
          />
        </div>

        {/* Main Content */}
        <motion.div
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <EnhancedChartOfAccountsManagement />
        </motion.div>
      </div>
    </ChartOfAccountsErrorBoundary>
  );
};

export default ChartOfAccounts;
