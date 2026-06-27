import { type CSSProperties, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { EnhancedChartOfAccountsManagement } from '@/components/finance/EnhancedChartOfAccountsManagement';
import { ChartOfAccountsErrorBoundary } from '@/components/finance/ChartOfAccountsErrorBoundary';
import { Button } from '@/components/ui/button';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Building2,
  ListChecks,
  Network,
} from 'lucide-react';

const chartTheme = {
  text: systemColorPattern.colors.text,
  surface: systemColorPattern.colors.surface,
  inner: systemColorPattern.colors.innerSurface,
  muted: systemColorPattern.colors.secondaryText,
  border: systemColorPattern.colors.border,
  info: systemColorPattern.colors.info,
  alert: systemColorPattern.colors.alert,
  focus: systemColorPattern.colors.focus,
  success: systemColorPattern.colors.success,
};

const chartStyle = {
  '--chart-text': chartTheme.text,
  '--chart-surface': chartTheme.surface,
  '--chart-inner': chartTheme.inner,
  '--chart-muted': chartTheme.muted,
  '--chart-border': chartTheme.border,
  '--chart-info': chartTheme.info,
  '--chart-alert': chartTheme.alert,
  '--chart-focus': chartTheme.focus,
  '--chart-success': chartTheme.success,
} as CSSProperties;

const typeCards = [
  { key: 'assetAccounts', label: 'الأصول', helper: 'Assets', icon: TrendingUp, accent: chartTheme.success },
  { key: 'liabilityAccounts', label: 'الخصوم', helper: 'Liabilities', icon: TrendingDown, accent: chartTheme.alert },
  { key: 'equityAccounts', label: 'حقوق الملكية', helper: 'Equity', icon: Building2, accent: chartTheme.info },
  { key: 'revenueAccounts', label: 'الإيرادات', helper: 'Revenue', icon: Wallet, accent: chartTheme.focus },
  { key: 'expenseAccounts', label: 'المصروفات', helper: 'Expenses', icon: Receipt, accent: chartTheme.alert },
] as const;

