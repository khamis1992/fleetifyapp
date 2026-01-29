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
    transition={{ duration: 0.5, delay, type: "spring", bounce: 0.4 }}
    className={cn(
      "bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm rounded-3xl overflow-hidden",
      className
    )}
  >
    {children}
  </motion.div>
);

const StatCard = ({ title, value, subtitle, icon: Icon, color, delay }: any) => (
  <GlassCard className="p-6 flex flex-col justify-between h-full group hover:shadow-md transition-all duration-300" delay={delay}>
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {subtitle && (
        <span className="text-xs font-bold px-2 py-1 rounded-full bg-neutral-100 text-neutral-600">
          {subtitle}
        </span>
      )}
    </div>
    <div>
      <h3 className="text-2xl font-black text-neutral-800 mb-1">{value}</h3>
      <p className="text-xs font-medium text-neutral-500">{title}</p>
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
        console.log('Access denied. Role:', role);
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 p-6 font-sans" dir="rtl">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-900">إدارة الفريق</h1>
              <p className="text-sm text-neutral-500 font-medium">مراقبة أداء الموظفين وتوزيع العقود</p>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center gap-3">
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
            className="bg-white/50 backdrop-blur-md border-neutral-200 hover:bg-white text-neutral-600 rounded-xl"
          >
            <BarChart3 className="ml-2 h-4 w-4" />
            التقارير
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="bg-white/50 backdrop-blur-md border-neutral-200 hover:bg-white text-neutral-600 rounded-xl"
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            الرئيسية
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={employeesLoading}
            className="bg-white/50 backdrop-blur-md border-neutral-200 hover:bg-white text-neutral-600 rounded-xl"
          >
            <RefreshCw className={cn("ml-2 h-4 w-4", employeesLoading && "animate-spin")} />
            تحديث
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAssignDialog(true)}
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-teal-500/20"
          >
            <UserPlus className="ml-2 h-4 w-4" />
            تعيين عقد
          </Button>
          <Button
            size="sm"
            onClick={() => setShowBulkAssignDialog(true)}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-purple-500/20"
          >
            <Users className="ml-2 h-4 w-4" />
            تعيين جماعي
          </Button>
          <Button
            size="sm"
            onClick={() => setShowSmartDistribution(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20"
          >
            <Sparkles className="ml-2 h-4 w-4" />
            توزيع ذكي
          </Button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
          color="bg-teal-500"
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
      <GlassCard className="p-6 mb-6" delay={0.5}>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="ابحث عن موظف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-white/50 border-neutral-200 rounded-xl"
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
                  "rounded-xl",
                  selectedFilter === filter.id
                    ? "bg-teal-500 hover:bg-teal-600 text-white"
                    : "bg-white/50 border-neutral-200 hover:bg-white text-neutral-600"
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
      <div className="grid grid-cols-12 gap-6">
        
        {/* Employees List */}
        <GlassCard className="col-span-12 lg:col-span-8 p-6" delay={0.6}>
          <h3 className="text-lg font-bold text-neutral-900 mb-4">الموظفون</h3>
        
        {employeesLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-500 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">جاري التحميل...</p>
          </div>
        ) : employees && employees.length > 0 ? (
          <ScrollArea className="h-[600px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employees.map((employee: any, index) => (
                <motion.div
                  key={employee.employee_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group p-5 bg-white rounded-2xl border border-neutral-100 hover:border-teal-200 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => navigate(`/employee/${employee.employee_id}`)}
                >
                  {/* Employee Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
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
                        className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full"
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
                  <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100 opacity-0 group-hover:opacity-100 transition-opacity">
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
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
              >
                <UserPlus className="ml-2 h-4 w-4" />
                إضافة موظف
              </Button>
            )}
          </div>
        )}
        </GlassCard>

        {/* Assignment History */}
        <GlassCard className="col-span-12 lg:col-span-4 p-6" delay={0.65}>
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
    </div>
  );
};

export default TeamManagement;
