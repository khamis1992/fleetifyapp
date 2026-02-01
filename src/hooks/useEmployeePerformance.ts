/**
 * useEmployeePerformance Hook
 * Hook لإدارة أداء الموظف
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import type { 
  EmployeePerformance, 
  PerformanceGradeInfo 
} from '@/types/mobile-employee.types';

interface UseEmployeePerformanceReturn {
  performance: EmployeePerformance | null;
  performanceGrade: PerformanceGradeInfo | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Performance grade definitions
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

export const useEmployeePerformance = (): UseEmployeePerformanceReturn => {
  const { user } = useAuth();

  // Get employee's profile
  const { data: profile } = useQuery({
    queryKey: ['employee-profile-performance', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, company_id')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch performance data
  const {
    data: performance = null,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['employee-performance', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const now = new Date();
      const currentMonth = format(now, 'yyyy-MM');
      const currentYear = now.getFullYear();

      // Try to get existing performance record
      let { data: existingPerformance, error: fetchError } = await supabase
        .from('employee_performance')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // If no record exists, calculate it
      if (!existingPerformance) {
        const startDate = startOfMonth(now).toISOString();
        const endDate = endOfMonth(now).toISOString();

        // Get contracts assigned to employee
        const { data: contracts } = await supabase
          .from('contracts')
          .select('id, balance_due, total_paid, monthly_amount')
          .eq('assigned_to_profile_id', profile.id)
          .eq('company_id', profile.company_id);

        // Get tasks
        const { data: tasks } = await supabase
          .from('employee_tasks')
          .select('id, status')
          .eq('assigned_to_profile_id', profile.id)
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate);

        // Get payments collected this month
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('company_id', profile.company_id)
          .eq('status', 'verified')
          .gte('payment_date', startDate)
          .lte('payment_date', endDate);

        // Get calls logged
        const { data: calls } = await supabase
          .from('call_logs')
          .select('id')
          .eq('profile_id', profile.id)
          .gte('call_date', startDate)
          .lte('call_date', endDate);

        // Get notes added
        const { data: notes } = await supabase
          .from('contract_notes')
          .select('id')
          .eq('created_by', profile.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        // Calculate metrics
        const totalCollected = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const targetAmount = contracts?.reduce((sum, c) => sum + (c.monthly_amount || 0), 0) || 0;
        const collectionRate = targetAmount > 0 ? (totalCollected / targetAmount) * 100 : 0;

        const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
        const totalTasks = tasks?.length || 0;
        const followupCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Calculate performance score (weighted average)
        const performanceScore = Math.round(
          (collectionRate * 0.5) + // 50% weight
          (followupCompletionRate * 0.3) + // 30% weight
          (Math.min((calls?.length || 0) / 20, 1) * 10) + // 10% weight (20 calls = 10 points)
          (Math.min((notes?.length || 0) / 10, 1) * 10) // 10% weight (10 notes = 10 points)
        );

        // Determine grade
        const grade = PERFORMANCE_GRADES.find(
          g => performanceScore >= g.minScore && performanceScore <= g.maxScore
        ) || PERFORMANCE_GRADES[PERFORMANCE_GRADES.length - 1];

        // Create performance record
        const performanceData: Omit<EmployeePerformance, 'created_at' | 'updated_at'> = {
          profile_id: profile.id,
          month: currentMonth,
          year: currentYear,
          performance_score: performanceScore,
          collection_rate: Math.round(collectionRate),
          followup_completion_rate: Math.round(followupCompletionRate),
          calls_logged: calls?.length || 0,
          notes_added: notes?.length || 0,
          tasks_completed: completedTasks,
          total_collected: totalCollected,
          target_amount: targetAmount,
          grade: grade.grade,
          grade_ar: grade.label_ar,
        };

        // Save to database
        const { data: newPerformance, error: insertError } = await supabase
          .from('employee_performance')
          .insert(performanceData)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating performance record:', insertError);
          // Return calculated data even if insert fails
          return performanceData as EmployeePerformance;
        }

        return newPerformance as EmployeePerformance;
      }

      return existingPerformance as EmployeePerformance;
    },
    enabled: !!profile?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get performance grade info
  const performanceGrade = performance 
    ? PERFORMANCE_GRADES.find(g => g.grade === performance.grade) || null
    : null;

  return {
    performance,
    performanceGrade,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
};