const ChartOfAccounts = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const formatQar = (amount: number) => formatCurrency(amount || 0, { currency: 'QAR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        headerAccounts: 0,
        postingAccounts: 0,
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
      headerAccounts: accounts.filter(a => a.is_header).length,
      postingAccounts: accounts.filter(a => !a.is_header).length,
    };
  }, [accounts]);

  return (
    <ChartOfAccountsErrorBoundary
      error={null}
      isLoading={false}
      onRetry={() => window.location.reload()}
    >
      <div className="chart-accounts-page" dir="rtl" style={chartStyle}>
        <div className="space-y-5">
          <motion.section
            className="chart-accounts-command"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3">
                <span className="chart-accounts-command-icon">
                  <Network className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-normal" style={{ color: chartTheme.success }}>
                    Chart of accounts
                  </p>
                  <h1 className="mt-1 text-2xl font-black tracking-normal" style={{ color: chartTheme.text }}>
                    دليل الحسابات
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-7" style={{ color: chartTheme.muted }}>
                    إدارة شجرة الحسابات، القوالب، العرض التفاعلي، وإنشاء الحسابات الفرعية من مساحة عمل واحدة.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => refetch()} variant="outline" size="sm" className="chart-accounts-outline">
                  <RefreshCw className="h-4 w-4 ml-2" />
                  تحديث
                </Button>
                <Button onClick={() => navigate('/finance/accounting')} variant="outline" size="sm" className="chart-accounts-outline">
                  <ArrowLeft className="h-4 w-4 ml-2" />
                  العودة
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="chart-accounts-balance">
                <span className="chart-accounts-mini-icon">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <div>
                  <p>إجمالي الأصول</p>
                  <strong>{formatQar(stats.totalAssets)}</strong>
                </div>
              </div>
              <div className="chart-accounts-balance">
                <span className="chart-accounts-mini-icon chart-accounts-mini-alert">
                  <TrendingDown className="h-4 w-4" />
                </span>
                <div>
                  <p>إجمالي الخصوم</p>
                  <strong>{formatQar(stats.totalLiabilities)}</strong>
                </div>
              </div>
              <div className="chart-accounts-balance">
                <span className="chart-accounts-mini-icon chart-accounts-mini-focus">
                  <ListChecks className="h-4 w-4" />
                </span>
                <div>
                  <p>حسابات الترحيل</p>
                  <strong>{stats.postingAccounts}</strong>
                </div>
              </div>
            </div>
          </motion.section>

          <div className="chart-accounts-type-grid">
            {typeCards.map(({ key, label, helper, icon: Icon, accent }) => (
              <div className="chart-accounts-type-card" key={key}>
                <span style={{ color: accent, backgroundColor: `${accent}14` }}>
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p>{helper}</p>
                  <strong>{stats[key]}</strong>
                  <small>{label}</small>
                </div>
              </div>
            ))}
          </div>

          <motion.div
            className="chart-accounts-workbench"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <EnhancedChartOfAccountsManagement />
          </motion.div>
        </div>
        <style>{`
          .chart-accounts-page {
            min-height: 100%;
            padding: 4px;
            color: var(--chart-text);
          }
          .chart-accounts-command,
          .chart-accounts-workbench,
          .chart-accounts-type-card {
            border: 1px solid var(--chart-border);
            background: var(--chart-surface);
            box-shadow: 0 14px 32px rgba(2, 6, 23, 0.06);
          }
          .chart-accounts-command {
            position: relative;
            overflow: hidden;
            border-radius: 12px;
            padding: 20px;
          }
          .chart-accounts-command::before {
            content: "";
            position: absolute;
            inset-block: 0;
            inset-inline-start: 0;
            width: 5px;
            background: linear-gradient(180deg, var(--chart-success), var(--chart-info), var(--chart-focus), var(--chart-alert));
          }
          .chart-accounts-command-icon,
          .chart-accounts-mini-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            background: color-mix(in srgb, var(--chart-success) 14%, white);
            color: var(--chart-success);
          }
          .chart-accounts-command-icon {
            height: 44px;
            width: 44px;
          }
          .chart-accounts-mini-icon {
            height: 34px;
            width: 34px;
            flex: 0 0 auto;
          }
          .chart-accounts-mini-alert {
            background: color-mix(in srgb, var(--chart-alert) 14%, white);
            color: var(--chart-alert);
          }
          .chart-accounts-mini-focus {
            background: color-mix(in srgb, var(--chart-focus) 14%, white);
            color: var(--chart-focus);
          }
          .chart-accounts-outline {
            border-color: var(--chart-border) !important;
            color: var(--chart-text) !important;
            background: white !important;
          }
          .chart-accounts-outline:hover {
            background: var(--chart-inner) !important;
          }
          .chart-accounts-balance {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
            border: 1px solid var(--chart-border);
            border-radius: 10px;
            background: var(--chart-inner);
            padding: 12px;
          }
          .chart-accounts-balance p,
          .chart-accounts-type-card p,
          .chart-accounts-type-card small {
            color: var(--chart-muted);
            font-size: 12px;
            font-weight: 800;
          }
          .chart-accounts-balance strong {
            color: var(--chart-text);
            font-size: 18px;
            font-weight: 900;
          }
          .chart-accounts-type-grid {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 12px;
          }
          .chart-accounts-type-card {
            display: flex;
            align-items: center;
            gap: 12px;
            border-radius: 12px;
            padding: 14px;
          }
          .chart-accounts-type-card span {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 38px;
            width: 38px;
            border-radius: 10px;
          }
          .chart-accounts-type-card strong {
            display: block;
            color: var(--chart-text);
            font-size: 24px;
            font-weight: 950;
            line-height: 1.1;
          }
          .chart-accounts-workbench {
            overflow: hidden;
            border-radius: 12px;
          }
          @media (max-width: 1100px) {
            .chart-accounts-type-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
          @media (max-width: 640px) {
            .chart-accounts-page {
              padding: 0;
            }
            .chart-accounts-command {
              padding: 16px;
            }
            .chart-accounts-type-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </ChartOfAccountsErrorBoundary>
  );
};

export default ChartOfAccounts;
