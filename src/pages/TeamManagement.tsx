/**
 * Team Management Page
 * صفحة إدارة الفريق - للمدراء والإدارة فقط
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  TrendingUp,
  Briefcase,
  Award,
  Search,
  Filter,
  UserPlus,
  RefreshCw,
  BarChart3,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ContractAssignmentDialog, BulkAssignmentDialog } from '@/components/team';
import { AssignmentHistoryWidget } from '@/components/team/AssignmentHistoryWidget';
import { SmartDistributionDialog } from '@/components/team/SmartDistributionDialog';
import { ExportButton } from '@/components/shared/ExportButton';
import { exportTeamPerformance } from '@/utils/exportToExcel';
import { NotificationBell } from '@/components/notifications/NotificationBell';

// Types
interface EmployeeStats {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  total_contracts: number;
  active_contracts: number;
  performance_score: number;
  collection_rate: number;
  grade: string;
  total_collected: number;
  balance_due: number;
}

// Shared Components
const GlassCard = ({ children, className, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay, type: "spring", bounce: 0.18 }}
    className={cn(
      "team-card overflow-hidden rounded-lg border border-[#DDE5EF] bg-white shadow-sm",
      className
    )}
  >
    {children}
  </motion.div>
);

const StatCard = ({ title, value, subtitle, icon: Icon, color, delay }: any) => (
  <GlassCard className="team-stat-card p-5 flex flex-col justify-between h-full group transition-all duration-300" delay={delay}>
    <div className="flex justify-between items-start gap-4 mb-4">
      <div className={cn("team-stat-icon p-3 rounded-lg transition-transform group-hover:scale-105 duration-300", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      {subtitle && (
        <span className="team-stat-badge text-xs font-bold px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#536173]">
          {subtitle}
        </span>
      )}
    </div>
    <div>
      <h3 className="team-stat-value text-2xl font-black text-[#142033] mb-1">{value}</h3>
      <p className="team-stat-title text-sm font-bold text-[#6A7688]">{title}</p>
    </div>
  </GlassCard>
);

export const TeamManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [showSmartDistribution, setShowSmartDistribution] = useState(false);

  // Check if user has permission (admin or manager)
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-role', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Redirect if not authorized
  React.useEffect(() => {
    if (userProfile) {
      const role = userProfile.role?.toLowerCase();
      if (!role || !['admin', 'manager'].includes(role)) {
        navigate('/dashboard');
      }
    }
  }, [userProfile, navigate]);

  // Get company_id from user
  const companyId = user?.profile?.company_id || user?.company?.id;

  // Fetch team stats
  const { data: teamStats, isLoading: statsLoading } = useQuery({
    queryKey: ['team-stats', companyId],
    queryFn: async () => {
      if (!companyId) return { totalEmployees: 0, activeEmployees: 0, totalContracts: 0, avgPerformance: 0 };

      // Get all employees with contracts from same company
      const { data: employees, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name_ar,
          last_name_ar,
          email,
          contracts:contracts!assigned_to_profile_id(count)
        `)
        .eq('company_id', companyId)
        .not('role', 'eq', 'customer');

      if (error) throw error;

      return {
        totalEmployees: employees?.length || 0,
        activeEmployees: employees?.filter(e => e.contracts && e.contracts.length > 0).length || 0,
        totalContracts: employees?.reduce((sum, e) => sum + (e.contracts?.[0]?.count || 0), 0) || 0,
        avgPerformance: 0, // سنحسبها لاحقاً
      };
    },
    enabled: !!companyId,
  });

  // Fetch employees performance
  const { data: employees, isLoading: employeesLoading, refetch } = useQuery({
    queryKey: ['team-employees', companyId, searchQuery, selectedFilter],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from('employee_performance_view')
        .select('*')
        .eq('company_id', companyId)
        .order('performance_score', { ascending: false });

      // Apply filters
      if (selectedFilter !== 'all') {
        if (selectedFilter === 'high') {
          query = query.gte('performance_score', 75);
        } else if (selectedFilter === 'medium') {
          query = query.gte('performance_score', 50).lt('performance_score', 75);
        } else if (selectedFilter === 'low') {
          query = query.lt('performance_score', 50);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search query
      if (searchQuery) {
        return data?.filter(emp => 
          emp.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.employee_email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return data;
    },
    enabled: !!companyId,
  });

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

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-amber-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  // Show loading while checking permissions
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-neutral-600 font-medium">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  const role = userProfile.role?.toLowerCase();
  if (!role || !['admin', 'manager'].includes(role)) {
    return null;
  }

  return (
    <div className="team-management-system min-h-screen bg-[#F6F8FB] p-4 font-sans sm:p-6" dir="rtl">
      
      {/* Header */}
      <header className="team-page-header mb-5 flex flex-col gap-4 rounded-lg border border-[#DDE5EF] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="team-header-icon flex h-12 w-12 items-center justify-center rounded-lg bg-[#173A63] text-white shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-900">إدارة الفريق</h1>
              <p className="text-sm text-neutral-500 font-medium">مراقبة أداء الموظفين وتوزيع العقود</p>
            </div>
          </motion.div>
        </div>

        <div className="team-header-actions flex flex-wrap items-center gap-2">
          <NotificationBell />
          <ExportButton
            onExportExcel={async () => {
              if (employees) {
                exportTeamPerformance(employees);
              }
            }}
            label="تصدير"
            variant="outline"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/team-reports')}
            className="rounded-lg border-[#DDE5EF] bg-white text-[#536173] hover:bg-[#F8FAFC]"
          >
            <BarChart3 className="ml-2 h-4 w-4" />
            التقارير
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="rounded-lg border-[#DDE5EF] bg-white text-[#536173] hover:bg-[#F8FAFC]"
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            الرئيسية
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={employeesLoading}
            className="rounded-lg border-[#DDE5EF] bg-white text-[#536173] hover:bg-[#F8FAFC]"
          >
            <RefreshCw className={cn("ml-2 h-4 w-4", employeesLoading && "animate-spin")} />
            تحديث
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAssignDialog(true)}
            className="rounded-lg bg-[#173A63] text-white shadow-sm hover:bg-[#102C4D]"
          >
            <UserPlus className="ml-2 h-4 w-4" />
            تعيين عقد
          </Button>
          <Button
            size="sm"
            onClick={() => setShowBulkAssignDialog(true)}
            className="rounded-lg bg-[#1BBF9A] text-white shadow-sm hover:bg-[#12A885]"
          >
            <Users className="ml-2 h-4 w-4" />
            تعيين جماعي
          </Button>
          <Button
            size="sm"
            onClick={() => setShowSmartDistribution(true)}
            className="rounded-lg bg-[#EEF5FB] text-[#173A63] shadow-sm hover:bg-[#E3EEF8]"
          >
            <Sparkles className="ml-2 h-4 w-4" />
            توزيع ذكي
          </Button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="team-stats-grid mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="إجمالي الموظفين"
          value={teamStats?.totalEmployees || 0}
          subtitle={`${teamStats?.activeEmployees || 0} نشط`}
          icon={Users}
          color="bg-blue-500"
          delay={0.1}
        />
        <StatCard
          title="العقود الموزعة"
          value={teamStats?.totalContracts || 0}
          icon={Briefcase}
          color="bg-[#1BBF9A]"
          delay={0.2}
        />
        <StatCard
          title="متوسط الأداء"
          value={`${Math.round(employees?.reduce((sum, e) => sum + (e.performance_score || 0), 0) / (employees?.length || 1) || 0)}%`}
          icon={TrendingUp}
          color="bg-emerald-500"
          delay={0.3}
        />
        <StatCard
          title="موظف الشهر"
          value={employees?.[0]?.employee_name?.split(' ')[0] || '-'}
          subtitle={`${Math.round(employees?.[0]?.performance_score || 0)}%`}
          icon={Award}
          color="bg-amber-500"
          delay={0.4}
        />
      </div>

      {/* Filters and Search */}
      <GlassCard className="team-filter-bar mb-5 p-4" delay={0.5}>
        <div className="flex flex-col gap-4 xl:flex-row">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="ابحث عن موظف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-lg border-[#DDE5EF] bg-[#F8FAFC] pr-10 text-[#142033]"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'الكل', icon: Users },
              { id: 'high', label: 'أداء عالي', icon: TrendingUp },
              { id: 'medium', label: 'متوسط', icon: BarChart3 },
              { id: 'low', label: 'يحتاج تحسين', icon: Filter },
            ].map((filter) => (
              <Button
                key={filter.id}
                variant={selectedFilter === filter.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter(filter.id as any)}
                className={cn(
                  "h-10 rounded-lg font-bold",
                  selectedFilter === filter.id
                    ? "bg-[#173A63] text-white hover:bg-[#102C4D]"
                    : "border-[#DDE5EF] bg-white text-[#536173] hover:bg-[#F8FAFC]"
                )}
              >
                <filter.icon className="ml-2 h-4 w-4" />
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Main Grid */}
      <div className="team-workspace grid grid-cols-12 gap-5">
        
        {/* Employees List */}
        <GlassCard className="team-directory col-span-12 p-5 xl:col-span-8" delay={0.6}>
          <h3 className="text-lg font-bold text-neutral-900 mb-4">الموظفون</h3>
        
        {employeesLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-500 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">جاري التحميل...</p>
          </div>
        ) : employees && employees.length > 0 ? (
          <ScrollArea className="h-[640px] pr-1">
            <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
              {employees.map((employee: any, index) => (
                <motion.div
                  key={employee.employee_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="team-employee-card group cursor-pointer rounded-lg border border-[#DDE5EF] bg-white p-4 transition-all hover:border-[#173A63] hover:shadow-md"
                  onClick={() => navigate(`/employee/${employee.employee_id}`)}
                >
                  {/* Employee Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#173A63] text-lg font-black text-white shadow-sm">
                          {employee.employee_name?.charAt(0) || '؟'}
                        </div>
                        {/* Active Indicator */}
                        {employee.total_contracts > 0 && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" title="نشط" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 group-hover:text-teal-600 transition-colors">
                          {employee.employee_name || 'غير محدد'}
                        </h4>
                        <p className="text-xs text-neutral-500">{employee.employee_email}</p>
                      </div>
                    </div>
                    <Badge className={cn("text-xs font-bold border", getGradeColor(employee.grade || 'N/A'))}>
                      {employee.grade || 'N/A'}
                    </Badge>
                  </div>

                  {/* Performance Score */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-neutral-600">نقاط الأداء</span>
                      <span className={cn("text-lg font-black", getPerformanceColor(employee.performance_score || 0))}>
                        {Math.round(employee.performance_score || 0)}
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-teal-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${employee.performance_score || 0}%` }}
                        transition={{ duration: 1, delay: index * 0.05 }}
                      />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-100">
                    <div className="text-center">
                      <p className="text-lg font-bold text-neutral-900">{employee.total_contracts || 0}</p>
                      <p className="text-xs text-neutral-500">عقود</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-neutral-900">{Math.round(employee.collection_rate || 0)}%</p>
                      <p className="text-xs text-neutral-500">تحصيل</p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-3 flex gap-2 border-t border-[#EEF2F6] pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/employee/${employee.employee_id}`);
                      }}
                    >
                      عرض التفاصيل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAssignDialog(true);
                      }}
                    >
                      تعيين عقد
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center"
            >
              <Users className="w-10 h-10 text-neutral-400" />
            </motion.div>
            <p className="text-lg font-bold text-neutral-700 mb-2">لا يوجد موظفون</p>
            <p className="text-sm text-neutral-500 mb-6">
              {companyId ? 'لم يتم إضافة موظفين لشركتك بعد' : 'يرجى تسجيل الدخول'}
            </p>
            {companyId && (
              <Button
                onClick={() => navigate('/settings/team')}
                className="bg-teal-500 hover:bg-teal-600"
              >
                <UserPlus className="ml-2 h-4 w-4" />
                إضافة موظف
              </Button>
            )}
          </div>
        )}
        </GlassCard>

        {/* Assignment History */}
        <GlassCard className="team-history-panel col-span-12 p-5 xl:col-span-4" delay={0.65}>
          <AssignmentHistoryWidget limit={10} />
        </GlassCard>
      </div>

      {/* Dialogs */}
      <ContractAssignmentDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
      />

      <BulkAssignmentDialog
        open={showBulkAssignDialog}
        onOpenChange={setShowBulkAssignDialog}
      />

      <SmartDistributionDialog
        open={showSmartDistribution}
        onOpenChange={setShowSmartDistribution}
      />
      <style>{`
        .team-management-system {
          color: #142033;
          background:
            linear-gradient(180deg, rgba(246, 248, 251, 0.82), #F6F8FB 280px),
            #F6F8FB !important;
        }

        .team-management-system .team-card {
          border-radius: 8px;
          box-shadow: 0 10px 28px rgba(2, 6, 23, 0.06);
        }

        .team-page-header {
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(12px);
          background: rgba(255, 255, 255, 0.94);
        }

        .team-header-actions button,
        .team-header-actions a {
          min-height: 40px;
          font-weight: 800;
        }

        .team-stat-card {
          min-height: 152px;
          border-color: #DDE5EF !important;
          background: #fff !important;
        }

        .team-stat-card:hover,
        .team-employee-card:hover {
          transform: translateY(-1px);
        }

        .team-stat-icon {
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
        }

        .team-filter-bar {
          border-color: #DDE5EF !important;
        }

        .team-filter-bar button {
          white-space: nowrap;
        }

        .team-directory,
        .team-history-panel {
          min-height: 720px;
        }

        .team-employee-card h4,
        .team-employee-card p {
          overflow-wrap: anywhere;
        }

        .team-employee-card .rounded-full {
          border-radius: 999px;
        }

        .team-employee-card button {
          min-width: 0;
        }

        .team-management-system [data-radix-scroll-area-viewport] {
          padding-left: 4px;
        }

        .team-management-system .text-xs {
          font-size: 13px;
          line-height: 1.55;
        }

        .team-management-system .text-sm {
          font-size: 14px;
          line-height: 1.65;
        }

        .team-management-system button,
        .team-management-system input {
          border-radius: 8px !important;
        }

        @media (max-width: 1280px) {
          .team-page-header {
            position: static;
          }

          .team-directory,
          .team-history-panel {
            min-height: auto;
          }
        }

        @media (max-width: 768px) {
          .team-header-actions {
            width: 100%;
          }

          .team-header-actions button,
          .team-header-actions > div {
            flex: 1 1 140px;
          }
        }
      `}</style>
    </div>
  );
};

export default TeamManagement;
