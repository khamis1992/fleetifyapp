/**
 * صفحة إدارة المتعثرات المالية - التصميم المعاد
 * تحسين تجربة المستخدم مع استخدام ألوان النظام
 *
 * @component FinancialDelinquency
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  DollarSign,
  AlertTriangle,
  Clock,
  Eye,
  FileText,
  Car,
  Gavel,
  Printer,
  Download,
  RefreshCw,
  TrendingUp,
  Phone,
  Mail,
  Zap,
  Target,
  CalendarClock,
  PhoneCall,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DelinquentCustomersTab } from '@/components/legal/DelinquentCustomersTab';
import { useDelinquencyStats } from '@/hooks/useDelinquencyStats';
import { useRefreshDelinquentCustomers } from '@/hooks/useDelinquentCustomers';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { lawsuitService, OverdueContract } from '@/services/LawsuitService';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';

// ===== System Colors =====
const colors = {
  primary: '174 80% 40%',      // Teal
  primaryLight: '173 75% 48%',
  primaryDark: '175 84% 32%',
  accent: '25 90% 92%',        // Orange
  accentForeground: '25 85% 55%',
  success: '142 56% 42%',
  warning: '25 85% 55%',
  destructive: '0 65% 51%',
  background: '0 0% 96%',
  card: '0 0% 100%',
  border: '0 0% 85%',
  muted: '0 0% 92%',
  foreground: '0 0% 15%',
};

// ===== Stat Card Component =====
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: { value: string; isPositive: boolean };
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  onClick
}) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300",
        "hover:shadow-lg",
        onClick && "cursor-pointer"
      )}
      style={{ borderColor: `hsl(${color} / 0.2)` }}
    >
      {/* Background gradient accent */}
      <div
        className="absolute inset-0 opacity-5"
        style={{ background: `linear-gradient(135deg, hsl(${color}), transparent)` }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p
            className="text-3xl font-bold tracking-tight"
            style={{ color: `hsl(${color})` }}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              trend.isPositive ? "text-emerald-600" : "text-red-600"
            )}>
              <TrendingUp className="w-3 h-3" />
              <span>{trend.value}</span>
            </div>
          )}
        </div>

        {/* Icon with colored background */}
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl shadow-md"
          style={{ backgroundColor: `hsl(${color} / 0.1)` }}
        >
          <Icon
            className="h-6 w-6"
            style={{ color: `hsl(${color})` }}
          />
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ backgroundColor: `hsl(${color})` }}
      />
    </motion.div>
  );
};

// ===== Quick Action Button Component =====
interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}

const QuickAction: React.FC<QuickActionProps> = ({
  icon: Icon,
  label,
  color,
  onClick,
  disabled
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200",
        "hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      )}
      style={{
        borderColor: `hsl(${color} / 0.3)`,
        backgroundColor: `hsl(${color} / 0.05)`
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: `hsl(${color})` }}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <span
        className="text-xs font-semibold"
        style={{ color: `hsl(${color})` }}
      >
        {label}
      </span>
    </motion.button>
  );
};

// ===== Info Card Component =====
interface InfoCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  description?: string;
  color: string;
  onClick?: () => void;
}

const InfoCard: React.FC<InfoCardProps> = ({
  icon: Icon,
  title,
  value,
  description,
  color,
  onClick
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all",
        onClick && "cursor-pointer"
      )}
      style={{
        borderColor: `hsl(${color} / 0.2)`,
        backgroundColor: `hsl(${color} / 0.03)`
      }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
        style={{ backgroundColor: `hsl(${color} / 0.15)` }}
      >
        <Icon className="h-4 w-4" style={{ color: `hsl(${color})` }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-sm font-bold" style={{ color: `hsl(${color})` }}>
          {value}
        </p>
      </div>
    </motion.div>
  );
};

