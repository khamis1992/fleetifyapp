import { useNavigate } from 'react-router-dom';
import {
  ArrowUpLeft,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Receipt,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Users,
  Car,
  Wrench,
  BriefcaseBusiness,
  ShoppingCart,
  Boxes,
  Scale,
  Building2,
  ChartPie,
} from 'lucide-react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useFinancialWorkspace } from '@/hooks/finance/useFinancialWorkspace';
import { financeToday } from '@/services/financialReporting';
import { useFinanceWorkspaceText, type FinanceWorkspaceTextKey } from './financeWorkspaceText';
import { cn } from '@/lib/utils';
import './finance-workspace.css';

const checkRoutes: Record<string, string> = {
  account_classification: '/finance/accounting?tab=chart',
  journal_balance: '/finance/monthly-close-audit',
  posting_accounts: '/finance/accounting?tab=chart',
  receipt_journal: '/finance/invoice-journal-report',
  invoice_balance: '/finance/billing',
  prepaid_due_date: '/finance/billing',
  allocation_overflow: '/finance/billing?tab=payments',
  payroll_journal: '/hr/payroll',
  maintenance_journal: '/fleet/maintenance',
  property_journal: '/properties',
};
const panel = 'rounded-2xl border border-border bg-card p-5 md:p-6';

