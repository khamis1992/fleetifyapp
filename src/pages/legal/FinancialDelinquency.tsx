/**
 * صفحة إدارة المتعثرات المالية الموحدة
 * تدمج صفحتي "العملاء المتأخرون" و "العقود المتعثرة"
 *
 * @component FinancialDelinquency
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  DollarSign,
  AlertTriangle,
  Clock,
  FileText,
  Car,
  Gavel,
  Printer,
  Download,
  RefreshCw,
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

// ===== Stat Card Component =====
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: 'rose' | 'red' | 'amber' | 'emerald' | 'sky';
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title, value, subtitle, icon: Icon, color, delay = 0
}) => {
  const colorClasses = {
    rose: {
      bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50',
      icon: 'bg-gradient-to-br from-rose-500 to-rose-600',
      border: 'border-rose-200',
      value: 'text-rose-700',
      title: 'text-rose-700'
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-red-100/50',
      icon: 'bg-gradient-to-br from-red-500 to-red-600',
      border: 'border-red-200',
      value: 'text-red-700',
      title: 'text-red-700'
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
      icon: 'bg-gradient-to-br from-amber-500 to-amber-600',
      border: 'border-amber-200',
      value: 'text-amber-700',
      title: 'text-amber-700'
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
      icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      border: 'border-emerald-200',
      value: 'text-emerald-700',
      title: 'text-emerald-700'
    },
    sky: {
      bg: 'bg-gradient-to-br from-sky-50 to-sky-100/50',
      icon: 'bg-gradient-to-br from-sky-500 to-sky-600',
      border: 'border-sky-200',
      value: 'text-sky-700',
      title: 'text-sky-700'
    },
  };

  const classes = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={cn(
        "relative rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden",
        classes.bg, classes.border
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
      <div className="relative flex items-start justify-between p-6">
        <div className="space-y-3">
          <p className={cn("text-sm font-semibold", classes.title)}>{title}</p>
          <p className={cn("text-3xl font-bold tracking-tight", classes.value)}>{value}</p>
          {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>
        <div className={cn("p-3 rounded-xl shadow-md", classes.icon)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
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

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 font-sans text-right pb-10" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl blur-xl opacity-20" />
                <div className="relative bg-gradient-to-br from-rose-500 to-rose-600 p-4 rounded-2xl shadow-lg">
                  <Gavel className="text-white" size={28} />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">إدارة المتعثرات المالية</h1>
                <p className="text-base text-slate-500 mt-1.5">
                  متابعة العملاء والعقود المتأخرة عن السداد
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => refreshDelinquentCustomers.mutate()}
                disabled={refreshDelinquentCustomers.isPending}
                className="gap-2 border-slate-200 hover:bg-slate-50 hover:text-slate-700 rounded-xl transition-all"
              >
                <RefreshCw className={cn("h-4 w-4", refreshDelinquentCustomers.isPending && "animate-spin")} />
                تحديث
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-slate-200 hover:bg-slate-50 hover:text-slate-700 rounded-xl transition-all"
              >
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
              <Button
                variant="outline"
                onClick={handleExportContracts}
                className="gap-2 border-slate-200 hover:bg-slate-50 hover:text-slate-700 rounded-xl transition-all"
              >
                <Download className="h-4 w-4" />
                تصدير
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-5"
        >
          <StatCard
            title="إجمالي المتأخرات"
            value={formatCurrency(activeTab === 'customers' ? (stats?.totalAmountAtRisk || 0) : contractStats.amount)}
            icon={DollarSign}
            color="rose"
            delay={0}
          />
          <StatCard
            title={activeTab === 'customers' ? "عدد العملاء المتأخرين" : "عدد العقود المتعثرة"}
            value={activeTab === 'customers' ? (stats?.totalDelinquent || 0) : contractStats.total}
            icon={Users}
            color="red"
            delay={1}
          />
          <StatCard
            title="متوسط أيام التأخير"
            value={`${activeTab === 'customers' ? Math.round(stats?.averageDaysOverdue || 0) : contractStats.avgDays} يوم`}
            icon={Clock}
            color="amber"
            delay={2}
          />
          <StatCard
            title="حالات حرجة"
            value={activeTab === 'customers' ? (stats?.criticalRisk || 0) : 0}
            subtitle={activeTab === 'contracts' ? `${contractStats.lawsuits} دعوى مرفوعة` : undefined}
            icon={AlertTriangle}
            color="red"
            delay={3}
          />
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'customers' | 'contracts')} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200">
              <TabsTrigger
                value="customers"
                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl transition-all"
              >
                <Users className="w-4 h-4" />
                حسب العميل
              </TabsTrigger>
              <TabsTrigger
                value="contracts"
                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl transition-all"
              >
                <FileText className="w-4 h-4" />
                حسب العقد
              </TabsTrigger>
            </TabsList>

            {/* Customers Tab - استخدام DelinquentCustomersTab مباشرة */}
            <TabsContent value="customers" className="mt-0">
              <DelinquentCustomersTab />
            </TabsContent>

            {/* Contracts Tab */}
            <TabsContent value="contracts" className="mt-0">
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <AnimatePresence mode="wait">
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
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center h-80 text-center"
                      >
                        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
                          <FileText className="w-10 h-10 text-emerald-500" />
                        </div>
                        <p className="text-slate-700 text-xl font-semibold mb-2">لا توجد عقود متعثرة!</p>
                        <p className="text-slate-500 text-sm">جميع العملاء يسددون التزاماتهم في الوقت المحدد</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="table"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="overflow-x-auto"
                      >
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="p-5 text-right font-semibold text-slate-700">المستأجر</th>
                              <th className="p-5 text-right font-semibold text-slate-700">رقم العقد</th>
                              <th className="p-5 text-right font-semibold text-slate-700">السيارة</th>
                              <th className="p-5 text-right font-semibold text-slate-700">المبلغ المتأخر</th>
                              <th className="p-5 text-right font-semibold text-slate-700">أيام التأخير</th>
                              <th className="p-5 text-right font-semibold text-slate-700">الحالة</th>
                              <th className="p-5 text-center font-semibold text-slate-700">الإجراء</th>
                            </tr>
                          </thead>
                          <tbody>
                            {overdueContracts.map((contract, idx) => (
                              <motion.tr
                                key={contract.contract_id || idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="border-t border-slate-100 hover:bg-rose-50/30 transition-colors"
                              >
                                <td className="p-5">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-rose-200 rounded-xl flex items-center justify-center shadow-sm">
                                      <Users className="w-6 h-6 text-rose-600" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-900">{contract.customer_name}</p>
                                      <p className="text-sm text-slate-500 mt-0.5">{contract.customer_id_number}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-5">
                                  <Badge variant="outline" className="gap-1.5 border-slate-200 text-slate-700 rounded-lg px-3 py-1.5">
                                    <Car className="w-3.5 h-3.5" />
                                    {contract.contract_number}
                                  </Badge>
                                </td>
                                <td className="p-5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">🚗</span>
                                    <span className="text-sm text-slate-700">{contract.vehicle_info}</span>
                                  </div>
                                </td>
                                <td className="p-5">
                                  <p className="font-bold text-red-600 text-base">{formatCurrency(contract.total_overdue)}</p>
                                </td>
                                <td className="p-5">
                                  <Badge
                                    variant={contract.days_overdue > 90 ? 'destructive' : contract.days_overdue > 30 ? 'default' : 'secondary'}
                                    className={cn(
                                      "rounded-lg px-3 py-1.5 font-medium",
                                      contract.days_overdue > 90
                                        ? "bg-red-100 text-red-700 border-red-200"
                                        : contract.days_overdue > 30
                                          ? "bg-amber-100 text-amber-700 border-amber-200"
                                          : "bg-slate-100 text-slate-700 border-slate-200"
                                    )}
                                  >
                                    {contract.days_overdue} يوم
                                  </Badge>
                                </td>
                                <td className="p-5">
                                  {contract.has_lawsuit ? (
                                    <Badge className="bg-violet-100 text-violet-700 border-violet-200 rounded-lg px-3 py-1.5 font-medium">
                                      قضية مرفوعة
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 rounded-lg px-3 py-1.5 font-medium">
                                      متأخر
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-5 text-center">
                                  <Button
                                    size="sm"
                                    className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 gap-2 rounded-xl shadow-md hover:shadow-lg transition-all"
                                    onClick={() => navigate(`/legal/lawsuit/prepare/${contract.contract_id}`)}
                                  >
                                    <Gavel className="w-4 h-4" />
                                    رفع دعوى
                                  </Button>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default FinancialDelinquencyPage;
