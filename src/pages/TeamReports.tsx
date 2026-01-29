/**
 * Team Reports Page
 * صفحة التقارير المفصلة للفريق
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  ArrowRight,
  RefreshCw,
  BarChart3,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PerformanceTrendChart } from '@/components/employee/PerformanceTrendChart';
import { TeamComparisonChart } from '@/components/team/TeamComparisonChart';
import { LeaderboardWidget } from '@/components/team/LeaderboardWidget';
import { ExportButton } from '@/components/shared/ExportButton';
import { exportTeamPerformance } from '@/utils/exportToExcel';

// Shared Components
const GlassCard = ({ children, className, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, type: 'spring', bounce: 0.4 }}
    className={cn(
      'bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm rounded-3xl overflow-hidden',
      className
    )}
  >
    {children}
  </motion.div>
);

export const TeamReports: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedMetric, setSelectedMetric] = useState<'performance_score' | 'collection_rate' | 'task_completion'>('performance_score');
  
  // Get company_id from user
  const companyId = user?.profile?.company_id || user?.company?.id;

  // Check permissions
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

  // Fetch team performance data
  const { data: teamPerformance, isLoading, refetch } = useQuery({
    queryKey: ['team-performance-reports', companyId, selectedPeriod],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('employee_performance_view')
        .select('*')
        .eq('company_id', companyId)
        .order('performance_score', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Mock data for trend chart (في الإنتاج، يجب جلبها من database)
  const trendData = [
    { month: 'يناير', performance_score: 75, collection_rate: 70, task_completion: 80 },
    { month: 'فبراير', performance_score: 78, collection_rate: 75, task_completion: 82 },
    { month: 'مارس', performance_score: 82, collection_rate: 80, task_completion: 85 },
    { month: 'أبريل', performance_score: 85, collection_rate: 83, task_completion: 88 },
    { month: 'مايو', performance_score: 87, collection_rate: 85, task_completion: 90 },
    { month: 'يونيو', performance_score: 90, collection_rate: 88, task_completion: 92 },
  ];

  const handleExportExcel = async () => {
    if (teamPerformance) {
      exportTeamPerformance(teamPerformance);
    }
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

  const avgPerformance = teamPerformance
    ? Math.round(teamPerformance.reduce((sum, e) => sum + (e.performance_score || 0), 0) / teamPerformance.length)
    : 0;

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
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-900">تقارير الفريق</h1>
              <p className="text-sm text-neutral-500 font-medium">تحليلات مفصلة وإحصائيات متقدمة</p>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={(v: any) => setSelectedPeriod(v)}>
            <SelectTrigger className="w-[140px] bg-white/50 border-neutral-200 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">هذا الأسبوع</SelectItem>
              <SelectItem value="month">هذا الشهر</SelectItem>
              <SelectItem value="quarter">هذا الربع</SelectItem>
              <SelectItem value="year">هذا العام</SelectItem>
            </SelectContent>
          </Select>

          <ExportButton
            onExportExcel={handleExportExcel}
            label="تصدير"
            variant="outline"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="bg-white/50 backdrop-blur-md border-neutral-200 hover:bg-white text-neutral-600 rounded-xl"
          >
            <RefreshCw className={cn('ml-2 h-4 w-4', isLoading && 'animate-spin')} />
            تحديث
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/team-management')}
            className="bg-white/50 backdrop-blur-md border-neutral-200 hover:bg-white text-neutral-600 rounded-xl"
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            إدارة الفريق
          </Button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <GlassCard className="p-6" delay={0.1}>
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-teal-500" />
            <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
              نشط
            </Badge>
          </div>
          <p className="text-2xl font-black text-neutral-900">{teamPerformance?.length || 0}</p>
          <p className="text-xs text-neutral-500 font-medium">إجمالي الموظفين</p>
        </GlassCard>

        <GlassCard className="p-6" delay={0.15}>
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{avgPerformance}%</p>
          <p className="text-xs text-neutral-500 font-medium">متوسط الأداء</p>
        </GlassCard>

        <GlassCard className="p-6" delay={0.2}>
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600">
            {teamPerformance?.reduce((sum, e) => sum + (e.total_contracts || 0), 0) || 0}
          </p>
          <p className="text-xs text-neutral-500 font-medium">إجمالي العقود</p>
        </GlassCard>

        <GlassCard className="p-6" delay={0.25}>
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600">
            {selectedPeriod === 'week' ? '7' : selectedPeriod === 'month' ? '30' : selectedPeriod === 'quarter' ? '90' : '365'}
          </p>
          <p className="text-xs text-neutral-500 font-medium">أيام التقرير</p>
        </GlassCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Performance Trend */}
        <GlassCard className="col-span-12 lg:col-span-8 p-6" delay={0.3}>
          <PerformanceTrendChart data={trendData} title="تطور الأداء عبر الوقت" />
        </GlassCard>

        {/* Leaderboard */}
        <GlassCard className="col-span-12 lg:col-span-4 p-6" delay={0.35}>
          <LeaderboardWidget limit={5} showTrend={false} />
        </GlassCard>

        {/* Team Comparison */}
        <GlassCard className="col-span-12 p-6" delay={0.4}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-neutral-900">مقارنة الفريق</h3>
            <Select value={selectedMetric} onValueChange={(v: any) => setSelectedMetric(v)}>
              <SelectTrigger className="w-[180px] bg-white/50 border-neutral-200 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="performance_score">نقاط الأداء</SelectItem>
                <SelectItem value="collection_rate">نسبة التحصيل</SelectItem>
                <SelectItem value="task_completion">إنجاز المهام</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TeamComparisonChart 
            data={teamPerformance || []} 
            metric={selectedMetric}
            title=""
          />
        </GlassCard>
      </div>
    </div>
  );
};

export default TeamReports;
