/**
 * صفحة إدارة المتعثرات المالية الموحدة
 * تدمج صفحتي "العملاء المتأخرون" و "العقود المتعثرة"
 * 
 * @component FinancialDelinquency
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  color: 'coral' | 'red' | 'orange' | 'green' | 'blue';
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, value, subtitle, icon: Icon, color 
}) => {
  const colorClasses = {
    coral: { bg: 'bg-gradient-to-br from-coral-50 to-coral-100/50', icon: 'bg-coral-100 text-coral-600', border: 'border-coral-200', value: 'text-coral-600' },
    red: { bg: 'bg-gradient-to-br from-red-50 to-red-100/50', icon: 'bg-red-100 text-red-600', border: 'border-red-200', value: 'text-red-600' },
    orange: { bg: 'bg-gradient-to-br from-orange-50 to-orange-100/50', icon: 'bg-orange-100 text-orange-600', border: 'border-orange-200', value: 'text-orange-600' },
    green: { bg: 'bg-gradient-to-br from-green-50 to-green-100/50', icon: 'bg-green-100 text-green-600', border: 'border-green-200', value: 'text-green-600' },
    blue: { bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50', icon: 'bg-blue-100 text-blue-600', border: 'border-blue-200', value: 'text-blue-600' },
  };

  const classes = colorClasses[color];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn("relative rounded-2xl border p-5 transition-all duration-200", classes.bg, classes.border)}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-600">{title}</p>
          <p className={cn("text-3xl font-bold", classes.value)}>{value}</p>
          {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
        </div>
        <div className={cn("p-3 rounded-xl", classes.icon)}>
          <Icon className="w-6 h-6" />
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
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-coral-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Gavel className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">إدارة المتعثرات المالية</h1>
            <p className="text-sm text-neutral-500">
              متابعة العملاء والعقود المتأخرة عن السداد
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refreshDelinquentCustomers.mutate()} disabled={refreshDelinquentCustomers.isPending} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", refreshDelinquentCustomers.isPending && "animate-spin")} />
            تحديث
          </Button>
          <Button variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          <Button variant="outline" onClick={handleExportContracts} className="gap-2">
            <Download className="h-4 w-4" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المتأخرات"
          value={formatCurrency(activeTab === 'customers' ? (stats?.totalAmountAtRisk || 0) : contractStats.amount)}
          icon={DollarSign}
          color="coral"
        />
        <StatCard
          title={activeTab === 'customers' ? "عدد العملاء المتأخرين" : "عدد العقود المتعثرة"}
          value={activeTab === 'customers' ? (stats?.totalDelinquent || 0) : contractStats.total}
          icon={Users}
          color="red"
        />
        <StatCard
          title="متوسط أيام التأخير"
          value={`${activeTab === 'customers' ? Math.round(stats?.averageDaysOverdue || 0) : contractStats.avgDays} يوم`}
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="حالات حرجة"
          value={activeTab === 'customers' ? (stats?.criticalRisk || 0) : 0}
          subtitle={activeTab === 'contracts' ? `${contractStats.lawsuits} دعوى مرفوعة` : undefined}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'customers' | 'contracts')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
          <TabsTrigger value="customers" className="gap-2">
            <Users className="w-4 h-4" />
            حسب العميل
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-2">
            <FileText className="w-4 h-4" />
            حسب العقد
          </TabsTrigger>
        </TabsList>

        {/* Customers Tab - استخدام DelinquentCustomersTab مباشرة */}
        <TabsContent value="customers">
          <DelinquentCustomersTab />
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <Card>
            <CardContent className="p-0">
              {contractsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" />
                </div>
              ) : !overdueContracts.length ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <FileText className="w-12 h-12 text-green-400 mb-4" />
                  <p className="text-neutral-600 text-lg font-medium">لا توجد عقود متعثرة! 🎉</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="p-4 text-right font-medium text-neutral-600">المستأجر</th>
                        <th className="p-4 text-right font-medium text-neutral-600">رقم العقد</th>
                        <th className="p-4 text-right font-medium text-neutral-600">السيارة</th>
                        <th className="p-4 text-right font-medium text-neutral-600">المبلغ المتأخر</th>
                        <th className="p-4 text-right font-medium text-neutral-600">أيام التأخير</th>
                        <th className="p-4 text-right font-medium text-neutral-600">الحالة</th>
                        <th className="p-4 text-center font-medium text-neutral-600">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueContracts.map((contract, idx) => (
                        <tr key={contract.contract_id || idx} className="border-t border-neutral-100 hover:bg-neutral-50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-coral-100 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-coral-600" />
                              </div>
                              <div>
                                <p className="font-medium">{contract.customer_name}</p>
                                <p className="text-sm text-neutral-500">{contract.customer_id_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="gap-1">
                              <Car className="w-3 h-3" />
                              {contract.contract_number}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <p className="text-sm">🚗 {contract.vehicle_info}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-red-600">{formatCurrency(contract.total_overdue)}</p>
                          </td>
                          <td className="p-4">
                            <Badge variant={contract.days_overdue > 90 ? 'destructive' : contract.days_overdue > 30 ? 'default' : 'secondary'}>
                              {contract.days_overdue} يوم
                            </Badge>
                          </td>
                          <td className="p-4">
                            {contract.has_lawsuit ? (
                              <Badge className="bg-purple-100 text-purple-700">قضية مرفوعة</Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-700">متأخر</Badge>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <Button 
                              size="sm" 
                              className="bg-coral-500 hover:bg-coral-600 gap-2"
                              onClick={() => navigate(`/legal/lawsuit/prepare/${contract.contract_id}`)}
                            >
                              <Gavel className="w-4 h-4" />
                              رفع دعوى
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialDelinquencyPage;