// ===== Main Component =====
const FinancialDelinquencyPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'customers' | 'contracts'>('customers');
  const { companyId } = useUnifiedCompanyAccess();

  // Stats
  const { data: stats, isLoading: statsLoading } = useDelinquencyStats();
  const refreshDelinquentCustomers = useRefreshDelinquentCustomers();

  // Overdue contracts for contracts tab
  const { data: overdueContracts = [], isLoading: contractsLoading } = useQuery<OverdueContract[]>({
    queryKey: ['overdue-contracts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      return lawsuitService.getOverdueContracts(companyId, 30);
    },
    enabled: !!companyId && activeTab === 'contracts',
  });

  // Calculate stats for contracts
  const contractStats = useMemo(() => {
    if (!overdueContracts.length) return { total: 0, amount: 0, avgDays: 0, lawsuits: 0 };
    const total = overdueContracts.length;
    const amount = overdueContracts.reduce((sum, c) => sum + (c.total_overdue || 0), 0);
    const avgDays = Math.round(overdueContracts.reduce((sum, c) => sum + (c.days_overdue || 0), 0) / total);
    const lawsuits = overdueContracts.filter(c => c.has_lawsuit).length;
    return { total, amount, avgDays, lawsuits };
  }, [overdueContracts]);

  // Executive summary calculations
  const executiveSummary = useMemo(() => {
    if (!stats) return { urgentToday: 0, over90Days: 0, over90Amount: 0, noContactWeek: 0 };

    const urgentToday = stats.criticalRisk + stats.highRisk;
    const over90Days = stats.criticalRisk;
    const over90Amount = stats.totalAmountAtRisk * 0.6; // Approximate
    const noContactWeek = stats.needBlacklist;

    return { urgentToday, over90Days, over90Amount, noContactWeek };
  }, [stats]);

  // Export contracts
  const handleExportContracts = () => {
    if (!overdueContracts.length) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }
    const headers = ['رقم العقد', 'المستأجر', 'السيارة', 'المبلغ المتأخر', 'أيام التأخير'];
    const rows = overdueContracts.map(c => [
      c.contract_number, c.customer_name, c.vehicle_info, c.total_overdue.toString(), c.days_overdue.toString()
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `overdue_contracts_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('تم تصدير البيانات');
  };

  // Print report
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="w-full min-h-screen bg-background font-sans text-right pb-8" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
              style={{ background: `linear-gradient(135deg, hsl(${colors.primaryDark}), hsl(${colors.primary}))` }}
            >
              <Gavel className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                إدارة المتعثرات المالية
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                متابعة العملاء والعقود المتأخرة عن السداد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshDelinquentCustomers.mutate()}
              disabled={refreshDelinquentCustomers.isPending}
              className="gap-2 rounded-xl"
            >
              <RefreshCw className={cn("h-4 w-4", refreshDelinquentCustomers.isPending && "animate-spin")} />
              تحديث
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintReport}
              className="gap-2 rounded-xl"
            >
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportContracts}
              className="gap-2 rounded-xl"
            >
              <Download className="h-4 w-4" />
              تصدير
            </Button>
          </div>
        </motion.div>

        {/* Quick Actions Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <QuickAction
            icon={Mail}
            label="إرسال تذكيرات"
            color={colors.primary}
            onClick={() => toast.info('سيتم فتح نافذة إرسال التذكيرات')}
          />
          <QuickAction
            icon={Phone}
            label="جدولة مكالمات"
            color={colors.accentForeground}
            onClick={() => toast.info('سيتم فتح نافذة جدولة المكالمات')}
          />
          <QuickAction
            icon={Zap}
            label="الحالات العاجلة"
            color={colors.destructive}
            onClick={() => setActiveTab('customers')}
          />
          <QuickAction
            icon={FileText}
            label="بيانات تقاضي"
            color={colors.primaryDark}
            onClick={() => navigate('/legal/lawsuit-data')}
          />
        </motion.div>

        {/* Executive Summary Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border bg-card p-5 shadow-sm"
          style={{
            background: `linear-gradient(135deg, hsl(${colors.primaryDark}), hsl(${colors.primary}))`,
            borderColor: `hsl(${colors.primary} / 0.3)`
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-bold text-lg text-white">ملخص تنفيذي</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCard
              icon={AlertTriangle}
              title="يحتاجون إجراء فوري"
              value={`${executiveSummary.urgentToday} عميل`}
              color="0 100% 95%"
              onClick={() => setActiveTab('customers')}
            />
            <InfoCard
              icon={Clock}
              title="تجاوزوا 90 يوم"
              value={`${executiveSummary.over90Days} عميل`}
              description={formatCurrency(executiveSummary.over90Amount)}
              color="25 100% 95%"
              onClick={() => setActiveTab('customers')}
            />
            <InfoCard
              icon={PhoneCall}
              title="لم يتم التواصل"
              value={`${executiveSummary.noContactWeek} عميل`}
              description="منذ أسبوع أو أكثر"
              color="45 100% 95%"
              onClick={() => setActiveTab('customers')}
            />
            <InfoCard
              icon={DollarSign}
              title="إجمالي المستحقات"
              value={formatCurrency(stats?.totalAmountAtRisk || 0)}
              color="142 100% 95%"
            />
          </div>
        </motion.div>

        {/* Stats Cards */}
        {!statsLoading && stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <StatCard
              title="إجمالي العملاء المتأخرين"
              value={stats.totalDelinquent}
              subtitle={`${stats.criticalRisk + stats.highRisk} عميل عالي المخاطر`}
              icon={Users}
              color={colors.primary}
            />
            <StatCard
              title="المبالغ المعرضة للخطر"
              value={formatCurrency(stats.totalAmountAtRisk)}
              subtitle="إيجارات متأخرة"
              icon={DollarSign}
              color={colors.destructive}
            />
            <StatCard
              title="الغرامات المتراكمة"
              value={formatCurrency(stats.totalPenalties)}
              subtitle={`متوسط ${Math.round(stats.averageDaysOverdue)} يوم تأخير`}
              icon={AlertTriangle}
              color={colors.accentForeground}
            />
            <StatCard
              title="يحتاجون إجراء فوري"
              value={stats.criticalRisk + stats.highRisk}
              subtitle={`${stats.needLegalCase} يحتاجون قضية قانونية`}
              icon={Zap}
              color={colors.destructive}
            />
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'customers' | 'contracts')} className="w-full">
            <TabsList
              className="grid w-full max-w-md grid-cols-2 mb-6 h-12 rounded-xl bg-muted p-1 border"
              style={{ borderColor: `hsl(${colors.border})` }}
            >
              <TabsTrigger
                value="customers"
                className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all font-semibold"
              >
                <Users className="w-4 h-4" />
                حسب العميل
              </TabsTrigger>
              <TabsTrigger
                value="contracts"
                className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all font-semibold"
              >
                <FileText className="w-4 h-4" />
                حسب العقد
              </TabsTrigger>
            </TabsList>

            {/* Customers Tab */}
            <TabsContent value="customers" className="mt-0">
              <DelinquentCustomersTab />
            </TabsContent>

            {/* Contracts Tab */}
            <TabsContent value="contracts" className="mt-0">
              <div className="space-y-4">
                {/* Table Header Card */}
                <div className="rounded-2xl border bg-card p-5 shadow-sm" style={{ borderColor: `hsl(${colors.border})` }}>
                  <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-3">المستأجر</div>
                    <div className="col-span-2">رقم العقد</div>
                    <div className="col-span-2">السيارة</div>
                    <div className="col-span-2 text-left">المبلغ المتأخر</div>
                    <div className="col-span-1">الأيام</div>
                    <div className="col-span-1">الحالة</div>
                    <div className="col-span-1 text-center">إجراء</div>
                  </div>
                </div>

                {/* Contract Rows */}
                <AnimatePresence mode="popLayout">
                  {contractsLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center h-80"
                    >
                      <LoadingSpinner size="lg" />
                    </motion.div>
                  ) : !overdueContracts.length ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center justify-center h-80 text-center"
                    >
                      <div
                        className="flex h-20 w-20 items-center justify-center rounded-2xl mb-4 shadow-lg"
                        style={{ backgroundColor: `hsl(${colors.success} / 0.1)` }}
                      >
                        <FileText className="h-10 w-10" style={{ color: `hsl(${colors.success})` }} />
                      </div>
                      <p className="text-foreground text-xl font-bold mb-2">ممتاز! لا توجد عقود متعثرة</p>
                      <p className="text-muted-foreground text-sm">جميع العملاء يسددون التزاماتهم في الوقت المحدد</p>
                    </motion.div>
                  ) : (
                    overdueContracts.map((contract, idx) => (
                      <motion.div
                        key={contract.contract_id || idx}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        className={cn(
                          "group rounded-2xl border-2 bg-card transition-all duration-300 hover:shadow-lg",
                          contract.days_overdue > 90
                            ? ""
                            : contract.days_overdue > 60
                              ? ""
                              : ""
                        )}
                        style={{
                          borderColor: contract.days_overdue > 90
                            ? `hsl(${colors.destructive} / 0.3)`
                            : contract.days_overdue > 60
                              ? `hsl(${colors.accentForeground} / 0.3)`
                              : `hsl(${colors.border})`,
                          backgroundColor: contract.days_overdue > 90
                            ? `hsl(${colors.destructive} / 0.03)`
                            : contract.days_overdue > 60
                              ? `hsl(${colors.accentForeground} / 0.03)`
                              : `hsl(${colors.card})`
                        }}
                      >
                        <div className="p-5">
                          <div className="grid grid-cols-12 gap-4 items-center">
                            {/* Customer */}
                            <div className="col-span-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "flex h-12 w-12 items-center justify-center rounded-xl shadow-md transition-all duration-300",
                                  )}
                                  style={{
                                    backgroundColor: contract.days_overdue > 90
                                      ? `hsl(${colors.destructive} / 0.1)`
                                      : contract.days_overdue > 60
                                        ? `hsl(${colors.accentForeground} / 0.1)`
                                        : `hsl(${colors.primary} / 0.1)`
                                  }}
                                >
                                  <Users className={cn("h-6 w-6 transition-colors")}
                                    style={{
                                      color: contract.days_overdue > 90
                                        ? `hsl(${colors.destructive})`
                                        : contract.days_overdue > 60
                                          ? `hsl(${colors.accentForeground})`
                                          : `hsl(${colors.primary})`
                                    }}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-foreground text-base truncate">{contract.customer_name}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{contract.customer_id_number}</p>
                                </div>
                              </div>
                            </div>

                            {/* Contract Number */}
                            <div className="col-span-2">
                              <div className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                                <Car className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-semibold text-foreground">{contract.contract_number}</span>
                              </div>
                            </div>

                            {/* Vehicle */}
                            <div className="col-span-2">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <span className="text-xl">🚗</span>
                                <span className="text-sm font-medium">{contract.vehicle_info}</span>
                              </div>
                            </div>

                            {/* Amount */}
                            <div className="col-span-2 text-left">
                              <div
                                className="inline-block rounded-xl px-4 py-2 font-bold text-base"
                                style={{
                                  backgroundColor: contract.days_overdue > 90
                                    ? `hsl(${colors.destructive} / 0.1)`
                                    : contract.days_overdue > 60
                                      ? `hsl(${colors.accentForeground} / 0.1)`
                                      : `hsl(${colors.primary} / 0.1)`,
                                  color: contract.days_overdue > 90
                                    ? `hsl(${colors.destructive})`
                                    : contract.days_overdue > 60
                                      ? `hsl(${colors.accentForeground})`
                                      : `hsl(${colors.primary})`
                                }}
                              >
                                {formatCurrency(contract.total_overdue)}
                              </div>
                            </div>

                            {/* Days */}
                            <div className="col-span-1">
                              <div
                                className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold shadow-md"
                                style={{
                                  backgroundColor: contract.days_overdue > 90
                                    ? `hsl(${colors.destructive})`
                                    : contract.days_overdue > 60
                                      ? `hsl(${colors.accentForeground})`
                                      : `linear-gradient(135deg, hsl(${colors.primaryDark}), hsl(${colors.primary}))`,
                                  color: 'white'
                                }}
                              >
                                {contract.days_overdue}
                              </div>
                            </div>

                            {/* Status */}
                            <div className="col-span-1">
                              {contract.has_lawsuit ? (
                                <div className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold border"
                                  style={{
                                    backgroundColor: `hsl(262 83% 58% / 0.1)`,
                                    color: `hsl(262 83% 58%)`,
                                    borderColor: `hsl(262 83% 58% / 0.3)`
                                  }}
                                >
                                  <Gavel className="w-3 h-3" />
                                  <span>قضية</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold border"
                                  style={{
                                    backgroundColor: `hsl(${colors.accentForeground} / 0.1)`,
                                    color: `hsl(${colors.accentForeground})`,
                                    borderColor: `hsl(${colors.accentForeground} / 0.3)`
                                  }}
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>متأخر</span>
                                </div>
                              )}
                            </div>

                            {/* Action */}
                            <div className="col-span-1 text-center">
                              <Button
                                size="sm"
                                onClick={() => navigate(`/legal/lawsuit/prepare/${contract.contract_id}`)}
                                className={cn(
                                  "gap-2 rounded-xl font-semibold shadow-md transition-all",
                                  contract.has_lawsuit
                                    ? "bg-muted text-muted-foreground hover:bg-muted/80"
                                    : ""
                                )}
                                style={!contract.has_lawsuit ? {
                                  background: `linear-gradient(135deg, hsl(${colors.primaryDark}), hsl(${colors.primary}))`,
                                  color: 'white'
                                } : {}}
                              >
                                <Gavel className="w-4 h-4" />
                                {contract.has_lawsuit ? 'عرض' : 'رفع'}
                              </Button>
                            </div>
                          </div>

                          {/* Progress bar for days overdue */}
                          <div className="mt-4 pt-4 border-t" style={{ borderColor: `hsl(${colors.border})` }}>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                              <span>مستوى التأخير</span>
                              <span>{contract.days_overdue} يوم</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(contract.days_overdue / 1.5, 100)}%` }}
                                transition={{ duration: 0.8, delay: idx * 0.05 + 0.2 }}
                                className="h-full rounded-full"
                                style={{
                                  background: contract.days_overdue > 90
                                    ? `linear-gradient(90deg, hsl(${colors.destructive}), hsl(${colors.destructive}) / 0.7)`
                                    : contract.days_overdue > 60
                                      ? `linear-gradient(90deg, hsl(${colors.accentForeground}), hsl(${colors.accentForeground}) / 0.7)`
                                      : `linear-gradient(90deg, hsl(${colors.primary}), hsl(${colors.primary}) / 0.7)`
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

      </div>
    </div>
  );
};

export default FinancialDelinquencyPage;
