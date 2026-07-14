/**
 * Current employee performance from the canonical employee_performance table.
 */

import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type {
  EmployeePerformance,
  PerformanceGradeInfo,
} from '@/types/mobile-employee.types';

interface UseEmployeePerformanceReturn {
  performance: EmployeePerformance | null;
  performanceGrade: PerformanceGradeInfo | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

const PERFORMANCE_GRADES: PerformanceGradeInfo[] = [
  {
    grade: 'excellent',
    label: 'Excellent',
    label_ar: 'ممتاز',
    color: 'text-emerald-600',
    icon: '🏆',
    minScore: 85,
    maxScore: 100,
  },
  {
    grade: 'good',
    label: 'Good',
    label_ar: 'جيد',
    color: 'text-blue-600',
    icon: '⭐',
    minScore: 70,
    maxScore: 84,
  },
  {
    grade: 'average',
    label: 'Average',
    label_ar: 'متوسط',
    color: 'text-amber-600',
    icon: '📊',
    minScore: 50,
    maxScore: 69,
  },
  {
    grade: 'poor',
    label: 'Poor',
    label_ar: 'ضعيف',
    color: 'text-red-600',
    icon: '📉',
    minScore: 0,
    maxScore: 49,
  },
];

const getGrade = (score: number) => PERFORMANCE_GRADES.find(
  grade => score >= grade.minScore && score <= grade.maxScore
) || PERFORMANCE_GRADES[PERFORMANCE_GRADES.length - 1];

export const useEmployeePerformance = (): UseEmployeePerformanceReturn => {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id || user?.company?.id;

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    error: profileQueryError,
  } = useQuery({
    queryKey: ['employee-profile-performance', companyId, user?.id],
    queryFn: async () => {
      if (!user?.id || !companyId) throw new Error('Employee identity is required');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, company_id')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!companyId,
  });

  const performanceQuery = useQuery({
    queryKey: ['employee-performance', companyId, profile?.id],
    queryFn: async (): Promise<EmployeePerformance | null> => {
      if (!profile?.id || !companyId) throw new Error('Employee profile is required');

      const { data, error } = await supabase
        .from('employee_performance')
        .select('*')
        .eq('employee_id', profile.id)
        .eq('company_id', companyId)
        .eq('period_type', 'monthly')
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const score = Math.max(0, Math.min(100, Number(data.performance_score || 0)));
      const grade = getGrade(score);
      const periodStart = new Date(`${data.period_start}T00:00:00Z`);

      return {
        profile_id: profile.id,
        month: data.period_start.slice(0, 7),
        year: periodStart.getUTCFullYear(),
        performance_score: score,
        collection_rate: Number(data.collection_rate || 0),
        followup_completion_rate: Number(data.followup_completion_rate || 0),
        calls_logged: Number(data.phone_calls_count || 0),
        notes_added: 0,
        tasks_completed: Number(data.completed_followups || 0),
        total_collected: Number(data.total_collected || 0),
        target_amount: Number(data.target_collection_amount || 0),
        grade: grade.grade,
        grade_ar: grade.label_ar,
        created_at: data.created_at || undefined,
        updated_at: data.updated_at || undefined,
      };
    },
    enabled: !!profile?.id && !!companyId,
  });

  const performance = performanceQuery.data || null;
  const performanceGrade = performance ? getGrade(performance.performance_score) : null;
  const error = profileQueryError || performanceQuery.error;

  return {
    performance,
    performanceGrade,
    isLoading: profileLoading || performanceQuery.isLoading,
    isError: profileError || performanceQuery.isError,
    error: error instanceof Error ? error : null,
    refetch: () => {
      void performanceQuery.refetch();
    },
  };
};
