/**
 * صفحة إدارة المتعثرات المالية الموحدة
 * تدمج صفحتي "العملاء المتأخرون" و "العقود المتعثرة"
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
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 font-sans text-right pb-10" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/50 p-8 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl blur-xl opacity-20" />
                <div className="relative bg-gradient-to-br from-teal-500 to-teal-600 p-4 rounded-2xl shadow-lg shadow-teal-500/20">
                  <Gavel className="text-white" size={28} />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">إدارة المتعثرات المالية</h1>
                <p className="text-base text-slate-600 mt-1.5">
                  متابعة العملاء والعقود المتأخرة عن السداد
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => refreshDelinquentCustomers.mutate()}
                disabled={refreshDelinquentCustomers.isPending}
                className="gap-2 border-slate-200/50 hover:border-teal-500/30 hover:bg-teal-50/30 rounded-xl transition-all"
              >
                <RefreshCw className={cn("h-4 w-4", refreshDelinquentCustomers.isPending && "animate-spin")} />
                تحديث
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-slate-200/50 hover:border-teal-500/30 hover:bg-teal-50/30 rounded-xl transition-all"
              >
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
              <Button
                variant="outline"
                onClick={handleExportContracts}
                className="gap-2 border-slate-200/50 hover:border-teal-500/30 hover:bg-teal-50/30 rounded-xl transition-all"
              >
                <Download className="h-4 w-4" />
                تصدير
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'customers' | 'contracts')} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 bg-white/80 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/50">
              <TabsTrigger
                value="customers"
                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl transition-all hover:bg-teal-50/30"
              >
                <Users className="w-4 h-4" />
                حسب العميل
              </TabsTrigger>
              <TabsTrigger
                value="contracts"
                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl transition-all hover:bg-teal-50/30"
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
              <div className="space-y-4">
                {/* Table Header Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-6 shadow-sm">
                  <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20">
                        <FileText className="w-12 h-12 text-teal-500" />
                      </div>
                      <p className="text-slate-900 text-2xl font-bold mb-3">ممتاز! لا توجد عقود متعثرة</p>
                      <p className="text-slate-500">جميع العملاء يسددون التزاماتهم في الوقت المحدد</p>
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
                          "group bg-white/80 backdrop-blur-xl rounded-3xl border-2 transition-all duration-300 hover:shadow-xl",
                          contract.days_overdue > 90
                            ? "border-red-200 hover:border-red-300 hover:bg-red-50/30"
                            : contract.days_overdue > 60
                              ? "border-amber-200 hover:border-amber-300 hover:bg-amber-50/30"
                              : "border-slate-200/50 hover:border-teal-500/30 hover:bg-teal-50/20"
                        )}
                      >
                        <div className="p-6">
                          <div className="grid grid-cols-12 gap-4 items-center">
                            {/* Customer */}
                            <div className="col-span-3">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300",
                                  contract.days_overdue > 90
                                    ? "bg-gradient-to-br from-red-100 to-red-200"
                                    : contract.days_overdue > 60
                                      ? "bg-gradient-to-br from-amber-100 to-amber-200"
                                      : "bg-gradient-to-br from-teal-50 to-teal-100 group-hover:from-teal-100 group-hover:to-teal-200"
                                )}>
                                  <Users className={cn(
                                    "w-7 h-7 transition-colors",
                                    contract.days_overdue > 90
                                      ? "text-red-600"
                                      : contract.days_overdue > 60
                                        ? "text-amber-600"
                                        : "text-teal-600 group-hover:text-teal-700"
                                  )} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-slate-900 text-base truncate">{contract.customer_name}</p>
                                  <p className="text-sm text-slate-400 mt-0.5 truncate">{contract.customer_id_number}</p>
                                </div>
                              </div>
                            </div>

                            {/* Contract Number */}
                            <div className="col-span-2">
                              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 group-hover:bg-teal-50/50 transition-colors">
                                <Car className="w-4 h-4 text-slate-500" />
                                <span className="text-sm font-semibold text-slate-700">{contract.contract_number}</span>
                              </div>
                            </div>

                            {/* Vehicle */}
                            <div className="col-span-2">
                              <div className="flex items-center gap-2 text-slate-600">
                                <span className="text-2xl">🚗</span>
                                <span className="text-sm font-medium">{contract.vehicle_info}</span>
                              </div>
                            </div>

                            {/* Amount */}
                            <div className="col-span-2 text-left">
                              <div className={cn(
                                "inline-block px-4 py-2 rounded-xl font-bold text-lg",
                                contract.days_overdue > 90
                                  ? "bg-red-100 text-red-700"
                                  : contract.days_overdue > 60
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-teal-50 text-teal-700"
                              )}>
                                {formatCurrency(contract.total_overdue)}
                              </div>
                            </div>

                            {/* Days */}
                            <div className="col-span-1">
                              <div className={cn(
                                "flex items-center justify-center w-12 h-12 rounded-xl text-sm font-bold",
                                contract.days_overdue > 90
                                  ? "bg-red-500 text-white shadow-lg shadow-rose-500/30"
                                  : contract.days_overdue > 60
                                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                                    : "bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30"
                              )}>
                                {contract.days_overdue}
                              </div>
                            </div>

                            {/* Status */}
                            <div className="col-span-1">
                              {contract.has_lawsuit ? (
                                <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-100 text-violet-700 text-xs font-bold border border-violet-200">
                                  <Gavel className="w-3 h-3" />
                                  <span>قضية</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
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
                                  "gap-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105",
                                  contract.has_lawsuit
                                    ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                    : "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-teal-500/20"
                                )}
                              >
                                <Gavel className="w-4 h-4" />
                                {contract.has_lawsuit ? 'عرض' : 'رفع'}
                              </Button>
                            </div>
                          </div>

                          {/* Progress bar for days overdue */}
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                              <span>مستوى التأخير</span>
                              <span>{contract.days_overdue} يوم</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(contract.days_overdue / 1.5, 100)}%` }}
                                transition={{ duration: 0.8, delay: idx * 0.05 + 0.2 }}
                                className={cn(
                                  "h-full rounded-full",
                                  contract.days_overdue > 90
                                    ? "bg-gradient-to-r from-red-500 to-red-400"
                                    : contract.days_overdue > 60
                                      ? "bg-gradient-to-r from-amber-500 to-amber-400"
                                      : "bg-gradient-to-r from-teal-500 to-teal-400"
                                )}
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
