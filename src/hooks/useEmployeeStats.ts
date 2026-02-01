/**
 * useEmployeeStats Hook
 * Hook لجمع جميع إحصائيات الموظف
 */

import { useEmployeeContracts } from './useEmployeeContracts';
import { useEmployeeTasks } from './useEmployeeTasks';
import { useEmployeePerformance } from './useEmployeePerformance';
import { useMonthlyCollections } from './useMonthlyCollections';
import type { EmployeeStats } from '@/types/mobile-employee.types';

interface UseEmployeeStatsReturn {
  stats: EmployeeStats;
  isLoading: boolean;
  isError: boolean;
  refetchAll: () => void;
}

export const useEmployeeStats = (): UseEmployeeStatsReturn => {
  // Fetch all data
  const {
    stats: contractStats,
    isLoading: isLoadingContracts,
    refetch: refetchContracts
  } = useEmployeeContracts();

  const {
    stats: taskStats,
    isLoading: isLoadingTasks,
    refetch: refetchTasks
  } = useEmployeeTasks();

  const {
    performance,
    performanceGrade,
    isLoading: isLoadingPerformance,
    refetch: refetchPerformance
  } = useEmployeePerformance();

  const {
    stats: collectionStats,
    isLoading: isLoadingCollections,
    refetch: refetchCollections
  } = useMonthlyCollections();

  // Combine all stats
  const stats: EmployeeStats = {
    // Contracts
    totalContracts: contractStats.totalContracts,
    activeContracts: contractStats.activeContracts,
    totalBalanceDue: contractStats.totalBalanceDue,
    
    // Tasks
    todayTasks: taskStats.todayTasks,
    completedTasks: taskStats.completedTasks,
    completionRate: taskStats.completionRate,
    
    // Performance
    performanceScore: performance?.performance_score || 0,
    performanceGrade: performanceGrade?.label || 'N/A',
    performanceGrade_ar: performanceGrade?.label_ar || 'غير محدد',
    
    // Collections
    monthlyTarget: collectionStats.totalDue,
    monthlyCollected: collectionStats.totalCollected,
    collectionRate: collectionStats.collectionRate,
    
    // Activity
    callsLogged: performance?.calls_logged || 0,
    notesAdded: performance?.notes_added || 0,
    paymentsRecorded: collectionStats.paidCount,
  };

  // Refetch all data
  const refetchAll = () => {
    refetchContracts();
    refetchTasks();
    refetchPerformance();
    refetchCollections();
  };

  return {
    stats,
    isLoading: isLoadingContracts || isLoadingTasks || isLoadingPerformance || isLoadingCollections,
    isError: false, // Individual hooks handle their own errors
    refetchAll,
  };
};
