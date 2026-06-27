/**
 * Employee Details Page
 * صفحة تفاصيل الموظف - للمدراء
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEmployeeDetails } from '@/hooks/useEmployeeDetails';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import {
  ArrowRight,
  Briefcase,
  TrendingUp,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Phone,
  Calendar,
  AlertCircle,
  XCircle,
  UserPlus,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { PerformanceTrendChart } from '@/components/employee/PerformanceTrendChart';
import { UnassignContractDialog, ContractAssignmentDialog } from '@/components/team';

// Shared Components
const GlassCard = ({ children, className, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay, type: 'spring', bounce: 0.18 }}
    className={cn(
      'employee-card overflow-hidden rounded-lg border border-[#DDE5EF] bg-white shadow-sm',
      className
    )}
  >
    {children}
  </motion.div>
);

const StatCard = ({ title, value, subtitle, icon: Icon, color, delay }: any) => (
  <GlassCard className="employee-stat-card flex h-full flex-col justify-between p-5" delay={delay}>
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className={cn('rounded-lg p-3', color)}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      {subtitle && (
        <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-bold text-[#536173]">
          {subtitle}
        </span>
      )}
    </div>
    <div>
      <h3 className="mb-1 text-2xl font-black text-[#142033]">{value}</h3>
      <p className="text-sm font-bold text-[#6A7688]">{title}</p>
    </div>
  </GlassCard>
);

export const EmployeeDetails: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const [showUnassignDialog, setShowUnassignDialog] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  const { employee, performance, contracts, tasks, isLoading, stats } = useEmployeeDetails(employeeId || '');
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'B': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'C': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'D': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'F': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'completed': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'under_legal_procedure': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      case 'suspended': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-neutral-50 text-neutral-700 border-neutral-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'pending': return 'معلق';
      case 'completed': return 'مكتمل';
      case 'under_legal_procedure': return 'تحت الإجراء القانوني';
      case 'cancelled': return 'ملغي';
      case 'suspended': return 'موقوف';
      case 'expired': return 'منتهي';
      default: return status;
    }
  };

  const getCustomerName = (contract: any) => {
    const customer = contract?.customers;
    if (!customer) return 'غير محدد';
    return customer.company_name_ar || `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() || 'غير محدد';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-neutral-600 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-600 font-medium">الموظف غير موجود</p>
          <Button onClick={() => navigate('/team-management')} className="mt-4">
            العودة إلى إدارة الفريق
          </Button>
        </div>
      </div>
    );
  }

  const employeeName = employee.first_name_ar && employee.last_name_ar
    ? `${employee.first_name_ar} ${employee.last_name_ar}`
    : employee.first_name && employee.last_name
    ? `${employee.first_name} ${employee.last_name}`
    : employee.email;

  // Mock data for trend chart
  const trendData = [
    { month: 'يناير', performance_score: 75, collection_rate: 70, task_completion: 80 },
    { month: 'فبراير', performance_score: 78, collection_rate: 75, task_completion: 82 },
    { month: 'مارس', performance_score: 82, collection_rate: 80, task_completion: 85 },
    { month: 'أبريل', performance_score: 85, collection_rate: 83, task_completion: 88 },
    { month: 'مايو', performance_score: 87, collection_rate: 85, task_completion: 90 },
    { month: 'يونيو', performance_score: performance?.performance_score || 90, collection_rate: performance?.collection_rate || 88, task_completion: 92 },
  ];

  return (
    <div className="employee-details-system min-h-screen bg-[#F6F8FB] p-4 font-sans sm:p-6" dir="rtl">
      
      {/* Header */}
      <header className="employee-page-header mb-5 rounded-lg border border-[#DDE5EF] bg-white p-4 shadow-sm">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/team-management')}
            className="mb-3 -mr-2"
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة إلى إدارة الفريق
          </Button>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#173A63] text-2xl font-black text-white shadow-sm">
              {employeeName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-neutral-900">{employeeName}</h1>
                <Badge className={cn('text-xs font-bold border', getGradeColor(performance?.grade || 'N/A'))}>
                  {performance?.grade || 'N/A'}
                </Badge>
              </div>
              <p className="text-sm text-neutral-500 font-medium">{employee.email}</p>
              <p className="text-xs text-neutral-400">{employee.position || employee.role}</p>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg border-[#DDE5EF] bg-white text-[#536173] hover:bg-[#F8FAFC]"
            onClick={() => navigate(`/employee/${employeeId}/report`)}
          >
            <FileText className="ml-2 h-4 w-4" />
            تقرير مفصل
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg border-[#DDE5EF] bg-white text-[#536173] hover:bg-[#F8FAFC]"
            onClick={() => {
              if (employee?.phone) {
                window.location.href = `tel:${employee.phone}`;
              } else {
                window.location.href = `mailto:${employee.email}`;
              }
            }}
          >
            <Phone className="ml-2 h-4 w-4" />
            اتصال
          </Button>
          <Button
            size="sm"
            className="rounded-lg bg-[#173A63] text-white shadow-sm hover:bg-[#102C4D]"
            onClick={() => setShowAssignDialog(true)}
          >
            <UserPlus className="ml-2 h-4 w-4" />
            تعيين عقد
          </Button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="employee-stats-grid mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="إجمالي العقود"
          value={stats.totalContracts}
          subtitle={`${stats.activeContracts} نشط`}
          icon={FileText}
          color="bg-blue-500"
          delay={0.1}
        />
        <StatCard
          title="نقاط الأداء"
          value={`${Math.round(performance?.performance_score || 0)}%`}
          subtitle={performance?.grade || 'N/A'}
          icon={TrendingUp}
          color="bg-[#1BBF9A]"
          delay={0.2}
        />
        <StatCard
          title="المبالغ المستحقة"
          value={formatCurrency(stats.totalBalance)}
          icon={DollarSign}
          color="bg-amber-500"
          delay={0.3}
        />
        <StatCard
          title="المهام"
          value={stats.pendingTasks}
          subtitle={`${stats.completedTasks} مكتمل`}
          icon={CheckCircle}
          color="bg-purple-500"
          delay={0.4}
        />
      </div>

      {/* Main Content Grid */}
      <div className="employee-workspace grid grid-cols-12 gap-5">
        
        {/* Performance Chart */}
        <GlassCard className="employee-performance-panel col-span-12 p-5 xl:col-span-8" delay={0.5}>
          <PerformanceTrendChart data={trendData} title="تطور الأداء (آخر 6 أشهر)" />
          
          {/* Performance Metrics */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-neutral-200">
            <div>
              <p className="text-xs text-neutral-500 font-medium mb-2">نسبة التحصيل</p>
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg font-bold text-neutral-900">{Math.round(performance?.collection_rate || 0)}%</span>
              </div>
              <Progress value={performance?.collection_rate || 0} className="h-2" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium mb-2">إنجاز المهام</p>
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg font-bold text-neutral-900">{Math.round(performance?.followup_completion_rate || 0)}%</span>
              </div>
              <Progress value={performance?.followup_completion_rate || 0} className="h-2" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium mb-2">التواصل</p>
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg font-bold text-neutral-900">{performance?.total_communications || 0}</span>
              </div>
              <p className="text-xs text-neutral-400">مكالمة/رسالة</p>
            </div>
          </div>
        </GlassCard>

        {/* Quick Stats */}
        <GlassCard className="employee-quick-panel col-span-12 p-5 xl:col-span-4" delay={0.55}>
          <h3 className="text-lg font-bold text-neutral-900 mb-4">إحصائيات سريعة</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-neutral-700">المحصّل</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">
                {formatCurrency(stats.totalCollected)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-neutral-700">المستحق</span>
              </div>
              <span className="text-sm font-bold text-amber-600">
                {formatCurrency(stats.totalBalance)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-neutral-700">العقود النشطة</span>
              </div>
              <span className="text-sm font-bold text-blue-600">
                {stats.activeContracts}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-neutral-700">مهام معلقة</span>
              </div>
              <span className="text-sm font-bold text-purple-600">
                {stats.pendingTasks}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Assigned Contracts */}
        <GlassCard className="employee-contracts-panel col-span-12 p-5 xl:col-span-7" delay={0.6}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-neutral-900">العقود المعيّنة</h3>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {contracts?.length || 0} عقود
            </Badge>
          </div>

          {contracts && contracts.length > 0 ? (
            <ScrollArea className="h-[460px] pr-1">
              <div className="space-y-3">
                {contracts.map((contract: any, index) => (
                  <motion.div
                    key={contract.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group rounded-lg border border-[#DDE5EF] bg-white p-4 transition-all hover:border-[#173A63] hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-sm font-bold text-neutral-900">
                            #{contract.contract_number}
                          </h4>
                          <Badge variant="outline" className={cn('text-xs', getStatusColor(contract.status))}>
                            {getStatusLabel(contract.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-600 mb-2">
                          {getCustomerName(contract)}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(contract.start_date).toLocaleDateString('ar-EG')}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatCurrency(contract.monthly_amount)}
                          </span>
                          {contract.balance_due > 0 && (
                            <span className="flex items-center gap-1 text-red-600 font-bold">
                              <AlertCircle className="w-3 h-3" />
                              مستحق: {formatCurrency(contract.balance_due)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setSelectedContractId(contract.id);
                          setShowUnassignDialog(true);
                        }}
                      >
                        <XCircle className="ml-2 h-4 w-4" />
                        إلغاء التعيين
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 text-neutral-400">
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">لا توجد عقود معيّنة</p>
            </div>
          )}
        </GlassCard>

        {/* Scheduled Tasks */}
        <GlassCard className="employee-tasks-panel col-span-12 p-5 xl:col-span-5" delay={0.65}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-neutral-900">المهام المجدولة</h3>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {tasks?.length || 0} مهام
            </Badge>
          </div>

          {tasks && tasks.length > 0 ? (
            <ScrollArea className="h-[460px] pr-1">
              <div className="space-y-3">
                {tasks.map((task: any, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 bg-white rounded-xl border border-neutral-100"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-bold text-neutral-900 line-clamp-1">
                        {task.title_ar || task.title}
                      </h4>
                      <Badge variant="outline" className={cn('text-xs', getStatusColor(task.status))}>
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.scheduled_date).toLocaleDateString('ar-EG')}
                      </span>
                      {task.scheduled_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.scheduled_time}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 text-neutral-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">لا توجد مهام مجدولة</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Dialogs */}
      <UnassignContractDialog
        open={showUnassignDialog}
        onOpenChange={setShowUnassignDialog}
        contractId={selectedContractId}
        contractNumber={contracts?.find(c => c.id === selectedContractId)?.contract_number}
        employeeName={employeeName}
      />

      <ContractAssignmentDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        preselectedEmployeeId={employeeId}
      />
      <style>{`
        .employee-details-system {
          color: #142033;
          background:
            linear-gradient(180deg, rgba(246, 248, 251, 0.82), #F6F8FB 280px),
            #F6F8FB !important;
        }

        .employee-details-system .employee-card {
          border-radius: 8px;
          border-color: #DDE5EF;
          box-shadow: 0 10px 28px rgba(2, 6, 23, 0.06);
        }

        .employee-page-header {
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(12px);
          background: rgba(255, 255, 255, 0.94);
        }

        .employee-page-header > div:last-child {
          flex-wrap: wrap;
        }

        .employee-page-header button {
          min-height: 40px;
          font-weight: 800;
        }

        .employee-stat-card {
          min-height: 152px;
        }

        .employee-performance-panel,
        .employee-quick-panel,
        .employee-contracts-panel,
        .employee-tasks-panel {
          background: #fff !important;
        }

        .employee-performance-panel .grid.grid-cols-3 {
          gap: 12px;
        }

        .employee-performance-panel .grid.grid-cols-3 > div,
        .employee-quick-panel .space-y-4 > div {
          border: 1px solid #DDE5EF;
          border-radius: 8px;
          background: #F8FAFC !important;
          padding: 14px;
        }

        .employee-contracts-panel .group,
        .employee-tasks-panel .space-y-3 > div {
          border-radius: 8px !important;
          border-color: #DDE5EF !important;
          background: #fff !important;
        }

        .employee-contracts-panel .group button {
          opacity: 1 !important;
          border: 1px solid #FECACA;
          border-radius: 8px;
          background: #FFF7F7;
          font-weight: 800;
        }

        .employee-details-system .text-xs {
          font-size: 13px;
          line-height: 1.55;
        }

        .employee-details-system .text-sm {
          font-size: 14px;
          line-height: 1.65;
        }

        .employee-details-system h3 {
          color: #142033;
          font-weight: 950;
        }

        .employee-details-system button,
        .employee-details-system [role="progressbar"] {
          border-radius: 8px !important;
        }

        .employee-details-system [data-radix-progress-indicator],
        .employee-details-system .bg-primary {
          background-color: #1BBF9A !important;
        }

        @media (max-width: 1280px) {
          .employee-page-header {
            position: static;
          }
        }

        @media (max-width: 768px) {
          .employee-page-header > div:last-child button {
            flex: 1 1 140px;
          }

          .employee-performance-panel .grid.grid-cols-3 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeDetails;