export default function FinanceWorkspace() {
  const { text, language } = useFinanceWorkspaceText();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const asOf = financeToday();
  const query = useFinancialWorkspace(asOf);
  const report = query.data;
  const Arrow = language === 'ar' ? ArrowUpLeft : ArrowUpRight;
  const number = (value: number) =>
    new Intl.NumberFormat(language === 'ar' ? 'ar-QA' : 'en-QA').format(value);
  const month = (value: string) =>
    new Intl.DateTimeFormat(language === 'ar' ? 'ar-QA' : 'en-QA', {
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(value + 'T00:00:00Z'));
  const issues = report?.checks.filter((check) => check.count > 0) || [];
  const departments = [
    { key: 'contracts', icon: BookOpen, path: '/contracts' },
    { key: 'customers', icon: Users, path: '/customers' },
    { key: 'fleet', icon: Car, path: '/fleet' },
    { key: 'maintenance', icon: Wrench, path: '/fleet/maintenance' },
    { key: 'payroll', icon: BriefcaseBusiness, path: '/hr/payroll' },
    { key: 'purchasing', icon: ShoppingCart, path: '/finance/purchase-orders' },
    { key: 'inventory', icon: Boxes, path: '/inventory' },
    { key: 'legal', icon: Scale, path: '/legal' },
    { key: 'properties', icon: Building2, path: '/properties' },
    { key: 'budgets', icon: ChartPie, path: '/finance/budgets-centers' },
  ] as const;

  return (
    <main
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="finance-workspace min-w-0 space-y-6 bg-muted/30 p-4 text-foreground md:p-7"
      data-testid="financial-workspace"
    >
      <header className="relative overflow-hidden rounded-2xl bg-[#102f35] p-6 text-white md:p-8">
        <div className="pointer-events-none absolute -end-16 -top-32 h-80 w-80 rounded-full border-[45px] border-white/[0.035]" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="mb-3 text-xs font-medium text-teal-200">{language === 'ar' ? 'فليتيفاي / الإدارة المالية' : 'Fleetify / Finance'}</p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{text('title')}</h1>
            <p className="mt-3 text-sm text-slate-200">{text('subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-white/20 px-3 py-2 text-xs">
              {text('today')} · <bdi>{asOf}</bdi>
            </span>
            <Button
              variant="outline"
              className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              disabled={query.isFetching}
              onClick={() => {
                void query.refetch();
              }}
            >
              <RefreshCw size={15} className={cn('me-2', query.isFetching && 'animate-spin')} />
              {text('refresh')}
            </Button>
          </div>
        </div>
      </header>

      {query.isPending && (
        <div role="status" className={panel}>
          <p>{text('loading')}</p>
          <div className="mt-5 grid animate-pulse gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      )}
      {query.isError && (
        <section role="alert" className={cn(panel, 'border-red-300')}>
          <AlertCircle className="mb-3 text-red-600" />
          <h2 className="font-bold">{text('unavailable')}</h2>
          <p className="my-3 text-sm text-muted-foreground">{text('errorHint')}</p>
          <Button
            onClick={() => {
              void query.refetch();
            }}
          >
            {text('retry')}
          </Button>
        </section>
      )}

      {report && !query.isError && (
        <>
          <section aria-label={text('overview')} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { title: 'monthRevenue', value: report.summary.total_revenue, hint: 'ledgerBasis' },
              { title: 'monthExpenses', value: report.summary.total_expenses, hint: 'ledgerBasis' },
              { title: 'netIncome', value: report.summary.net_income, hint: 'ledgerBasis' },
              { title: 'monthReceipts', value: report.monthly_receipts, hint: 'receiptBasis' },
            ].map((metric, index) => (
              <div
                key={metric.title}
                className={cn(panel, index === 2 && 'border-teal-700/30 bg-teal-50/50 dark:bg-teal-950/20')}
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {text(metric.title as FinanceWorkspaceTextKey)}
                </p>
                <p
                  className={cn(
                    'my-4 text-2xl font-bold tabular-nums lg:text-3xl',
                    metric.value < 0 && 'text-red-600'
                  )}
                >
                  <bdi>{formatCurrency(metric.value)}</bdi>
                </p>
                <p className="text-[11px] leading-5 text-muted-foreground">
                  {text(metric.hint as FinanceWorkspaceTextKey)}
                </p>
              </div>
            ))}
          </section>

          <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
            <section className={cn(panel, 'min-w-0')}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">{text('trend')}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{text('sixMonths')}</p>
                </div>
                <div className="flex gap-4 text-xs">
                  <span>
                    <span className="me-2 inline-block h-2 w-2 rounded-full bg-teal-700" />
                    {text('revenue')}
                  </span>
                  <span>
                    <span className="me-2 inline-block h-2 w-2 rounded-full bg-amber-600" />
                    {text('expenses')}
                  </span>
                </div>
              </div>
              <div className="mt-6 h-60" dir="ltr" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.trend} barGap={4}>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 4"
                      stroke="currentColor"
                      opacity={0.1}
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={month}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={10}
                      width={62}
                      tickFormatter={(v) =>
                        new Intl.NumberFormat(language, { notation: 'compact' }).format(Number(v))
                      }
                    />
                    <Tooltip
                      labelFormatter={(value) => month(String(value))}
                      formatter={(value, name) => [
                        formatCurrency(Number(value)),
                        name === 'revenue' ? text('revenue') : text('expenses'),
                      ]}
                    />
                    <Bar dataKey="revenue" fill="#0f766e" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="expenses" fill="#b97824" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer py-2 text-muted-foreground">{text('table')}</summary>
                <table className="w-full text-start">
                  <thead>
                    <tr>
                      <th className="py-2 text-start">{text('month')}</th>
                      <th>{text('revenue')}</th>
                      <th>{text('expenses')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.trend.map((row) => (
                      <tr key={row.month} className="border-t border-border">
                        <td className="py-2">{month(row.month)}</td>
                        <td className="text-center">
                          <bdi>{formatCurrency(row.revenue)}</bdi>
                        </td>
                        <td className="text-center">
                          <bdi>{formatCurrency(row.expenses)}</bdi>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>
            <section className={panel}>
              <h2 className="font-bold">{text('receivables')}</h2>
              <p className="mt-5 text-xs text-muted-foreground">{text('outstanding')}</p>
              <p className="mt-2 text-3xl font-bold tabular-nums">
                <bdi>{formatCurrency(report.receivables.outstanding)}</bdi>
              </p>
              <div className="my-5 border-y border-border py-4">
                <div className="flex justify-between gap-3 text-sm">
                  <span>{text('overdue')}</span>
                  <strong className="text-amber-700 dark:text-amber-400">
                    <bdi>{formatCurrency(report.receivables.overdue)}</bdi>
                  </strong>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {number(report.receivables.overdue_count)} {text('overdueInvoices')}
                </p>
              </div>
              <p className="text-xs leading-6 text-muted-foreground">{text('settlementNote')}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  className="bg-teal-800 text-white hover:bg-teal-900"
                  onClick={() => navigate('/finance/operations/receive-payment')}
                >
                  <Receipt size={15} className="me-2" />
                  {text('receive')}
                </Button>
                <Button variant="outline" onClick={() => navigate('/finance/billing')}>
                  {text('openBilling')}
                </Button>
              </div>
            </section>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
            <section className={panel}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold">{text('review')}</h2>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs',
                    issues.length ? 'bg-amber-100 text-amber-900' : 'bg-teal-50 text-teal-800'
                  )}
                >
                  {number(issues.length)} {text('checkCount')}
                </span>
              </div>
              <p className="my-3 text-xs leading-6 text-muted-foreground">{text('checksNote')}</p>
              {issues.length === 0 && (
                <p className="flex items-center gap-2 py-4 text-sm text-teal-700">
                  <CheckCircle2 size={18} />
                  {text('passed')}
                </p>
              )}
              <div className="divide-y divide-border">
                {issues.map((check) => (
                  <button
                    key={check.code}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-start hover:bg-muted focus-visible:outline-teal-600"
                    onClick={() => navigate(checkRoutes[check.code] || '/finance/monthly-close-audit')}
                  >
                    <AlertCircle
                      size={17}
                      className={
                        check.severity === 'critical' ? 'shrink-0 text-red-600' : 'shrink-0 text-amber-600'
                      }
                    />
                    <span className="flex-1 text-sm">
                      {text(
                        check.code in checkRoutes ? (check.code as FinanceWorkspaceTextKey) : 'unknownCheck'
                      )}
                    </span>
                    <strong className="tabular-nums">{number(check.count)}</strong>
                    <Arrow size={16} />
                  </button>
                ))}
              </div>
            </section>
            <section className={panel}>
              <h2 className="font-bold">{text('balanceSheet')}</h2>
              <dl className="mt-5 space-y-4">
                {[
                  ['assets', report.summary.total_assets],
                  ['liabilities', report.summary.total_liabilities],
                  ['equity', report.summary.total_equity],
                ].map(([key, value]) => (
                  <div key={key} className="flex flex-wrap justify-between gap-2 text-sm">
                    <dt className="text-muted-foreground">{text(key as FinanceWorkspaceTextKey)}</dt>
                    <dd className="font-semibold tabular-nums">
                      <bdi>{formatCurrency(Number(value))}</bdi>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 text-xs leading-6 text-muted-foreground">{text('positionNote')}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
                {[
                  ['posted', report.posted_entries],
                  ['drafts', report.draft_entries],
                ].map(([key, value]) => (
                  <div key={key}>
                    <p className="text-lg font-bold">{number(Number(value))}</p>
                    <p className="text-xs text-muted-foreground">{text(key as FinanceWorkspaceTextKey)}</p>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="mt-5 w-full"
                onClick={() => navigate('/finance/accounting?tab=entries')}
              >
                <Plus size={15} className="me-2" />
                {text('newJournal')}
              </Button>
            </section>
          </div>
          <p className="text-xs text-muted-foreground" role="status">
            {query.isFetching
              ? text('refreshing')
              : text('updated') +
                ' · ' +
                new Date(report.checked_at).toLocaleString(language === 'ar' ? 'ar-QA' : 'en-QA')}
          </p>
        </>
      )}

      <section className={panel}>
        <h2 className="font-bold">{text('departments')}</h2>
        <p className="mt-2 text-xs text-muted-foreground">{text('departmentsNote')}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {departments.map(({ key, icon: Icon, path }) => (
            <button
              key={key}
              onClick={() => navigate(path)}
              className="group rounded-xl border border-border p-4 text-start transition-colors hover:border-teal-700/40 hover:bg-teal-50/50 focus-visible:outline-teal-600 dark:hover:bg-teal-950/20"
            >
              <div className="flex items-center justify-between">
                <Icon size={19} className="text-teal-700 dark:text-teal-400" />
                <Arrow size={14} className="text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-bold">{text(key)}</h3>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                {text((key + 'Desc') as FinanceWorkspaceTextKey)}
              </p>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
