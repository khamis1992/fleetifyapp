/**
 * صفحة دليل الحسابات - تصميم جديد متوافق مع الداشبورد
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { EnhancedChartOfAccountsManagement } from '@/components/finance/EnhancedChartOfAccountsManagement';
import { ChartOfAccountsErrorBoundary } from '@/components/finance/ChartOfAccountsErrorBoundary';
import { Button } from '@/components/ui/button';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { StatCard } from '@/components/ui/StatCard';
import {
  ListTree,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Building2,
} from 'lucide-react';

const ChartOfAccounts = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: accounts, refetch } = useChartOfAccounts();

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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">دليل الحسابات</h1>
              <p className="text-sm text-slate-500 mt-1">
                نظام ذكي لإدارة وتنظيم شجرة الحسابات المحاسبية
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
              <Button
                onClick={() => navigate('/finance/accounting')}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 ml-2" />
                العودة
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="حسابات الأصول"
              value={stats.assetAccounts}
              subtitle="Assets"
              icon={TrendingUp}
              variant="emerald"
              delay={0.1}
            />
            <StatCard
              title="حسابات الخصوم"
              value={stats.liabilityAccounts}
              subtitle="Liabilities"
              icon={TrendingDown}
              variant="danger"
              delay={0.15}
            />
            <StatCard
              title="حقوق الملكية"
              value={stats.equityAccounts}
              subtitle="Equity"
              icon={Building2}
              variant="sky"
              delay={0.2}
            />
            <StatCard
              title="حسابات الإيرادات"
              value={stats.revenueAccounts}
              subtitle="Revenue"
              icon={Wallet}
              variant="violet"
              delay={0.25}
            />
            <StatCard
              title="حسابات المصروفات"
              value={stats.expenseAccounts}
              subtitle="Expenses"
              icon={Receipt}
              variant="coral"
              delay={0.3}
            />
          </div>

          <motion.div
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <EnhancedChartOfAccountsManagement />
          </motion.div>
        </div>
      </div>
    </ChartOfAccountsErrorBoundary>
  );
};

export default ChartOfAccounts;